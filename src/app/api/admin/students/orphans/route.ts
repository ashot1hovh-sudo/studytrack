import { NextResponse } from 'next/server'
import { accessExpiryFromNow, getConsultantUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Logins without a profile. Users created by hand in the Supabase dashboard
 * get an auth.users entry but no public.students row (only the app's own
 * registration creates it), so they are invisible in the admin panel and
 * cannot be given access. This lists them and creates the missing profile.
 */

async function allAuthUsers(admin: NonNullable<ReturnType<typeof createAdminClient>>) {
  const users: { id: string; email?: string; created_at: string; user_metadata?: Record<string, unknown> }[] = []
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(error.message)
    users.push(...data.users)
    if (data.users.length < 1000) break
  }
  return users
}

// GET /api/admin/students/orphans
export async function GET() {
  if (missingSupabaseEnv()) return setupErrorResponse()
  const { response } = await getConsultantUser()
  if (response) return response
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing' }, { status: 500 })

  try {
    const users = await allAuthUsers(admin)
    const { data: profiles, error } = await admin.from('students').select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const known = new Set((profiles ?? []).map((p) => p.id))
    const orphans = users
      .filter((u) => !known.has(u.id))
      .map((u) => ({
        id: u.id,
        email: u.email ?? '',
        createdAt: u.created_at,
        name: typeof u.user_metadata?.full_name === 'string' ? u.user_metadata.full_name : '',
      }))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    return NextResponse.json({ orphans })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}

// POST /api/admin/students/orphans { userId, fullName, access: 'trial' | 'paid' | 'premium' }
export async function POST(request: Request) {
  if (missingSupabaseEnv()) return setupErrorResponse()
  const { response } = await getConsultantUser()
  if (response) return response
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing' }, { status: 500 })

  const body = await request.json().catch(() => null)
  const userId = String(body?.userId ?? '')
  const access = body?.access === 'paid' || body?.access === 'premium' ? body.access : 'trial'
  if (!userId) return NextResponse.json({ error: 'userId обязателен' }, { status: 400 })

  const { data: auth, error: authError } = await admin.auth.admin.getUserById(userId)
  if (authError || !auth?.user?.email) return NextResponse.json({ error: 'Пользователь не найден в Supabase Auth' }, { status: 404 })

  const email = auth.user.email.toLowerCase()
  const fullName = String(body?.fullName ?? '').trim() || (typeof auth.user.user_metadata?.full_name === 'string' ? auth.user.user_metadata.full_name : '') || email.split('@')[0]

  const { error } = await admin.from('students').insert({
    id: userId,
    email,
    full_name: fullName,
    role: 'student',
    service_type: access === 'premium' ? 'premium' : 'diy',
    subscription_status: access === 'trial' ? 'trial' : 'active',
    access_expires_at: access === 'paid' ? accessExpiryFromNow() : null,
    pin_code: null,
  })
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Профиль уже существует или email занят другим профилем' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
