'use client'

/**
 * «Таймлайн»: the common checklist and the selected university's own list on
 * one time axis, grouped like the boards (Экзамены, Собрать, Написать…).
 * Each card is a bar from its start to its deadline. Colour means status
 * only; the coral line is today, the navy one the university's deadline.
 *
 * Cards without dates still get a bar, placed by a stable guess (the same on
 * every load): a missing start fades in from the left, a card with no dates
 * at all is hatched. So the family can tell a real plan from an estimate.
 * Iana sets real dates on the cards («Начало», «Срок»).
 */
import { Check } from 'lucide-react'
import { DONE_STAGE, GROUPS, OWNER_LABEL, stageLabel, stagesOf, type GroupKey, type LkItem, type LkUniPublic } from '@/lib/lk/types'

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const DAY = 86400000
const todayYmd = () => new Date().toLocaleDateString('sv-SE')
const toMs = (ymd: string) => new Date(`${ymd}T00:00:00`).getTime()
const toYmd = (ms: number) => new Date(ms).toLocaleDateString('sv-SE')
const short = (ymd: string) => {
  const [, m, d] = ymd.split('-').map(Number)
  return `${d} ${MONTHS_SHORT[m - 1]}`
}

/** A stable number per card, so a guessed bar stays put between loads. */
function hash(s: string) {
  let h = 2166136261
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return h >>> 0
}

/** `guess`: which ends are estimates. 'start' = only the start, 'all' = both. */
type Bar = { t: LkItem; uni: boolean; start: string; end: string; guess: 'none' | 'start' | 'end' | 'all' }

function place(t: LkItem, uni: boolean, today: string): Bar {
  const h = hash(t.id)
  const len = 14 + (h % 32) // 2 to 6½ weeks
  if (t.start && t.due) return { t, uni, start: t.start <= t.due ? t.start : t.due, end: t.due, guess: 'none' }
  if (t.due) return { t, uni, start: toYmd(toMs(t.due) - len * DAY), end: t.due, guess: 'start' }
  if (t.start) return { t, uni, start: t.start, end: toYmd(toMs(t.start) + len * DAY), guess: 'end' }
  const from = toMs(today) + ((h >>> 8) % 45) * DAY
  return { t, uni, start: toYmd(from), end: toYmd(from + len * DAY), guess: 'all' }
}

type Status = 'todo' | 'doing' | 'done' | 'late'
function statusOf(b: Bar, today: string): Status {
  if (b.t.stage === DONE_STAGE) return 'done'
  // Only a real deadline can be missed.
  if ((b.guess === 'none' || b.guess === 'start') && b.end < today) return 'late'
  return b.t.stage === stagesOf(b.t.group)[0].key ? 'todo' : 'doing'
}

