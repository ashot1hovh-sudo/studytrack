'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Camera, ChevronDown, ClipboardPaste, ExternalLink, Eye, ListPlus, Lock, PenLine, Plus, Search, Send, Trash2, Wallet, X } from 'lucide-react'
import {
  COMMON_ID,
  firstStage,
  GROUPS,
  paymentsSummary,
  progressOf,
  rub,
  STARTER_COMMON,
  STARTER_UNI,
  STATUS_LABEL,
  STATUSES,
  TONES,
  TRACKS,
  withStage,
  type AppStatus,
  type GroupKey,
  type LkDataPublic,
  type LkItem,
  type LkPayment,
  type LkUniPublic,
  type Tone,
  type TrackKey,
} from '@/lib/lk/types'
import type { CatalogUni } from '@/lib/lk/catalog'
import DatePicker from '@/components/DatePicker'
import LkBoard from '@/app/v2/_ui/lkBoard'
import { LkView, type LkAdminApi } from '@/app/v2/_ui/lk'
import { display } from '@/app/v2/_ui/font'
import { photoUrl, uploadPhoto } from '@/sections/admin/StudentCard'
import '@/app/v2/v2.css'

/**
 * «Личный кабинет v2» block in the premium student panel: everything the
 * family sees at /lk. Iana adds universities (from our database or typed
 * by hand), and for each one sets the application status, the facts from
 * her «Университеты» sheet, the portal login and password, and the checklist
 * from her «План действий» (no fixed order; done when everything is ticked).
 * Each university is saved on its own.
 */
type View = 'form' | 'family'
const VIEW_KEY = 'lk-editor-view'

