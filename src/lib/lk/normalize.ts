// Validation of what the admin editor sends. Everything is clipped and
// re-shaped here, so the store and the student page can trust the data.
// Links must be http(s): they are rendered as hrefs on the student page.

import { randomUUID } from 'node:crypto'
import { DONE_STAGE, firstStage, isGroupKey, isStageOf, isStatus, isTrack, TONES, type LkInternal, type LkItem, type LkPayment, type LkPayments, type LkProfile, type LkRef, type LkSource, type LkUni, type Owner, type Tone } from './types'

type Obj = Record<string, unknown>
const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {})
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

export const str = (v: unknown, max = 500): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')
export const strOrNull = (v: unknown, max = 500): string | null => str(v, max) || null
export const ymd = (v: unknown): string | null => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null)
export function url(v: unknown): string | null {
  const s = str(v, 1000)
  if (!s) return null
  try {
    const u = new URL(/^[a-z]+:\/\//i.test(s) ? s : `https://${s}`)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null
  } catch {
    return null
  }
}
const id = (v: unknown) => str(v, 64) || randomUUID()
const owner = (v: unknown): Owner => (v === 'parent' || v === 'iana' ? v : 'student')
const tone = (v: unknown): Tone => (TONES.includes(v as Tone) ? (v as Tone) : 'navy')

function item(v: unknown): LkItem | null {
  const t = obj(v)
  const text = str(t.text, 300)
  if (!text) return null
  const group = isGroupKey(t.group) ? t.group : 'other'
  // The stage decides; data saved before stages existed only has `done`.
  const stage = isStageOf(group, t.stage) ? t.stage : t.done === true ? DONE_STAGE : firstStage(group)
  const done = stage === DONE_STAGE
  return {
    id: id(t.id),
    group,
    text,
    owner: owner(t.owner),
    stage,
    done,
    start: ymd(t.start),
    due: ymd(t.due),
    note: strOrNull(t.note, 200),
    comment: strOrNull(t.comment, 2000),
    done_at: done ? strOrNull(t.done_at, 40) : null,
  }
}

const joinText = (a: unknown, b: unknown, max: number) => [str(a, max), str(b, max)].filter(Boolean).join(' · ').slice(0, max) || null

/**
 * Until 2026-10-16 notarised translation was its own group. It is now the
 * «Отнесли на нот. перевод» stage of «Собрать». A translation item that
 * names a document already in «Собрать» merges into it: done translation →
 * «Готово»; collected but not yet translated → «Получен оригинал».
 * Any other translation item moves to «Собрать» as it is.
 */
function foldTranslate(raw: unknown[]): unknown[] {
  const list = raw.map((x) => ({ ...obj(x) }))
  const key = (t: Obj) => str(t.text, 300).toLowerCase()
  const out: Obj[] = []
  for (const t of list) {
    if (t.group !== 'translate') { out.push(t); continue }
    const twin = list.find((c) => c.group === 'collect' && key(c) === key(t))
    if (!twin) { out.push({ ...t, group: 'collect', stage: undefined }); continue }
    if (t.done === true) Object.assign(twin, { stage: DONE_STAGE, done: true, done_at: twin.done_at ?? t.done_at })
    else if (twin.done === true) Object.assign(twin, { stage: 'original', done: false, done_at: null })
    twin.note = joinText(twin.note, t.note, 200)
    twin.comment = joinText(twin.comment, t.comment, 2000)
  }
  return out
}

/** A checklist as sent by the admin editor (or read from disk). */
export function normalizeItems(v: unknown): LkItem[] {
  return foldTranslate(arr(v)).map(item).filter((t): t is LkItem => !!t).slice(0, 120)
}

export function normalizeProfile(v: unknown): LkProfile {
  const p = obj(v)
  return {
    track: isTrack(p.track) ? p.track : null,
    major: strOrNull(p.major, 120),
    photo: typeof p.photo === 'string' && /^[\w-]{1,40}$/.test(p.photo) ? p.photo : null,
  }
}

const MAX_RUB = 100_000_000
function rubles(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(/[\s ₽]/g, '').replace(',', '.')) : NaN
  return Number.isFinite(n) && n >= 0 && n <= MAX_RUB ? Math.round(n) : null
}

