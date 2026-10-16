'use client'

/**
 * v2 «Личный кабинет» (сопровождение).
 *
 * One family account (student + parents). The page is about the universities
 * Iana chose with the family: pick one with the buttons on top, and see where
 * its application stands, what is ready and what is left. Exams are a list
 * with a status; documents, letters and the rest are pipeline boards whose
 * cards move from stage to stage. Done = every card in its last stage.
 *
 * `LkPage` loads /api/lk for the family. `LkView` is the page itself; the
 * admin renders it too («Как видит семья»), with `admin` set, so Iana edits
 * right in the family's layout. A consultant opening /v2/lk?student=<id>
 * gets a read-only preview.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { ArrowUpRight, CalendarClock, Check, Copy, Eye, EyeOff, Globe, KeyRound, MessageCircle, Phone, ShieldCheck } from 'lucide-react'
import DatePicker from '@/components/DatePicker'
import { paymentsSummary, progressOf, rub, STATUS_LABEL, STATUSES, withStage, type AppStatus, type LkDataPublic, type LkItem, type LkPayments, type LkUniPublic } from '@/lib/lk/types'
import { plural } from './plural'
import LkBoard from './lkBoard'

const EASE = [0.16, 1, 0.3, 1] as const
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const thisYear = () => new Date().getFullYear()
/** «20 мая», with the year when it isn't the current one. */
const day = (ymd: string) => {
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}${y !== thisYear() ? ` ${y}` : ''}`
}
const todayYmd = () => new Date().toLocaleDateString('sv-SE')
const daysTo = (ymd: string) => Math.round((new Date(`${ymd}T00:00:00`).getTime() - new Date(`${todayYmd()}T00:00:00`).getTime()) / 86400000)
const daysWord = (n: number) => `${n} ${plural(n, 'день', 'дня', 'дней')}`
const untilWord = (n: number) => (n > 0 ? `через ${daysWord(n)}` : n === 0 ? 'сегодня' : `${daysWord(-n)} назад`)
const isExam = (g: string) => g === 'exams'

/** Where the application window stands today, in one line. */
function windowLine(u: LkUniPublic): { text: string; hot: boolean } | null {
  if (u.opens && daysTo(u.opens) > 0) return { text: `Приём заявок откроется ${day(u.opens)}, ${untilWord(daysTo(u.opens))}`, hot: false }
  if (!u.deadline.date) return null
  const left = daysTo(u.deadline.date)
  if (left < 0) return { text: `${u.deadline.label}: ${day(u.deadline.date)}, прошёл`, hot: false }
  return { text: `${u.deadline.label}: ${day(u.deadline.date)}, ${untilWord(left)}`, hot: left <= 30 }
}

type Loaded = { preview: boolean; demo?: boolean; student: { id: string; fullName: string }; lk: LkDataPublic }

const IANA_TG = 'https://t.me/ianamedvedeva'

/* =====================================================================
   The family's page: loads its ЛК and saves the family's own card moves.
   ===================================================================== */
export default function LkPage() {
  const [data, setData] = useState<Loaded | null>(null)
  const [error, setError] = useState<{ text: string; code?: string } | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const student = new URLSearchParams(window.location.search).get('student')
    const q = student ? `?student=${encodeURIComponent(student)}` : ''
    setQuery(q)
    fetch(`/api/lk${q}`, { credentials: 'same-origin' })
      .then(async (r) => {
        const d = await r.json().catch(() => null)
        if (!r.ok) throw Object.assign(new Error(d?.error ?? 'Не удалось загрузить кабинет'), { code: d?.code })
        setData(d)
      })
      .catch((e) => setError({ text: e.message, code: e.code }))
  }, [])

  // Moves: the card jumps at once; the server gets only the final stage after
  // a short pause, so quick back-and-forth sends one request. Per card at most
  // one request is in flight: a change made meanwhile is sent after it
  // returns, so a slow connection can't apply them out of order. Replies never
  // replace the page; a failure puts the card back where it was saved.
  const moves = useRef(new Map<string, { timer?: number; busy: boolean; want: string; saved: string }>())
  const [moveError, setMoveError] = useState<string | null>(null)

  const setStage = useCallback(
    (uniId: string, itemId: string, stage: string) =>
      setData((d) => d && { ...d, lk: { ...d.lk, unis: d.lk.unis.map((u) => (u.id !== uniId ? u : { ...u, items: u.items.map((t) => (t.id === itemId ? withStage(t, stage) : t)) })) } }),
    [],
  )

  const flush = useCallback(
    async (uniId: string, itemId: string) => {
      const m = moves.current.get(`${uniId}:${itemId}`)
      if (!m || m.busy || m.want === m.saved) return
      m.busy = true
      const v = m.want
      const r = await fetch('/api/lk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'stage', uniId, itemId, stage: v }) }).catch(() => null)
      m.busy = false
      if (r?.ok) {
        m.saved = v
        void flush(uniId, itemId) // the family may have moved it again meanwhile
      } else if (m.want === v) {
        m.want = m.saved
        setStage(uniId, itemId, m.saved)
        setMoveError('Изменение не сохранилось: нет связи с сервером. Попробуйте ещё раз.')
      } else {
        void flush(uniId, itemId)
      }
    },
    [setStage],
  )

  const move = useCallback(
    (uniId: string, itemId: string, stage: string) => {
      if (!data || data.preview) return
      // Demo (no сопровождение): cards move on screen only, nothing is saved.
      if (data.demo) { setStage(uniId, itemId, stage); return }
      const item = data.lk.unis.find((u) => u.id === uniId)?.items.find((t) => t.id === itemId)
      if (!item || item.owner === 'iana' || item.stage === stage) return
      const key = `${uniId}:${itemId}`
      const m = moves.current.get(key) ?? { busy: false, want: item.stage, saved: item.stage }
      moves.current.set(key, m)
      m.want = stage
      setStage(uniId, itemId, stage)
      setMoveError(null)
      window.clearTimeout(m.timer)
      m.timer = window.setTimeout(() => void flush(uniId, itemId), 450)
    },
    [data, setStage, flush],
  )

  if (error) {
    return (
      <div className="v2-lk-empty">
        <h1>{error.code === 'choose_student' ? 'Личный кабинет студента' : 'Кабинет не загрузился'}</h1>
        <p>{error.code === 'choose_student' ? 'Вы вошли как консультант. Откройте кабинет нужного студента из админки: «Открыть глазами студента».' : error.text}</p>
      </div>
    )
  }
  if (!data) return <div className="v2-lk-loading" aria-label="Загрузка" />

  return <LkView lk={data.lk} studentName={data.student.fullName} preview={data.preview} demo={!!data.demo} query={query} onMove={move} moveError={moveError} />
}

/* =====================================================================
   The page itself. With `admin`, every visible field is editable.
   ===================================================================== */

export type LkAdminApi = {
  /** Change one university (status, comment, facts, items…). Saved by the caller. */
  patchUni: (uniId: string, patch: Partial<LkUniPublic>) => void
  setSubtitle: (s: string | null) => void
  /** Shown in the bar on top: «Сохраняю…», «Сохранено», an error. */
  saveState: string | null
}

export function LkView({ lk, studentName, preview, demo = false, query, onMove, moveError, admin }: {
  lk: LkDataPublic
  studentName: string
  preview: boolean
  /** A student without сопровождение: example data, an offer on top. */
  demo?: boolean
  /** `?student=<id>` for a consultant, '' for the family: used to reveal portal passwords. */
  query: string
  onMove: (uniId: string, itemId: string, stage: string) => void
  moveError?: string | null
  admin?: LkAdminApi
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const unis = lk.unis
  const active = unis.find((u) => u.id === activeId) ?? unis[0] ?? null
  const yourTurn = unis.flatMap((u) => u.items.filter((t) => !t.done && t.owner !== 'iana'))
  const nearest = unis.filter((u) => u.deadline.date && daysTo(u.deadline.date) >= 0).sort((a, b) => (a.deadline.date! < b.deadline.date! ? -1 : 1))[0]
  const canMove = (t: LkItem) => !!admin || (!preview && t.owner !== 'iana')
  const patch = admin && active ? (p: Partial<LkUniPublic>) => admin.patchUni(active.id, p) : undefined
  const pipelineItems = active?.items.filter((t) => !isExam(t.group)) ?? []

  return (
    <LayoutGroup>
      {admin ? (
        <div className="v2-preview-bar is-admin" role="status">
          Вид семьи, режим редактирования: изменения сохраняются сразу.{admin.saveState && <b> {admin.saveState}</b>}
        </div>
      ) : (
        preview && <div className="v2-preview-bar" role="status">Просмотр глазами студента: так кабинет видит семья. Изменения здесь не сохраняются.</div>
      )}
      {!admin && (
        <div className="v2-top">
          <div className="v2-today"><b>Сопровождение</b> · Личный кабинет</div>
          <a className="v2-cab-tg" href={IANA_TG} target="_blank" rel="noopener noreferrer">
            <MessageCircle aria-hidden /> Написать Яне
          </a>
        </div>
      )}
      {demo && (
        <section className="v2-lk-demo" role="note">
          <div>
            <b>Эта страница только для студентов на сопровождении</b>
            <p>Ниже демо-версия: так выглядел бы ваш личный кабинет. Яна ведёт каждый вуз из вашего списка, а вы видите, что уже готово, что осталось и где сейчас заявка.</p>
          </div>
          <a className="v2-lk-demo-go" href={IANA_TG} target="_blank" rel="noopener noreferrer">
            Узнать о сопровождении <ArrowUpRight aria-hidden />
          </a>
        </section>
      )}

      <div className="v2-grid">
        {/* Hero: who, and the three things a family checks first */}
        <motion.section className="v2-card v2-lk-hero span-12" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
          <div className="v2-lk-hero-top">
            <div>
              {admin ? (
                <input
                  className="v2-lk-edit lbl"
                  value={lk.subtitle ?? ''}
                  onChange={(e) => admin.setSubtitle(e.target.value || null)}
                  placeholder="Подпись над именем: «11 класс · поступление 2027»"
                />
              ) : (
                lk.subtitle && <div className="lbl">{lk.subtitle}</div>
              )}
              <h1>{studentName}</h1>
              {lk.updated_at && <p className="where">Яна обновила кабинет {day(lk.updated_at.slice(0, 10))}</p>}
              <PayLine p={lk.payments} />
            </div>
            <div className="v2-lk-ia" aria-hidden>Я</div>
          </div>
          <div className="v2-lk-stats">
            <div>
              <b className="num">{unis.length}</b>
              <span>{plural(unis.length, 'вуз', 'вуза', 'вузов')} в плане</span>
            </div>
            <div>
              <b className="num">{nearest ? daysWord(daysTo(nearest.deadline.date!)) : '—'}</b>
              <span>{nearest ? `до ближайшего дедлайна: ${nearest.short}, ${day(nearest.deadline.date!)}` : 'ближайших дедлайнов пока нет'}</span>
            </div>
            <div className={yourTurn.length ? 'is-hot' : ''}>
              <b className="num">{yourTurn.length}</b>
              <span>{plural(yourTurn.length, 'пункт', 'пункта', 'пунктов')} на вашей стороне</span>
            </div>
          </div>
        </motion.section>

        {!active && (
          <section className="v2-card v2-lk-none span-12">
            <h2>Яна готовит ваш план</h2>
            <p>{admin ? 'Добавьте первый вуз в режиме «Редактор».' : 'Здесь появятся вузы, которые вы выбрали вместе с Яной, и по каждому: что уже готово, что осталось и где сейчас заявка.'}</p>
          </section>
        )}

        {active && (
          <>
            {/* University buttons */}
            <div className="v2-lk-switch span-12" role="tablist" aria-label="Вузы">
              {unis.map((u, i) => {
                const p = progressOf(u)
                const on = u.id === active.id
                return (
                  <motion.button
                    key={u.id}
                    role="tab"
                    aria-selected={on}
                    className={`v2-lk-tab tone-${u.tone}${on ? ' is-on' : ''}`}
                    onClick={() => setActiveId(u.id)}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE, delay: 0.08 + i * 0.05 } }}
                  >
                    {on && <motion.span layoutId="v2-lk-tab-ring" className="v2-lk-tab-ring" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                    <Ring done={p.done} total={p.total} />
                    <span className="txt">
                      <b>{u.short}</b>
                      <span>{[u.country, u.city].filter(Boolean).join(' · ')}</span>
                      <em className={`st-${u.status}`}>{STATUS_LABEL[u.status]}</em>
                    </span>
                  </motion.button>
                )
              })}
            </div>

            {/* The selected university: status, Iana's comment, exams */}
            <AnimatePresence mode="wait">
              <motion.section
                key={active.id}
                className="v2-card v2-lk-path span-8"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                <UniHead u={active} patch={patch} />
                {patch ? (
                  <div className="v2-lk-comment">
                    <span className="ava" aria-hidden>Я</span>
                    <div>
                      <div className="who">Комментарий Яны по вузу{active.comment ? ` · ${day(active.comment.at)}` : ''}</div>
                      <textarea
                        className="v2-lk-edit area"
                        rows={2}
                        value={active.comment?.text ?? ''}
                        onChange={(e) => patch({ comment: e.target.value ? { text: e.target.value, at: todayYmd() } : null })}
                        placeholder="Что сейчас важно по этому вузу"
                      />
                    </div>
                  </div>
                ) : (
                  active.comment && (
                    <div className="v2-lk-comment">
                      <span className="ava" aria-hidden>Я</span>
                      <div>
                        <div className="who">Яна · {day(active.comment.at)}</div>
                        <p>{active.comment.text}</p>
                      </div>
                    </div>
                  )
                )}
                {moveError && <p className="v2-lk-tickerr" role="alert">{moveError}</p>}
                {active.items.length === 0 && !admin ? (
                  <p className="v2-lk-nolist">Яна составит список документов и задач для этого вуза. Он появится здесь.</p>
                ) : (
                  <LkBoard
                    items={active.items}
                    only={isExam}
                    canMove={canMove}
                    onMove={(itemId, stage) => onMove(active.id, itemId, stage)}
                    edit={patch ? (items) => patch({ items }) : undefined}
                    showEmpty={!!admin}
                  />
                )}
              </motion.section>
            </AnimatePresence>

            {/* University card */}
            <AnimatePresence mode="wait">
              <motion.aside
                key={`side-${active.id}`}
                className={`v2-card v2-lk-side span-4${unis.length > 1 ? ' is-tall' : ''}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: EASE, delay: 0.05 }}
              >
                <UniSide u={active} query={query} patch={patch} />
              </motion.aside>
            </AnimatePresence>

            {/* All universities at a glance */}
            {unis.length > 1 && (
              <motion.section className="v2-card v2-lk-matrix span-8" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.25 }}>
                <div className="v2-card-head">
                  <div className="v2-h">Все вузы на одном экране</div>
                  <span className="v2-cab-count">нажмите на строку, чтобы открыть вуз</span>
                </div>
                <div className="v2-lk-ov">
                  {unis.map((u) => {
                    const p = progressOf(u)
                    return (
                      <button key={u.id} className={`v2-lk-ov-row${u.id === active.id ? ' is-on' : ''}`} onClick={() => setActiveId(u.id)}>
                        <span className="name">{u.short}</span>
                        <StatusPill s={u.status} />
                        <span className="ready">
                          <span className="bar"><i style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%` }} /></span>
                          <span className="num">{p.done}/{p.total}</span>
                        </span>
                        <span className="dl">{u.deadline.date ? day(u.deadline.date) : '—'}</span>
                      </button>
                    )
                  })}
                </div>
              </motion.section>
            )}
            {/* Documents, letters, the rest: pipeline boards */}
            {(pipelineItems.length > 0 || admin) && (
              <motion.section
                key={`board-${active.id}`}
                className="v2-card v2-lk-boards span-12"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: EASE, delay: 0.1 }}
              >
                <div className="v2-card-head">
                  <div className="v2-h">Документы и задачи: {active.short}</div>
                  <span className="v2-cab-count">{canMove({ owner: 'student' } as LkItem) ? 'перетащите карточку в нужный этап' : 'где сейчас каждый документ'}</span>
                </div>
                <LkBoard
                  items={active.items}
                  only={(g) => !isExam(g)}
                  canMove={canMove}
                  onMove={(itemId, stage) => onMove(active.id, itemId, stage)}
                  edit={patch ? (items) => patch({ items }) : undefined}
                  showEmpty={!!admin}
                />
              </motion.section>
            )}

          </>
        )}
      </div>
    </LayoutGroup>
  )
}

type Patch = ((p: Partial<LkUniPublic>) => void) | undefined

/** One small orange line in the hero: what is left to pay. */
function PayLine({ p }: { p: LkPayments }) {
  const { left } = paymentsSummary(p)
  // The due date matters only while something is left (or the total isn't set yet).
  const due = p.due && (left === null || left > 0) ? `Оплатить до: ${day(p.due)}` : null
  const sum = left === null ? null : left > 0 ? `Осталось оплатить: ${rub(left)}` : left === 0 ? 'Сопровождение оплачено полностью' : `Переплата: ${rub(-left)}`
  if (!sum && !due) return null
  return <p className="v2-lk-hero-pay">{[sum, due].filter(Boolean).join(' · ')}</p>
}

function StatusPill({ s, patch }: { s: AppStatus; patch?: Patch }) {
  if (!patch) return <span className={`v2-lk-status st-${s}`}>{STATUS_LABEL[s]}</span>
  return (
    <select className={`v2-lk-status st-${s} v2-lk-status-edit`} value={s} onChange={(e) => patch({ status: e.target.value as AppStatus })} aria-label="Статус заявки">
      {STATUSES.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
    </select>
  )
}

function Ring({ done, total }: { done: number; total: number }) {
  const r = 18
  const c = 2 * Math.PI * r
  return (
    <span className="v2-lk-ring" aria-label={`Готово ${done} из ${total}`}>
      <svg viewBox="0 0 44 44" aria-hidden>
        <circle cx="22" cy="22" r={r} className="bg" />
        <motion.circle
          cx="22"
          cy="22"
          r={r}
          className="fg"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: total ? c - (c * done) / total : c }}
          transition={{ duration: 1, ease: EASE, delay: 0.2 }}
        />
      </svg>
      <b className="num">{done}/{total}</b>
    </span>
  )
}

/** A text the family reads; an input when Iana edits in the family view. */
function T({ v, patch, k, ph, area }: { v: string | null; patch?: (val: string | null) => void; k?: string; ph?: string; area?: boolean }) {
  if (!patch) return <>{v}</>
  return area ? (
    <textarea key={k} className="v2-lk-edit area" rows={3} value={v ?? ''} onChange={(e) => patch(e.target.value || null)} placeholder={ph} />
  ) : (
    <input key={k} className="v2-lk-edit" value={v ?? ''} onChange={(e) => patch(e.target.value || null)} placeholder={ph} />
  )
}

function UniHead({ u, patch }: { u: LkUniPublic; patch?: Patch }) {
  const p = progressOf(u)
  const w = windowLine(u)
  return (
    <div className="v2-lk-pathhead">
      <div>
        <div className="v2-kicker">{[u.country, u.city].filter(Boolean).join(' · ')}</div>
        {patch ? (
          <h2 className="is-edit">
            <input className="v2-lk-edit h" value={u.short} onChange={(e) => patch({ short: e.target.value })} placeholder="Короткое название" />
            <input className="v2-lk-edit cn" value={u.nameCn ?? ''} onChange={(e) => patch({ nameCn: e.target.value || null })} placeholder="中文名" />
          </h2>
        ) : (
          <h2>{u.short} <span>{u.nameCn ?? ''}</span></h2>
        )}
        {patch ? <T v={u.program} patch={(v) => patch({ program: v ?? '' })} ph="Программа" /> : u.program && <p>{u.program}</p>}
      </div>
      <div className="meta">
        <StatusPill s={u.status} patch={patch} />
        <div className="bar"><motion.i initial={{ width: 0 }} animate={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%` }} transition={{ duration: 0.9, ease: EASE }} /></div>
        <span>{p.total ? `Готово ${p.done} из ${p.total}` : 'Список для подачи Яна ещё составляет'}</span>
        {w && <span className={`dl${w.hot ? ' is-hot' : ''}`}><CalendarClock aria-hidden /> {w.text}</span>}
      </div>
    </div>
  )
}