export default function LkTimeline({ common, uni }: { common: LkItem[]; uni: LkUniPublic | null }) {
  const today = todayYmd()
  const bars = [...common.map((t) => place(t, false, today)), ...(uni?.items ?? []).map((t) => place(t, true, today))]
  if (!bars.length) {
    return <p className="v2-lk-nolist">Яна добавит документы и сроки, и здесь появится таймлайн подготовки.</p>
  }

  // The axis: from a week before the earliest start (or today) to ten days
  // after the latest deadline (or the university's), at least two months.
  const deadline = uni?.deadline.date ?? null
  const applyBy = uni?.applyBy ?? null
  const lo = Math.min(toMs(today), ...bars.map((b) => toMs(b.start)), applyBy ? toMs(applyBy) : Infinity) - 7 * DAY
  let hi = Math.max(toMs(today), ...bars.map((b) => toMs(b.end)), deadline ? toMs(deadline) : 0) + 10 * DAY
  if (hi - lo < 60 * DAY) hi = lo + 60 * DAY
  const at = (ms: number) => ((ms - lo) / (hi - lo)) * 100
  const pct = (ymd: string) => at(toMs(ymd))

  // Month boundaries (labelled) and Mondays (a faint grid).
  const months: { left: number; label: string }[] = []
  const first = new Date(lo)
  for (let d = new Date(first.getFullYear(), first.getMonth() + 1, 1); d.getTime() < hi; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    months.push({ left: at(d.getTime()), label: d.getMonth() === 0 ? `${MONTHS_SHORT[0]} ${d.getFullYear()}` : MONTHS_SHORT[d.getMonth()] })
  }
  const weeks: number[] = []
  const monday = new Date(lo)
  monday.setDate(monday.getDate() + ((8 - monday.getDay()) % 7))
  for (let t = monday.getTime(); t < hi; t += 7 * DAY) weeks.push(at(t))

  const groups = GROUPS.map((g) => {
    const list = bars.filter((b) => b.t.group === g.key).sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))
    return { ...g, bars: list, done: list.filter((b) => b.t.done).length }
  }).filter((g) => g.bars.length)

  const has = (s: Status) => bars.some((b) => statusOf(b, today) === s)
  const todayAt = pct(today)
  const deadlineAt = deadline ? pct(deadline) : null
  const applyAt = applyBy ? pct(applyBy) : null
  let n = 0 // stagger index for the entrance

  return (
    <div className="v2-tl">
      <div className="v2-tl-legend" aria-label="Обозначения">
        <span><i className="sw is-todo" />Не начато</span>
        <span><i className="sw is-doing" />В работе</span>
        <span><i className="sw is-done" />Готово</span>
        {has('late') && <span><i className="sw is-late" />Срок прошёл</span>}
        {bars.some((b) => b.guess !== 'none') && <span><i className="sw is-guess" />Примерные даты, Яна уточнит</span>}
        {bars.some((b) => b.uni) && <span><i className="dot" />Только для {uni!.short}</span>}
      </div>

      <div className="v2-tl-scroll">
        <div className="v2-tl-grid">
          {/* grid lines, today and the deadline run behind every row */}
          <div className="v2-tl-bg" aria-hidden>
            {weeks.map((w) => <i key={`w${w}`} className="wk" style={{ left: `${w}%` }} />)}
            {months.map((m) => <i key={`m${m.left}`} className="mo" style={{ left: `${m.left}%` }} />)}
            {deadlineAt !== null && <i className="dl" style={{ left: `${deadlineAt}%` }} />}
            {applyAt !== null && <i className="ab" style={{ left: `${applyAt}%` }} />}
            <i className="td" style={{ left: `${todayAt}%` }} />
          </div>

          <div className="v2-tl-row is-axis">
            <div className="v2-tl-lab" />
            <div className="v2-tl-track">
              {months.map((m) => <span key={m.left} className="v2-tl-month" style={{ left: `${m.left}%` }}>{m.label}</span>)}
              {deadlineAt !== null && (
                <span className={`v2-tl-flag is-deadline${deadlineAt > 82 ? ' is-flip' : ''}`} style={{ left: `${deadlineAt}%` }}>
                  Дедлайн {uni!.short} · {short(deadline!)}
                </span>
              )}
              {applyAt !== null && (
                // Top row next to «Сегодня» unless the two would touch; then the bottom row.
                <span className={`v2-tl-flag is-apply${Math.abs(applyAt - todayAt) < 12 ? ' is-low' : ''}${applyAt > 82 ? ' is-flip' : ''}`} style={{ left: `${applyAt}%` }}>
                  Подаём до · {short(applyBy!)}
                </span>
              )}
              <span className={`v2-tl-flag is-today${todayAt > 82 ? ' is-flip' : ''}`} style={{ left: `${todayAt}%` }}>Сегодня</span>
            </div>
          </div>

          {groups.map((g) => {
            const from = g.bars.reduce((m, b) => (b.start < m ? b.start : m), g.bars[0].start)
            const to = g.bars.reduce((m, b) => (b.end > m ? b.end : m), g.bars[0].end)
            return (
              <section key={g.key} className="v2-tl-group" aria-label={g.title}>
                <div className="v2-tl-row is-head">
                  <div className="v2-tl-lab">
                    <b>{g.title}</b>
                    <span className="num">{g.done}/{g.bars.length}</span>
                  </div>
                  <div className="v2-tl-track">
                    <i className="v2-tl-span" style={{ left: `${pct(from)}%`, width: `${Math.max(pct(to) - pct(from), 0.6)}%` }} />
                  </div>
                </div>
                {g.bars.map((b) => <Row key={`${b.uni ? 'u' : 'c'}-${b.t.id}`} b={b} group={g.key} uniShort={uni?.short ?? ''} pct={pct} today={today} n={n++} />)}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Row({ b, group, uniShort, pct, today, n }: { b: Bar; group: GroupKey; uniShort: string; pct: (ymd: string) => number; today: string; n: number }) {
  const { t } = b
  const left = pct(b.start)
  const width = Math.max(pct(b.end) - left, 0.8)
  const status = statusOf(b, today)
  const flip = left + width > 84 // no room on the right: the date goes before the bar
  const range = `${short(b.start)} → ${short(b.end)}`
  const title = [
    t.text,
    `${stageLabel(group, t.stage)} · ${OWNER_LABEL[t.owner]}`,
    b.guess === 'none' ? range : b.guess === 'start' ? `до ${short(b.end)}, начало примерно ${short(b.start)}` : `примерно ${range}`,
    t.note,
  ].filter(Boolean).join('\n')
  const when = status === 'done' ? 'готово' : b.guess === 'all' || b.guess === 'end' ? `≈ ${short(b.end)}` : `до ${short(b.end)}`
  return (
    <div className={`v2-tl-row is-${status}`}>
      <div className="v2-tl-lab">
        <span className="name">{t.text}</span>
        {b.uni && <i className="dot" title={`Только для ${uniShort}`} aria-label={`Только для ${uniShort}`} />}
      </div>
      <div className="v2-tl-track">
        <div className={`v2-tl-bar is-${status} guess-${b.guess}`} style={{ left: `${left}%`, width: `${width}%`, ['--n' as string]: n }} title={title}>
          {status === 'done' && <Check aria-hidden />}
        </div>
        <span className="v2-tl-when" style={flip ? { right: `calc(${100 - left}% + 8px)` } : { left: `calc(${left + width}% + 8px)` }}>{when}</span>
      </div>
    </div>
  )
}
