// Everything Iana's dashboard shows, worked out from the students' ЛК data.
// Pure functions only: the views call them with the loaded data and today's
// date, so nothing here fetches or stores anything.

import {
  paymentsSummary,
  progressAll,
  rub,
  stageLabel,
  stagesOf,
  STATUS_LABEL,
  type AppStatus,
  type GroupKey,
  type LkDataPublic,
  type LkEvent,
  type Owner,
  type TrackKey,
} from '@/lib/lk/types'
import { plural } from '@/app/v2/_ui/plural'

export type DashStudent = { id: string; name: string; email: string; lk: LkDataPublic | null }

// ---------- dates (YYYY-MM-DD strings, local calendar days) ----------

export function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const toUtc = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}
export function addDays(iso: string, n: number) {
  const t = new Date(toUtc(iso) + n * 86400000)
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`
}
/** b − a in whole days. */
export const daysBetween = (a: string, b: string) => Math.round((toUtc(b) - toUtc(a)) / 86400000)

const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const MON = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
export const MONTH_TITLE = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
const weekday = (iso: string) => new Date(toUtc(iso)).getUTCDay()

/** «22 окт» */
export function fmtDay(iso: string) {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MON[m - 1]}`
}
/** «чт, 22 окт» */
export const fmtDayWd = (iso: string) => `${WD[weekday(iso)]}, ${fmtDay(iso)}`
export const wd = (iso: string) => WD[weekday(iso)]

/** «сегодня», «завтра», «чт, 22 окт», or «просрочено на 4 дня». */
export function relDue(due: string, today: string) {
  const n = daysBetween(today, due)
  if (n < 0) return `просрочено на ${-n} ${plural(-n, 'день', 'дня', 'дней')}`
  if (n === 0) return 'сегодня'
  if (n === 1) return 'завтра'
  return fmtDayWd(due)
}

/** «сегодня, 09:12», «вчера, 21:40», «19 окт, 12:20» for a timestamp. */
export function relTime(at: string, today: string) {
  const d = new Date(at)
  if (Number.isNaN(d.getTime())) return ''
  const day = isoDay(d)
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const n = daysBetween(day, today)
  if (n === 0) return `сегодня, ${hm}`
  if (n === 1) return `вчера, ${hm}`
  return `${fmtDay(day)}, ${hm}`
}

/** «сегодня», «вчера», «5 дней назад» for the last update. */
export function relAgo(at: string | null, today: string) {
  if (!at) return 'не обновлялось'
  const n = daysBetween(isoDay(new Date(at)), today)
  if (n <= 0) return 'сегодня'
  if (n === 1) return 'вчера'
  return `${n} ${plural(n, 'день', 'дня', 'дней')} назад`
}

// ---------- task types ----------

export type TaskType = GroupKey | 'apply' | 'payment'
export const TYPE_META: Record<TaskType, { label: string; color: string }> = {
  exams: { label: 'Экзамены', color: '#1A237E' },
  collect: { label: 'Документы', color: '#E88F5C' },
  write: { label: 'Письма', color: '#FF4F13' },
  contact: { label: 'Связь с вузом', color: '#2F7D4F' },
  apply: { label: 'Подача в вуз', color: '#C14330' },
  other: { label: 'Другое', color: 'rgba(18, 19, 26, 0.32)' },
  payment: { label: 'Оплата', color: '#8A6D3B' },
}
export const TYPE_ORDER: TaskType[] = ['exams', 'collect', 'write', 'contact', 'apply', 'other', 'payment']
export const OWNER_SHORT: Record<Owner, string> = { student: 'Студент', parent: 'Родитель', iana: 'Яна' }

export type DashTask = {
  key: string
  studentId: string
  type: TaskType
  text: string
  /** University short name, «Общие документы», or a note for payments. */
  where: string
  owner: Owner | null
  stage: string | null
  /** Position of the current stage (0 = first) and how many stages the group has. */
  stageIdx: number
  stageCount: number
  start: string | null
  due: string | null
  done: boolean
  doneAt: string | null
  /** Iana's comment and the short note on the item, as the family sees them. */
  comment: string | null
  note: string | null
}

export type TaskStatus = 'todo' | 'progress' | 'done' | 'late'
export const STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: 'Не начато', color: '#1A237E' },
  progress: { label: 'В работе', color: '#1A237E' },
  done: { label: 'Готово', color: '#2F7D4F' },
  late: { label: 'Просрочено', color: '#FF4F13' },
}
export function taskStatus(t: DashTask, today: string): TaskStatus {
  if (t.done) return 'done'
  if (t.due && t.due < today) return 'late'
  return t.stageIdx > 0 ? 'progress' : 'todo'
}
/** Share of the stages already passed, 0..1. */
export const taskProgress = (t: DashTask) => (t.done ? 1 : t.stageCount > 1 ? t.stageIdx / (t.stageCount - 1) : 0)

