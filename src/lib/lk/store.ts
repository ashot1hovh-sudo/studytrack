// Storage for the v2 ЛК, keyed by Supabase student id. Two backends share
// all the editing rules (BaseLkStore): a Supabase table + Storage bucket for
// production (supabase/migrations/002_lk.sql), and the original JSON file in
// .data/ for offline work (LK_STORE=file). Routes and UI only talk to
// LkStore. Portal passwords are stored encrypted (secret.ts).

import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/lib/supabase/config'
import { appendLog, diffLk, normalizeLog } from './changelog'
import { normalizeInternal, normalizeItems, normalizePayments, normalizeProfile, normalizeUni } from './normalize'
import { decryptSecret, encryptSecret } from './secret'
import { COMMON_ID, emptyLk, isStageOf, LK_VERSION, RENAMED_STARTERS, stagesOf, withStage, type LkData, type LkDataPublic, type LkEvent, type LkInternal, type LkItem, type LkPayments, type LkProfile, type LkUni } from './types'

export interface LkStore {
  get(studentId: string): Promise<LkData>
  /** Every student's ЛК, for Iana's student cards. */
  all(): Promise<Record<string, LkData>>
  setSubtitle(studentId: string, subtitle: string | null): Promise<LkData>
  /** Track and major on Iana's card. The photo token is set by setPhoto only. */
  setProfile(studentId: string, profile: Pick<LkProfile, 'track' | 'major'>): Promise<LkData>
  /** Store (or with null, remove) the card photo: a small WebP made in the browser. */
  setPhoto(studentId: string, webp: Buffer | null): Promise<LkData>
  getPhoto(studentId: string): Promise<Buffer | null>
  /** The сопровождение price and payments; the family sees them. */
  setPayments(studentId: string, payments: LkPayments): Promise<LkData>
  /** Budget and Telegram channel: Iana's eyes only. */
  setInternal(studentId: string, internal: LkInternal): Promise<LkData>
  addUni(studentId: string, uni: LkUni): Promise<LkData>
  /**
   * Iana saves one university. `password`: undefined keeps the stored one,
   * '' clears it, any other string replaces it. `base` is the version she
   * loaded: items the family ticked meanwhile keep their tick unless she
   * changed that same item herself.
   */
  saveUni(studentId: string, uni: LkUni, base: LkUni | null, password?: string): Promise<LkData>
  /** Iana saves the common checklist; `base` works as in saveUni. */
  saveCommon(studentId: string, items: LkItem[], base: LkItem[] | null): Promise<LkData>
  deleteUni(studentId: string, uniId: string): Promise<LkData>
  moveUni(studentId: string, uniId: string, dir: -1 | 1): Promise<LkData>
  /**
   * The family moves one of their items to a stage. Iana's own items are hers
   * to move. `uniId` is COMMON_ID for the common checklist.
   */
  familyStage(studentId: string, uniId: string, itemId: string, stage: string): Promise<LkData>
  getPassword(studentId: string, uniId: string): Promise<string | null>
}

export class NotFoundError extends Error {}
export class BadRequestError extends Error {}

/**
 * Version 1 → 2 (2026-10-18): «Собрать» documents are the same for every
 * university, so they move from each university into the common checklist.
 * The same document listed under several universities becomes one card: the
 * copy furthest along wins, missing dates and notes are filled from the
 * others. Old English starter names get Iana's Russian wording. Nothing is
 * written here: the moved shape is saved with the next change to this ЛК.
 */
function toV2(d: LkData) {
  const rename = (t: LkItem): LkItem => ({ ...t, text: RENAMED_STARTERS[t.text.trim().toLowerCase()] ?? t.text })
  const key = (t: LkItem) => t.text.trim().toLowerCase()
  const rank = (t: LkItem) => stagesOf(t.group).findIndex((x) => x.key === t.stage)
  const common = d.common.map(rename)
  for (const u of d.unis) {
    u.items = u.items.map(rename)
    for (const t of u.items.filter((x) => x.group === 'collect')) {
      const i = common.findIndex((c) => c.group === 'collect' && key(c) === key(t))
      if (i < 0) { common.push(t); continue }
      const [win, other] = rank(t) > rank(common[i]) ? [t, common[i]] : [common[i], t]
      common[i] = { ...win, start: win.start ?? other.start, due: win.due ?? other.due, note: win.note ?? other.note, comment: win.comment ?? other.comment }
    }
    u.items = u.items.filter((x) => x.group !== 'collect')
  }
  d.common = common
}

