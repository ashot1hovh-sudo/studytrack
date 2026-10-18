'use client'

/**
 * v2 «Личный кабинет» (сопровождение).
 *
 * One family account (student + parents). The page is about the universities
 * Iana chose with the family. Two checklists sit side by side: «Общие
 * документы», shared by every university, and the documents of the
 * university picked with the buttons on top. Exams are a list with a status;
 * documents, letters and the rest are pipeline boards whose cards move from
 * stage to stage. Done = every card in its last stage. The university's facts
 * and portal login open in a popup from its button. «Таймлайн» shows both
 * lists on one time axis instead of the boards.
 *
 * `LkPage` loads /api/lk for the family. `LkView` is the page itself; the
 * admin renders it too («Как видит семья»), with `admin` set, so Iana edits
 * right in the family's layout. A consultant opening /v2/lk?student=<id>
 * gets a read-only preview.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { ArrowUpRight, CalendarClock, Check, Copy, Eye, EyeOff, Globe, Info, KeyRound, MessageCircle, Phone, ShieldCheck, X } from 'lucide-react'
import DatePicker from '@/components/DatePicker'
import { COMMON_ID, paymentsSummary, progressOf, progressWith, rub, STATUS_LABEL, STATUSES, withStage, type AppStatus, type LkDataPublic, type LkItem, type LkPayments, type LkUniPublic } from '@/lib/lk/types'
import { plural } from './plural'
import LkBoard from './lkBoard'
import LkTimeline from './lkTimeline'

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

/**
 * The three dates of an application, as short lines: when the window opens
 * (while it is still ahead), «Подаём до» (our own target) and the
 * university's deadline. A date within 30 days is highlighted.
 */
function windowLines(u: LkUniPublic): { text: string; hot: boolean }[] {
  const lines: { text: string; hot: boolean }[] = []
  if (u.opens && daysTo(u.opens) > 0) lines.push({ text: `Приём заявок откроется ${day(u.opens)}, ${untilWord(daysTo(u.opens))}`, hot: false })
  const line = (label: string, ymd: string) => {
    const left = daysTo(ymd)
    lines.push(left < 0 ? { text: `${label}: ${day(ymd)}, прошёл`, hot: false } : { text: `${label}: ${day(ymd)}, ${untilWord(left)}`, hot: left <= 30 })
  }
  if (u.applyBy) line('Подаём до', u.applyBy)
  if (u.deadline.date) line(u.deadline.label, u.deadline.date)
  return lines
}

type Loaded = { preview: boolean; demo?: boolean; student: { id: string; fullName: string }; lk: LkDataPublic }

const IANA_TG = 'https://t.me/ianamedvedeva'

