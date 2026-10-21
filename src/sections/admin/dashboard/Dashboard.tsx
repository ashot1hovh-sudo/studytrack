'use client'

/**
 * Iana's «Дашборд»: deadlines, who is where and the big timeline for every
 * сопровождение student, read-only. Everything is worked out from the ЛК data
 * she already keeps; any change happens in the student's card, which every
 * row opens. Styled with the v2 brand (navy/coral on cream, Unbounded).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { LayoutGrid, LogOut, RefreshCw, Search, Star, User, GraduationCap, X } from 'lucide-react'
import type { LkDataPublic } from '@/lib/lk/types'
import { display } from '@/app/v2/_ui/font'
import { actorLabel, allEvents, eventColor, eventText, greeting, isoDay, relTime, stageOf, type DashStudent, type StudentStage } from './derive'
import WeekView from './WeekView'
import StudentsView from './StudentsView'
import TimelineView from './TimelineView'
import '@/app/v2/v2.css'
import './dashboard.css'

export type DashNav = 'premium' | 'diy' | 'shortlists' | 'sync'
type View = 'week' | 'students' | 'timeline'

export default function Dashboard({ students, userName, navTabs = ['premium', 'diy', 'shortlists'], onNav, onOpenStudent, onRefresh, onLogout }: {
  /** Premium students from /api/admin/students. */
  students: { id: string; fullName: string; email: string }[]
  userName: string | null
  /** The other admin tabs this build has, for the sidebar. */
  navTabs?: DashNav[]
  onNav: (tab: DashNav) => void
  onOpenStudent: (id: string) => void
  onRefresh: () => void
  onLogout: () => void
}) {
  const [lk, setLk] = useState<Record<string, LkDataPublic> | null>(null)
  const [at, setAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<View>(() => {
    try { const v = sessionStorage.getItem('dash-view'); return v === 'students' || v === 'timeline' ? v : 'week' } catch { return 'week' }
  })
  const [query, setQuery] = useState('')
  const [stage, setStage] = useState<'all' | StudentStage>('all')
  const [logOpen, setLogOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetch('/api/admin/dashboard', { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json().catch(() => null)
        if (!r.ok) throw new Error(d?.error ?? 'Не удалось загрузить данные')
        setLk(d.lk ?? {})
        setAt(new Date())
        setNow(new Date())
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Не удалось загрузить данные'))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => { try { sessionStorage.setItem('dash-view', view) } catch {} }, [view])
  // Keep «today» right if the tab stays open past midnight.
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t) }, [])

  const today = isoDay(now)
  const all: DashStudent[] = useMemo(
    () => students.map((s) => ({ id: s.id, name: s.fullName?.trim() || s.email, email: s.email, lk: lk?.[s.id] ?? null })),
    [students, lk],
  )
  const q = query.trim().toLowerCase()
  const shown = q ? all.filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)) : all
  const choosing = all.filter((s) => stageOf(s.lk) === 'choosing').length
  const refresh = () => { onRefresh(); load() }
  const name = userName && !/админ/i.test(userName) ? userName.split(' ')[0] : null

  const titles: Record<View, { h: string; sub: string }> = {
    week: { h: `${greeting(now)}${name ? `, ${name}` : ''}`, sub: `${all.length} студентов на сопровождении · ${all.length - choosing} уже со списком вузов · ${choosing} ещё выбирают` },
    students: { h: 'Студенты', sub: `${all.length} студентов на сопровождении · где кто сейчас` },
    timeline: { h: 'Таймлайн', sub: 'Экзамены, документы и окна подачи всех студентов' },
  }

  return (
    <div className={`v2 ${display.variable} dash`}>
      <div className="dash-shell">
        <aside className="dash-sidebar">
          <div className="dash-brand"><span>КайКитай</span><em>АДМИН</em></div>
          <div className="dash-navlabel">Обзор</div>
          <button type="button" className="dash-nav is-on"><LayoutGrid />Дашборд</button>
          <div className="dash-navlabel">Клиенты</div>
          <button type="button" className="dash-nav" onClick={() => onNav('premium')}><Star />Премиум клиенты</button>
          <button type="button" className="dash-nav" onClick={() => onNav('diy')}><User />DIY клиенты</button>
          <div className="dash-navlabel">Вузы</div>
          <button type="button" className="dash-nav" onClick={() => onNav('shortlists')}><GraduationCap />Подбор вузов</button>
          {navTabs.includes('sync') && <button type="button" className="dash-nav" onClick={() => onNav('sync')}><RefreshCw />Синхронизация базы</button>}
          <div className="dash-foot">
            <span className="dash-ava dash-ava-navy">{(name ?? 'Я')[0]}</span>
            <span><b>{name ?? 'Яна'}</b><small>Куратор сопровождения</small></span>
            <button type="button" onClick={onLogout} title="Выйти" aria-label="Выйти"><LogOut /></button>
          </div>
        </aside>

        <main className="dash-main">
          <div className="dash-top">
            <span className="dash-muted">Сегодня {now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            <div className="dash-top-right">
              <label className="dash-search">
                <Search />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Найти студента по имени или email" />
                {query && <button type="button" onClick={() => setQuery('')} aria-label="Очистить"><X /></button>}
              </label>
              <button type="button" className="dash-fresh" onClick={refresh} title="Обновить данные">
                <i className={loading ? 'is-loading' : error ? 'is-error' : ''} />
                {loading ? 'Обновляем…' : at ? `Данные на ${at.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : 'Загрузка…'}
              </button>
            </div>
          </div>

          <header className="dash-header">
            <div>
              <h1>{titles[view].h}</h1>
              <p>{titles[view].sub}{q ? ` · найдено ${shown.length}` : ''}</p>
            </div>
            <div className="dash-tabs" role="tablist">
              {([['week', 'Неделя'], ['students', 'Студенты'], ['timeline', 'Таймлайн']] as [View, string][]).map(([v, label]) => (
                <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? 'is-on' : ''} onClick={() => setView(v)}>{label}</button>
              ))}
            </div>
          </header>

          {error && (
            <div className="dash-error">
              {error}. <button type="button" className="dash-link" onClick={load}>Повторить</button>
            </div>
          )}
          {!lk && !error && <div className="dash-card dash-empty">Загружаем данные студентов…</div>}

          {lk && view === 'week' && (
            <WeekView students={shown} today={today} onOpenStudent={onOpenStudent} onOpenLog={() => setLogOpen(true)} onShowChoosing={() => { setStage('choosing'); setView('students') }} />
          )}
          {lk && view === 'students' && <StudentsView students={shown} today={today} stage={stage} onStage={setStage} onOpenStudent={onOpenStudent} />}
          {lk && view === 'timeline' && <TimelineView students={shown} today={today} onOpenStudent={onOpenStudent} />}
        </main>
      </div>

      {logOpen && <LogModal students={all} today={today} onClose={() => setLogOpen(false)} onOpenStudent={(id) => { setLogOpen(false); onOpenStudent(id) }} />}
    </div>
  )
}

function LogModal({ students, today, onClose, onOpenStudent }: { students: DashStudent[]; today: string; onClose: () => void; onOpenStudent: (id: string) => void }) {
  const [who, setWho] = useState<'all' | 'iana' | 'family'>('all')
  const events = allEvents(students).filter((e) => who === 'all' || e.actor === who)
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div className="dash-modal" role="dialog" aria-modal="true" aria-label="Журнал изменений" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="dash-modal-card">
        <div className="dash-card-head">
          <h2>Журнал изменений</h2>
          <button type="button" className="dash-round" onClick={onClose} aria-label="Закрыть"><X /></button>
        </div>
        <div className="dash-seg" role="radiogroup" aria-label="Кто">
          {([['all', 'Все'], ['iana', 'Яна'], ['family', 'Семьи']] as const).map(([v, l]) => (
            <button key={v} type="button" role="radio" aria-checked={who === v} className={who === v ? 'is-on' : ''} onClick={() => setWho(v)}>{l}</button>
          ))}
        </div>
        <div className="dash-modal-list">
          {events.length === 0 && <div className="dash-empty">Пока пусто. Журнал пишется с момента запуска дашборда.</div>}
          {events.slice(0, 300).map((e, i) => (
            <button key={`${e.s.id}-${e.at}-${i}`} type="button" className="dash-event" onClick={() => onOpenStudent(e.s.id)}>
              <i style={{ background: eventColor(e) }} />
              <span><b>{e.s.name} · {eventText(e)}</b><small>{relTime(e.at, today)} · {actorLabel(e)}</small></span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
