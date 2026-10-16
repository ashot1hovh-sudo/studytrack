import { NextResponse } from 'next/server'
import { getConsultantUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { getLkStore, NotFoundError, toPublic } from '@/lib/lk/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// The photo on Iana's student card. The browser shrinks it to a small WebP
// before upload, so the server only checks the type and size.
const MAX_BYTES = 600 * 1024
const isWebp = (b: Buffer) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP'

// GET /api/admin/lk/:studentId/photo
export async function GET(_req: Request, { params }: { params: { studentId: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()
  const { response } = await getConsultantUser()
  if (response) return response
  try {
    const photo = await getLkStore().getPhoto(params.studentId)
    if (!photo) return NextResponse.json({ error: 'Нет фото' }, { status: 404 })
    // The URL carries a version token (?v=), so the browser may keep it.
    return new NextResponse(new Uint8Array(photo), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=31536000, immutable' } })
  } catch (err) {
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 })
    throw err
  }
}

// POST multipart { photo: File (image/webp) }
export async function POST(request: Request, { params }: { params: { studentId: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()
  const { response } = await getConsultantUser()
  if (response) return response
  const form = await request.formData().catch(() => null)
  const file = form?.get('photo')
  if (!(file instanceof Blob)) return NextResponse.json({ error: 'Файл не получен' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Фото слишком большое' }, { status: 413 })
  const buf = Buffer.from(await file.arrayBuffer())
  if (!isWebp(buf)) return NextResponse.json({ error: 'Нужен формат WebP' }, { status: 400 })
  try {
    return NextResponse.json({ lk: toPublic(await getLkStore().setPhoto(params.studentId, buf), { internal: true }) })
  } catch (err) {
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 })
    throw err
  }
}

// DELETE: remove the photo.
export async function DELETE(_req: Request, { params }: { params: { studentId: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()
  const { response } = await getConsultantUser()
  if (response) return response
  try {
    return NextResponse.json({ lk: toPublic(await getLkStore().setPhoto(params.studentId, null), { internal: true }) })
  } catch (err) {
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 })
    throw err
  }
}
