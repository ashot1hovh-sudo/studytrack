/**
 * The document set required by virtually every Chinese university.
 *
 * `leadTimeDays` is how long the document takes to *obtain*, not how long it
 * takes to fill in — a справка о несудимости is ordered months before anyone
 * looks at it. Deadlines are derived as (earliest university deadline − lead
 * time), so the student is told when to *start*, which is the part people get
 * wrong.
 *
 * `scope: 'shared'` means one copy covers every university (you order one
 * police certificate). `scope: 'per-university'` means a separate copy per
 * university — only the motivation letter, which is normally written for a
 * specific programme.
 *
 * `leadTimeDays: null` means no deadline can be computed: the аттестат is gated
 * by the school's graduation date, not by a production time, so inventing a
 * date would be a guess presented as a fact.
 */
export type DocumentScope = 'shared' | 'per-university'

export type DocumentTemplate = {
  key: string
  name: string
  leadTimeDays: number | null
  scope: DocumentScope
  /** Shown under the document name — why this lead time exists. */
  hint: string
}

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    key: 'attestat',
    name: 'Аттестат об окончании 11 классов',
    leadTimeDays: null,
    scope: 'shared',
    hint: 'После выпуска из школы — дату ставите сами, когда будет известна',
  },
  {
    key: 'school_enrollment',
    name: 'Справка о зачислении в школу',
    leadTimeDays: 30,
    scope: 'shared',
    hint: 'Заказать минимум за 1 месяц — учителя могут долго делать',
  },
  {
    key: 'transcript_10',
    name: 'Годовые выписки оценок за 10 класс',
    leadTimeDays: 30,
    scope: 'shared',
    hint: 'Заказать минимум за 1 месяц — учителя могут долго делать',
  },
  {
    key: 'transcript_11',
    name: 'Годовые выписки оценок за 11 класс',
    leadTimeDays: 30,
    scope: 'shared',
    hint: 'Заказать минимум за 1 месяц — учителя могут долго делать',
  },
  {
    key: 'no_criminal_record',
    name: 'Справка о несудимости',
    // 2 months of buffer: official issuance is up to 30 days, but the real
    // problem is unpredictability (Госуслуги can be days, other routes weeks),
    // so the checklist plans for the slow case.
    leadTimeDays: 60,
    scope: 'shared',
    hint: 'Сроки разнятся: через Госуслуги бывает за пару дней, официально — до 30 дней. Закажите с запасом, ориентир — за 2 месяца до дедлайна',
  },
  {
    key: 'medical_exam',
    name: 'Медицинское обследование',
    leadTimeDays: 14,
    scope: 'shared',
    hint: 'Начать минимум за 2 недели',
  },
  {
    key: 'recommendation_letters',
    name: 'Рекомендательные письма',
    leadTimeDays: 30,
    scope: 'shared',
    hint: 'Попросить минимум за 1 месяц — учителя могут долго делать',
  },
  {
    key: 'motivation_letter',
    name: 'Мотивационное письмо',
    leadTimeDays: 14,
    scope: 'per-university',
    hint: 'Зависит от вас — кто-то пишет за день. Пишется под конкретный вуз',
  },
  {
    key: 'video_intro',
    name: 'Видео визитка',
    leadTimeDays: 14,
    scope: 'shared',
    hint: 'Зависит от вас — кто-то записывает за день',
  },
]

export const TEMPLATES_BY_KEY = new Map(DOCUMENT_TEMPLATES.map((t) => [t.key, t]))

/**
 * (earliest university deadline − lead time), as an ISO date.
 *
 * Returns null when there is nothing to derive from — no universities with a
 * deadline yet, or a document with no lead time. A null deadline shows as
 * "срок не задан" rather than as a wrong date.
 */
export function computeDocumentDeadline(
  earliestUniversityDeadline: string | null,
  leadTimeDays: number | null
): string | null {
  if (!earliestUniversityDeadline || leadTimeDays == null) return null

  const deadline = new Date(`${earliestUniversityDeadline}T00:00:00Z`)
  if (Number.isNaN(deadline.getTime())) return null

  deadline.setUTCDate(deadline.getUTCDate() - leadTimeDays)
  return deadline.toISOString().slice(0, 10)
}