const COMMON_WHERE = 'Общие документы'

/**
 * Every dated thing a student has to do: checklist items (common and per
 * university), our «Подаём до» target and the university's own deadline while
 * the application is being prepared, and the сопровождение payment.
 * Items without any date are returned too (due null) so views can count them.
 */
export function tasksOf(s: DashStudent): DashTask[] {
  const lk = s.lk
  if (!lk) return []
  const out: DashTask[] = []
  const item = (where: string, uniKey: string) => (t: LkDataPublic['common'][number]) => {
    const stages = stagesOf(t.group)
    out.push({
      key: `${s.id}:${uniKey}:${t.id}`,
      studentId: s.id,
      type: t.group,
      text: t.text.trim() || 'Без названия',
      where,
      owner: t.owner,
      stage: stageLabel(t.group, t.stage),
      stageIdx: Math.max(0, stages.findIndex((x) => x.key === t.stage)),
      stageCount: stages.length,
      start: t.start,
      due: t.due,
      done: t.done,
      doneAt: t.done_at,
      comment: t.comment,
      note: t.note,
    })
  }
  const extra = { stageIdx: 0, stageCount: 1, done: false, doneAt: null, comment: null, note: null }
  lk.common.forEach(item(COMMON_WHERE, 'common'))
  for (const u of lk.unis) {
    const where = u.short || u.name
    u.items.forEach(item(where, u.id))
    if (u.status !== 'preparing') continue
    if (u.applyBy) {
      out.push({ ...extra, key: `${s.id}:${u.id}:applyBy`, studentId: s.id, type: 'apply', text: 'Подать заявку', where, owner: 'iana', stage: STATUS_LABEL[u.status], start: u.opens, due: u.applyBy })
    }
    if (u.deadline.date && u.deadline.date !== u.applyBy) {
      out.push({ ...extra, key: `${s.id}:${u.id}:deadline`, studentId: s.id, type: 'apply', text: u.deadline.label || 'Дедлайн вуза', where, owner: 'iana', stage: STATUS_LABEL[u.status], start: null, due: u.deadline.date })
    }
  }
  const pay = paymentsSummary(lk.payments)
  if (lk.payments.due && pay.left !== null && pay.left > 0) {
    out.push({ ...extra, key: `${s.id}:payment`, studentId: s.id, type: 'payment', text: 'Оплата сопровождения', where: `осталось ${rub(pay.left)}`, owner: 'parent', stage: null, start: null, due: lk.payments.due })
  }
  return out
}

/** Open, dated tasks of everyone, earliest first. */
export function openTasks(students: DashStudent[]) {
  return students
    .flatMap(tasksOf)
    .filter((t) => !t.done && t.due)
    .sort((a, b) => (a.due! < b.due! ? -1 : a.due! > b.due! ? 1 : a.studentId.localeCompare(b.studentId)))
}

// ---------- where each student is ----------

export type StudentStage = 'choosing' | 'preparing' | 'submitted' | 'interview' | 'decision'
export const STAGES: { key: StudentStage; label: string; color: string }[] = [
  { key: 'choosing', label: 'Выбирают вузы', color: '#E88F5C' },
  { key: 'preparing', label: 'Готовим заявки', color: '#1A237E' },
  { key: 'submitted', label: 'Заявки поданы', color: '#5C6BC0' },
  { key: 'interview', label: 'Интервью', color: '#2F7D4F' },
  { key: 'decision', label: 'Есть решение вуза', color: '#C14330' },
]

/** One stage per student: the furthest any of their universities has got. */
export function stageOf(lk: LkDataPublic | null): StudentStage {
  const st = new Set<AppStatus>((lk?.unis ?? []).map((u) => u.status))
  if (!lk || lk.unis.length === 0) return 'choosing'
  if (st.has('accepted') || st.has('waitlist') || st.has('rejected')) return 'decision'
  if (st.has('interview')) return 'interview'
  if (st.has('submitted')) return 'submitted'
  return 'preparing'
}

export type StudentRow = {
  s: DashStudent
  stage: StudentStage
  track: TrackKey | null
  major: string | null
  unis: string[]
  pct: number | null
  done: number
  total: number
  next: DashTask | null
  updated: string | null
  undated: number
}