/** Re-validate on read: brings data saved in an older shape up to date. */
function normalizeData(raw: Partial<LkData> | null | undefined): LkData {
  const d = { ...emptyLk(), ...raw, v: typeof raw?.v === 'number' ? raw.v : 1 }
  d.profile = normalizeProfile(d.profile)
  d.payments = normalizePayments(d.payments)
  d.internal = normalizeInternal(d.internal)
  d.common = normalizeItems(d.common)
  d.log = normalizeLog(raw?.log)
  d.unis = (d.unis ?? []).map((u) => {
    const n = normalizeUni(u)
    n.portal.password_enc = u.portal?.password_enc ?? null
    return n
  })
  if (d.v < 2) toV2(d)
  d.v = LK_VERSION
  return d
}

// Student ids are uuids; anything else never reaches the disk or the bucket.
function checkId(studentId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(studentId)) throw new NotFoundError('Студент не найден')
}

/**
 * Iana's saved checklist, with the family's moves made since she loaded it
 * (`base`) kept: an item keeps the current stage unless she moved it herself.
 * Returns copies, so a retried write (Supabase version clash) can run again.
 */
function keepFamilyMoves(next: LkItem[], cur: LkItem[], base: LkItem[] | null): LkItem[] {
  return next.map((t) => {
    const now = cur.find((x) => x.id === t.id)
    const was = base?.find((x) => x.id === t.id)
    return now && was && t.stage === was.stage ? { ...t, stage: now.stage, done: now.done, done_at: now.done_at } : { ...t }
  })
}

abstract class BaseLkStore implements LkStore {
  /** Read one student's ЛК, apply fn, write it back atomically. */
  protected abstract mutate(studentId: string, fn: (d: LkData) => void, touch?: boolean): Promise<LkData>
  abstract get(studentId: string): Promise<LkData>
  abstract all(): Promise<Record<string, LkData>>
  protected abstract writePhoto(studentId: string, webp: Buffer | null): Promise<void>
  abstract getPhoto(studentId: string): Promise<Buffer | null>

  private uni(d: LkData, uniId: string): LkUni {
    const u = d.unis.find((x) => x.id === uniId)
    if (!u) throw new NotFoundError('Вуз не найден')
    return u
  }

  /** Wrap a change so what it did lands in the change log, in the same write. */
  private logged(actor: LkEvent['actor'], fn: (d: LkData) => void) {
    return (d: LkData) => {
      const before = structuredClone(d)
      fn(d)
      const events = diffLk(before, d, actor)
      if (events.length) d.log = appendLog(d.log, events)
    }
  }

  setSubtitle(studentId: string, subtitle: string | null) {
    return this.mutate(studentId, (d) => { d.subtitle = subtitle })
  }

  addUni(studentId: string, uni: LkUni) {
    uni.updated_at = new Date().toISOString()
    return this.mutate(studentId, this.logged('iana', (d) => { d.unis = [...d.unis, uni] }))
  }

  saveUni(studentId: string, uni: LkUni, base: LkUni | null, password?: string) {
    // Encrypt before entering the write, so a missing key fails cleanly.
    const enc = password === undefined || password === '' ? null : encryptSecret(password)
    return this.mutate(studentId, this.logged('iana', (d) => {
      const cur = this.uni(d, uni.id)
      // Work on a copy: a retried write (Supabase version clash) runs fn again.
      const next: LkUni = { ...uni, portal: { ...uni.portal }, items: keepFamilyMoves(uni.items, cur.items, base?.items ?? null) }
      next.updated_at = new Date().toISOString()
      next.portal.password_enc = password === undefined ? cur.portal.password_enc ?? null : enc
      d.unis = d.unis.map((x) => (x.id === next.id ? next : x))
    }))
  }

  saveCommon(studentId: string, items: LkItem[], base: LkItem[] | null) {
    return this.mutate(studentId, this.logged('iana', (d) => { d.common = keepFamilyMoves(items, d.common, base) }))
  }

