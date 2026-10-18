// The ЛК demo for students without сопровождение (DIY): their own name and
// the universities from their «Вузы» tracker, with an example checklist,
// so they see what the service looks like. Nothing here is stored; it is
// rebuilt on every request, the same way for the same student (seeded by id).
// Server-only (reads the catalogue).

import { getLkCatalog } from './catalog'
import { normalizeUni } from './normalize'
import { emptyLk, STARTER_COMMON, STARTER_UNI, type AppStatus, type GroupKey, type LkData, type LkItem, type Owner, stagesOf } from './types'

/** Used when the tracker has fewer than two universities. */
const FALLBACK = ['Zhejiang University', 'Sun Yat-sen University', 'Shenzhen University']
const STATUSES: AppStatus[] = ['submitted', 'preparing', 'interview']
const TONES = ['navy', 'coral', 'tint'] as const

const ITEM_COMMENTS: Record<string, string> = {
  Загранпаспорт: 'Пример: нужен скан всех страниц, включая пустые.',
  'Учебный план (Study Plan)': 'Пример: у вуза свой шаблон, Яна пришлёт его вместе с подсказками.',
  'Выписка о доступном остатке из банка': 'Пример: сумма и срок выписки зависят от вуза, Яна уточнит.',
}
const OWNERS: Partial<Record<string, Owner>> = { 'Выписка о доступном остатке из банка': 'parent', Интервью: 'iana', 'Рекомендательное письмо 1': 'iana' }

/** Small deterministic generator: the demo looks the same on every reload. */
function rng(seed: string) {
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

const plusDays = (n: number) => new Date(Date.now() + n * 86400000).toLocaleDateString('sv-SE')
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9а-яё]+/g, ' ').trim()

export type TrackerUni = { name: string; city: string | null; major: string | null; deadline: string | null }

export async function buildDemoLk(studentId: string, tracker: TrackerUni[]): Promise<LkData> {
  const rand = rng(studentId)
  const catalog = await getLkCatalog().catch(() => [])
  const find = (name: string) => catalog.find((c) => norm(c.name) === norm(name) || (c.nameRu && norm(c.nameRu) === norm(name)))

  const picked: TrackerUni[] = tracker.filter((u) => u.name.trim()).slice(0, 3)
  for (const name of FALLBACK) {
    if (picked.length >= 2) break
    if (!picked.some((u) => norm(u.name) === norm(name))) picked.push({ name, city: null, major: null, deadline: null })
  }

  // `reach`: how far along the boards look (0..1), so the demo looks lived in.
  // Dates: spread over the next months, so the timeline has something to show.
  const demoItems = (list: typeof STARTER_UNI, prefix: string, reach: number): LkItem[] =>
    list.map((s, j) => {
      const stages = stagesOf(s.group as GroupKey)
      const stage = stages[Math.min(stages.length - 1, Math.floor(rand() * stages.length * reach * 1.6))].key
      const from = Math.round(rand() * 70) - 20
      return {
        id: `${prefix}-${j}`,
        group: s.group,
        text: s.text,
        owner: OWNERS[s.text] ?? 'student',
        stage,
        done: stage === 'done',
        start: plusDays(from),
        due: plusDays(from + 14 + Math.round(rand() * 40)),
        note: s.note ?? null,
        comment: ITEM_COMMENTS[s.text] ?? null,
        done_at: null,
      }
    })
  const common = demoItems(STARTER_COMMON, 'demo-common', 0.6)

  const unis = picked.map((t, i) => {
    const c = find(t.name)
    // The first university is further along.
    const items = demoItems(STARTER_UNI, `demo-${i}`, i === 0 ? 0.75 : 0.4)
    const short = c?.name ?? t.name
    return normalizeUni({
      id: `demo-${i}`,
      ref: { kind: 'free', key: null },
      short,
      name: c?.name ?? t.name,
      nameCn: c?.nameCn ?? null,
      country: 'Китай',
      city: t.city ?? c?.city ?? '',
      program: t.major ?? 'Пример программы',
      tone: c?.tone ?? TONES[i % TONES.length],
      status: STATUSES[i % STATUSES.length],
      deadline: { label: 'Дедлайн подачи', date: t.deadline ?? plusDays(45 + i * 30) },
      comment: { text: 'Пример комментария: здесь Яна пишет, что сейчас важно по этому вузу и какой следующий шаг.', at: plusDays(-2) },
      items,
    })
  })

  return { ...emptyLk(), subtitle: 'Демо-версия кабинета', common, unis, updated_at: new Date().toISOString() }
}
