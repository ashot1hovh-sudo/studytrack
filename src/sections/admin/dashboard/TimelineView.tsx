'use client'

import { useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsDownUp, ChevronsUpDown, ExternalLink } from 'lucide-react'
import { progressAll, STATUS_LABEL, type AppStatus } from '@/lib/lk/types'
import { plural } from '@/app/v2/_ui/plural'
import {
  addDays,
  daysBetween,
  fmtDay,
  fmtDayWd,
  MONTH_TITLE,
  OWNER_SHORT,
  relDue,
  stageOf,
  STATUS_META,
  taskProgress,
  tasksOf,
  taskStatus,
  TYPE_META,
  TYPE_ORDER,
  type DashStudent,
  type DashTask,
  type TaskStatus,
  type TaskType,
} from './derive'
import { Dropdown, Seg } from './ui'

type Zoom = 'months' | 'weeks'
type Col = { label: string; from: string; to: string }
/** One university's application: window, our «Подаём до», the official deadline. */
type UniRow = { key: string; uni: string; status: AppStatus; opens: string | null; applyBy: string | null; deadline: string | null; deadlineLabel: string; done: number; total: number }
type Line = { s: DashStudent; tasks: DashTask[]; unis: UniRow[]; undated: number; pct: number | null; next: DashTask | null }
type Tip = { x: number; y: number; body: ReactNode }
const STEP = 12

