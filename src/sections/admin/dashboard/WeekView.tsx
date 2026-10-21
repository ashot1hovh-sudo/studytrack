'use client'

import { useMemo, useState } from 'react'
import { AlertCircle, ArrowRight, CalendarDays, Check, ChevronDown, GraduationCap } from 'lucide-react'
import { TRACKS, type Owner, type TrackKey } from '@/lib/lk/types'
import { plural } from '@/app/v2/_ui/plural'
import {
  actorLabel,
  addDays,
  allEvents,
  attentionList,
  daysBetween,
  eventColor,
  eventText,
  fmtDay,
  openTasks,
  OWNER_SHORT,
  relDue,
  relTime,
  stageOf,
  TYPE_META,
  TYPE_ORDER,
  upcomingWindows,
  wd,
  type DashStudent,
  type DashTask,
  type TaskType,
} from './derive'
import { Avatar, Dropdown, Seg, Toggle } from './ui'

type OwnerFilter = 'all' | Owner
const PAGE = 12

export default function WeekView({ students, today, onOpenStudent, onShowChoosing, onOpenLog }: {
  students: DashStudent[]
  today: string
  onOpenStudent: (id: string) => void
  onShowChoosing: () => void
  onOpenLog: () => void
}) {
  const [owner, setOwner] = useState<OwnerFilter>('all')
  const [type, setType] = useState<'all' | TaskType>('all')
  const [track, setTrack] = useState<'all' | TrackKey>('all')
  const [lateOnly, setLateOnly] = useState(false)
  const [day, setDay] = useState<string | null>(null) // a date, 'late', or null for the whole week
  const [showAll, setShowAll] = useState(false)
  const [attnAll, setAttnAll] = useState(false)
  const [winAll, setWinAll] = useState(false)

  const byId = useMemo(() => new Map(students.map((s) => [s.id, s])), [students])
  const end = addDays(today, 6)
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i))

  // Everything due up to the end of the week, before the list filters.
  const horizon = useMemo(() => openTasks(students).filter((t) => t.due! <= end), [students, end])
  const late = horizon.filter((t) => t.due! < today)
  const week = horizon.filter((t) => t.due! >= today)
  const mine = horizon.filter((t) => t.owner === 'iana')
  const noUnis = students.filter((s) => stageOf(s.lk) === 'choosing').length

  const list = horizon.filter((t) => {
    if (owner !== 'all' && t.owner !== owner) return false
    if (type !== 'all' && t.type !== type) return false
    if (track !== 'all' && byId.get(t.studentId)?.lk?.profile.track !== track) return false
    if (lateOnly && t.due! >= today) return false
    if (day === 'late' && t.due! >= today) return false
    if (day && day !== 'late' && t.due !== day) return false
    return true
  })
  const shown = showAll ? list : list.slice(0, PAGE)
  const groups: { key: string; title: string; hot?: boolean; today?: boolean; items: DashTask[] }[] = []
  for (const t of shown) {
    const key = t.due! < today ? 'late' : t.due!
    let g = groups.find((x) => x.key === key)
    if (!g) {
      const n = key === 'late' ? -1 : daysBetween(today, key)
      const title = key === 'late' ? 'Просрочено' : n === 0 ? `Сегодня · ${wd(key)} ${fmtDay(key)}` : n === 1 ? `Завтра · ${wd(key)} ${fmtDay(key)}` : `${wd(key)} ${fmtDay(key)}`
      g = { key, title, hot: key === 'late', today: n === 0, items: [] }
      groups.push(g)
    }
    g.items.push(t)
  }
  const countOf = (key: string) => list.filter((t) => (key === 'late' ? t.due! < today : t.due === key)).length

  const resetFilters = () => { setOwner('all'); setType('all'); setTrack('all'); setLateOnly(false); setDay(null) }
  const attention = attentionList(students, today)
  const events = allEvents(students)
  const windows = upcomingWindows(students, today)

  const dots = (items: DashTask[]) => TYPE_ORDER.filter((k) => items.some((t) => t.type === k))

  return (
    <>
      <section className="dash-kpis">
        <button type="button" className={`dash-kpi${lateOnly || day === 'late' ? ' is-on' : ''}`} onClick={() => { resetFilters(); setLateOnly(true) }}>
          <div className="dash-kpi-top"><div><b>Просрочено</b><span>Срок прошёл, не готово</span></div><i className="is-hot"><AlertCircle /></i></div>
          <strong className={late.length ? 'is-hot' : ''}>{late.length}</strong>
        </button>
        <button type="button" className="dash-kpi" onClick={resetFilters}>
          <div className="dash-kpi-top"><div><b>На этой неделе</b><span>{fmtDay(today)} – {fmtDay(end)}</span></div><i><CalendarDays /></i></div>
          <strong>{week.length}</strong>
        </button>
        <button type="button" className={`dash-kpi${owner === 'iana' ? ' is-on' : ''}`} onClick={() => { resetFilters(); setOwner('iana') }}>
          <div className="dash-kpi-top"><div><b>Мои задачи</b><span>Ответственная — Яна, 7 дней</span></div><i><Check /></i></div>
          <strong>{mine.length}</strong>
        </button>
        <button type="button" className="dash-kpi" onClick={onShowChoosing}>
          <div className="dash-kpi-top"><div><b>Ещё без вузов</b><span>Из {students.length} {plural(students.length, 'студента', 'студентов', 'студентов')}</span></div><i><GraduationCap /></i></div>
          <strong>{noUnis}</strong>
        </button>
      </section>

      <section className="dash-card">
        <div className="dash-card-head">
          <h2>Ближайшие 7 дней</h2>
          <div className="dash-legend">
            {(['exams', 'collect', 'write', 'contact', 'apply', 'other'] as TaskType[]).map((k) => (
              <span key={k}><i style={{ background: TYPE_META[k].color }} />{TYPE_META[k].label}</span>
            ))}
          </div>
        </div>
        <div className="dash-days">
          <button type="button" className={`dash-day is-late${day === 'late' ? ' is-sel' : ''}`} onClick={() => setDay(day === 'late' ? null : 'late')}>
            <span>Просрочено</span>
            <strong>{late.length}</strong>
            <em>{dots(late).map((k) => <i key={k} style={{ background: TYPE_META[k].color }} />)}</em>
          </button>
          {days.map((d, i) => {
            const items = week.filter((t) => t.due === d)
            const weekend = [0, 6].includes(new Date(`${d}T00:00:00`).getDay())
            return (
              <button key={d} type="button" className={`dash-day${i === 0 ? ' is-today' : ''}${!items.length ? ' is-empty' : ''}${weekend && !items.length ? ' is-weekend' : ''}${day === d ? ' is-sel' : ''}`} onClick={() => setDay(day === d ? null : d)}>
                <span>{i === 0 ? `Сегодня · ${wd(d)} ${d.slice(8).replace(/^0/, '')}` : `${wd(d)} ${d.slice(8).replace(/^0/, '')}`}</span>
                <strong>{items.length}</strong>
                {items.length ? <em>{dots(items).map((k) => <i key={k} style={{ background: TYPE_META[k].color }} />)}</em> : <small>свободно</small>}
              </button>
            )
          })}
        </div>
      </section>

      <div className="dash-body">
        <section className="dash-card dash-list">
          <div className="dash-card-head">
            <div className="dash-title-row">
              <h2>Дедлайны</h2>
              <span className="dash-muted">{week.length} на неделе · {late.length} просрочено</span>
            </div>
            <Toggle on={lateOnly} onChange={(v) => { setLateOnly(v); if (v) setDay(null) }} label="Только просроченные" />
          </div>
          <div className="dash-filters">
            <Seg label="Ответственный" value={owner} onChange={setOwner} options={[{ value: 'all', label: 'Все' }, { value: 'iana', label: 'Яна' }, { value: 'student', label: 'Студент' }, { value: 'parent', label: 'Родитель' }]} />
            <Dropdown label="Тип задачи" value={type} onChange={setType} options={[{ value: 'all', label: 'Все типы задач' }, ...TYPE_ORDER.map((k) => ({ value: k, label: TYPE_META[k].label, dot: TYPE_META[k].color }))]} />
            <Dropdown label="Программа" value={track} onChange={setTrack} options={[{ value: 'all', label: 'Все программы' }, ...TRACKS.map((t) => ({ value: t.key, label: t.label }))]} />
            {(owner !== 'all' || type !== 'all' || track !== 'all' || lateOnly || day) && (
              <button type="button" className="dash-link" onClick={resetFilters}>Сбросить</button>
            )}
          </div>

          {groups.length === 0 && (
            <div className="dash-empty">
              {horizon.length === 0 ? 'На ближайшие 7 дней сроков нет. Задачи появятся здесь, когда у пунктов в ЛК будут даты.' : 'Под эти фильтры ничего не подходит.'}
            </div>
          )}

          {groups.map((g) => (
            <div key={g.key} className="dash-group">
              <div className={`dash-group-head${g.hot ? ' is-hot' : ''}${g.today ? ' is-today' : ''}`}>
                <b>{g.title}</b><span>{countOf(g.key)}</span><i />
              </div>
              {g.items.map((t) => {
                const s = byId.get(t.studentId)!
                const isLate = t.due! < today
                return (
                  <button key={t.key} type="button" className={`dash-row${isLate ? ' is-late' : ''}`} onClick={() => onOpenStudent(t.studentId)} title="Открыть карточку студента">
                    <i className="dash-bar" style={{ background: TYPE_META[t.type].color }} />
                    <Avatar name={s.name} />
                    <span className="dash-person"><b>{s.name}</b><small>{s.email}</small></span>
                    <span className="dash-item">
                      <b>{t.text}</b>
                      <small className={isLate ? 'is-hot' : ''}>
                        {[TYPE_META[t.type].label, t.where, t.owner ? OWNER_SHORT[t.owner] : null, isLate ? relDue(t.due!, today) : null].filter(Boolean).join(' · ')}
                      </small>
                    </span>
                    {t.stage && <span className="dash-stage">{t.stage}</span>}
                    <span className="dash-go"><ArrowRight /></span>
                  </button>
                )
              })}
            </div>
          ))}

          {list.length > PAGE && (
            <button type="button" className="dash-more" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Свернуть' : `Ещё ${list.length - PAGE} ${plural(list.length - PAGE, 'задача', 'задачи', 'задач')}`}
              <ChevronDown style={{ transform: showAll ? 'rotate(180deg)' : undefined }} />
            </button>
          )}
        </section>

        <aside className="dash-side">
          <section className="dash-card">
            <div className="dash-card-head"><h3>Требуют внимания</h3><span className="dash-chip">{attention.length}</span></div>
            {attention.length === 0 && <div className="dash-empty">Всё под контролем.</div>}
            {(attnAll ? attention : attention.slice(0, 5)).map((a) => (
              <button key={a.s.id} type="button" className="dash-note" onClick={() => onOpenStudent(a.s.id)}>
                <b>{a.s.name}</b>
                {a.reasons.map((r) => <span key={r.text} className={r.hot ? 'is-hot' : ''}>{r.text}</span>)}
                {a.note && <em>«{a.note.length > 140 ? `${a.note.slice(0, 140)}…` : a.note}»</em>}
              </button>
            ))}
            {attention.length > 5 && <button type="button" className="dash-link" onClick={() => setAttnAll((v) => !v)}>{attnAll ? 'Свернуть' : `Показать всех (${attention.length})`}</button>}
          </section>

          <section className="dash-card">
            <div className="dash-card-head"><h3>Что изменилось</h3><button type="button" className="dash-link" onClick={onOpenLog}>Весь журнал →</button></div>
            {events.length === 0 && <div className="dash-empty">Журнал начнёт заполняться с сегодняшнего дня: каждое перемещение пункта, новый срок и смена статуса вуза.</div>}
            {events.slice(0, 6).map((e, i) => (
              <button key={`${e.s.id}-${e.at}-${i}`} type="button" className="dash-event" onClick={() => onOpenStudent(e.s.id)}>
                <i style={{ background: eventColor(e) }} />
                <span><b>{e.s.name} · {eventText(e)}</b><small>{relTime(e.at, today)} · {actorLabel(e)}</small></span>
              </button>
            ))}
          </section>

          <section className="dash-card">
            <div className="dash-card-head"><h3>Окна подачи</h3><span className="dash-muted">90 дней</span></div>
            {windows.length === 0 && <div className="dash-empty">В ближайшие 90 дней подача никуда не открывается.</div>}
            {(winAll ? windows : windows.slice(0, 4)).map((w, i) => {
              const n = daysBetween(today, w.opens)
              return (
                <button key={w.key} type="button" className={`dash-window${i === 0 ? ' is-first' : ''}`} onClick={() => onOpenStudent(w.s.id)}>
                  <span className="dash-date"><b>{Number(w.opens.slice(8))}</b><small>{fmtDay(w.opens).split(' ')[1]}</small></span>
                  <span><b>{w.uni} — открывается подача</b><small>{n === 0 ? 'сегодня' : `через ${n} ${plural(n, 'день', 'дня', 'дней')}`} · {w.s.name}{w.deadline ? ` · до ${fmtDay(w.deadline)}` : ''}</small></span>
                </button>
              )
            })}
            {windows.length > 4 && <button type="button" className="dash-link" onClick={() => setWinAll((v) => !v)}>{winAll ? 'Свернуть' : `Все окна (${windows.length})`}</button>}
          </section>
        </aside>
      </div>
    </>
  )
}
