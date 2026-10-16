// One-off: copy the local ЛК (.data/lk.json + .data/lk-photos/) into
// Supabase (public.lk + the lk-photos bucket, see supabase/migrations/002_lk.sql).
//
//   npm run lk:import            dry run: lists what would be copied
//   npm run lk:import -- --write copy; students that already have a row are skipped
//
// Data is copied as stored; the app normalizes it on read, as it did from the file.

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const write = process.argv.includes('--write')
const dir = process.env.UNIVERSITY_SYNC_DATA_DIR ?? path.join(process.cwd(), '.data')
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing')

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
const all: Record<string, { unis?: unknown[]; profile?: { photo?: string | null } }> = JSON.parse(await readFile(path.join(dir, 'lk.json'), 'utf8'))

const { data: existing, error: readErr } = await db.from('lk').select('student_id')
if (readErr) throw new Error(`public.lk not readable (migration applied?): ${readErr.message}`)
const have = new Set((existing ?? []).map((r) => r.student_id))

for (const [studentId, data] of Object.entries(all)) {
  const { data: student } = await db.from('students').select('email').eq('id', studentId).maybeSingle()
  const label = `${studentId} ${student?.email ?? '(no students row)'} · ${data.unis?.length ?? 0} unis`
  if (!student) { console.log(`skip  ${label}`); continue }
  if (have.has(studentId)) { console.log(`exists ${label}`); continue }
  console.log(`${write ? 'copy ' : 'would copy'} ${label}`)
  if (!write) continue

  const { error } = await db.from('lk').insert({ student_id: studentId, data, version: 1 })
  if (error) throw new Error(`insert ${studentId}: ${error.message}`)

  if (data.profile?.photo) {
    const photo = await readFile(path.join(dir, 'lk-photos', `${studentId}.webp`)).catch(() => null)
    if (!photo) { console.log('      photo token set but file missing'); continue }
    const { error: upErr } = await db.storage.from('lk-photos').upload(`${studentId}.webp`, photo, { contentType: 'image/webp', upsert: true })
    if (upErr) throw new Error(`photo ${studentId}: ${upErr.message}`)
    console.log('      photo copied')
  }
}
if (!write) console.log('\nDry run. Add --write to copy.')
