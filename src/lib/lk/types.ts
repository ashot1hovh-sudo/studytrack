// v2 «Личный кабинет» for сопровождение students: the data Iana edits in the
// admin panel and the family sees in /v2/lk. Shared by the store, the API
// routes and both UIs, so client code must not import anything server-only
// from here.
//
// Modelled on Iana's working file («Магистратура Яна.xlsx»): one card per
// university (sheet «Университеты») and, per university, a checklist of what
// has to be done before applying, grouped like her «План действий». The
// checklist has no fixed order: every family goes through it differently,
// and the goal is simply that everything gets ticked.

export type Owner = 'student' | 'parent' | 'iana'
export type Tone = 'navy' | 'coral' | 'cream' | 'tint'

export const OWNER_LABEL: Record<Owner, string> = { student: 'Студент', parent: 'Родитель', iana: 'Яна' }
export const TONES: Tone[] = ['navy', 'coral', 'cream', 'tint']

/**
 * Every item moves through its group's stages, left to right, in any order
 * Iana or the family likes. The last stage is always `done`: an item is done
 * exactly when it sits there. Exams are shown as a list with a status column;
 * the other groups as pipeline boards.
 */
export type Stage = { key: string; label: string }
const BASIC_STAGES: Stage[] = [
  { key: 'not_started', label: 'Не начато' },
  { key: 'in_progress', label: 'В работе' },
  { key: 'done', label: 'Готово' },
]

/** Groups of «План действий». The order here is only the display order. */
export const GROUPS = [
  {
    key: 'exams',
    title: 'Экзамены',
    hint: 'Сдать',
    stages: [
      { key: 'planned', label: 'В плане' },
      { key: 'registered', label: 'Зарегистрирован' },
      { key: 'waiting', label: 'Жду результата' },
      { key: 'done', label: 'Сдано' },
    ],
  },
  {
    // Notarised translation is a stage here, not a group of its own: one
    // document travels the whole way to «Готово».
    key: 'collect',
    title: 'Собрать',
    hint: 'Документы и нотариальный перевод',
    stages: [
      { key: 'not_started', label: 'Не начато' },
      { key: 'requested', label: 'Запрошено' },
      { key: 'original', label: 'Получен оригинал' },
      { key: 'translation', label: 'Отнесли на нот. перевод' },
      { key: 'done', label: 'Готово' },
    ],
  },
  {
    key: 'write',
    title: 'Написать',
    hint: 'Письма, Study Plan, CV',
    stages: [
      { key: 'not_started', label: 'Ещё не начато' },
      { key: 'draft', label: 'Драфт написан' },
      { key: 'done', label: 'Готово' },
    ],
  },
  { key: 'contact', title: 'Связь с вузом', hint: 'Интервью, письма от профессоров', stages: BASIC_STAGES },
  { key: 'other', title: 'Другое', hint: '', stages: BASIC_STAGES },
] as const satisfies readonly { key: string; title: string; hint: string; stages: readonly Stage[] }[]
export type GroupKey = (typeof GROUPS)[number]['key']
export const GROUP_KEYS = GROUPS.map((g) => g.key) as GroupKey[]
export const isGroupKey = (v: unknown): v is GroupKey => typeof v === 'string' && (GROUP_KEYS as string[]).includes(v)
export const groupOf = (k: GroupKey) => GROUPS.find((g) => g.key === k)!
export const stagesOf = (k: GroupKey): readonly Stage[] => groupOf(k).stages
export const DONE_STAGE = 'done'
export const firstStage = (k: GroupKey) => stagesOf(k)[0].key
export const isStageOf = (k: GroupKey, v: unknown): v is string => typeof v === 'string' && stagesOf(k).some((s) => s.key === v)
export const stageLabel = (k: GroupKey, stage: string) => stagesOf(k).find((s) => s.key === stage)?.label ?? stage

/** What the student is applying for, shown in big letters on Iana's student cards. */
export const TRACKS = [
  { key: 'bachelor', label: "Bachelor's" },
  { key: 'master', label: "Master's" },
  { key: 'foundation', label: 'Foundation' },
  { key: 'language', label: 'Language year' },
] as const
export type TrackKey = (typeof TRACKS)[number]['key']
export const isTrack = (v: unknown): v is TrackKey => typeof v === 'string' && TRACKS.some((t) => t.key === v)
export const TRACK_LABEL = Object.fromEntries(TRACKS.map((t) => [t.key, t.label])) as Record<TrackKey, string>

/** Iana's card for the student in the admin list. */
export type LkProfile = {
  track: TrackKey | null
  major: string | null
  /** Set when a photo was uploaded: a version token for cache-busting. */
  photo: string | null
}

