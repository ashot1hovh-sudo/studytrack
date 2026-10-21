'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, ArrowUpDown } from 'lucide-react'
import { TRACK_LABEL, TRACKS, type TrackKey } from '@/lib/lk/types'
import { daysBetween, isoDay, relAgo, relDue, STAGES, studentRows, type DashStudent, type StudentRow, type StudentStage } from './derive'
import { Avatar, Dropdown, Seg } from './ui'

type Sort = 'deadline' | 'name' | 'progress' | 'updated'
const PER_PAGE = 12

export default function StudentsView({ students, today, stage, onStage, onOpenStudent }: {
  students: DashStudent[]
  today: string
  stage: 'all' | StudentStage
  onStage: (s: 'all' | StudentStage) => void
  onOpenStudent: (id: string) => void
}) {
  const [track, setTrack] = useState<'all' | TrackKey | 'none'>('all')
  const [sort, setSort] = useState<Sort>('deadline')
  const [page, setPage] = useState(0)

  const rows = useMemo(() => studentRows(students), [students])
  const counts = Object.fromEntries(STAGES.map((s) => [s.key, rows.filter((r) => r.stage === s.key).length])) as Record<StudentStage, number>
  const trackCount = (k: TrackKey | 'none') => rows.filter((r) => (k === 'none' ? !r.track : r.track === k)).length

  const filtered = rows
    .filter((r) => (stage === 'all' || r.stage === stage) && (track === 'all' || (track === 'none' ? !r.track : r.track === track)))
    .sort(compare(sort))
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const cur = Math.min(page, pages - 1)
  const shown = filtered.slice(cur * PER_PAGE, (cur + 1) * PER_PAGE)
  useEffect(() => { setPage(0) }, [stage, track, sort, students])

  const total = rows.length || 1

  return (
    <>
      <section className="dash-card">
        <div className="dash-card-head">
          <h2>Где сейчас студенты</h2>
          <span className="dash-muted">
            {TRACKS.filter((t) => trackCount(t.key)).map((t) => `${t.label} ${trackCount(t.key)}`).join(' · ')}
            {trackCount('none') ? ` · без программы ${trackCount('none')}` : ''}
          </span>
        </div>
        <div className="dash-stackbar">
          {STAGES.filter((s) => counts[s.key]).map((s) => (
            <i key={s.key} style={{ flexGrow: counts[s.key] / total, background: s.color }} title={`${s.label}: ${counts[s.key]}`} />
          ))}
        </div>
        <div className="dash-stages">
          {STAGES.map((s) => (
            <button key={s.key} type="button" className={`dash-stagecell${stage === s.key ? ' is-sel' : ''}${counts[s.key] ? '' : ' is-zero'}`} onClick={() => onStage(stage === s.key ? 'all' : s.key)} style={{ ['--c' as string]: s.color }}>
              <span><i />{s.label}</span>
              <strong>{counts[s.key]}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="dash-card">
        <div className="dash-toolbar">
          <div className="dash-filters">
            <Seg
              label="Программа"
              value={track}
              onChange={setTrack}
              options={[
                { value: 'all', label: `Все · ${rows.length}` },
                ...TRACKS.filter((t) => trackCount(t.key)).map((t) => ({ value: t.key, label: `${t.label} · ${trackCount(t.key)}` })),
                ...(trackCount('none') ? [{ value: 'none' as const, label: `Не указана · ${trackCount('none')}` }] : []),
              ]}
            />
            <Dropdown label="Статус" value={stage} onChange={onStage} options={[{ value: 'all', label: 'Все статусы' }, ...STAGES.map((s) => ({ value: s.key, label: s.label, dot: s.color }))]} />
          </div>
          <Dropdown
            label="Сортировка"
            icon={<ArrowUpDown className="dash-pill-ico" />}
            value={sort}
            onChange={setSort}
            options={[
              { value: 'deadline', label: 'Сначала ближайший дедлайн' },
              { value: 'updated', label: 'Сначала давно не обновлялись' },
              { value: 'progress', label: 'Сначала меньше готово' },
              { value: 'name', label: 'По имени' },
            ]}
          />
        </div>

        <div className="dash-thead">
          <span>Студент</span><span>Программа</span><span>Вузы</span><span>Готовность</span><span>Ближайший дедлайн</span><span>Обновлено</span><span />
        </div>
        {shown.length === 0 && <div className="dash-empty">Под эти фильтры никто не подходит.</div>}
        {shown.map((r) => {
          const late = !!r.next && r.next.due! < today
          const idle = !r.updated || daysBetween(isoDay(new Date(r.updated)), today) >= 10
          return (
            <button key={r.s.id} type="button" className={`dash-srow${late ? ' is-late' : ''}`} onClick={() => onOpenStudent(r.s.id)} title="Открыть карточку студента">
              <span className="dash-person dash-person-ava"><Avatar name={r.s.name} size={34} /><span><b>{r.s.name}</b><small>{r.s.email}</small></span></span>
              <span className="dash-prog"><b>{r.track ? TRACK_LABEL[r.track] : 'Программа не указана'}</b><small>{r.major ?? '—'}</small></span>
              <span className="dash-unis">
                {r.unis.length === 0 && <em className="is-choosing">Выбирает вузы</em>}
                {r.unis.slice(0, 2).map((u) => <em key={u} title={u}>{u.length > 18 ? `${u.slice(0, 17)}…` : u}</em>)}
                {r.unis.length > 2 && <em className="is-more" title={r.unis.slice(2).join(', ')}>+{r.unis.length - 2}</em>}
              </span>
              <span className="dash-ready">
                <b>{r.pct === null ? '—' : `${r.pct}%`}</b>
                <i><b style={{ width: `${r.pct ?? 0}%` }} /></i>
                {r.total > 0 && <small>{r.done} из {r.total}</small>}
              </span>
              <span className="dash-next">
                {r.next ? (<><b>{r.next.text}{r.next.type === 'apply' ? ` — ${r.next.where}` : ''}</b><small className={late ? 'is-hot' : relDue(r.next.due!, today) === 'сегодня' ? 'is-today' : ''}>{relDue(r.next.due!, today)}</small></>) : (<><b className="dash-muted">Сроков нет</b><small>{r.undated ? `${r.undated} без даты` : ''}</small></>)}
              </span>
              <span className={`dash-upd${idle ? ' is-hot' : ''}`}>{relAgo(r.updated, today)}</span>
              <span className="dash-go"><ArrowRight /></span>
            </button>
          )
        })}

        <div className="dash-pager">
          <span className="dash-muted">{filtered.length ? `Показаны ${cur * PER_PAGE + 1}–${cur * PER_PAGE + shown.length} из ${filtered.length}` : ''}</span>
          {pages > 1 && (
            <div>
              {Array.from({ length: pages }, (_, i) => (
                <button key={i} type="button" className={i === cur ? 'is-on' : ''} onClick={() => setPage(i)}>{i + 1}</button>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

function compare(sort: Sort) {
  return (a: StudentRow, b: StudentRow) => {
    if (sort === 'name') return a.s.name.localeCompare(b.s.name, 'ru')
    if (sort === 'progress') return (a.pct ?? -1) - (b.pct ?? -1)
    if (sort === 'updated') return (a.updated ?? '').localeCompare(b.updated ?? '')
    // Nearest deadline first; students without any date go last.
    const ad = a.next?.due ?? '9999', bd = b.next?.due ?? '9999'
    return ad.localeCompare(bd) || a.s.name.localeCompare(b.s.name, 'ru')
  }
}
