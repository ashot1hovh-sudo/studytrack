'use client'

/**
 * «Аналитика»: what students do in the app. Time per section and per lesson,
 * which locked lessons free students try to open, who spends the most time,
 * and which universities students add to their tracker. Read-only; all
 * numbers are worked out here from GET /api/admin/analytics.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Clock, Lock, UserPlus, Users } from 'lucide-react'
import { SECTION_LABEL } from '@/lib/analytics/sections'
import type { AdminStudent, AdminUni, AdminView } from '@/lib/analytics/server'
import { Seg, Toggle } from './ui'

type Days = '7' | '30' | '90' | 'all'
type Plan = 'all' | 'free' | 'paid'
type Data = { views: AdminView[]; unis: AdminUni[]; students: AdminStudent[]; firstViewAt: string | null; since: string | null; at: string }

const PER_PAGE = 15

// Students type some names by hand; these are the ones seen so far.
const UNI_ALIAS: Record<string, string> = {
  'фудань': 'Fudan University',
  'чжэцзянский университет': 'Zhejiang University',
}
const uniName = (n: string) => { const t = n.trim(); return UNI_ALIAS[t.toLowerCase()] ?? t }

export function fmtDur(s: number) {
  if (s < 60) return `${Math.round(s)} с`
  const m = Math.round(s / 60)
  if (m < 60) return `${m} мин`
  return `${Math.floor(m / 60)} ч ${m % 60} мин`
}
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
const plural = (n: number, one: string, few: string, many: string) => {
  const a = n % 10, b = n % 100
  return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many
}

type Agg = { key: string; title: string; students: Set<string>; views: number; seconds: number }
function group(rows: AdminView[], keyOf: (v: AdminView) => string, titleOf: (v: AdminView) => string): Agg[] {
  const m = new Map<string, Agg>()
  for (const v of rows) {
    const k = keyOf(v)
    const a = m.get(k) ?? { key: k, title: titleOf(v), students: new Set<string>(), views: 0, seconds: 0 }
    a.students.add(v.student_id)
    a.views += 1
    a.seconds += v.seconds
    if (v.item_title) a.title = titleOf(v)
    m.set(k, a)
  }
  return [...m.values()]
}

const itemTitle = (v: AdminView) => {
  const t = v.item_title ?? v.item ?? ''
  return v.item?.startsWith('module:') ? `Модуль: ${t}` : t
}

export default function AnalyticsView() {
  const [days, setDays] = useState<Days>('30')
  const [plan, setPlan] = useState<Plan>('all')
  const [hideTeam, setHideTeam] = useState(true)
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/admin/analytics?days=${days === 'all' ? 0 : days}`, { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json().catch(() => null)
        if (!r.ok) throw new Error(d?.error ?? 'Не удалось загрузить аналитику')
        setData(d)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Не удалось загрузить аналитику'))
      .finally(() => setLoading(false))
  }, [days])
  useEffect(() => { load() }, [load])

  const people = useMemo(() => new Map((data?.students ?? []).map((s) => [s.id, s])), [data])
  const keep = (id: string) => { const s = people.get(id); return !!s && !(hideTeam && s.team) }

  // Views are filtered by the access the student had at the time; universities
  // and registrations by the access they have now.
  const views = useMemo(
    () => (data?.views ?? []).filter((v) => keep(v.student_id) && (plan === 'all' || v.plan === plan)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, plan, hideTeam, people],
  )
  const nowPlanOk = (s: AdminStudent) => plan === 'all' || (plan === 'paid') === s.paid
  const seen = views.filter((v) => v.kind === 'view')
  const locks = views.filter((v) => v.kind === 'paywall')

  const activeIds = new Set(seen.map((v) => v.student_id))
  const totalSec = seen.reduce((n, v) => n + v.seconds, 0)
  const signups = (data?.students ?? []).filter((s) => !(hideTeam && s.team) && nowPlanOk(s) && (!data?.since || s.createdAt >= data.since))
  const lockIds = new Set(locks.map((v) => v.student_id))

  const sections = group(seen, (v) => v.section, (v) => SECTION_LABEL[v.section] ?? v.section).sort((a, b) => b.seconds - a.seconds)
  const items = group(seen.filter((v) => v.item), (v) => v.item!, itemTitle).sort((a, b) => b.students.size - a.students.size || b.seconds - a.seconds)
  const locked = group(locks, (v) => v.item ?? '', itemTitle).sort((a, b) => b.students.size - a.students.size || b.views - a.views)
  const maxSec = Math.max(1, ...sections.map((s) => s.seconds))

  const periodLabel = days === 'all' ? 'за всё время' : `за ${days} ${plural(Number(days), 'день', 'дня', 'дней')}`
  const started = data?.firstViewAt ? fmtDate(data.firstViewAt) : null

  return (
    <>
      <header className="dash-header">
        <div>
          <h1>Аналитика</h1>
          <p>Что студенты делают в приложении · {periodLabel}{started ? ` · данные о просмотрах с ${started}` : ''}</p>
        </div>
        <button type="button" className="dash-fresh" onClick={load} title="Обновить данные">
          <i className={loading ? 'is-loading' : error ? 'is-error' : ''} />
          {loading ? 'Обновляем…' : data ? `Данные на ${new Date(data.at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : 'Загрузка…'}
        </button>
      </header>

      <section className="dash-card">
        <div className="dash-toolbar">
          <div className="dash-filters">
            <Seg label="Период" value={days} onChange={setDays} options={[{ value: '7', label: '7 дней' }, { value: '30', label: '30 дней' }, { value: '90', label: '90 дней' }, { value: 'all', label: 'Всё время' }]} />
            <Seg label="Доступ" value={plan} onChange={setPlan} options={[{ value: 'all', label: 'Все' }, { value: 'free', label: 'Бесплатные' }, { value: 'paid', label: 'Платные' }]} />
          </div>
          <Toggle on={hideTeam} onChange={setHideTeam} label="Без команды и тестов" />
        </div>
      </section>

      {error && <div className="dash-error">{error}. <button type="button" className="dash-link" onClick={load}>Повторить</button></div>}
      {!data && !error && <div className="dash-card dash-empty">Загружаем аналитику…</div>}

      {data && (
        <>
          <section className="dash-kpis">
            <Kpi icon={<Users />} title="Активные студенты" sub="Открывали приложение" value={String(activeIds.size)} />
            <Kpi icon={<Clock />} title="Время в приложении" sub={activeIds.size ? `≈ ${fmtDur(totalSec / activeIds.size)} на студента` : 'Пока нет данных'} value={fmtDur(totalSec)} text />
            <Kpi icon={<Lock />} title="Нажали на замок" sub={`${locks.length} ${plural(locks.length, 'клик', 'клика', 'кликов')} по закрытым урокам`} value={String(lockIds.size)} />
            <Kpi icon={<UserPlus />} title="Регистрации" sub={periodLabel[0].toUpperCase() + periodLabel.slice(1)} value={String(signups.length)} />
          </section>

          {!data.firstViewAt && (
            <div className="dash-card dash-an-note">
              Сбор просмотров только начался: строки появляются, когда студент открывает приложение с новой версией.
              Пока она не выложена на app.kaykitay.ru, сюда попадают только просмотры с localhost. Рейтинг вузов ниже уже настоящий.
            </div>
          )}

          <div className="dash-an-grid">
            <section className="dash-card">
              <div className="dash-card-head"><h2>Разделы</h2><span className="dash-muted">по времени</span></div>
              {sections.length ? (
                <table className="dash-an-table">
                  <thead><tr><th>Раздел</th><th className="num">Студ.</th><th className="num">Сред. визит</th><th className="num">Всего</th></tr></thead>
                  <tbody>
                    {sections.map((s) => (
                      <tr key={s.key}>
                        <td><span className="dash-an-name"><b>{s.title}</b><small>{s.views} {plural(s.views, 'просмотр', 'просмотра', 'просмотров')}</small></span><div className="dash-an-bar"><i style={{ width: `${(s.seconds / maxSec) * 100}%` }} /></div></td>
                        <td className="num">{s.students.size}</td>
                        <td className="num">{fmtDur(s.seconds / s.views)}</td>
                        <td className="num">{fmtDur(s.seconds)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div className="dash-empty">Пока нет просмотров.</div>}
            </section>

            <section className="dash-card">
              <div className="dash-card-head"><h2>Закрытые уроки</h2><span className="dash-muted">что пытались открыть без доступа</span></div>
              {locked.length ? (
                <table className="dash-an-table">
                  <thead><tr><th>Урок</th><th className="num">Студ.</th><th className="num">Кликов</th></tr></thead>
                  <tbody>
                    {locked.map((s) => (
                      <tr key={s.key}><td><span className="dash-an-name"><b>{s.title}</b></span></td><td className="num">{s.students.size}</td><td className="num">{s.views}</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : <div className="dash-empty">Пока никто не нажимал на замок.</div>}
            </section>
          </div>

          <Lessons items={items} />
          <StudentsTime views={seen} people={people} />
          <UniRanking unis={data.unis} people={people} hideTeam={hideTeam} plan={plan} />
        </>
      )}
    </>
  )
}

function Kpi({ icon, title, sub, value, text }: { icon: ReactNode; title: string; sub: string; value: string; text?: boolean }) {
  return (
    <div className="dash-kpi">
      <div className="dash-kpi-top"><div><b>{title}</b><span>{sub}</span></div><i>{icon}</i></div>
      <strong className={text ? 'is-text' : ''}>{value}</strong>
    </div>
  )
}

function Lessons({ items }: { items: Agg[] }) {
  const [all, setAll] = useState(false)
  const shown = all ? items : items.slice(0, PER_PAGE)
  return (
    <section className="dash-card">
      <div className="dash-card-head"><h2>Уроки и модули</h2><span className="dash-muted">«Начало обучения» · по числу студентов</span></div>
      {items.length ? (
        <>
          <table className="dash-an-table">
            <thead><tr><th>Урок</th><th className="num">Студ.</th><th className="num">Просм.</th><th className="num">Сред. визит</th><th className="num">Всего</th></tr></thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.key}>
                  <td><span className="dash-an-name"><b>{s.title}</b></span></td>
                  <td className="num">{s.students.size}</td>
                  <td className="num">{s.views}</td>
                  <td className="num">{fmtDur(s.seconds / s.views)}</td>
                  <td className="num">{fmtDur(s.seconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length > PER_PAGE && <button type="button" className="dash-link" onClick={() => setAll((v) => !v)}>{all ? 'Свернуть' : `Показать все ${items.length}`}</button>}
        </>
      ) : <div className="dash-empty">Пока никто не открывал уроки.</div>}
    </section>
  )
}

function StudentsTime({ views, people }: { views: AdminView[]; people: Map<string, AdminStudent> }) {
  const [page, setPage] = useState(0)
  const rows = useMemo(() => {
    const m = new Map<string, { id: string; seconds: number; last: string; bySection: Map<string, number>; lessons: Set<string> }>()
    for (const v of views) {
      const r = m.get(v.student_id) ?? { id: v.student_id, seconds: 0, last: v.updated_at, bySection: new Map(), lessons: new Set() }
      r.seconds += v.seconds
      if (v.updated_at > r.last) r.last = v.updated_at
      r.bySection.set(v.section, (r.bySection.get(v.section) ?? 0) + v.seconds)
      if (v.item && !v.item.startsWith('module:')) r.lessons.add(v.item)
      m.set(v.student_id, r)
    }
    return [...m.values()].sort((a, b) => b.seconds - a.seconds)
  }, [views])
  useEffect(() => { setPage(0) }, [views])
  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE))
  const cur = Math.min(page, pages - 1)
  return (
    <section className="dash-card">
      <div className="dash-card-head"><h2>Студенты</h2><span className="dash-muted">кто сколько времени провёл</span></div>
      {rows.length ? (
        <>
          <table className="dash-an-table">
            <thead><tr><th>Студент</th><th>Доступ</th><th>Больше всего</th><th className="num">Уроков</th><th className="num">Время</th><th className="num">Был</th></tr></thead>
            <tbody>
              {rows.slice(cur * PER_PAGE, (cur + 1) * PER_PAGE).map((r) => {
                const s = people.get(r.id)
                const top = [...r.bySection.entries()].sort((a, b) => b[1] - a[1])[0]
                return (
                  <tr key={r.id}>
                    <td><span className="dash-an-name"><b>{s?.name ?? '—'}</b><small>{s?.email}</small></span></td>
                    <td><PlanTag s={s} /></td>
                    <td>{top ? `${SECTION_LABEL[top[0]] ?? top[0]} · ${fmtDur(top[1])}` : '—'}</td>
                    <td className="num">{r.lessons.size}</td>
                    <td className="num">{fmtDur(r.seconds)}</td>
                    <td className="num">{fmtDate(r.last)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {pages > 1 && (
            <div className="dash-pager">
              <span className="dash-muted">{rows.length} {plural(rows.length, 'студент', 'студента', 'студентов')}</span>
              <div>
                {Array.from({ length: pages }, (_, i) => (
                  <button key={i} type="button" className={i === cur ? 'is-on' : ''} onClick={() => setPage(i)}>{i + 1}</button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : <div className="dash-empty">Пока нет данных.</div>}
    </section>
  )
}

function PlanTag({ s }: { s?: AdminStudent }) {
  if (!s) return null
  if (s.team) return <span className="dash-an-tag">Команда</span>
  if (s.premium) return <span className="dash-an-tag is-paid">Сопровождение</span>
  return <span className={`dash-an-tag${s.paid ? ' is-paid' : ''}`}>{s.paid ? 'Платный' : 'Бесплатный'}</span>
}

function UniRanking({ unis, people, hideTeam, plan }: { unis: AdminUni[]; people: Map<string, AdminStudent>; hideTeam: boolean; plan: Plan }) {
  const [open, setOpen] = useState<string | null>(null)
  const [all, setAll] = useState(false)
  const rows = useMemo(() => {
    const m = new Map<string, { name: string; free: Set<string>; paid: Set<string> }>()
    for (const u of unis) {
      const s = people.get(u.student_id)
      if (!s || (hideTeam && s.team) || (plan !== 'all' && (plan === 'paid') !== s.paid)) continue
      const name = uniName(u.name)
      const r = m.get(name) ?? { name, free: new Set(), paid: new Set() }
      ;(s.paid ? r.paid : r.free).add(s.id)
      m.set(name, r)
    }
    return [...m.values()].sort((a, b) => b.free.size + b.paid.size - (a.free.size + a.paid.size) || a.name.localeCompare(b.name))
  }, [unis, people, hideTeam, plan])
  const adders = new Set(rows.flatMap((r) => [...r.free, ...r.paid]))
  const shown = all ? rows : rows.slice(0, PER_PAGE)
  let place = 0, prev = -1
  return (
    <section className="dash-card">
      <div className="dash-card-head">
        <h2>Вузы в трекере</h2>
        <span className="dash-muted">за всё время · {adders.size} {plural(adders.size, 'студент добавил', 'студента добавили', 'студентов добавили')} вузы · нажмите на строку, чтобы увидеть кто</span>
      </div>
      {rows.length ? (
        <>
          <table className="dash-an-table">
            <thead><tr><th className="num">#</th><th>Вуз</th><th className="num">Всего</th><th className="num">Бесплатные</th><th className="num">Платные</th></tr></thead>
            <tbody>
              {shown.map((r, i) => {
                const n = r.free.size + r.paid.size
                if (n !== prev) { place = i + 1; prev = n }
                const isOpen = open === r.name
                const who = [...r.free, ...r.paid].map((id) => people.get(id)).filter(Boolean) as AdminStudent[]
                return (
                  <tr key={r.name} className="dash-an-row" onClick={() => setOpen(isOpen ? null : r.name)}>
                    <td className="num">{place}</td>
                    <td>
                      <span className="dash-an-name"><b>{r.name}</b></span>
                      {isOpen && (
                        <div className="dash-an-who">
                          {who.sort((a, b) => Number(b.paid) - Number(a.paid) || a.name.localeCompare(b.name)).map((s) => (
                            <div key={s.id}>{s.name} · {s.email} · {s.paid ? 'платный' : 'бесплатный'}</div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="num"><b>{n}</b></td>
                    <td className="num">{r.free.size || '—'}</td>
                    <td className="num">{r.paid.size || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rows.length > PER_PAGE && <button type="button" className="dash-link" onClick={() => setAll((v) => !v)}>{all ? 'Свернуть' : `Показать все ${rows.length}`}</button>}
        </>
      ) : <div className="dash-empty">Никто ещё не добавил вуз.</div>}
    </section>
  )
}