  deleteUni(studentId: string, uniId: string) {
    return this.mutate(studentId, this.logged('iana', (d) => { d.unis = d.unis.filter((x) => x.id !== uniId) }))
  }

  moveUni(studentId: string, uniId: string, dir: -1 | 1) {
    return this.mutate(studentId, (d) => {
      const i = d.unis.findIndex((x) => x.id === uniId)
      const j = i + dir
      if (i < 0 || j < 0 || j >= d.unis.length) return
      const next = [...d.unis]
      ;[next[i], next[j]] = [next[j], next[i]]
      d.unis = next
    })
  }

  familyStage(studentId: string, uniId: string, itemId: string, stage: string) {
    return this.mutate(studentId, this.logged('family', (d) => {
      const list = uniId === COMMON_ID ? d.common : this.uni(d, uniId).items
      const t = list.find((x) => x.id === itemId)
      if (!t) throw new NotFoundError('Пункт не найден')
      if (!isStageOf(t.group, stage)) throw new BadRequestError('Неизвестный этап')
      if (t.owner === 'iana' || t.stage === stage) return
      const moved = list.map((x) => (x.id === itemId ? withStage(x, stage) : x))
      if (uniId === COMMON_ID) d.common = moved
      else this.uni(d, uniId).items = moved
    }), false)
  }

  setProfile(studentId: string, profile: Pick<LkProfile, 'track' | 'major'>) {
    return this.mutate(studentId, (d) => { d.profile = { ...d.profile, track: profile.track, major: profile.major } }, false)
  }

  setPayments(studentId: string, payments: LkPayments) {
    return this.mutate(studentId, (d) => { d.payments = payments })
  }

  setInternal(studentId: string, internal: LkInternal) {
    return this.mutate(studentId, (d) => { d.internal = internal }, false)
  }

  async setPhoto(studentId: string, webp: Buffer | null) {
    checkId(studentId)
    await this.writePhoto(studentId, webp)
    return this.mutate(studentId, (d) => { d.profile = { ...d.profile, photo: webp ? Date.now().toString(36) : null } }, false)
  }

  async getPassword(studentId: string, uniId: string) {
    const enc = (await this.get(studentId)).unis.find((x) => x.id === uniId)?.portal.password_enc
    return enc ? decryptSecret(enc) : null
  }
}

class FileLkStore extends BaseLkStore {
  // Serialize writes in this process so two quick edits never clobber each other.
  private queue: Promise<unknown> = Promise.resolve()

  constructor(private readonly file: string) { super() }

  private async readAll(): Promise<Record<string, LkData>> {
    let raw: Record<string, LkData>
    try {
      raw = JSON.parse(await readFile(this.file, 'utf8'))
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return {}
      throw err
    }
    return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, normalizeData(v)]))
  }

  protected mutate(studentId: string, fn: (d: LkData) => void, touch = true): Promise<LkData> {
    const run = this.queue.then(async () => {
      const all = await this.readAll()
      const data = normalizeData(all[studentId])
      fn(data)
      if (touch) data.updated_at = new Date().toISOString()
      all[studentId] = data
      await mkdir(path.dirname(this.file), { recursive: true })
      // 0600: the file holds encrypted portal passwords and personal plans.
      await writeFile(`${this.file}.tmp`, JSON.stringify(all, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 })
      await rename(`${this.file}.tmp`, this.file)
      return data
    })
    this.queue = run.catch(() => {})
    return run
  }

  async get(studentId: string) {
    return (await this.readAll())[studentId] ?? emptyLk()
  }

  all() {
    return this.readAll()
  }

  private photoFile(studentId: string) {
    return path.join(path.dirname(this.file), 'lk-photos', `${studentId}.webp`)
  }

  protected async writePhoto(studentId: string, webp: Buffer | null) {
    const file = this.photoFile(studentId)
    if (webp) {
      await mkdir(path.dirname(file), { recursive: true })
      await writeFile(file, webp, { mode: 0o600 })
    } else {
      await unlink(file).catch(() => {})
    }
  }

  async getPhoto(studentId: string) {
    checkId(studentId)
    return readFile(this.photoFile(studentId)).catch(() => null)
  }
}

const PHOTO_BUCKET = 'lk-photos'
const MAX_RETRIES = 5