export function studentRows(students: DashStudent[]): StudentRow[] {
  return students.map((s) => {
    const all = tasksOf(s)
    const open = all.filter((t) => !t.done && t.due).sort((a, b) => (a.due! < b.due! ? -1 : 1))
    const p = s.lk ? progressAll(s.lk) : { done: 0, total: 0 }
    return {
      s,
      stage: stageOf(s.lk),
      track: s.lk?.profile.track ?? null,
      major: s.lk?.profile.major ?? null,
      unis: (s.lk?.unis ?? []).map((u) => u.short || u.name),
      pct: p.total ? Math.round((p.done / p.total) * 100) : null,
      done: p.done,
      total: p.total,
      next: open[0] ?? null,
      updated: s.lk?.updated_at ?? null,
      undated: all.filter((t) => !t.done && !t.due).length,
    }
  })
}

// ---------- attention, change log, windows ----------

export type Attention = { s: DashStudent; reasons: { text: string; hot: boolean }[]; note: string | null; score: number }

/** Students who need a look: late items, no universities, untouched for long, many undated items, or Iana's own note. */
export function attentionList(students: DashStudent[], today: string): Attention[] {
  const rows = studentRows(students)
  const out: Attention[] = []
  for (const r of rows) {
    const reasons: Attention['reasons'] = []
    let score = 0
    const late = tasksOf(r.s).filter((t) => !t.done && t.due && t.due < today).length
    if (late) { reasons.push({ text: `${late} ${plural(late, 'просроченная задача', 'просроченные задачи', 'просроченных задач')}`, hot: true }); score += 10 + late }
    if (r.stage === 'choosing') { reasons.push({ text: 'Вузы ещё не выбраны', hot: false }); score += 5 }
    const idle = r.updated ? daysBetween(isoDay(new Date(r.updated)), today) : null
    if (idle === null || idle >= 10) { reasons.push({ text: idle === null ? 'ЛК ещё не заполнялся' : `Не обновлялось ${idle} ${plural(idle, 'день', 'дня', 'дней')}`, hot: false }); score += 3 }
    if (r.undated >= 3) { reasons.push({ text: `${r.undated} ${plural(r.undated, 'задача', 'задачи', 'задач')} без срока`, hot: false }); score += 1 }
    const note = r.s.lk?.internal?.notes?.trim() || null
    if (note) score += 2
    if (reasons.length || note) out.push({ s: r.s, reasons, note, score })
  }
  return out.sort((a, b) => b.score - a.score || a.s.name.localeCompare(b.s.name, 'ru'))
}

export type DashEvent = LkEvent & { s: DashStudent }

export function allEvents(students: DashStudent[]): DashEvent[] {
  return students
    .flatMap((s) => (s.lk?.log ?? []).map((e) => ({ ...e, s })))
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
}

/** «Мотивационное письмо → Драфт написан», in plain words. */
export function eventText(e: LkEvent) {
  const where = e.uni ? ` (${e.uni})` : ''
  switch (e.kind) {
    case 'stage': return `${e.item ?? 'Пункт'}${where} → ${e.to}`
    case 'status': return `${e.uni}: ${e.from} → ${e.to}`
    case 'due': return e.to ? `${e.item ?? 'Пункт'}${where}: срок ${fmtDay(e.to)}` : `${e.item ?? 'Пункт'}${where}: срок убран`
    case 'uni_add': return `Добавлен вуз ${e.uni}`
    case 'uni_remove': return `Убран вуз ${e.uni}`
  }
}
export const actorLabel = (e: LkEvent) => (e.actor === 'family' ? 'семья' : 'Яна')
export const eventColor = (e: LkEvent) =>
  e.kind === 'stage' && e.to && /готово|сдано/i.test(e.to) ? '#2F7D4F' : e.actor === 'family' ? '#FF4F13' : '#1A237E'

export type UniWindow = { key: string; s: DashStudent; uni: string; opens: string; deadline: string | null }

/** Application windows opening within `days` days, for universities still being prepared. */
export function upcomingWindows(students: DashStudent[], today: string, days = 90): UniWindow[] {
  const end = addDays(today, days)
  return students
    .flatMap((s) =>
      (s.lk?.unis ?? [])
        .filter((u) => u.status === 'preparing' && u.opens && u.opens >= today && u.opens <= end)
        .map((u) => ({ key: `${s.id}:${u.id}`, s, uni: u.short || u.name, opens: u.opens!, deadline: u.deadline.date })),
    )
    .sort((a, b) => (a.opens < b.opens ? -1 : 1))
}

export function initials(name: string) {
  const parts = name.replace(/[()]/g, ' ').trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

export function greeting(now: Date) {
  const h = now.getHours()
  return h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер'
}