export default function LkEditor({ studentId, studentName, onChanged }: { studentId: string; studentName: string; onChanged?: () => void }) {
  const [lk, setLk] = useState<LkDataPublic | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [subtitle, setSubtitle] = useState('')
  const [view, setView] = useState<View>('form')
  // Universities with unsaved edits in the form view.
  const dirty = useRef(new Set<string>())

  useEffect(() => {
    try { if (localStorage.getItem(VIEW_KEY) === 'family') setView('family') } catch {}
  }, [])

  const apply = useCallback((d: LkDataPublic) => {
    setLk(d)
    setSubtitle(d.subtitle ?? '')
    auto.current.server = d
    auto.current.local = d
  }, [])

  useEffect(() => {
    setLk(null)
    setOpen(null)
    dirty.current.clear()
    fetch(`/api/admin/lk/${studentId}`, { cache: 'no-store' })
      .then(async (r) => {
        const body = await r.json().catch(() => null)
        if (!r.ok) throw new Error(body?.error ?? 'Не удалось загрузить ЛК')
        apply(body.lk)
      })
      .catch((e: Error) => setError(e.message))
  }, [studentId, apply])

  const post = useCallback(
    async (label: string, payload: Record<string, unknown>) => {
      setBusy(label)
      setError(null)
      try {
        const r = await fetch(`/api/admin/lk/${studentId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const body = await r.json().catch(() => null)
        if (!r.ok) throw new Error(body?.error ?? 'Не удалось сохранить')
        if (body.lk) { apply(body.lk); onChanged?.() }
        return body
      } catch (e) {
        setError((e as Error).message)
        return null
      } finally {
        setBusy(null)
      }
    },
    [studentId, apply, onChanged],
  )

  /* ---- family view: every change saves by itself, one request at a time ----
     The page shows Iana's local state at once. Each university saves 600 ms
     after its last change; saves run in order, each with the latest local
     version and the last saved one as `base` (so the family's own moves made
     meanwhile survive). Replies don't replace what Iana is typing. */
  const auto = useRef<{ server: LkDataPublic | null; local: LkDataPublic | null; timers: Map<string, number>; queue: Promise<void> }>({ server: null, local: null, timers: new Map(), queue: Promise.resolve() })
  const [saveState, setSaveState] = useState<string | null>(null)

  const runSave = useCallback((key: string) => {
    const a = auto.current
    a.timers.delete(key)
    a.queue = a.queue.then(async () => {
      const local = a.local
      if (!local) return
      setSaveState('Сохраняю…')
      const payload = key === '__subtitle'
        ? { action: 'subtitle', subtitle: local.subtitle }
        : key === COMMON_ID
          ? { action: 'common', items: local.common, base: a.server?.common ?? null }
          : { action: 'save', uni: local.unis.find((u) => u.id === key), base: a.server?.unis.find((u) => u.id === key) ?? null }
      if (payload.action === 'save' && !payload.uni) return
      try {
        const r = await fetch(`/api/admin/lk/${studentId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const body = await r.json().catch(() => null)
        if (!r.ok) throw new Error(body?.error ?? 'ошибка сервера')
        a.server = body.lk
        setSaveState(a.timers.size ? 'Есть изменения…' : 'Сохранено')
        onChanged?.()
      } catch (e) {
        setSaveState(`Не сохранилось: ${(e as Error).message}. Измените что-нибудь, чтобы повторить.`)
      }
    })
  }, [studentId, onChanged])

  const schedule = useCallback((key: string, next: LkDataPublic) => {
    const a = auto.current
    a.local = next
    setLk(next)
    setSaveState('Есть изменения…')
    window.clearTimeout(a.timers.get(key))
    a.timers.set(key, window.setTimeout(() => runSave(key), 600))
  }, [runSave])

  const adminApi = useMemo<LkAdminApi>(() => ({
    saveState,
    patchUni: (uniId, p) => {
      const cur = auto.current.local
      if (!cur) return
      schedule(uniId, { ...cur, unis: cur.unis.map((u) => (u.id === uniId ? { ...u, ...p } : u)) })
    },
    setCommon: (items) => {
      const cur = auto.current.local
      if (!cur) return
      schedule(COMMON_ID, { ...cur, common: items })
    },
    setSubtitle: (v) => {
      const cur = auto.current.local
      if (!cur) return
      setSubtitle(v ?? '')
      schedule('__subtitle', { ...cur, subtitle: v })
    },
  }), [saveState, schedule])

  // Leaving the page with a save still waiting would drop Iana's last edit.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (auto.current.timers.size) e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  /** Finish pending family-view saves, then show the saved (cleaned) data. */
  async function settle() {
    const a = auto.current
    for (const [key, t] of Array.from(a.timers)) { window.clearTimeout(t); runSave(key) }
    await a.queue
    if (a.server) apply(a.server)
  }

  async function switchView(v: View) {
    if (v === view) return
    if (v === 'family' && dirty.current.size && !window.confirm('В форме есть несохранённые изменения. Переключиться без сохранения?')) return
    if (view === 'family') await settle()
    dirty.current.clear()
    setView(v)
    try { localStorage.setItem(VIEW_KEY, v) } catch {}
  }

  // The pinned view switch shows only while this editor is on screen.
  const rootRef = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  async function addUni(seed: Partial<LkUniPublic>) {
    const body = await post('add', { action: 'add', uni: seed })
    const added = body?.lk?.unis?.at(-1)
    if (added) setOpen(added.id)
  }

  return (
    <div ref={rootRef} className="rounded-xl border-2 border-study-orange/30 p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-study-dark">Личный кабинет (сопровождение)</h3>
          <p className="text-xs text-study-gray">Всё, что семья видит на странице «Личный кабинет». Редактировать можно в обоих видах.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lk?.internal?.telegram && (
            <a
              href={lk.internal.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-study-bg text-sm font-semibold text-study-dark"
              title="Закрытый канал студента в Telegram"
            >
              <Send className="w-4 h-4" /> Канал
            </a>
          )}
          <a
            href={`/lk?student=${studentId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-study-bg text-sm font-semibold text-study-dark"
            title="Открыть страницу семьи в новой вкладке (только просмотр)"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* View switch: pinned to the right edge of the screen (bottom on
          phones) while the editor is on screen, so it stays in reach. */}
      {inView && (
        <div
          role="tablist"
          aria-label="Вид редактора"
          className="fixed z-40 bottom-4 left-1/2 -translate-x-1/2 flex gap-1 p-1 rounded-xl bg-study-card card-shadow border border-study-lightgray lg:flex-col lg:bottom-auto lg:left-auto lg:right-2 lg:top-1/2 lg:translate-x-0 lg:-translate-y-1/2"
        >
          {([['form', 'Редактор', PenLine], ['family', 'Семья', Eye]] as const).map(([k, l, Icon]) => (
            <button
              key={k}
              role="tab"
              aria-selected={view === k}
              onClick={() => switchView(k)}
              title={k === 'family' ? 'Как видит семья' : 'Редактор'}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors lg:flex-col lg:gap-1 lg:w-16 lg:px-1 lg:text-[11px] ${view === k ? 'bg-study-brown text-white' : 'text-study-gray hover:text-study-dark hover:bg-study-bg'}`}
            >
              <Icon className="w-4 h-4" /> {l}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-study-red">{error}</p>}
      {!lk && !error && <p className="text-sm text-study-gray">Загрузка…</p>}

      {lk && view === 'family' && (
        <div className={`v2 v2-embed ${display.variable}`}>
          <LkView
            lk={lk}
            studentName={studentName}
            preview={false}
            query={`?student=${encodeURIComponent(studentId)}`}
            admin={adminApi}
            onMove={(uniId, itemId, stage) => {
              if (uniId === COMMON_ID) {
                const common = auto.current.local?.common
                if (common) adminApi.setCommon(common.map((t) => (t.id === itemId ? withStage(t, stage) : t)))
                return
              }
              const u = auto.current.local?.unis.find((x) => x.id === uniId)
              if (u) adminApi.patchUni(uniId, { items: u.items.map((t) => (t.id === itemId ? withStage(t, stage) : t)) })
            }}
          />
        </div>
      )}

      {lk && view === 'form' && (
        <>
          <ProfileBlock studentId={studentId} lk={lk} busy={busy} post={post} onPhoto={(d) => { apply(d); onChanged?.() }} />
          <InternalBlock lk={lk} busy={busy} post={post} />
          <PaymentsBlock lk={lk} busy={busy} post={post} />

          <div className="grid sm:grid-cols-[1fr_auto] gap-2">
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Подпись над именем, например «11 класс · поступление 2027»"
              className="rounded-lg border border-study-lightgray px-3 py-2 text-sm"
            />
            <button
              onClick={() => post('subtitle', { action: 'subtitle', subtitle })}
              disabled={busy !== null || subtitle === (lk.subtitle ?? '')}
              className="px-4 py-2 rounded-lg bg-study-brown text-white text-sm font-semibold disabled:opacity-40"
            >
              Сохранить
            </button>
          </div>

          <CommonBlock lk={lk} busy={busy} post={post} onDirty={(on) => { if (on) dirty.current.add(COMMON_ID); else dirty.current.delete(COMMON_ID) }} />

          <AddUni onAdd={addUni} disabled={busy !== null} existing={lk.unis} />

          <div className="space-y-2">
            {lk.unis.length === 0 && <p className="text-sm text-study-gray">Вузов пока нет. Семья видит «Яна готовит ваш план».</p>}
            {lk.unis.map((u, i) => (
              <UniBlock
                key={u.id}
                u={u}
                isOpen={open === u.id}
                onToggle={() => setOpen((o) => (o === u.id ? null : u.id))}
                first={i === 0}
                last={i === lk.unis.length - 1}
                busy={busy}
                post={post}
                onDirty={(on) => { if (on) dirty.current.add(u.id); else dirty.current.delete(u.id) }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ---------- Iana's card for this student: track, major, photo ---------- */

function ProfileBlock({ studentId, lk, busy, post, onPhoto }: { studentId: string; lk: LkDataPublic; busy: string | null; post: Post; onPhoto: (d: LkDataPublic) => void }) {
  const [track, setTrack] = useState<TrackKey | ''>(lk.profile.track ?? '')
  const [major, setMajor] = useState(lk.profile.major ?? '')
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoErr, setPhotoErr] = useState<string | null>(null)
  const file = useRef<HTMLInputElement>(null)
  useEffect(() => { setTrack(lk.profile.track ?? ''); setMajor(lk.profile.major ?? '') }, [lk.profile.track, lk.profile.major])
  const changed = (track || null) !== lk.profile.track || (major.trim() || null) !== lk.profile.major

  async function photo(f: File | null) {
    setPhotoBusy(true)
    setPhotoErr(null)
    try {
      if (f) await uploadPhoto(studentId, f)
      else {
        const r = await fetch(`/api/admin/lk/${studentId}/photo`, { method: 'DELETE' })
        if (!r.ok) throw new Error('Не удалось удалить фото')
      }
      const r = await fetch(`/api/admin/lk/${studentId}`, { cache: 'no-store' })
      const body = await r.json()
      onPhoto(body.lk)
    } catch (e) {
      setPhotoErr((e as Error).message)
    } finally {
      setPhotoBusy(false)
      if (file.current) file.current.value = ''
    }
  }

  return (
    <section className="rounded-xl bg-study-bg p-3 grid sm:grid-cols-[96px_1fr] gap-3 items-start">
      <div className="space-y-1.5">
        <button
          onClick={() => file.current?.click()}
          disabled={photoBusy}
          className="relative block w-24 h-24 rounded-xl overflow-hidden bg-study-brown/10 group"
          title="Загрузить фото для карточки"
        >
          {lk.profile.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl(studentId, lk.profile.photo)} alt="" className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-6 h-6 text-study-brown/50 absolute inset-0 m-auto" />
          )}
          <span className="absolute inset-x-0 bottom-0 bg-black/55 text-white text-[10px] font-semibold py-0.5 opacity-0 group-hover:opacity-100">{photoBusy ? 'Загрузка…' : 'Сменить'}</span>
        </button>
        {lk.profile.photo && <button onClick={() => photo(null)} disabled={photoBusy} className="text-[11px] font-semibold text-study-red">Удалить фото</button>}
        <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="sr-only" onChange={(e) => photo(e.target.files?.[0] ?? null)} />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold text-study-gray">Карточка студента в списке (видите только вы)</p>
        <div className="grid sm:grid-cols-[180px_1fr_auto] gap-2">
          <select className={input} value={track} onChange={(e) => setTrack(e.target.value as TrackKey | '')} aria-label="Программа">
            <option value="">Программа: не указана</option>
            {TRACKS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <input className={input} value={major} onChange={(e) => setMajor(e.target.value)} placeholder="Специальность, например Business Administration" aria-label="Специальность" />
          <button
            onClick={() => post('profile', { action: 'profile', profile: { track: track || null, major } })}
            disabled={!changed || busy !== null}
            className="px-4 py-2 rounded-lg bg-study-brown text-white text-sm font-semibold disabled:opacity-40"
          >
            Сохранить
          </button>
        </div>
        {photoErr && <p className="text-xs font-semibold text-study-red">{photoErr}</p>}
      </div>
    </section>
  )
}

/* ---------- Iana only: the family's budget and the student's Telegram channel ---------- */

function InternalBlock({ lk, busy, post }: { lk: LkDataPublic; busy: string | null; post: Post }) {
  const saved = { budget: lk.internal?.budget ?? '', telegram: lk.internal?.telegram ?? '', notes: lk.internal?.notes ?? '' }
  const [budget, setBudget] = useState(saved.budget)
  const [telegram, setTelegram] = useState(saved.telegram)
  const [notes, setNotes] = useState(saved.notes)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { setBudget(saved.budget); setTelegram(saved.telegram); setNotes(saved.notes) }, [saved.budget, saved.telegram, saved.notes])
  const changed = budget.trim() !== saved.budget || telegram.trim() !== saved.telegram || notes.trim() !== saved.notes

  async function save() {
    setErr(null)
    const body = await post('internal', { action: 'internal', internal: { budget, telegram, notes } })
    // The server drops a link it can't read as http(s): say so instead of losing it silently.
    if (body?.lk && telegram.trim() && !body.lk.internal?.telegram) setErr('Ссылка не распознана. Нужна ссылка вида https://t.me/+…')
  }

  return (
    <section className="rounded-xl bg-study-bg p-3 space-y-2">
      <p className="text-xs font-semibold text-study-gray"><Lock className="w-3 h-3 inline -mt-0.5" /> Только для вас, семья это не видит</p>
      <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2">
        <label className="text-xs text-study-gray space-y-1">
          <span>Бюджет семьи на обучение</span>
          <input className={input} value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Например, до 40 000 ¥ в год за обучение и общежитие" />
        </label>
        <label className="text-xs text-study-gray space-y-1">
          <span>Закрытый канал студента в Telegram</span>
          <div className="flex gap-2">
            <input className={input} value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="https://t.me/+…" inputMode="url" />
            {saved.telegram && (
              <a href={saved.telegram} target="_blank" rel="noopener noreferrer" className="shrink-0 inline-flex items-center px-3 rounded-lg bg-study-card border border-study-lightgray text-study-dark" title="Открыть канал">
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </label>
        <button onClick={save} disabled={!changed || busy !== null} className="self-end px-4 py-2 rounded-lg bg-study-brown text-white text-sm font-semibold disabled:opacity-40">
          Сохранить
        </button>
      </div>
      <label className="block text-xs text-study-gray space-y-1">
        <span>Заметки</span>
        <textarea
          className={`${input} min-h-[96px] resize-y`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Контакты, родитель, что уточнить, какие вузы ещё посмотреть"
        />
      </label>
      {err && <p className="text-xs font-semibold text-study-red">{err}</p>}
    </section>
  )
}

/* ---------- сопровождение payments: the family sees this block ---------- */

type PayDraft = { id: string; date: string | null; amount: string; note: string }
const toDraft = (e: LkPayment): PayDraft => ({ id: e.id, date: e.date, amount: String(e.amount), note: e.note ?? '' })
const rubNum = (v: string) => { const n = Number(v.replace(/[\s ₽]/g, '').replace(',', '.')); return Number.isFinite(n) && n > 0 ? Math.round(n) : null }

function PaymentsBlock({ lk, busy, post }: { lk: LkDataPublic; busy: string | null; post: Post }) {
  const savedKey = JSON.stringify(lk.payments)
  const [total, setTotal] = useState(lk.payments.total === null ? '' : String(lk.payments.total))
  const [due, setDue] = useState<string | null>(lk.payments.due)
  const [rows, setRows] = useState<PayDraft[]>(() => lk.payments.entries.map(toDraft))
  useEffect(() => {
    const p = JSON.parse(savedKey) as LkDataPublic['payments']
    setTotal(p.total === null ? '' : String(p.total))
    setDue(p.due)
    setRows(p.entries.map(toDraft))
  }, [savedKey])

  const draft = {
    total: total.trim() ? rubNum(total) ?? (Number(total) === 0 ? 0 : null) : null,
    due,
    entries: rows.map((r) => ({ id: r.id, date: r.date, amount: rubNum(r.amount), note: r.note.trim() || null })),
  }
  const bad = (total.trim() !== '' && draft.total === null) || draft.entries.some((e) => e.amount === null)
  const changed = JSON.stringify(draft) !== JSON.stringify({ total: lk.payments.total, due: lk.payments.due, entries: lk.payments.entries.map((e) => ({ id: e.id, date: e.date, amount: e.amount, note: e.note })) })
  const sum = paymentsSummary({ total: draft.total, due, entries: draft.entries.filter((e): e is LkPayment => e.amount !== null) })
  const upd = (id: string, p: Partial<PayDraft>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)))

  return (
    <section className="rounded-xl bg-study-bg p-3 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <p className="text-sm font-bold text-study-dark inline-flex items-center gap-1.5"><Wallet className="w-4 h-4" /> Оплата сопровождения <span className="text-xs font-semibold text-study-gray">· семья видит этот блок</span></p>
        <p className="text-xs font-semibold text-study-gray">
          Оплачено {rub(sum.paid)}
          {sum.left !== null && <> · {sum.left >= 0 ? <span className={sum.left > 0 ? 'text-study-orange' : 'text-study-green'}>осталось {rub(sum.left)}</span> : <span className="text-study-red">переплата {rub(-sum.left)}</span>}</>}
        </p>
      </div>
      <div className="grid sm:grid-cols-[240px_200px] gap-2">
        <label className="block text-xs text-study-gray space-y-1">
          <span>Стоимость сопровождения, ₽</span>
          <input className={input} value={total} onChange={(e) => setTotal(e.target.value)} placeholder="Например, 350 000" inputMode="numeric" />
        </label>
        <div className="text-xs text-study-gray space-y-1">
          <span className="block">Оплатить до (видит семья)</span>
          <DatePicker value={due} onChange={setDue} placeholder="Дата" />
        </div>
      </div>

      <div className="space-y-2">
        {rows.length > 0 && <p className="text-xs text-study-gray">Платежи</p>}
        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[170px_160px_1fr_auto] gap-2 items-center">
            <DatePicker value={r.date} onChange={(v) => upd(r.id, { date: v })} placeholder="Дата" />
            <input className={`${input} ${rubNum(r.amount) === null ? 'border-study-red' : ''}`} value={r.amount} onChange={(e) => upd(r.id, { amount: e.target.value })} placeholder="Сумма, ₽" inputMode="numeric" aria-label="Сумма" />
            <input className={`${input} col-span-1`} value={r.note} onChange={(e) => upd(r.id, { note: e.target.value })} placeholder="Комментарий: «1-й платёж», «перевод на карту»" aria-label="Комментарий" />
            <button onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))} className="p-2 rounded-lg text-study-red hover:bg-study-red/10" aria-label="Удалить платёж"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setRows((rs) => [...rs, { id: newId(), date: new Date().toLocaleDateString('sv-SE'), amount: '', note: '' }])}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-study-card border border-study-lightgray text-sm font-semibold"
        >
          <Plus className="w-4 h-4" /> Платёж
        </button>
        <button
          onClick={() => post('payments', { action: 'payments', payments: draft })}
          disabled={!changed || bad || busy !== null}
          className="px-4 py-2 rounded-lg bg-study-brown text-white text-sm font-semibold disabled:opacity-40"
        >
          Сохранить оплату
        </button>
        {bad && <span className="text-xs font-semibold text-study-red">Проверьте суммы: только числа больше нуля</span>}
      </div>
    </section>
  )
}

/* ---------- add a university: our database first, free text as fallback ---------- */

function AddUni({ onAdd, disabled, existing }: { onAdd: (seed: Partial<LkUniPublic>) => void; disabled: boolean; existing: LkUniPublic[] }) {
  const [catalog, setCatalog] = useState<CatalogUni[] | null>(null)
  const [q, setQ] = useState('')
  const [focus, setFocus] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/admin/lk/catalog', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { universities: [] }))
      .then((d) => setCatalog(d.universities ?? []))
      .catch(() => setCatalog([]))
  }, [])

  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setFocus(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const hits = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s || !catalog) return []
    return catalog.filter((u) => [u.name, u.nameRu, u.nameCn, u.city].some((v) => v?.toLowerCase().includes(s))).slice(0, 8)
  }, [q, catalog])

  const taken = (name: string) => existing.some((u) => u.name.toLowerCase() === name.toLowerCase())

  function pick(u: CatalogUni) {
    onAdd({ ref: { kind: u.kind, key: u.key }, short: u.name, name: u.name, nameCn: u.nameCn, city: u.city, country: 'Китай', tone: u.tone ?? 'navy', art: u.art ?? null })
    setQ('')
    setFocus(false)
  }
  function addFree() {
    const name = q.trim()
    if (!name) return
    onAdd({ ref: { kind: 'free', key: null }, short: name, name, country: 'Китай' })
    setQ('')
    setFocus(false)
  }

  return (
    <div ref={box} className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-study-lightgray px-3 py-2 bg-study-card">
        <Search className="w-4 h-4 text-study-gray shrink-0" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setFocus(true) }}
          onFocus={() => setFocus(true)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (hits[0]) pick(hits[0]); else addFree() } }}
          placeholder={catalog ? 'Добавить вуз: начните вводить название' : 'Загрузка списка вузов…'}
          className="flex-1 text-sm bg-transparent outline-none"
          disabled={disabled}
        />
      </div>
      {focus && q.trim() && (
        <div className="absolute z-20 left-0 right-0 mt-1 rounded-lg border border-study-lightgray bg-study-card shadow-lg overflow-hidden">
          {hits.map((u) => (
            <button key={`${u.kind}:${u.key}`} onClick={() => pick(u)} className="w-full text-left px-3 py-2 text-sm hover:bg-study-bg flex items-center justify-between gap-2">
              <span className="min-w-0">
                <span className="font-semibold text-study-dark">{u.name}</span>
                {u.nameCn && <span className="text-study-gray"> · {u.nameCn}</span>}
                {u.city && <span className="text-study-gray"> · {u.city}</span>}
              </span>
              <span className="text-[11px] text-study-gray shrink-0">
                {taken(u.name) ? 'уже в плане · ' : ''}{u.kind === 'sync' ? 'наша база' : 'каталог'}
              </span>
            </button>
          ))}
          <button onClick={addFree} className="w-full text-left px-3 py-2 text-sm hover:bg-study-bg border-t border-study-lightgray text-study-brown font-semibold">
            <Plus className="w-4 h-4 inline -mt-0.5" /> Добавить «{q.trim()}» вручную
          </button>
        </div>
      )}
    </div>
  )
}