/** Where the application stands. One value, not a path: Iana sets it. */
export const STATUSES = [
  { key: 'preparing', label: 'Готовим заявку' },
  { key: 'submitted', label: 'Заявка подана' },
  { key: 'interview', label: 'Интервью' },
  { key: 'accepted', label: 'Принят' },
  { key: 'waitlist', label: 'Лист ожидания' },
  { key: 'rejected', label: 'Отказ' },
] as const
export type AppStatus = (typeof STATUSES)[number]['key']
export const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.key, s.label])) as Record<AppStatus, string>
export const isStatus = (v: unknown): v is AppStatus => typeof v === 'string' && STATUSES.some((s) => s.key === v)

export type LkItem = {
  id: string
  group: GroupKey
  text: string
  owner: Owner
  /** One of the group's stages (see GROUPS). */
  stage: string
  /** Always `stage === 'done'`; kept so progress counts stay simple. */
  done: boolean
  /** YYYY-MM-DD: when work on it starts (the left end of its timeline bar). */
  start: string | null
  /** YYYY-MM-DD: deadline, or when it was done. */
  due: string | null
  /** Short visible note, e.g. «Сдан, 7.0» or «шаблон вуза». */
  note: string | null
  /** Iana's comment on this line, shown to the family under the item. */
  comment: string | null
  done_at: string | null
}

export type LkSource = { id: string; label: string; url: string; checked: string | null }

/** Where the university came from: our synced DB, the older catalogue, or typed by hand. */
export type LkRef = { kind: 'sync' | 'catalog' | 'free'; key: string | null }

export type LkUni = {
  id: string
  ref: LkRef
  short: string
  name: string
  nameCn: string | null
  country: string
  city: string
  program: string
  language: string
  tone: Tone
  art: string | null
  website: string | null
  /** Free text: «12», «1 международный». */
  rankChina: string | null
  /** Application window: opens (optional), our own «Подаём до» target, and the university's deadline. */
  opens: string | null
  /** YYYY-MM-DD: the date Iana and the family aim to apply by, before the official deadline. */
  applyBy: string | null
  deadline: { label: string; date: string | null }
  /** Free text, e.g. «35 000 ¥». */
  cost: string | null
  scholarships: string[]
  /** University admission contacts, shown to the family. */
  contacts: string | null
  /** Iana's working notes. Admin only, never sent to the family. */
  notes_internal?: string | null
  status: AppStatus
  /** Iana's comment on this university, shown to the family. */
  comment: { text: string; at: string } | null
  portal: {
    url: string | null
    login: string | null
    note: string | null
    /** «Пока нет информации»: the family sees that the login is coming; stored fields stay hidden. */
    pending: boolean
    /** Encrypted on disk; never sent to a browser. Use hasPassword + the reveal action. */
    password_enc?: string | null
  }
  items: LkItem[]
  sources: LkSource[]
  updated_at: string
}

/** One payment the family made for сопровождение. Amounts are whole rubles. */
export type LkPayment = { id: string; date: string | null; amount: number; note: string | null }

/** The сопровождение contract: total price and the payments so far. The family sees all of it. */
export type LkPayments = {
  total: number | null
  /** YYYY-MM-DD: when the rest is due, shown to the family as «Оплатить до». */
  due: string | null
  entries: LkPayment[]
}

/** Iana's working fields for this family. Admin only, never sent to the family. */
export type LkInternal = {
  /** What the family is ready to spend on the university, free text: «до 40 000 ¥ в год». */
  budget: string | null
  /** The company's private Telegram channel for this student (documents and updates). */
  telegram: string | null
  /** Free-form notes: contacts, parent, what to check next. */
  notes: string | null
}

export type LkData = {
  /**
   * Shape version. 2 = «Собрать» documents live in `common`, not in each
   * university (store.ts moves them once, on read, from older data).
   */
  v: number
  /** Line above the name in the hero, e.g. «11 класс · поступление 2027». */
  subtitle: string | null
  profile: LkProfile
  payments: LkPayments
  internal: LkInternal
  /**
   * «Общие документы»: the checklist shared by every university (passport,
   * IELTS, transcript…). Each university's own `items` hold only what that
   * university asks for on top. Shown side by side on the family's page.
   */
  common: LkItem[]
  unis: LkUni[]
  updated_at: string | null
}

/** What the family's browser gets: no password, no internal notes or fields. */
export type LkUniPublic = Omit<LkUni, 'portal' | 'notes_internal'> & {
  portal: { url: string | null; login: string | null; note: string | null; pending: boolean; hasPassword: boolean }
  notes_internal?: string | null
}
export type LkDataPublic = Omit<LkData, 'unis' | 'internal'> & { unis: LkUniPublic[]; internal?: LkInternal }