type Mode = 'boards' | 'timeline'
const MODE_KEY = 'lk-mode'
const isExam = (g: string) => g === 'exams'
const notExam = (g: string) => g !== 'exams'

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

  // uniId is COMMON_ID for the checklist shared by all universities.
  const setStage = useCallback(
    (uniId: string, itemId: string, stage: string) =>
      setData((d) => {
        if (!d) return d
        const moveIn = (items: LkItem[]) => items.map((t) => (t.id === itemId ? withStage(t, stage) : t))
        if (uniId === COMMON_ID) return { ...d, lk: { ...d.lk, common: moveIn(d.lk.common) } }
        return { ...d, lk: { ...d.lk, unis: d.lk.unis.map((u) => (u.id !== uniId ? u : { ...u, items: moveIn(u.items) })) } }
      }),
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
      const list = uniId === COMMON_ID ? data.lk.common : data.lk.unis.find((u) => u.id === uniId)?.items
      const item = list?.find((t) => t.id === itemId)
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
  /** Replace the common checklist. Saved by the caller. */
  setCommon: (items: LkItem[]) => void
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
  /** uniId is COMMON_ID for the common checklist. */
  onMove: (uniId: string, itemId: string, stage: string) => void
  moveError?: string | null
  admin?: LkAdminApi
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [infoId, setInfoId] = useState<string | null>(null)
  // Boards or timeline: a per-browser preference.
  const [mode, setModeState] = useState<Mode>('boards')
  useEffect(() => {
    try { if (localStorage.getItem(MODE_KEY) === 'timeline') setModeState('timeline') } catch {}
  }, [])
  const setMode = (m: Mode) => {
    setModeState(m)
    try { localStorage.setItem(MODE_KEY, m) } catch {}
  }
  const unis = lk.unis
  const active = unis.find((u) => u.id === activeId) ?? unis[0] ?? null
  const info = unis.find((u) => u.id === infoId) ?? null
  const yourTurn = [...lk.common, ...unis.flatMap((u) => u.items)].filter((t) => !t.done && t.owner !== 'iana')
  const nearest = unis.filter((u) => u.deadline.date && daysTo(u.deadline.date) >= 0).sort((a, b) => (a.deadline.date! < b.deadline.date! ? -1 : 1))[0]
  const canMove = (t: LkItem) => !!admin || (!preview && t.owner !== 'iana')
  const patch = admin && active ? (p: Partial<LkUniPublic>) => admin.patchUni(active.id, p) : undefined
  const infoPatch = admin && info ? (p: Partial<LkUniPublic>) => admin.patchUni(info.id, p) : undefined
  // Exams sit in the university card on top; the two pipelines below hold the rest.
  const commonDocs = lk.common.filter((t) => notExam(t.group))
  const uniDocs = active?.items.filter((t) => notExam(t.group)) ?? []
  const common = progressOf({ items: commonDocs })
  const exams = active ? [...lk.common, ...active.items].filter((t) => isExam(t.group)) : []
  const commonIds = new Set(lk.common.map((t) => t.id))
  // An exam from the common list moves there; the rest belong to the university.
  const moveExam = (itemId: string, stage: string) => active && onMove(commonIds.has(itemId) ? COMMON_ID : active.id, itemId, stage)
  // Admin edits of the exam list: common exams go back to the common list, new ones to the university.
  const editExams = admin && active
    ? (next: LkItem[]) => {
        const nextCommon = [...lk.common.filter((t) => notExam(t.group)), ...next.filter((t) => commonIds.has(t.id))]
        if (JSON.stringify(nextCommon) !== JSON.stringify(lk.common)) admin.setCommon(nextCommon)
        admin.patchUni(active.id, { items: [...active.items.filter((t) => notExam(t.group)), ...next.filter((t) => !commonIds.has(t.id))] })
      }
    : undefined
  const moveHint = canMove({ owner: 'student' } as LkItem) ? 'перетащите карточку в нужный этап' : null

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
            {/* University buttons. «Информация о моей программе» opens its facts and portal login. */}
            <div className="v2-lk-switch span-12" role="tablist" aria-label="Вузы">
              {unis.map((u, i) => {
                const p = progressWith(lk.common, u)
                const on = u.id === active.id
                return (
                  <motion.div
                    key={u.id}
                    role="tab"
                    tabIndex={0}
                    aria-selected={on}
                    className={`v2-lk-tab tone-${u.tone}${on ? ' is-on' : ''}`}
                    onClick={() => setActiveId(u.id)}
                    onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setActiveId(u.id) } }}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE, delay: 0.08 + i * 0.05 } }}
                  >
                    {on && <motion.span layoutId="v2-lk-tab-ring" className="v2-lk-tab-ring" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                    <Ring done={p.done} total={p.total} />
                    <span className="txt">
                      <b>{u.short}</b>
                      <span>{[u.country, u.city].filter(Boolean).join(' · ')}</span>
                      <span className="row">
                        <em className={`st-${u.status}`}>{STATUS_LABEL[u.status]}</em>
                        <button
                          type="button"
                          className="v2-lk-tab-info"
                          onClick={(e) => { e.stopPropagation(); setActiveId(u.id); setInfoId(u.id) }}
                        >
                          <Info aria-hidden /> Информация о моей программе
                        </button>
                      </span>
                    </span>
                  </motion.div>
                )
              })}
            </div>

            {/* The selected university: status, deadline, Iana's comment, exams */}
            <AnimatePresence mode="wait">
              <motion.section
                key={active.id}
                className="v2-card v2-lk-path span-12"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                <UniHead u={active} common={lk.common} patch={patch} />
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
                <LkBoard items={exams} only={isExam} canMove={canMove} onMove={moveExam} edit={editExams} showEmpty={!!admin} />
              </motion.section>
            </AnimatePresence>

            {/* All universities at a glance */}
            {unis.length > 1 && (
              <motion.section className="v2-card v2-lk-matrix span-12" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}>
                <div className="v2-card-head">
                  <div className="v2-h">Все вузы на одном экране</div>
                  <span className="v2-cab-count">нажмите на строку, чтобы открыть вуз</span>
                </div>
                <div className="v2-lk-ov">
                  {unis.map((u) => {
                    const p = progressWith(lk.common, u)
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

            <div className="v2-lk-mode span-12" role="tablist" aria-label="Вид">
              <span className="lbl">Вид</span>
              {([['boards', 'Доски'], ['timeline', 'Таймлайн']] as const).map(([k, l]) => (
                <button key={k} role="tab" aria-selected={mode === k} className={mode === k ? 'is-on' : ''} onClick={() => setMode(k)}>{l}</button>
              ))}
            </div>

            {moveError && <p className="v2-lk-tickerr span-12" role="alert">{moveError}</p>}

            {mode === 'timeline' && (
              <motion.section
                key={`tl-${active.id}`}
                className="v2-card v2-lk-tlcard span-12"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: EASE }}
              >
                <div className="v2-lk-tl-head">
                  <h2>Таймлайн подготовки</h2>
                  <p>Общие документы и {active.short} на одной шкале. Наведите на полоску, чтобы увидеть этап и сроки.</p>
                </div>
                <LkTimeline common={lk.common} uni={active} />
                {admin && <p className="v2-lk-fine">Даты меняются на карточках в виде «Доски»: «Начало» и «Срок».</p>}
              </motion.section>
            )}

            {mode === 'boards' && (<>
            {/* Left: the checklist every university shares */}
            <motion.section
              className="v2-card v2-lk-pipe span-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE, delay: 0.1 }}
            >
              <div className="v2-lk-pipe-head">
                <div>
                  <div className="v2-kicker">Для всех вузов</div>
                  <h2>Общие документы</h2>
                </div>
                <span className="v2-lk-pipe-count num">{common.done}/{common.total}</span>
              </div>
              {moveHint && commonDocs.length > 0 && <p className="v2-lk-pipe-hint">{moveHint}</p>}
              {commonDocs.length === 0 && !admin ? (
                <p className="v2-lk-nolist">Яна составит список документов, общих для всех вузов. Он появится здесь.</p>
              ) : (
                <LkBoard
                  items={lk.common}
                  only={notExam}
                  canMove={canMove}
                  onMove={(itemId, stage) => onMove(COMMON_ID, itemId, stage)}
                  edit={admin ? admin.setCommon : undefined}
                  showEmpty={!!admin}
                  starterDocs
                />
              )}
            </motion.section>

            {/* Right: what the selected university asks for on top */}
            <AnimatePresence mode="wait">
              <motion.section
                key={`pipe-${active.id}`}
                className="v2-card v2-lk-pipe span-6"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                <div className="v2-lk-pipe-head">
                  <div>
                    <div className="v2-kicker">Только для этого вуза</div>
                    <h2>Документы для {active.short}</h2>
                  </div>
                  <span className="v2-lk-pipe-count num">{uniDocs.filter((t) => t.done).length}/{uniDocs.length}</span>
                </div>
                {moveHint && uniDocs.length > 0 && <p className="v2-lk-pipe-hint">{moveHint}</p>}
                {uniDocs.length === 0 && !admin ? (
                  <p className="v2-lk-nolist">Яна составит список того, что нужно именно для {active.short}. Он появится здесь.</p>
                ) : (
                  <LkBoard
                    items={active.items}
                    only={notExam}
                    canMove={canMove}
                    onMove={(itemId, stage) => onMove(active.id, itemId, stage)}
                    edit={patch ? (items) => patch({ items }) : undefined}
                    showEmpty={!!admin}
                  />
                )}
              </motion.section>
            </AnimatePresence>
            </>)}
          </>
        )}
      </div>

      {/* University facts and portal login */}
      <AnimatePresence>
        {info && <UniSheet key={info.id} u={info} query={query} patch={infoPatch} onClose={() => setInfoId(null)} />}
      </AnimatePresence>
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

