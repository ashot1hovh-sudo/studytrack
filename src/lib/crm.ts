// Shared CRM constants, block model, and serializers.
//
// Pure data + functions (no 'use client') so both the API routes and the client
// component import the same source of truth — the brief's "keep this list in one
// shared constant, not duplicated between frontend and backend".

export type CrmStageColor = 'gray' | 'brown' | 'orange' | 'green' | 'red'

export const STAGES: { id: string; label: string; color: CrmStageColor }[] = [
  { id: 'anketa', label: 'Анкета отправлена', color: 'gray' },
  { id: 'primary_selection', label: 'Первичный подбор', color: 'brown' },
  { id: 'final_selection', label: 'Финальный список', color: 'brown' },
  { id: 'exam_prep', label: 'Подготовка к экзаменам', color: 'orange' },
  { id: 'date_x_planning', label: 'Планирование даты X', color: 'orange' },
  { id: 'docs_collection', label: 'Сбор документов', color: 'orange' },
  { id: 'translation', label: 'Перевод и финализация', color: 'orange' },
  { id: 'application', label: 'Подача заявок', color: 'brown' },
  { id: 'monitoring', label: 'Мониторинг / Ожидание', color: 'gray' },
  { id: 'result', label: 'Admission / Pre-admission', color: 'green' },
  { id: 'rejected', label: 'Отказ', color: 'red' },
]

export const STAGE_BY_ID: Record<string, { id: string; label: string; color: CrmStageColor }> =
  Object.fromEntries(STAGES.map((s) => [s.id, s]))

export const PROGRAMS: { id: string; label: string }[] = [
  { id: 'language-year', label: 'Языковой год' },
  { id: 'prevuz', label: 'Предвуз' },
  { id: 'bachelor', label: 'Бакалавриат' },
]

export const EXAM_TYPES = ['CSCA Math', 'CSCA Physics', 'IELTS', 'HSK']
export const EXAM_STATUSES = ['Не сдан', 'Записан', 'Сдан'] as const

export const DOC_TEMPLATE = [
  'Загранпаспорт',
  'Фото по требованиям визы',
  'Справка о несудимости',
  'Медицинское обследование',
  'Школьные оценки (10 класс)',
  'Оценки 1 полугодия 11 класса',
  'Справка о зачислении в школу',
  'Рекомендательные письма',
  'Мотивационное письмо',
  'Банковская выписка',
  'Резюме',
  'Портфолио',
]

// ---------------------------------------------------------------------------
// Block model
// ---------------------------------------------------------------------------

export type ExamStatus = (typeof EXAM_STATUSES)[number]

export type TextBlock = { id: string; type: 'text'; title: string; text: string; size: 'sm' | 'md' | 'lg' }
export type ChecklistBlock = {
  id: string
  type: 'checklist'
  title: string
  items: { id: string; text: string; done: boolean }[]
}
export type ExamTableBlock = {
  id: string
  type: 'exam_table'
  title: string
  rows: { id: string; name: string; status: ExamStatus; score: string }[]
}
export type Block = TextBlock | ChecklistBlock | ExamTableBlock

let __blockIdCounter = 1
export function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${__blockIdCounter++}`
}

// The 4 default blocks a brand-new client is seeded with. After creation every
// block is freely addable/editable/deletable — this is only the starting shape.
export function defaultBlocks(): Block[] {
  return [
    { id: genId('blk'), type: 'text', title: 'Профиль студента', text: '', size: 'md' },
    { id: genId('blk'), type: 'text', title: 'Заметки по этапу', text: '', size: 'md' },
    {
      id: genId('blk'),
      type: 'exam_table',
      title: 'Экзамены',
      rows: EXAM_TYPES.map((t) => ({ id: genId('row'), name: t, status: 'Не сдан' as ExamStatus, score: '' })),
    },
    {
      id: genId('blk'),
      type: 'checklist',
      title: 'Чек-лист документов',
      items: DOC_TEMPLATE.map((d) => ({ id: genId('item'), text: d, done: false })),
    },
  ]
}

// ---------------------------------------------------------------------------
// Client shape (camelCase, as the API returns it)
// ---------------------------------------------------------------------------

export type CrmClientUniversity = {
  id: number
  universityName: string
  program: string | null
  universitySource: string | null
}

export type CrmClient = {
  id: string
  name: string
  parentName: string | null
  telegramId: string | null
  anketaDone: boolean
  anketaLink: string | null
  podborLink: string | null
  stage: string
  stageDeadline: string | null
  dateX: string | null
  program: string
  blocks: Block[]
  universities: CrmClientUniversity[]
  createdAt: string
  updatedAt: string
}

export function serializeClient(row: Record<string, any>, universities: CrmClientUniversity[] = []): CrmClient {
  return {
    id: row.id,
    name: row.name,
    parentName: row.parent_name,
    telegramId: row.telegram_id,
    anketaDone: !!row.anketa_done,
    anketaLink: row.anketa_link,
    podborLink: row.podbor_link,
    stage: row.stage,
    stageDeadline: row.stage_deadline,
    dateX: row.date_x,
    program: row.program,
    blocks: Array.isArray(row.blocks) ? (row.blocks as Block[]) : [],
    universities,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function serializeClientUniversity(row: Record<string, any>): CrmClientUniversity {
  return {
    id: row.id,
    universityName: row.university_name,
    program: row.program,
    universitySource: row.university_source,
  }
}

export const CLIENT_COLUMNS =
  'id,name,parent_name,telegram_id,anketa_done,anketa_link,podbor_link,stage,stage_deadline,date_x,program,blocks,created_at,updated_at'

// Map incoming camelCase → DB columns for PATCH. Only these may be updated.
export const CLIENT_FIELD_MAP: Record<string, string> = {
  name: 'name',
  parentName: 'parent_name',
  telegramId: 'telegram_id',
  anketaDone: 'anketa_done',
  anketaLink: 'anketa_link',
  podborLink: 'podbor_link',
  stage: 'stage',
  stageDeadline: 'stage_deadline',
  dateX: 'date_x',
  program: 'program',
  blocks: 'blocks',
}