function UniSide({ u, query, patch }: { u: LkUniPublic; query: string; patch?: Patch }) {
  const checked = useMemo(() => u.sources.map((s) => s.checked).filter(Boolean).sort().pop(), [u.sources])
  const hasPortal = !!(u.portal.url || u.portal.login || u.portal.hasPassword || u.portal.note)
  const period = u.deadline.date ? (u.opens ? `${day(u.opens)} – ${day(u.deadline.date)}` : `до ${day(u.deadline.date)}`) : null
  const e = !!patch
  const fact = (dt: string, v: string | null, set: (v: string | null) => void, ph?: string) =>
    (v || e) && <div><dt>{dt}</dt><dd><T v={v} patch={patch ? set : undefined} ph={ph ?? dt} /></dd></div>
  return (
    <>
      {u.art ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="v2-lk-art" src={u.art} alt="" />
      ) : (
        <div className={`v2-lk-artph tone-${u.tone}`} aria-hidden><span>{u.nameCn ?? u.short}</span></div>
      )}
      <h3>{patch ? <T v={u.name} patch={(v) => patch({ name: v ?? '' })} ph="Полное название" /> : u.name}</h3>
      <dl className="v2-lk-facts">
        {fact('Программа', u.program, (v) => patch?.({ program: v ?? '' }))}
        {fact('Город', u.city, (v) => patch?.({ city: v ?? '' }))}
        {fact('Рейтинг в Китае', u.rankChina, (v) => patch?.({ rankChina: v }))}
        {e ? (
          <div className="is-dates">
            <dt>Приём заявок</dt>
            <dd>
              <DatePicker value={u.opens} onChange={(v) => patch!({ opens: v })} placeholder="Открывается" />
              <DatePicker value={u.deadline.date} onChange={(v) => patch!({ deadline: { ...u.deadline, date: v } })} placeholder="Дедлайн" />
            </dd>
          </div>
        ) : (
          period && <div><dt>Приём заявок</dt><dd>{period}</dd></div>
        )}
        {fact('Стоимость', u.cost, (v) => patch?.({ cost: v }), '35 000 ¥')}
        {fact('Язык обучения', u.language, (v) => patch?.({ language: v ?? '' }))}
      </dl>

      {(u.scholarships.length > 0 || e) && (
        <div className="v2-lk-schol">
          <span className="lbl">Стипендии</span>
          {patch ? (
            <textarea
              className="v2-lk-edit area"
              rows={3}
              value={u.scholarships.join('\n')}
              onChange={(ev) => patch({ scholarships: ev.target.value.split('\n') })}
              onBlur={() => patch({ scholarships: u.scholarships.map((s) => s.trim()).filter(Boolean) })}
              placeholder="Каждая стипендия с новой строки"
            />
          ) : (
            <ul>{u.scholarships.map((s) => <li key={s}>{s}</li>)}</ul>
          )}
        </div>
      )}

      {hasPortal && <Portal u={u} query={query} />}
      {e && <p className="v2-lk-fine">Портал, пароль, источники и заметки редактируются в режиме «Редактор».</p>}

      {u.website && (
        <a className="v2-lk-site" href={u.website} target="_blank" rel="noopener noreferrer">
          <Globe aria-hidden /> Сайт программы <ArrowUpRight aria-hidden className="go" />
        </a>
      )}

      {(u.contacts || e) && (
        <div className="v2-lk-contacts">
          <span className="lbl"><Phone aria-hidden /> Приёмная комиссия</span>
          {patch ? <T v={u.contacts} patch={(v) => patch({ contacts: v })} ph={'Tel: …\nEmail: …'} area /> : <p>{u.contacts}</p>}
        </div>
      )}

      {u.sources.length > 0 && (
        <div className="v2-lk-src">
          <ShieldCheck aria-hidden />
          <span>
            Проверено по первоисточнику{checked ? ` ${day(checked)}` : ''}:{' '}
            {u.sources.map((s, i) => (
              <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer">{s.label}{i < u.sources.length - 1 ? ', ' : ''}</a>
            ))}
          </span>
        </div>
      )}
      <p className="v2-lk-fine">Решение о зачислении и стипендии принимает приёмная комиссия вуза.</p>
    </>
  )
}