export function normalizePayments(v: unknown): LkPayments {
  const p = obj(v)
  const entries = arr(p.entries)
    .map((x): LkPayment | null => {
      const e = obj(x)
      const amount = rubles(e.amount)
      return amount === null || amount === 0 ? null : { id: id(e.id), date: ymd(e.date), amount, note: strOrNull(e.note, 200) }
    })
    .filter((e): e is LkPayment => !!e)
    .slice(0, 60)
  return { total: rubles(p.total), due: ymd(p.due), entries }
}

export function normalizeInternal(v: unknown): LkInternal {
  const i = obj(v)
  return { budget: strOrNull(i.budget, 300), telegram: url(i.telegram), notes: strOrNull(i.notes, 4000) }
}

function source(v: unknown): LkSource | null {
  const s = obj(v)
  const link = url(s.url)
  if (!link) return null
  return { id: id(s.id), label: str(s.label, 200) || link, url: link, checked: ymd(s.checked) }
}

function ref(v: unknown): LkRef {
  const r = obj(v)
  const kind = r.kind === 'sync' || r.kind === 'catalog' ? r.kind : 'free'
  return { kind, key: kind === 'free' ? null : strOrNull(r.key, 200) }
}

/**
 * Data saved before 2026-10-11 used a fixed 10-step path. Its todos become
 * checklist items, and the comment on the step the family was on becomes the
 * university comment, so nothing Iana typed is lost.
 */
function fromSteps(u: Obj): { items: unknown[]; comment: unknown } {
  const steps = obj(u.steps)
  const items = Object.values(steps).flatMap((s) => arr(obj(s).todos).map((t) => ({ ...obj(t), group: 'other' })))
  const current = typeof u.current === 'string' ? obj(steps[u.current]).comment : null
  return { items, comment: current }
}

/** A university as sent by the admin editor (or read from disk). The password is handled separately. */
export function normalizeUni(v: unknown): LkUni {
  const u = obj(v)
  const legacy = !Array.isArray(u.items) && u.steps ? fromSteps(u) : null
  const portal = obj(u.portal)
  const deadline = obj(u.deadline)
  const comment = obj(legacy ? legacy.comment : u.comment)
  const commentText = str(comment.text, 4000)
  const name = str(u.name, 200)
  // Short names used to be cut at 40 characters («…Science and Techn»). A cut
  // one that is the start of the full name gets the full name back.
  let short = str(u.short, 120)
  if (short.length === 40 && name.length > 40 && name.startsWith(short)) short = name.slice(0, 120)
  return {
    id: id(u.id),
    ref: ref(u.ref),
    short: short || name.slice(0, 120) || 'Вуз',
    name: name || short || 'Вуз',
    nameCn: strOrNull(u.nameCn, 60),
    country: str(u.country, 60) || 'Китай',
    city: str(u.city, 80),
    program: str(u.program, 300),
    language: str(u.language, 60),
    tone: tone(u.tone),
    art: typeof u.art === 'string' && /^\/(api\/university-media|images)\//.test(u.art) ? u.art.slice(0, 300) : null,
    website: url(u.website),
    rankChina: strOrNull(u.rankChina, 60),
    opens: ymd(u.opens),
    applyBy: ymd(u.applyBy),
    deadline: { label: str(deadline.label, 80) || 'Дедлайн подачи', date: ymd(deadline.date) },
    cost: strOrNull(u.cost, 120),
    scholarships: arr(u.scholarships).map((s) => str(s, 200)).filter(Boolean).slice(0, 12),
    contacts: strOrNull(u.contacts, 1000),
    notes_internal: strOrNull(u.notes_internal, 4000),
    status: isStatus(u.status) ? u.status : 'preparing',
    comment: commentText ? { text: commentText, at: ymd(comment.at) ?? new Date().toLocaleDateString('sv-SE') } : null,
    portal: { url: url(portal.url), login: strOrNull(portal.login, 200), note: strOrNull(portal.note, 500), pending: portal.pending === true },
    items: normalizeItems(legacy ? legacy.items : u.items),
    sources: arr(u.sources).map(source).filter((s): s is LkSource => !!s).slice(0, 10),
    updated_at: typeof u.updated_at === 'string' ? u.updated_at : new Date().toISOString(),
  }
}