/* ---------- one university ---------- */

type Post = (label: string, payload: Record<string, unknown>) => Promise<{ lk?: LkDataPublic; password?: string | null } | null>

const today = () => new Date().toLocaleDateString('sv-SE')
const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)
const input = 'rounded-lg border border-study-lightgray px-3 py-2 text-sm w-full bg-study-card'
const label = 'block text-xs font-semibold text-study-gray mb-1'
const TONE_LABEL: Record<Tone, string> = { navy: 'Синий', coral: 'Коралловый', cream: 'Кремовый', tint: 'Сиреневый' }
const newItem = (group: GroupKey, text = '', stage: string = firstStage(group), note: string | null = null): LkItem => ({ id: newId(), group, text, owner: 'student', stage, done: stage === 'done', start: null, due: null, note, comment: null, done_at: null })

function UniBlock({ u, isOpen, onToggle, first, last, busy, post, onDirty }: {
  u: LkUniPublic
  isOpen: boolean
  onToggle: () => void
  first: boolean
  last: boolean
  busy: string | null
  post: Post
  onDirty: (dirty: boolean) => void
}) {
  const p = progressOf(u)
  return (
    <div className="rounded-xl bg-study-bg">
      <div className="flex items-center gap-2 p-3">
        <button onClick={onToggle} className="flex-1 min-w-0 flex items-center gap-3 text-left">
          <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          <span className="min-w-0">
            <span className="block font-bold text-study-dark truncate">{u.short}</span>
            <span className="block text-xs text-study-gray truncate">
              {STATUS_LABEL[u.status]} · готово {p.done}/{p.total}
              {u.deadline.date ? ` · ${u.deadline.label}: ${u.deadline.date}` : ''}
              {u.ref.kind === 'free' ? ' · добавлен вручную' : ''}
            </span>
          </span>
        </button>
        <button onClick={() => post('move', { action: 'move', id: u.id, dir: -1 })} disabled={first || busy !== null} className="p-1.5 rounded-lg hover:bg-study-card disabled:opacity-30" aria-label="Выше"><ArrowUp className="w-4 h-4" /></button>
        <button onClick={() => post('move', { action: 'move', id: u.id, dir: 1 })} disabled={last || busy !== null} className="p-1.5 rounded-lg hover:bg-study-card disabled:opacity-30" aria-label="Ниже"><ArrowDown className="w-4 h-4" /></button>
        <button
          onClick={() => { if (window.confirm(`Удалить ${u.short} из кабинета? Чек-лист, комментарии и пароль портала будут удалены.`)) post('delete', { action: 'delete', id: u.id }) }}
          disabled={busy !== null}
          className="p-1.5 rounded-lg hover:bg-study-card text-study-red disabled:opacity-30"
          aria-label="Удалить вуз"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {isOpen && <UniForm u={u} busy={busy} post={post} onDirty={onDirty} />}
    </div>
  )
}