const firstOfMonth = (iso: string, add = 0) => {
  const [y, m] = iso.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1 + add, 1))
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-01`
}
const monday = (iso: string) => addDays(iso, -((new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7))

function columns(zoom: Zoom, offset: number, today: string): Col[] {
  if (zoom === 'months') {
    const start = firstOfMonth(today, offset * 3)
    return Array.from({ length: 9 }, (_, i) => {
      const from = firstOfMonth(start, i)
      const m = Number(from.slice(5, 7)) - 1
      return { label: m === 0 || i === 0 ? `${MONTH_TITLE[m]} ${from.slice(0, 4)}` : MONTH_TITLE[m], from, to: firstOfMonth(from, 1) }
    })
  }
  const start = addDays(monday(today), (offset * 4 - 1) * 7)
  return Array.from({ length: 13 }, (_, i) => {
    const from = addDays(start, i * 7)
    return { label: fmtDay(from), from, to: addDays(from, 7) }
  })
}

const isApply = (t: DashTask) => t.type === 'apply' || t.type === 'payment'

export default function TimelineView({ students, today, onOpenStudent }: {
  students: DashStudent[]
  today: string
  onOpenStudent: (id: string) => void
}) {
  const [zoom, setZoom] = useState<Zoom>('months')
  const [offset, setOffset] = useState(0)
  const [type, setType] = useState<'all' | TaskType>('all')
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [count, setCount] = useState(STEP)
  const [tip, setTip] = useState<Tip | null>(null)

  const cols = columns(zoom, offset, today)
  const start = cols[0].from
  const end = cols[cols.length - 1].to
  const span = daysBetween(start, end)
  const pct = (iso: string) => (daysBetween(start, iso) / span) * 100
  const clamp = (v: number) => Math.max(0, Math.min(100, v))
  const inView = (a: string, b: string) => !(b < start || a >= end)

  const lines: Line[] = useMemo(() => {
    return students
      .map((s) => {
        const all = tasksOf(s)
        // Applications get their own «Подача» row per university, so the
        // «Подать заявку» / «Дедлайн» tasks are not drawn twice.
        const tasks = all
          .filter((t) => !isApply(t) && (t.start || t.due) && (type === 'all' || t.type === type))
          .sort((a, b) => ((a.start ?? a.due)! < (b.start ?? b.due)! ? -1 : 1))
        const unis: UniRow[] = type !== 'all' && type !== 'apply' ? [] : (s.lk?.unis ?? [])
          .filter((u) => u.opens || u.applyBy || u.deadline.date)
          .map((u) => ({
            key: u.id, uni: u.short || u.name, status: u.status, opens: u.opens, applyBy: u.applyBy, deadline: u.deadline.date,
            deadlineLabel: u.deadline.label || 'Дедлайн вуза', done: u.items.filter((i) => i.done).length, total: u.items.length,
          }))
        const p = s.lk ? progressAll(s.lk) : { done: 0, total: 0 }
        const next = all.filter((t) => !t.done && t.due).sort((a, b) => (a.due! < b.due! ? -1 : 1))[0] ?? null
        return { s, tasks, unis, undated: all.filter((t) => !t.done && !t.due && !isApply(t)).length, pct: p.total ? Math.round((p.done / p.total) * 100) : null, next }
      })
      .sort((a, b) => (a.next?.due ?? '9999').localeCompare(b.next?.due ?? '9999') || a.s.name.localeCompare(b.s.name, 'ru'))
  }, [students, type])

  const shown = lines.slice(0, count)
  const toggle = (id: string) => setOpen((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const todayIn = today >= start && today < end

  // ---------- hover popup ----------
  const hover = (body: ReactNode) => ({
    onMouseEnter: (e: MouseEvent) => setTip({ x: e.clientX, y: e.clientY, body }),
    onMouseMove: (e: MouseEvent) => setTip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t)),
    onMouseLeave: () => setTip(null),
  })

  // ---------- drawing ----------
  const taskMark = (t: DashTask, s: DashStudent, mode: 'row' | 'tick') => {
    const st = taskStatus(t, today)
    const a = t.start ?? t.due!, b = t.due ?? t.start!
    if (!inView(a, b)) return null
    const props = hover(<TaskTip t={t} s={s} today={today} />)
    if (mode === 'tick') {
      return <i key={t.key} className={`dash-tl-tick is-${st}`} style={{ left: `${clamp(pct(b))}%` }} {...props} />
    }
    if (!t.start || !t.due || t.start >= t.due) {
      return <i className={`dash-tl-dot is-${st}`} style={{ left: `${clamp(pct(b))}%` }} {...props} />
    }
    const l = clamp(pct(a)), r = clamp(pct(addDays(b, 1)))
    return (
      <i className={`dash-tl-bar is-${st}`} style={{ left: `${l}%`, width: `${Math.max(r - l, 0.8)}%` }} {...props}>
        {st !== 'done' && <b style={{ width: `${taskProgress(t) * 100}%` }} />}
      </i>
    )
  }

  const uniMarks = (u: UniRow, s: DashStudent, thin = false) => {
    const props = hover(<UniTip u={u} s={s} today={today} />)
    const out: ReactNode[] = []
    const from = u.opens ?? u.applyBy ?? u.deadline
    const to = u.deadline ?? u.applyBy ?? u.opens
    if (from && to && from < to && inView(from, to)) {
      const l = clamp(pct(from)), r = clamp(pct(addDays(to, 1)))
      out.push(<i key="w" className={`dash-tl-window${thin ? ' is-thin' : ''} is-${u.status}`} style={{ left: `${l}%`, width: `${Math.max(r - l, 0.8)}%` }} {...props} />)
    }
    if (!thin && u.deadline && inView(u.deadline, u.deadline)) out.push(<i key="d" className="dash-tl-cap" style={{ left: `${clamp(pct(u.deadline))}%` }} {...props} />)
    if (!thin && u.applyBy && inView(u.applyBy, u.applyBy)) {
      const late = u.status === 'preparing' && u.applyBy < today
      out.push(<i key="a" className={`dash-tl-diamond${late ? ' is-late' : ''}${u.status !== 'preparing' ? ' is-done' : ''}`} style={{ left: `${clamp(pct(u.applyBy))}%` }} {...props} />)
    }
    return out
  }

  return (
    <section className="dash-card">
      <div className="dash-toolbar">
        <div className="dash-filters">
          <button type="button" className="dash-pill" onClick={() => setOpen(new Set(lines.map((l) => l.s.id)))}><ChevronsUpDown className="dash-pill-ico" />Развернуть всех</button>
          <button type="button" className="dash-pill" onClick={() => setOpen(new Set())}><ChevronsDownUp className="dash-pill-ico" />Свернуть всех</button>
          <Dropdown label="Тип задачи" value={type} onChange={setType} options={[{ value: 'all', label: 'Все типы задач' }, ...TYPE_ORDER.filter((k) => k !== 'payment').map((k) => ({ value: k, label: k === 'apply' ? 'Подача в вуз' : TYPE_META[k].label }))]} />
        </div>
        <div className="dash-filters">
          <button type="button" className="dash-round" onClick={() => setOffset((o) => o - 1)} aria-label="Раньше"><ChevronLeft /></button>
          <button type="button" className="dash-range" onClick={() => setOffset(0)} title="Вернуться к сегодняшнему дню">
            {zoom === 'months' ? `${cols[0].label.split(' ')[0]} ${start.slice(0, 4)} — ${MONTH_TITLE[Number(cols[8].from.slice(5, 7)) - 1]} ${cols[8].from.slice(0, 4)}` : `${fmtDay(start)} — ${fmtDay(addDays(end, -1))}`}
          </button>
          <button type="button" className="dash-round" onClick={() => setOffset((o) => o + 1)} aria-label="Позже"><ChevronRight /></button>
          <Seg label="Масштаб" value={zoom} onChange={(z) => { setZoom(z); setOffset(0) }} options={[{ value: 'months', label: 'Месяцы' }, { value: 'weeks', label: 'Недели' }]} />
        </div>
      </div>

      <div className="dash-tl">
        <div className="dash-tl-head">
          <span>Студент · задача</span>
          <div className="dash-tl-cols">
            {cols.map((c) => <span key={c.from} style={{ left: `${pct(c.from)}%` }}>{c.label}</span>)}
            {todayIn && <b className="dash-tl-todaypill" style={{ left: `${pct(today)}%` }}>{fmtDay(today)}</b>}
          </div>
        </div>
        <div className="dash-tl-body">
          <div className="dash-tl-grid" aria-hidden>
            {cols.map((c) => <i key={c.from} style={{ left: `${pct(c.from)}%` }} />)}
            {todayIn && <b style={{ left: `${pct(today)}%` }} />}
          </div>

          {shown.length === 0 && <div className="dash-empty">Нет студентов.</div>}
          {shown.map((l) => {
            const isOpen = open.has(l.s.id)
            const hasRows = l.tasks.length + l.unis.length > 0
            const choosing = stageOf(l.s.lk) === 'choosing'
            return (
              <div key={l.s.id} className={`dash-tl-block${isOpen ? ' is-open' : ''}`}>
                <div className="dash-tl-row is-student">
                  <div className="dash-tl-label">
                    <button type="button" className="dash-tl-chev" onClick={() => toggle(l.s.id)} disabled={!hasRows} aria-label={isOpen ? 'Свернуть' : 'Развернуть'} aria-expanded={isOpen}>
                      {isOpen ? <ChevronDown /> : <ChevronRight />}
                    </button>
                    <button type="button" className="dash-tl-name" onClick={() => (hasRows ? toggle(l.s.id) : onOpenStudent(l.s.id))}>
                      <b>{l.s.name}</b>
                      <small>{[l.pct !== null ? `${l.pct}% готово` : null, l.undated ? `${l.undated} без даты` : null].filter(Boolean).join(' · ') || l.s.email}</small>
                    </button>
                    <button type="button" className="dash-tl-open" onClick={() => onOpenStudent(l.s.id)} title="Открыть карточку студента"><ExternalLink /></button>
                  </div>
                  <div className="dash-tl-track">
                    {!hasRows && <span className={`dash-tl-note${choosing ? ' is-hot' : ''}`}>{choosing ? 'Вузы ещё не выбраны — сроков пока нет' : 'Сроков пока нет'}</span>}
                    {!isOpen && hasRows && (
                      <>
                        {l.unis.map((u) => <span key={u.key}>{uniMarks(u, l.s, true)}</span>)}
                        {l.tasks.map((t) => taskMark(t, l.s, 'tick'))}
                      </>
                    )}
                  </div>
                </div>
                {isOpen && l.unis.map((u) => (
                  <div key={u.key} className="dash-tl-row">
                    <div className="dash-tl-label is-sub">
                      <StatusIcon st={u.status === 'accepted' ? 'done' : u.status === 'preparing' && u.applyBy && u.applyBy < today ? 'late' : u.status === 'preparing' ? 'todo' : 'progress'} />
                      <span title={u.uni}>Подача<small> · {u.uni}</small></span>
                    </div>
                    <div className="dash-tl-track">{uniMarks(u, l.s)}</div>
                  </div>
                ))}
                {isOpen && l.tasks.map((t) => (
                  <div key={t.key} className="dash-tl-row">
                    <div className="dash-tl-label is-sub">
                      <StatusIcon st={taskStatus(t, today)} />
                      <span title={`${t.text} · ${t.where}`}>{t.text}<small> · {t.where}</small></span>
                    </div>
                    <div className="dash-tl-track">{taskMark(t, l.s, 'row')}</div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {lines.length > count && (
        <button type="button" className="dash-more" onClick={() => setCount((c) => c + STEP)}>
          Показать ещё {Math.min(STEP, lines.length - count)} {plural(Math.min(STEP, lines.length - count), 'студента', 'студентов', 'студентов')} из {lines.length - count}
          <ChevronDown />
        </button>
      )}

      <div className="dash-legend dash-tl-legend">
        <span><i className="dash-lg-bar is-todo" />Не начато</span>
        <span><i className="dash-lg-bar is-progress"><b /></i>В работе — заливка = пройденные этапы</span>
        <span><i className="dash-lg-bar is-done" />Готово</span>
        <span><i className="dash-lg-bar is-late"><b /></i>Просрочено</span>
        <span><i className="dash-lg-bar is-window" />Окно подачи вуза</span>
        <span><i className="dash-lg-diamond" />Подаём до</span>
        <span><i className="dash-lg-tick" />Срок задачи (в свёрнутом виде)</span>
      </div>

      {tip && <Popup tip={tip} />}
    </section>
  )
}

function StatusIcon({ st }: { st: TaskStatus }) {
  return <i className={`dash-st is-${st}`} aria-label={STATUS_META[st].label} title={STATUS_META[st].label} />
}

function Popup({ tip }: { tip: Tip }) {
  // Keep the card on screen: flip to the left / above near the edges.
  const w = 300
  const left = typeof window !== 'undefined' && tip.x + w + 24 > window.innerWidth ? tip.x - w - 14 : tip.x + 14
  const top = typeof window !== 'undefined' && tip.y + 220 > window.innerHeight ? tip.y - 14 : tip.y + 16
  const below = typeof window !== 'undefined' && tip.y + 220 > window.innerHeight
  return (
    <div className="dash-pop" style={{ left, top, width: w, transform: below ? 'translateY(-100%)' : undefined }} role="tooltip">
      {tip.body}
    </div>
  )
}

function TaskTip({ t, s, today }: { t: DashTask; s: DashStudent; today: string }) {
  const st = taskStatus(t, today)
  return (
    <>
      <div className="dash-pop-head">
        <span className={`dash-pop-status is-${st}`}>{STATUS_META[st].label}</span>
        <span className="dash-pop-type"><i style={{ background: TYPE_META[t.type].color }} />{TYPE_META[t.type].label}</span>
      </div>
      <b className="dash-pop-title">{t.text}</b>
      <small className="dash-pop-sub">{s.name} · {t.where}</small>
      {t.stageCount > 1 && (
        <div className="dash-pop-stage">
          <div className="dash-pop-steps">
            {Array.from({ length: t.stageCount }, (_, i) => <i key={i} className={t.done || i <= t.stageIdx ? (t.done ? 'is-done' : st === 'late' ? 'is-late' : 'is-on') : ''} />)}
          </div>
          <span>Этап: <b>{t.stage}</b> · {t.stageIdx + 1} из {t.stageCount}</span>
        </div>
      )}
      <dl className="dash-pop-dl">
        {t.start && <><dt>Начало</dt><dd>{fmtDayWd(t.start)}</dd></>}
        <dt>Срок</dt><dd className={st === 'late' ? 'is-hot' : ''}>{t.due ? `${fmtDayWd(t.due)}${t.done ? '' : ` · ${relDue(t.due, today)}`}` : 'не задан'}</dd>
        {t.done && t.doneAt && <><dt>Готово</dt><dd>{fmtDayWd(t.doneAt.slice(0, 10))}</dd></>}
        {t.owner && <><dt>Кто делает</dt><dd>{OWNER_SHORT[t.owner]}</dd></>}
      </dl>
      {t.note && <p className="dash-pop-note">{t.note}</p>}
      {t.comment && <p className="dash-pop-note is-comment">Комментарий Яны: {t.comment}</p>}
    </>
  )
}

function UniTip({ u, s, today }: { u: UniRow; s: DashStudent; today: string }) {
  const late = u.status === 'preparing' && !!u.applyBy && u.applyBy < today
  return (
    <>
      <div className="dash-pop-head">
        <span className={`dash-pop-status ${late ? 'is-late' : u.status === 'accepted' ? 'is-done' : 'is-progress'}`}>{STATUS_LABEL[u.status]}</span>
        <span className="dash-pop-type"><i style={{ background: TYPE_META.apply.color }} />Подача в вуз</span>
      </div>
      <b className="dash-pop-title">{u.uni}</b>
      <small className="dash-pop-sub">{s.name}</small>
      <dl className="dash-pop-dl">
        <dt>Подача открывается</dt><dd>{u.opens ? fmtDayWd(u.opens) : 'не указано'}</dd>
        <dt>Подаём до</dt><dd className={late ? 'is-hot' : ''}>{u.applyBy ? `${fmtDayWd(u.applyBy)}${u.status === 'preparing' ? ` · ${relDue(u.applyBy, today)}` : ''}` : 'не указано'}</dd>
        <dt>{u.deadlineLabel}</dt><dd>{u.deadline ? fmtDayWd(u.deadline) : 'не указано'}</dd>
        {u.total > 0 && <><dt>Документы вуза</dt><dd>{u.done} из {u.total} готово</dd></>}
      </dl>
    </>
  )
}
