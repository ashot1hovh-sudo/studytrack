// The student app's sections as the analytics see them. Shared by the
// tracker, the write route (as an allowlist) and the admin «Аналитика» page.

export const SECTION_LABEL: Record<string, string> = {
  dashboard: 'Главная',
  'learning-start': 'Начало обучения',
  checklist: 'Чек-лист',
  universities: 'Вузы',
  deadlines: 'Дедлайны',
  chances: 'Кейсы поступлений',
}

export const isSection = (s: unknown): s is string => typeof s === 'string' && s in SECTION_LABEL

export type AnalyticsKind = 'view' | 'paywall'

export type AnalyticsPing = {
  id: string
  kind: AnalyticsKind
  section: string
  item: string | null
  title: string | null
  seconds: number
}
