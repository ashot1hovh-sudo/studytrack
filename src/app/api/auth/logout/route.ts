import { NextResponse } from 'next/server'
import { missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const supabase = createClient()
  await supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}
