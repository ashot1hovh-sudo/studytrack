// The change log behind «Что изменилось» on Iana's dashboard. The store
// compares a ЛК before and after each write and records what Iana and the
// family care about: an item moving to another stage, a new deadline, a
// university's status, universities added or removed. Typing in a text field
// is not an event, so autosave doesn't flood the log.

import { LK_LOG_MAX, STATUS_LABEL, stageLabel, type LkData, type LkEvent, type LkItem } from './types'

type Actor = LkEvent['actor']

function itemEvents(before: LkItem[], after: LkItem[], uni: string | null, actor: Actor, at: string): LkEvent[] {
  const out: LkEvent[] = []
  for (const t of after) {
    const was = before.find((x) => x.id === t.id)
    if (!was) continue
    const item = t.text.trim() || null
    if (was.stage !== t.stage) {
      out.push({ at, actor, kind: 'stage', uni, item, from: stageLabel(t.group, was.stage), to: stageLabel(t.group, t.stage) })
    }
    // Only Iana sets dates; the family can't, so this never fires for them.
    if (was.due !== t.due) out.push({ at, actor, kind: 'due', uni, item, from: was.due, to: t.due })
  }
  return out
}

/** What changed between two versions of one ЛК, as log lines. */
export function diffLk(before: LkData, after: LkData, actor: Actor, at = new Date().toISOString()): LkEvent[] {
  const out = itemEvents(before.common, after.common, null, actor, at)
  for (const u of after.unis) {
    const was = before.unis.find((x) => x.id === u.id)
    if (!was) {
      out.push({ at, actor, kind: 'uni_add', uni: u.short || u.name, item: null, from: null, to: null })
      continue
    }
    if (was.status !== u.status) {
      out.push({ at, actor, kind: 'status', uni: u.short || u.name, item: null, from: STATUS_LABEL[was.status], to: STATUS_LABEL[u.status] })
    }
    out.push(...itemEvents(was.items, u.items, u.short || u.name, actor, at))
  }
  for (const u of before.unis) {
    if (!after.unis.some((x) => x.id === u.id)) out.push({ at, actor, kind: 'uni_remove', uni: u.short || u.name, item: null, from: null, to: null })
  }
  return out
}

/** Prepend new lines to the log, keeping it bounded. */
export function appendLog(log: LkEvent[] | undefined, events: LkEvent[]): LkEvent[] {
  return [...events, ...(log ?? [])].slice(0, LK_LOG_MAX)
}

const KINDS = new Set(['stage', 'status', 'due', 'uni_add', 'uni_remove'])
const str = (v: unknown) => (typeof v === 'string' ? v : null)

/** Re-validate stored log lines on read; drops anything malformed. */
export function normalizeLog(raw: unknown): LkEvent[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((e) => e && typeof e === 'object' && typeof e.at === 'string' && KINDS.has(e.kind))
    .map((e) => ({ at: e.at, actor: e.actor === 'family' ? 'family' : 'iana', kind: e.kind, uni: str(e.uni), item: str(e.item), from: str(e.from), to: str(e.to) }) as LkEvent)
    .slice(0, LK_LOG_MAX)
}
