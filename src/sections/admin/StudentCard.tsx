'use client'

import { useRef, useState } from 'react'
import { Camera, Trash2 } from 'lucide-react'
import { TRACK_LABEL, type LkCard, type TrackKey } from '@/lib/lk/types'
import type { AdminStudentSummary } from '@/types/studytrack'

/** students.program → card track, used until Iana sets the track in the ЛК. */
const PROGRAM_TRACK: Record<NonNullable<AdminStudentSummary['program']>, TrackKey> = {
  bachelor: 'bachelor',
  master: 'master',
  language_year: 'language',
}

export const photoUrl = (studentId: string, token: string) => `/api/admin/lk/${studentId}/photo?v=${token}`

/**
 * Shrink a picked image to a small WebP in the browser (longest side 640 px),
 * so uploads stay light and the server never has to decode images.
 */
export async function toWebp(file: File, max = 640): Promise<Blob> {
  const bmp = await createImageBitmap(file).catch(() => { throw new Error('Не удалось открыть фото: загрузите JPG или PNG') })
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * k)
  canvas.height = Math.round(bmp.height * k)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/webp', 0.85))
  if (!blob || blob.type !== 'image/webp') throw new Error('Браузер не смог сохранить фото')
  return blob
}

export async function uploadPhoto(studentId: string, file: File) {
  const form = new FormData()
  form.append('photo', await toWebp(file), 'photo.webp')
  const r = await fetch(`/api/admin/lk/${studentId}/photo`, { method: 'POST', body: form })
  const body = await r.json().catch(() => null)
  if (!r.ok) throw new Error(body?.error ?? 'Фото не загрузилось')
  return body.lk.profile.photo as string | null
}

const unisWord = (n: number) => { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? 'вуз' : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'вуза' : 'вузов' }
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('')

/** A premium student in Iana's list: photo, name, track and major in big letters, ЛК progress. */
export default function StudentCard({
  student,
  card,
  selected,
  onOpen,
  onDelete,
  onPhoto,
}: {
  student: AdminStudentSummary
  card: LkCard | undefined
  selected: boolean
  onOpen: () => void
  onDelete: () => void
  onPhoto: (token: string | null) => void
}) {
  const file = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const track = card?.track ?? (student.program ? PROGRAM_TRACK[student.program] : null)
  const p = card?.progress ?? { done: 0, total: 0 }
  const pct = p.total ? Math.round((p.done / p.total) * 100) : 0

  async function pick(f: File | undefined) {
    if (!f) return
    setBusy(true)
    setErr(null)
    try {
      onPhoto(await uploadPhoto(student.id, f))
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
      if (file.current) file.current.value = ''
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
      className={`group relative flex flex-col rounded-2xl border bg-study-card overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-study-brown ${
        selected ? 'border-study-brown ring-2 ring-study-brown/30' : 'border-study-lightgray'
      }`}
    >
      {/* photo */}
      <div className="relative aspect-[4/3] bg-study-brown/10">
        {card?.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl(student.id, card.photo)} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl font-black tracking-tight text-study-brown/40">{initials(student.fullName) || '?'}</span>
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); file.current?.click() }}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-black/55 px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-black/70 disabled:opacity-60"
            title={card?.photo ? 'Заменить фото' : 'Загрузить фото'}
          >
            <Camera className="w-3.5 h-3.5" /> {busy ? 'Загрузка…' : card?.photo ? 'Заменить' : 'Фото'}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="rounded-lg bg-black/55 p-1.5 text-white backdrop-blur hover:bg-study-red"
            title="Удалить пользователя"
            aria-label="Удалить пользователя"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="sr-only" onClick={(e) => e.stopPropagation()} onChange={(e) => pick(e.target.files?.[0])} />
      </div>

      {/* text */}
      <div className="flex flex-col gap-2 p-4 flex-1">
        <h3 className="text-2xl font-extrabold leading-tight text-study-dark break-words">{student.fullName}</h3>
        <div className="space-y-0.5">
          <p className="text-base font-bold uppercase tracking-wide text-study-brown">{track ? TRACK_LABEL[track] : 'Программа не указана'}</p>
          <p className="text-base font-bold uppercase tracking-wide text-study-dark break-words">{card?.major || <span className="text-study-gray font-semibold">Специальность не указана</span>}</p>
        </div>
        <p className="text-xs text-study-gray truncate">{student.email}</p>
        {err && <p className="text-xs font-semibold text-study-red">{err}</p>}

        <div className="mt-auto pt-2">
          <div className="flex items-baseline justify-between text-xs font-semibold text-study-gray mb-1">
            <span>{card?.unis ? `${card.unis} ${unisWord(card.unis)} · готово ${p.done} из ${p.total}` : 'Вузы ещё не добавлены'}</span>
            <span className="text-study-dark">{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-study-bg overflow-hidden">
            <div className="h-full rounded-full bg-study-green transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}