/** Top of the university card: name, status, readiness (common + its own), deadline. */
function UniHead({ u, common, patch }: { u: LkUniPublic; common: LkItem[]; patch?: Patch }) {
  const p = progressWith(common, u)
  const lines = windowLines(u)
  return (
    <div className="v2-lk-pathhead">
      <div>
        <div className="v2-kicker">{[u.country, u.city].filter(Boolean).join(' · ')}</div>
        {patch ? (
          <h2 className="is-edit">
            <textarea className="v2-lk-edit h" rows={1} value={u.short} onChange={(e) => patch({ short: e.target.value.replace(/\n/g, ' ') })} placeholder="Короткое название" />
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
        {lines.map((w) => <span key={w.text} className={`dl${w.hot ? ' is-hot' : ''}`}><CalendarClock aria-hidden /> {w.text}</span>)}
      </div>
    </div>
  )
}

/** The popup with everything about one university: facts, portal login, contacts. */
function UniSheet({ u, query, patch, onClose }: { u: LkUniPublic; query: string; patch?: Patch; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null)
  // Kept in a ref: the parent passes a new function on every render, and
  // re-running the effect would pull focus away from a field Iana is typing in.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    close.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <motion.div
      className="v2-scrim"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="v2-sheet v2-lk-info"
        role="dialog"
        aria-modal="true"
        aria-label={u.name}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.35, ease: EASE }}
      >
        <button ref={close} className="v2-sheet-x" onClick={onClose} aria-label="Закрыть"><X aria-hidden /></button>
        <div className="v2-lk-side">
          <div className="v2-lk-info-head">
            <div className="v2-kicker">{[u.country, u.city].filter(Boolean).join(' · ')}</div>
            {patch ? (
              <h2 className="is-edit">
                <textarea className="v2-lk-edit h" rows={1} value={u.short} onChange={(e) => patch({ short: e.target.value.replace(/\n/g, ' ') })} placeholder="Короткое название" />
                <input className="v2-lk-edit cn" value={u.nameCn ?? ''} onChange={(e) => patch({ nameCn: e.target.value || null })} placeholder="中文名" />
              </h2>
            ) : (
              <h2>{u.short} <span>{u.nameCn ?? ''}</span></h2>
            )}
            <StatusPill s={u.status} patch={patch} />
          </div>
          <UniSide u={u} query={query} patch={patch} />
        </div>
      </motion.div>
    </motion.div>
  )
}

function UniSide({ u, query, patch }: { u: LkUniPublic; query: string; patch?: Patch }) {
  const checked = useMemo(() => u.sources.map((s) => s.checked).filter(Boolean).sort().pop(), [u.sources])
  const hasPortal = !!(u.portal.pending || u.portal.url || u.portal.login || u.portal.hasPassword || u.portal.note)
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
        {e ? (
          <div><dt>Подаём до</dt><dd><DatePicker value={u.applyBy} onChange={(v) => patch!({ applyBy: v })} placeholder="Наша дата" /></dd></div>
        ) : (
          u.applyBy && <div><dt>Подаём до</dt><dd>{day(u.applyBy)}</dd></div>
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

  // Iana marked the login as «not there yet»: say so instead of showing fields.
  if (u.portal.pending) {
    return (
      <div className="v2-lk-portal">
        <div className="v2-lk-portal-head">
          <KeyRound aria-hidden />
          <span>
            <b>Ваша заявка на портале вуза</b>
            <small>Данные для входа пока не готовы. Яна добавит их, как только они появятся.</small>
          </span>
        </div>
      </div>
    )
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
