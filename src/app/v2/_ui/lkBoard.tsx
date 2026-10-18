'use client'

/**
 * The checklist of one university, as Iana and the family see it:
 * «Экзамены» is a list with a status column, every other group is a pipeline
 * board whose columns are the group's stages. Cards move by drag and drop
 * (desktop) or with the stage menu on the card (phones, keyboard).
 *
 * Shared by the family's page (/v2/lk) and both admin views. `canMove`
 * decides which cards the viewer may move; `edit` (admin only) also allows
 * renaming, notes, owner, due date, comments, adding and deleting.
 */
import { useState } from 'react'
import { ArrowRightLeft, Check, ListPlus, MessageSquare, Plus, Trash2 } from 'lucide-react'
import DatePicker from '@/components/DatePicker'
import { DONE_STAGE, GROUPS, OWNER_LABEL, STARTER_DOCS, firstStage, stageLabel, type GroupKey, type LkItem, type Owner } from '@/lib/lk/types'

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const dayShort = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}${y !== new Date().getFullYear() ? ` ${y}` : ''}`
}
const todayYmd = () => new Date().toLocaleDateString('sv-SE')
const daysTo = (ymd: string) => Math.round((new Date(`${ymd}T00:00:00`).getTime() - new Date(`${todayYmd()}T00:00:00`).getTime()) / 86400000)
const OWNERS = Object.keys(OWNER_LABEL) as Owner[]
const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)
export const newLkItem = (group: GroupKey, text = '', note: string | null = null): LkItem => ({ id: newId(), group, text, owner: 'student', stage: firstStage(group), done: false, start: null, due: null, note, comment: null, done_at: null })

export type BoardProps = {
  items: LkItem[]
  /** May the viewer move this card? */
  canMove: (t: LkItem) => boolean
  /** Move one card. The board never mutates `items` itself. */
  onMove: (itemId: string, stage: string) => void
  /** Admin only: replace the whole list (edits, adds, deletes). */
  edit?: (items: LkItem[]) => void
  /** Show empty groups too (admin), so Iana can add the first card. */
  showEmpty?: boolean
  /** Which groups to render. */
  only?: (g: GroupKey) => boolean
  /** Admin: offer «Типовой список документов» (the common checklist, where those documents live). */
  starterDocs?: boolean
}

export default function LkBoard({ items, canMove, onMove, edit, showEmpty, only, starterDocs }: BoardProps) {
  const groups = GROUPS.filter((g) => !only || only(g.key))
    .map((g) => ({ ...g, items: items.filter((i) => i.group === g.key) }))
    .filter((g) => showEmpty || g.items.length)
  if (!groups.length) return null

  const upd = (id: string, patch: Partial<LkItem>) => edit?.(items.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  const add = (group: GroupKey) => edit?.([...items, newLkItem(group)])
  const del = (id: string) => edit?.(items.filter((t) => t.id !== id))
  // The standard documents not on the list yet; Iana edits them like any card.
  const missingDocs = STARTER_DOCS.filter((d) => !items.some((t) => t.group === 'collect' && t.text.trim().toLowerCase() === d.text.toLowerCase()))
  const addDocs = () => edit?.([...items, ...missingDocs.map((d) => newLkItem('collect', d.text, d.note ?? null))])
  const ctl = { canMove, onMove, upd: edit ? upd : undefined, del: edit ? del : undefined }

  return (
    <div className="v2-lk-groups">
      {groups.map((g) => {
        const done = g.items.filter((i) => i.done).length
        const complete = g.items.length > 0 && done === g.items.length
        return (
          <section key={g.key} className={`v2-lk-group${complete ? ' is-complete' : ''}`}>
            <header>
              <span className="mark" aria-hidden>{complete ? <Check /> : null}</span>
              <b>{g.title}</b>
              {g.hint && <span className="hint">{g.hint}</span>}
              <span className="count num">{done}/{g.items.length}</span>
            </header>
            {g.key === 'exams' ? <ExamList items={g.items} {...ctl} /> : <Pipeline group={g.key} items={g.items} {...ctl} />}
            {edit && (
              <div className="v2-lkb-adds">
                <button className="v2-lkb-add" onClick={() => add(g.key)}>
                  <Plus aria-hidden /> {g.key === 'exams' ? 'Экзамен' : 'Карточка'}
                </button>
                {starterDocs && g.key === 'collect' && missingDocs.length > 0 && (
                  <button className="v2-lkb-add" onClick={addDocs} title={missingDocs.map((d) => d.text).join(', ')}>
                    <ListPlus aria-hidden /> Типовой список документов{missingDocs.length < STARTER_DOCS.length ? ` (+${missingDocs.length})` : ''}
                  </button>
                )}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

type Ctl = {
  canMove: (t: LkItem) => boolean
  onMove: (itemId: string, stage: string) => void
  upd?: (id: string, patch: Partial<LkItem>) => void
  del?: (id: string) => void
}

/* ---------- exams: a list with a status column ---------- */

function ExamList({ items, canMove, onMove, upd, del }: { items: LkItem[] } & Ctl) {
  const stages = GROUPS[0].stages
  return (
    <ul className="v2-lkb-exams">
      {items.map((t) => (
        <li key={t.id} className={t.done ? 'is-done' : ''}>
          <div className="row">
            <span className="txt">
              {upd ? (
                <input className="v2-lkb-in strong" value={t.text} onChange={(e) => upd(t.id, { text: e.target.value })} placeholder="Экзамен, например IELTS" />
              ) : (
                <b>{t.text}</b>
              )}
              {upd ? (
                <input className="v2-lkb-in" value={t.note ?? ''} onChange={(e) => upd(t.id, { note: e.target.value || null })} placeholder="Балл, например 7.0" />
              ) : (
                t.note && <span className="note">{t.note}</span>
              )}
            </span>
            <Due t={t} upd={upd} />
            <OwnerTag t={t} upd={upd} />
            <label className={`v2-lkb-status st-${t.stage}`}>
              <span className="sr">Статус</span>
              <select value={t.stage} disabled={!canMove(t)} onChange={(e) => onMove(t.id, e.target.value)}>
                {stages.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>
            {upd && <Tools t={t} upd={upd} del={del} />}
          </div>
          <Comment t={t} upd={upd} />
        </li>
      ))}
    </ul>
  )
}

/* ---------- other groups: a pipeline, stages stacked top to bottom ----------
   Each stage is a full-width lane on a thin spine, so the order reads like a
   path and every stage stays visible at any width. Cards drag between lanes;
   nothing changes size while dragging. */

function Pipeline({ group, items, canMove, onMove, upd, del }: { group: GroupKey; items: LkItem[] } & Ctl) {
  const stages = GROUPS.find((g) => g.key === group)!.stages
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const dragged = items.find((t) => t.id === dragId)

  return (
    <div className={`v2-lkb-lanes${dragged ? ' is-dragging' : ''}`}>
      {stages.map((s) => {
        const list = items.filter((t) => t.stage === s.key)
        const isTarget = !!dragged && dragged.stage !== s.key
        return (
          <div
            key={s.key}
            className={`v2-lkb-lane${s.key === DONE_STAGE ? ' is-done' : ''}${list.length ? '' : ' is-empty'}${isTarget ? ' is-target' : ''}${over === s.key && isTarget ? ' is-over' : ''}`}
            onDragOver={(e) => { if (isTarget) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOver(s.key) } }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver((o) => (o === s.key ? null : o)) }}
            onDrop={(e) => { e.preventDefault(); if (dragged && isTarget) onMove(dragged.id, s.key); setDragId(null); setOver(null) }}
          >
            <i className="v2-lkb-step" aria-hidden>{s.key === DONE_STAGE && list.length > 0 && <Check />}</i>
            <div className="v2-lkb-lanehead">
              <span>{s.label}</span>
              <b className="num">{list.length}</b>
              {isTarget && <em>отпустите здесь</em>}
            </div>
            {list.length > 0 && (
              <div className="v2-lkb-lanecards">
                {list.map((t) => (
                  <Card
                    key={t.id}
                    t={t}
                    stages={stages}
                    movable={canMove(t)}
                    dragging={dragId === t.id}
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => { setDragId(null); setOver(null) }}
                    onMove={onMove}
                    upd={upd}
                    del={del}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Card({ t, stages, movable, dragging, onDragStart, onDragEnd, onMove, upd, del }: {
  t: LkItem
  stages: readonly { key: string; label: string }[]
  movable: boolean
  dragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onMove: (itemId: string, stage: string) => void
  upd?: Ctl['upd']
  del?: Ctl['del']
}) {
  // A draggable card would swallow text selection in its inputs (admin), so
  // dragging is armed only when the press starts outside a field.
  const [armed, setArmed] = useState(true)
  return (
    <article
      className={`v2-lkb-card${dragging ? ' is-dragging' : ''}${movable ? ' is-movable' : ''}`}
      draggable={movable && armed}
      onPointerDown={(e) => setArmed(!(e.target as HTMLElement).closest('input, textarea, select, button, .v2-lkb-due-edit'))}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', t.id)
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      title={!movable && t.owner === 'iana' ? 'Переносит Яна' : undefined}
    >
      <div className="top">
        {upd ? (
          <textarea className="v2-lkb-in strong" rows={1} value={t.text} onChange={(e) => upd(t.id, { text: e.target.value })} placeholder="Документ или задача" />
        ) : (
          <b className="txt">{t.text}</b>
        )}
        {upd && <Tools t={t} upd={upd} del={del} />}
      </div>
      {upd ? (
        <input className="v2-lkb-in" value={t.note ?? ''} onChange={(e) => upd(t.id, { note: e.target.value || null })} placeholder="Пометка" />
      ) : (
        t.note && <span className="note">{t.note}</span>
      )}
      <div className="foot">
        <OwnerTag t={t} upd={upd} />
        <Due t={t} upd={upd} />
        {movable && (
          <label className="v2-lkb-move" title="Перенести в другой этап">
            <ArrowRightLeft aria-hidden />
            <select value={t.stage} onChange={(e) => onMove(t.id, e.target.value)} aria-label={`Этап: ${stageLabel(t.group, t.stage)}. Перенести`}>
              {stages.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
        )}
      </div>
      <Comment t={t} upd={upd} />
    </article>
  )
}

/* ---------- small parts ---------- */

function OwnerTag({ t, upd }: { t: LkItem; upd?: Ctl['upd'] }) {
  if (!upd) return <span className={`v2-lk-owner is-${t.owner}`}>{OWNER_LABEL[t.owner]}</span>
  // Admin: click cycles Студент → Родитель → Яна.
  return (
    <button
      className={`v2-lk-owner is-${t.owner}`}
      onClick={() => upd(t.id, { owner: OWNERS[(OWNERS.indexOf(t.owner) + 1) % OWNERS.length] })}
      title="Кто делает: нажмите, чтобы сменить"
    >
      {OWNER_LABEL[t.owner]}
    </button>
  )
}

function Due({ t, upd }: { t: LkItem; upd?: Ctl['upd'] }) {
  // Admin: start and deadline; together they place the card on the timeline.
  if (upd) {
    return (
      <>
        <div className="v2-lkb-due-edit"><DatePicker value={t.start} onChange={(v) => upd(t.id, { start: v })} title="Начало (для таймлайна)" placeholder="Начало" /></div>
        <div className="v2-lkb-due-edit"><DatePicker value={t.due} onChange={(v) => upd(t.id, { due: v })} title="Срок" placeholder="Срок" /></div>
      </>
    )
  }
  if (!t.due || t.done) return null
  const left = daysTo(t.due)
  return <small className={`v2-lkb-due${left < 0 ? ' is-late' : left <= 7 ? ' is-soon' : ''}`}>{left < 0 ? `срок прошёл ${dayShort(t.due)}` : `до ${dayShort(t.due)}`}</small>
}

function Tools({ t, upd, del }: { t: LkItem; upd: NonNullable<Ctl['upd']>; del?: Ctl['del'] }) {
  return (
    <span className="v2-lkb-tools">
      <button
        className={t.comment !== null ? 'has' : ''}
        onClick={() => upd(t.id, { comment: t.comment === null ? '' : t.comment || null })}
        title={t.comment ? 'Комментарий есть' : 'Комментарий для семьи'}
        aria-label="Комментарий"
      >
        <MessageSquare aria-hidden />
      </button>
      {del && (
        <button onClick={() => { if (!t.text || window.confirm(`Удалить «${t.text}»?`)) del(t.id) }} title="Удалить" aria-label="Удалить">
          <Trash2 aria-hidden />
        </button>
      )}
    </span>
  )
}

function Comment({ t, upd }: { t: LkItem; upd?: Ctl['upd'] }) {
  if (upd) {
    // '' = box open but empty; null = no comment. Empty boxes are dropped on save.
    if (t.comment === null) return null
    return (
      <textarea
        className="v2-lkb-in v2-lkb-cm-in"
        autoFocus={t.comment === ''}
        rows={2}
        value={t.comment}
        onChange={(e) => upd(t.id, { comment: e.target.value })}
        placeholder="Комментарий Яны (видит семья)"
      />
    )
  }
  if (!t.comment) return null
  return (
    <span className="v2-lkb-cm">
      <i aria-hidden>Я</i>
      <span>{t.comment}</span>
    </span>
  )
}