/**
 * public.lk: one row per student, the whole ЛК as jsonb plus a version
 * counter. Writes are compare-and-swap on `version`, so two app instances
 * (or Iana and the family at once) never overwrite each other: on a clash
 * the write re-reads and re-applies. Service role only; RLS keeps the
 * table closed to browser clients.
 */
class SupabaseLkStore extends BaseLkStore {
  constructor(private readonly db: SupabaseClient) { super() }

  private async read(studentId: string): Promise<{ data: LkData; version: number | null }> {
    const { data, error } = await this.db.from('lk').select('data,version').eq('student_id', studentId).maybeSingle()
    if (error) throw new Error(`lk read failed: ${error.message}`)
    return data ? { data: normalizeData(data.data), version: data.version } : { data: emptyLk(), version: null }
  }

  protected async mutate(studentId: string, fn: (d: LkData) => void, touch = true): Promise<LkData> {
    checkId(studentId)
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const { data, version } = await this.read(studentId)
      fn(data)
      if (touch) data.updated_at = new Date().toISOString()
      if (version === null) {
        const { error } = await this.db.from('lk').insert({ student_id: studentId, data, version: 1 })
        if (!error) return data
        if (error.code !== '23505') throw new Error(`lk insert failed: ${error.message}`) // 23505: someone inserted first
      } else {
        const { data: rows, error } = await this.db
          .from('lk')
          .update({ data, version: version + 1, updated_at: new Date().toISOString() })
          .eq('student_id', studentId)
          .eq('version', version)
          .select('student_id')
        if (error) throw new Error(`lk update failed: ${error.message}`)
        if (rows && rows.length) return data
      }
    }
    throw new Error('lk write kept clashing, try again')
  }

  async get(studentId: string) {
    return (await this.read(studentId)).data
  }

  async all() {
    const { data, error } = await this.db.from('lk').select('student_id,data')
    if (error) throw new Error(`lk read failed: ${error.message}`)
    return Object.fromEntries((data ?? []).map((r) => [r.student_id as string, normalizeData(r.data)]))
  }

  protected async writePhoto(studentId: string, webp: Buffer | null) {
    const bucket = this.db.storage.from(PHOTO_BUCKET)
    const name = `${studentId}.webp`
    const { error } = webp
      ? await bucket.upload(name, webp, { contentType: 'image/webp', upsert: true })
      : await bucket.remove([name])
    if (error) throw new Error(`lk photo write failed: ${error.message}`)
  }

  async getPhoto(studentId: string) {
    checkId(studentId)
    const { data, error } = await this.db.storage.from(PHOTO_BUCKET).download(`${studentId}.webp`)
    if (error || !data) return null
    return Buffer.from(await data.arrayBuffer())
  }
}

/**
 * The only shape that leaves the server: encrypted passwords become a flag,
 * and Iana's internal notes and fields are kept only for the admin editor.
 */
export function toPublic(d: LkData, { internal = false } = {}): LkDataPublic {
  const { internal: fields, log, ...rest } = d
  return {
    ...rest,
    ...(internal ? { internal: fields, log: log ?? [] } : {}),
    unis: d.unis.map(({ portal: { password_enc, ...portal }, notes_internal, ...u }) => ({
      ...u,
      ...(internal ? { notes_internal: notes_internal ?? null } : {}),
      portal: { ...portal, hasPassword: !!password_enc },
    })),
  }
}

export function fileLkStore(dir = process.env.UNIVERSITY_SYNC_DATA_DIR ?? path.join(process.cwd(), '.data')): LkStore {
  return new FileLkStore(path.join(dir, 'lk.json'))
}

export function supabaseLkStore(db: SupabaseClient): LkStore {
  return new SupabaseLkStore(db)
}

let store: LkStore | null = null
/** Supabase by default; LK_STORE=file keeps the local .data/lk.json. */
export function getLkStore(): LkStore {
  if (!store) {
    if (process.env.LK_STORE === 'file') {
      store = fileLkStore()
    } else {
      const { url } = getSupabaseConfig()
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing: the ЛК store needs it (or set LK_STORE=file)')
      // no-store: Next.js caches fetch() in route handlers, and a cached read
      // returns an old `version`, so every compare-and-swap write would clash.
      store = supabaseLkStore(createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
      }))
    }
  }
  return store
}