function UniForm({ u, busy, post, onDirty }: { u: LkUniPublic; busy: string | null; post: Post; onDirty: (dirty: boolean) => void }) {
  const [d, setD] = useState<LkUniPublic>(u)
  // Reload the draft only when this university was saved, not when another
  // one is moved or deleted, so an open form keeps its unsaved edits.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setD(u), [u.updated_at])
  const [pw, setPw] = useState('')
  const [clearPw, setClearPw] = useState(false)
  const [revealed, setRevealed] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const dirty = JSON.stringify(d) !== JSON.stringify(u) || pw !== '' || clearPw
  useEffect(() => { onDirty(dirty); return () => onDirty(false) }, [dirty, onDirty])
  const set = <K extends keyof LkUniPublic>(k: K, v: LkUniPublic[K]) => setD((x) => ({ ...x, [k]: v }))

  async function save() {
    const payload: Record<string, unknown> = { action: 'save', uni: d, base: u }
    if (clearPw) payload.password = ''
    else if (pw) payload.password = pw
    const body = await post('save', payload)
    if (body?.lk) {
      setSaved(true)
      setPw('')
      setClearPw(false)
      setRevealed(null)
    }
  }

  async function reveal() {
    const body = await post('reveal', { action: 'password', id: u.id })
    if (body && 'password' in body) setRevealed(body.password ?? '')
  }

  return (
    <div className="px-3 pb-4 space-y-5">
      {/* status + comment: what the family reads first */}
      <section className="grid sm:grid-cols-[220px_1fr] gap-3">
        <Field l="Статус заявки">
          <select className={input} value={d.status} onChange={(e) => set('status', e.target.value as AppStatus)}>
            {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </Field>
        <Field l="Комментарий Яны (видит семья)">
          <textarea
            className={`${input} min-h-[64px] resize-y`}
            value={d.comment?.text ?? ''}
            onChange={(e) => set('comment', e.target.value ? { text: e.target.value, at: today() } : null)}
            placeholder="Что сейчас важно по этому вузу"
          />
        </Field>
      </section>

      {/* university: «Университеты» sheet */}
      <section className="grid sm:grid-cols-2 gap-3">
        <Field l="Короткое название (на кнопке)"><input className={input} value={d.short} onChange={(e) => set('short', e.target.value)} placeholder="HITSZ, TJU…" /></Field>
        <Field l="Полное название"><input className={input} value={d.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field l="Название на китайском"><input className={input} value={d.nameCn ?? ''} onChange={(e) => set('nameCn', e.target.value || null)} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field l="Страна"><input className={input} value={d.country} onChange={(e) => set('country', e.target.value)} /></Field>
          <Field l="Город"><input className={input} value={d.city} onChange={(e) => set('city', e.target.value)} /></Field>
        </div>
        <Field l="Программа"><input className={input} value={d.program} onChange={(e) => set('program', e.target.value)} placeholder="Business Administration" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field l="Язык обучения"><input className={input} value={d.language} onChange={(e) => set('language', e.target.value)} placeholder="Английский" /></Field>
          <Field l="Рейтинг в Китае"><input className={input} value={d.rankChina ?? ''} onChange={(e) => set('rankChina', e.target.value || null)} placeholder="12" /></Field>
        </div>
        <Field l="Сайт программы"><input className={input} value={d.website ?? ''} onChange={(e) => set('website', e.target.value || null)} placeholder="https://…" /></Field>
        <Field l="Цвет обложки">
          <select className={input} value={d.tone} onChange={(e) => set('tone', e.target.value as Tone)}>
            {TONES.map((t) => <option key={t} value={t}>{TONE_LABEL[t]}</option>)}
          </select>
        </Field>
      </section>

      {/* application window, money */}
      <section className="grid sm:grid-cols-[180px_1fr_180px] gap-3">
        <Field l="Приём заявок открывается"><DatePicker value={d.opens} onChange={(v) => set('opens', v)} placeholder="Не указано" /></Field>
        <Field l="Дедлайн: как называется"><input className={input} value={d.deadline.label} onChange={(e) => set('deadline', { ...d.deadline, label: e.target.value })} placeholder="Дедлайн подачи" /></Field>
        <Field l="Дата дедлайна"><DatePicker value={d.deadline.date} onChange={(v) => set('deadline', { ...d.deadline, date: v })} /></Field>
        <Field l="Стоимость"><input className={input} value={d.cost ?? ''} onChange={(e) => set('cost', e.target.value || null)} placeholder="35 000 ¥" /></Field>
        <Field l="Стипендии (каждая с новой строки)" wide>
          <textarea
            className={`${input} min-h-[64px] resize-y`}
            value={d.scholarships.join('\n')}
            onChange={(e) => set('scholarships', e.target.value.split('\n'))}
            onBlur={() => set('scholarships', d.scholarships.map((s) => s.trim()).filter(Boolean))}
            placeholder={'Guangdong Government Scholarship\nUniversity Scholarship'}
          />
        </Field>
      </section>

      {/* portal */}
      <section className="rounded-xl bg-study-card p-3 space-y-3">
        <h4 className="text-sm font-bold text-study-dark">Портал для подачи: доступ для студента</h4>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field l="Ссылка на портал"><input className={input} value={d.portal.url ?? ''} onChange={(e) => set('portal', { ...d.portal, url: e.target.value || null })} placeholder="https://…" /></Field>
          <Field l="Логин"><input className={input} value={d.portal.login ?? ''} onChange={(e) => set('portal', { ...d.portal, login: e.target.value || null })} autoComplete="off" /></Field>
          <Field l={u.portal.hasPassword ? 'Пароль (сохранён; введите новый, чтобы заменить)' : 'Пароль'}>
            <input
              className={input}
              type="text"
              value={pw}
              onChange={(e) => { setPw(e.target.value); setClearPw(false) }}
              placeholder={u.portal.hasPassword ? (clearPw ? 'Будет удалён при сохранении' : '••••••••') : 'Пароль от портала'}
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
          <div className="flex items-end gap-2 flex-wrap">
            {u.portal.hasPassword && !clearPw && (
              <button onClick={revealed === null ? reveal : () => setRevealed(null)} disabled={busy !== null} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-study-bg text-sm font-semibold">
                <Eye className="w-4 h-4" /> {revealed === null ? 'Показать сохранённый' : 'Скрыть'}
              </button>
            )}
            {u.portal.hasPassword && (
              <button onClick={() => { setClearPw((c) => !c); setPw('') }} className="px-3 py-2 rounded-lg bg-study-bg text-sm font-semibold text-study-red">
                {clearPw ? 'Не удалять' : 'Удалить пароль'}
              </button>
            )}
            {revealed !== null && <code className="px-2 py-1 rounded bg-study-bg text-sm">{revealed || '(пусто)'}</code>}
          </div>
          <Field l="Пояснение для семьи" wide>
            <input className={input} value={d.portal.note ?? ''} onChange={(e) => set('portal', { ...d.portal, note: e.target.value || null })} placeholder="Например: аккаунт создан на почту студента" />
          </Field>
        </div>
        <p className="text-[11px] text-study-gray">Пароль хранится в зашифрованном виде. Семья видит его только по кнопке «Показать».</p>
      </section>

      <ChecklistEditor items={d.items} onChange={(items) => set('items', items)} starter={STARTER_UNI} />

      {/* contacts (family sees) and internal notes (admin only) */}
      <section className="grid sm:grid-cols-2 gap-3">
        <Field l="Контакты приёмной комиссии (видит семья)">
          <textarea className={`${input} min-h-[80px] resize-y`} value={d.contacts ?? ''} onChange={(e) => set('contacts', e.target.value || null)} placeholder={'Tel: …\nEmail: …'} />
        </Field>
        <label className="block">
          <span className={`${label} inline-flex items-center gap-1`}><Lock className="w-3 h-3" /> Заметки Яны (только в админке)</span>
          <textarea
            className={`${input} min-h-[80px] resize-y bg-study-orange/5 border-study-orange/30`}
            value={d.notes_internal ?? ''}
            onChange={(e) => set('notes_internal', e.target.value || null)}
            placeholder="Что перепроверить, вопросы к вузу…"
          />
        </label>
      </section>

      {/* sources */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-study-dark">Первоисточники</h4>
          <button onClick={() => set('sources', [...d.sources, { id: newId(), label: '', url: '', checked: today() }])} className="text-sm font-semibold text-study-brown inline-flex items-center gap-1"><Plus className="w-4 h-4" /> Источник</button>
        </div>
        {d.sources.map((s) => {
          const upd = (patch: Partial<typeof s>) => set('sources', d.sources.map((x) => (x.id === s.id ? { ...x, ...patch } : x)))
          return (
            <div key={s.id} className="grid sm:grid-cols-[1fr_1.3fr_160px_auto] gap-2">
              <input className={input} value={s.label} onChange={(e) => upd({ label: e.target.value })} placeholder="Admission guide" />
              <input className={input} value={s.url} onChange={(e) => upd({ url: e.target.value })} placeholder="https://…" />
              <DatePicker value={s.checked} onChange={(v) => upd({ checked: v })} title="Дата проверки" placeholder="Проверено" />
              <RemoveBtn onClick={() => set('sources', d.sources.filter((x) => x.id !== s.id))} />
            </div>
          )
        })}
      </section>

      <div className="sticky bottom-2 flex items-center justify-end gap-3 rounded-xl bg-study-card/95 backdrop-blur p-2 shadow">
        {saved && !dirty && <span className="text-sm text-study-green font-semibold">Сохранено</span>}
        {dirty && <span className="text-sm text-study-orange font-semibold">Есть несохранённые изменения</span>}
        {dirty && <button onClick={() => { setD(u); setPw(''); setClearPw(false) }} className="px-3 py-2 rounded-lg bg-study-bg text-sm font-semibold">Отменить</button>}
        <button onClick={save} disabled={!dirty || busy !== null} className="px-4 py-2 rounded-lg bg-study-brown text-white text-sm font-semibold disabled:opacity-40">
          {busy === 'save' ? 'Сохраняю…' : `Сохранить ${d.short}`}
        </button>
      </div>
    </div>
  )
}

/* ---------- the common checklist, shared by every university ---------- */

function CommonBlock({ lk, busy, post, onDirty }: { lk: LkDataPublic; busy: string | null; post: Post; onDirty: (dirty: boolean) => void }) {
  const [items, setItems] = useState(lk.common)
  const [saved, setSaved] = useState(false)
  useEffect(() => { setItems(lk.common) }, [lk.common])
  const dirty = JSON.stringify(items) !== JSON.stringify(lk.common)
  useEffect(() => { onDirty(dirty) }, [dirty, onDirty])

  async function save() {
    const body = await post('common', { action: 'common', items, base: lk.common })
    if (body?.lk) setSaved(true)
  }

  return (
    <div className="rounded-xl bg-study-bg p-4 space-y-3">
      <div>
        <h4 className="text-sm font-bold text-study-dark">Общие документы</h4>
        <p className="text-[11px] text-study-gray">То, что нужно для всех вузов сразу: паспорт, экзамены, аттестат. У семьи этот список стоит слева, а справа документы выбранного вуза. В чек-листе вуза оставьте только то, что просит именно он.</p>
      </div>
      <ChecklistEditor items={items} onChange={(next) => { setItems(next); setSaved(false) }} starter={STARTER_COMMON} starterDocs />
      <div className="flex items-center justify-end gap-3">
        {saved && !dirty && <span className="text-sm text-study-green font-semibold">Сохранено</span>}
        {dirty && <span className="text-sm text-study-orange font-semibold">Есть несохранённые изменения</span>}
        {dirty && <button onClick={() => setItems(lk.common)} className="px-3 py-2 rounded-lg bg-study-card text-sm font-semibold">Отменить</button>}
        <button onClick={save} disabled={!dirty || busy !== null} className="px-4 py-2 rounded-lg bg-study-brown text-white text-sm font-semibold disabled:opacity-40">
          {busy === 'common' ? 'Сохраняю…' : 'Сохранить общие документы'}
        </button>
      </div>
    </div>
  )
}

/* ---------- checklist: Iana's «План действий» (common, or one university's) ---------- */

function ChecklistEditor({ items, onChange, starter, starterDocs }: {
  items: LkItem[]
  onChange: (items: LkItem[]) => void
  /** What «Типовой список» puts on an empty list. */
  starter: { group: GroupKey; text: string; note?: string }[]
  starterDocs?: boolean
}) {
  const [paste, setPaste] = useState<{ group: GroupKey; text: string } | null>(null)
  const done = items.filter((i) => i.done).length

  function addPasted() {
    if (!paste) return
    const lines = paste.text.split('\n').map((l) => l.trim()).filter(Boolean)
    onChange([...items, ...lines.map((l) => newItem(paste.group, l))])
    setPaste(null)
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-study-dark">Чек-лист для подачи <span className="text-study-gray font-semibold">· готово {done}/{items.length}</span></h4>
          <p className="text-[11px] text-study-gray">Экзаменам ставьте статус, остальные карточки перетаскивайте между этапами. Семья двигает свои карточки сама; карточки «Яна» двигаете только вы. Нажмите на владельца, чтобы сменить его.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {items.length === 0 && (
            <button onClick={() => onChange(starter.map((s) => newItem(s.group, s.text, undefined, s.note ?? null)))} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-study-bg text-sm font-semibold">
              <ListPlus className="w-4 h-4" /> Типовой список
            </button>
          )}
          <button onClick={() => setPaste((p) => (p ? null : { group: 'collect', text: '' }))} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-study-bg text-sm font-semibold">
            <ClipboardPaste className="w-4 h-4" /> Вставить списком
          </button>
        </div>
      </div>

      {paste && (
        <div className="rounded-xl bg-study-card p-3 space-y-2">
          <p className="text-xs text-study-gray">Вставьте список, например колонку «Список документов» из таблицы: каждая строка станет карточкой в первом этапе.</p>
          <div className="grid sm:grid-cols-[200px_1fr] gap-2">
            <select className={input} value={paste.group} onChange={(e) => setPaste({ ...paste, group: e.target.value as GroupKey })}>
              {GROUPS.map((g) => <option key={g.key} value={g.key}>{g.title}{g.hint ? `: ${g.hint.toLowerCase()}` : ''}</option>)}
            </select>
            <textarea autoFocus className={`${input} min-h-[110px] resize-y`} value={paste.text} onChange={(e) => setPaste({ ...paste, text: e.target.value })} placeholder={'Passport\nStudy Certificate\nTranscript'} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setPaste(null)} className="px-3 py-2 rounded-lg bg-study-bg text-sm font-semibold">Отмена</button>
            <button onClick={addPasted} disabled={!paste.text.trim()} className="px-3 py-2 rounded-lg bg-study-brown text-white text-sm font-semibold disabled:opacity-40">
              Добавить {paste.text.split('\n').filter((l) => l.trim()).length || ''}
            </button>
          </div>
        </div>
      )}

      {/* The same board the family sees, in edit mode (v2 styles, scoped). */}
      <div className={`v2 v2-embed ${display.variable}`}>
        <LkBoard
          items={items}
          canMove={() => true}
          onMove={(id, stage) => onChange(items.map((t) => (t.id === id ? withStage(t, stage) : t)))}
          edit={onChange}
          showEmpty
          starterDocs={starterDocs}
        />
      </div>
    </section>
  )
}

function Field({ l, wide, children }: { l: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${wide ? 'sm:col-span-2' : ''}`}>
      <span className={label}>{l}</span>
      {children}
    </label>
  )
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="p-2 rounded-lg hover:bg-study-bg text-study-red justify-self-start" aria-label="Удалить">
      <X className="w-4 h-4" />
    </button>
  )
}