export const emptyProfile = (): LkProfile => ({ track: null, major: null, photo: null })
export const emptyPayments = (): LkPayments => ({ total: null, due: null, entries: [] })
export const emptyInternal = (): LkInternal => ({ budget: null, telegram: null, notes: null })
export const LK_VERSION = 2
export const emptyLk = (): LkData => ({ v: LK_VERSION, subtitle: null, profile: emptyProfile(), payments: emptyPayments(), internal: emptyInternal(), common: [], unis: [], updated_at: null })

/** Stands in for a university id when a family move targets the common checklist. */
export const COMMON_ID = 'common'

/** Paid so far and what is left (negative = paid more than the total). */
export function paymentsSummary(p: LkPayments) {
  const paid = p.entries.reduce((s, e) => s + e.amount, 0)
  return { paid, total: p.total, left: p.total === null ? null : p.total - paid }
}

/** «120 000 ₽». */
export const rub = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} ₽`

export function progressOf(u: Pick<LkUni, 'items'>) {
  return { done: u.items.filter((i) => i.done).length, total: u.items.length }
}

/** Everything needed to apply to one university: the common checklist plus its own. */
export function progressWith(common: LkItem[], u: Pick<LkUni, 'items'>) {
  const p = progressOf(u)
  const c = progressOf({ items: common })
  return { done: p.done + c.done, total: p.total + c.total }
}

/** One student card in the admin list (GET /api/admin/lk). */
export type LkCard = LkProfile & { unis: number; progress: { done: number; total: number } }

/** Progress over the common checklist and all universities, for Iana's student cards. */
export function progressAll(d: Pick<LkData, 'unis' | 'common'>) {
  return [{ items: d.common }, ...d.unis].reduce((a, u) => { const p = progressOf(u); return { done: a.done + p.done, total: a.total + p.total } }, { done: 0, total: 0 })
}

/** Move an item to a stage; keeps `done` / `done_at` in step with it. */
export function withStage(t: LkItem, stage: string): LkItem {
  if (t.stage === stage) return t
  const done = stage === DONE_STAGE
  return { ...t, stage, done, done_at: done ? (t.done ? t.done_at : new Date().toISOString()) : null }
}

/**
 * A starting checklist that mirrors Iana's «План действий», in her wording
 * (taken from her own lists, 2026-10-18). `common` items go to the checklist
 * shared by all universities, the rest to each university's own list.
 */
export const STARTER_ITEMS: { group: GroupKey; text: string; note?: string; common: boolean }[] = [
  { group: 'exams', text: 'IELTS', common: true },
  { group: 'collect', text: 'Загранпаспорт', note: 'Уточнить срок действия', common: true },
  { group: 'collect', text: 'Аттестат за 9 класс', note: 'Аттестат с приложением оценок', common: true },
  { group: 'collect', text: 'Выписка годовых оценок за 10 класс', note: 'Указать промежуточные оценки по полугодиям и годовые', common: true },
  { group: 'collect', text: 'Выписка промежуточных оценок за 11 класс', note: 'За первый семестр или четверть, в зависимости от вашей системы', common: true },
  { group: 'collect', text: 'Справка о зачислении в школу', note: 'С примерной датой выпуска', common: true },
  { group: 'collect', text: 'Справка о несудимости', note: 'Бумажная, с печатью', common: true },
  { group: 'collect', text: 'Медицинское обследование', note: 'Анализы на ВИЧ и сифилис, ЭКГ, флюорография', common: true },
  { group: 'collect', text: 'Выписка о доступном остатке из банка', note: '$5000 или эквивалент в рублях', common: true },
  { group: 'write', text: 'Мотивационное письмо', common: true },
  { group: 'write', text: 'Рекомендательное письмо 1', common: true },
  { group: 'write', text: 'Рекомендательное письмо 2', common: true },
  { group: 'write', text: 'Учебный план (Study Plan)', common: false },
  { group: 'contact', text: 'Интервью', common: false },
]
export const STARTER_COMMON = STARTER_ITEMS.filter((s) => s.common)
export const STARTER_UNI = STARTER_ITEMS.filter((s) => !s.common)

/** «Типовой список документов»: the «Собрать» part of the starter list. */
export const STARTER_DOCS = STARTER_ITEMS.filter((s) => s.group === 'collect')

/**
 * The old English starter names (before 2026-10-18) and their Russian
 * wording. Applied once, when store.ts brings older data to version 2.
 */
export const RENAMED_STARTERS: Record<string, string> = {
  passport: 'Загранпаспорт',
  'study certificate': 'Справка о зачислении в школу',
  transcript: 'Выписка оценок',
  'foreigner physical examination form': 'Медицинское обследование',
  'non-criminal record': 'Справка о несудимости',
  'bank statement': 'Выписка о доступном остатке из банка',
  'recommendation letter 1': 'Рекомендательное письмо 1',
  'recommendation letter 2': 'Рекомендательное письмо 2',
  'study plan': 'Учебный план (Study Plan)',
  cv: 'Резюме (CV)',
}