/** The family's own login to the university's application portal. */
function Portal({ u, query }: { u: LkUniPublic; query: string }) {
  const [password, setPassword] = useState<string | null>(null)
  const [shown, setShown] = useState(false)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<'login' | 'password' | null>(null)
  const [err, setErr] = useState<string | null>(null)

  // A different university is a different portal: forget the revealed password.
  useEffect(() => { setPassword(null); setShown(false); setErr(null) }, [u.id])

  const fetchPassword = async () => {
    if (password !== null) return password
    setBusy(true)
    setErr(null)
    const r = await fetch(`/api/lk${query}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'password', uniId: u.id }) }).catch(() => null)
    const d = await r?.json().catch(() => null)
    setBusy(false)
    if (!r?.ok || typeof d?.password !== 'string') {
      setErr('Не удалось получить пароль. Напишите Яне.')
      return null
    }
    setPassword(d.password)
    return d.password as string
  }

  const copy = async (what: 'login' | 'password') => {
    const value = what === 'login' ? u.portal.login : await fetchPassword()
    if (!value) return
    await navigator.clipboard.writeText(value).catch(() => null)
    setCopied(what)
    window.setTimeout(() => setCopied((c) => (c === what ? null : c)), 1600)
  }

  return (
    <div className="v2-lk-portal">
      <div className="v2-lk-portal-head">
        <KeyRound aria-hidden />
        <span>
          <b>Ваша заявка на портале вуза</b>
          {u.portal.note && <small>{u.portal.note}</small>}
        </span>
      </div>
      {(u.portal.login || u.portal.hasPassword) && (
        <dl className="v2-lk-cred">
          {u.portal.login && (
            <div>
              <dt>Логин</dt>
              <dd><code>{u.portal.login}</code></dd>
              <button onClick={() => copy('login')} aria-label="Скопировать логин" title="Скопировать">{copied === 'login' ? <Check aria-hidden /> : <Copy aria-hidden />}</button>
            </div>
          )}
          {u.portal.hasPassword && (
            <div>
              <dt>Пароль</dt>
              <dd><code>{shown && password !== null ? password : '••••••••'}</code></dd>
              <button
                onClick={async () => { if (shown) setShown(false); else if (await fetchPassword()) setShown(true) }}
                aria-label={shown ? 'Скрыть пароль' : 'Показать пароль'}
                title={shown ? 'Скрыть' : 'Показать'}
                disabled={busy}
              >
                {shown ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
              </button>
              <button onClick={() => copy('password')} aria-label="Скопировать пароль" title="Скопировать" disabled={busy}>{copied === 'password' ? <Check aria-hidden /> : <Copy aria-hidden />}</button>
            </div>
          )}
        </dl>
      )}
      {err && <p className="v2-lk-cred-err">{err}</p>}
      {u.portal.url && (
        <a className="v2-lk-portal-go" href={u.portal.url} target="_blank" rel="noopener noreferrer">
          Открыть портал <ArrowUpRight aria-hidden />
        </a>
      )}
    </div>
  )
}
