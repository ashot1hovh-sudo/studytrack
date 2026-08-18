'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  Calendar,
  CheckSquare,
  Clock,
  ExternalLink,
  GripVertical,
  Link2,
  LogOut,
  MapPin,
  Maximize2,
  MessageCircle,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { useApp } from '@/context/AppContext'
import ThemeSwitch from '@/components/ThemeSwitch'
import {
  EXAM_STATUSES,
  PROGRAMS,
  STAGES,
  STAGE_BY_ID,
  genId,
  type Block,
  type CrmClient,
  type CrmStageColor,
} from '@/lib/crm'

/* ---------- color helpers ----------
   Expressed against the scoped --brown/--green/… vars (mapped to the app's
   study tokens in crm.css), so pills flip with light/dark automatically. */
function pillBg(color: CrmStageColor) {
  return `rgb(var(--${color}) / 0.15)`
}
function pillFg(color: CrmStageColor) {
  return `rgb(var(--${color}))`
}

type DeadlineInfo = { text: string; cls: 'gray' | 'green' | 'orange' | 'red'; bucket: '' | 'overdue' | 'urgent' | 'soon' }
function deadlineInfo(iso: string | null, now: number): DeadlineInfo {
  if (!iso) return { text: 'нет дедлайна', cls: 'gray', bucket: '' }
  const diffMs = new Date(iso).getTime() - now
  const overdue = diffMs < 0
  const abs = Math.abs(diffMs)
  const days = Math.floor(abs / 86400000)
  const hours = Math.floor((abs % 86400000) / 3600000)
  if (overdue) return { text: `просрочено на ${days}д ${hours}ч`, cls: 'red', bucket: 'overdue' }
  const text = days > 0 ? `${days}д ${hours}ч осталось` : `${hours}ч осталось`
  if (diffMs < 86400000) return { text, cls: 'red', bucket: 'urgent' }
  if (diffMs < 3 * 86400000) return { text, cls: 'orange', bucket: 'soon' }
  return { text, cls: 'green', bucket: '' }
}

function markdownLiteToHtml(text: string) {
  const esc = (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return esc
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<i>$1</i>')
}

type Popover =
  | { kind: 'stage' | 'anketa' | 'program' | 'uni' | 'text'; clientId: string; field?: 'parentName' | 'telegramId'; top: number; left: number }
  | null

type UniSuggestion = { name: string; city: string }

export default function CrmApp() {
  const { logout } = useApp()

  const [clients, setClients] = useState<CrmClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())

  const [q, setQ] = useState('')
  const [fStage, setFStage] = useState('')
  const [fProgram, setFProgram] = useState('')
  const [fAnketa, setFAnketa] = useState('')
  const [fDeadline, setFDeadline] = useState('')

  const [showAdd, setShowAdd] = useState(false)
  const [naName, setNaName] = useState('')
  const [naParent, setNaParent] = useState('')
  const [naTg, setNaTg] = useState('')

  const [peekId, setPeekId] = useState<string | null>(null)
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [addBlockFor, setAddBlockFor] = useState<string | null>(null)

  const [popover, setPopover] = useState<Popover>(null)
  const [popQuery, setPopQuery] = useState('')
  const [uniResults, setUniResults] = useState<UniSuggestion[]>([])
  const popRef = useRef<HTMLDivElement | null>(null)

  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showToast = useCallback((t: string) => {
    setToast(t)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2000)
  }, [])

  /* ---------- live countdown ---------- */
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])

  /* ---------- load ---------- */
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/crm/clients', { credentials: 'same-origin' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Не удалось загрузить')
      setClients(data.clients ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])

  /* ---------- persistence (debounced, merged per client) ---------- */
  const pendingRef = useRef(new Map<string, Record<string, unknown>>())
  const timerRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const sendPatch = useCallback(
    async (clientId: string, fields: Record<string, unknown>) => {
      try {
        const res = await fetch(`/api/crm/clients/${clientId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(fields),
        })
        if (!res.ok) {
          const d = await res.json().catch(() => null)
          throw new Error(d?.error ?? 'Не сохранилось')
        }
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Не сохранилось')
      }
    },
    [showToast]
  )

  const flush = useCallback(
    (clientId: string) => {
      const t = timerRef.current.get(clientId)
      if (t) {
        clearTimeout(t)
        timerRef.current.delete(clientId)
      }
      const fields = pendingRef.current.get(clientId)
      if (fields && Object.keys(fields).length) {
        pendingRef.current.delete(clientId)
        void sendPatch(clientId, fields)
      }
    },
    [sendPatch]
  )
  const flushAll = useCallback(() => {
    Array.from(pendingRef.current.keys()).forEach(flush)
  }, [flush])

  const queuePatch = useCallback(
    (clientId: string, fields: Record<string, unknown>, immediate = false) => {
      const cur = pendingRef.current.get(clientId) ?? {}
      pendingRef.current.set(clientId, { ...cur, ...fields })
      const t = timerRef.current.get(clientId)
      if (t) clearTimeout(t)
      if (immediate) flush(clientId)
      else timerRef.current.set(clientId, setTimeout(() => flush(clientId), 500))
    },
    [flush]
  )

  const mutate = useCallback((clientId: string, updater: (c: CrmClient) => CrmClient) => {
    setClients((prev) => prev.map((c) => (c.id === clientId ? updater(c) : c)))
  }, [])

  const setField = useCallback(
    (clientId: string, field: keyof CrmClient, value: unknown, immediate = false) => {
      mutate(clientId, (c) => ({ ...c, [field]: value }))
      queuePatch(clientId, { [field]: value }, immediate)
    },
    [mutate, queuePatch]
  )

  const setBlocks = useCallback(
    (clientId: string, updater: (blocks: Block[]) => Block[], immediate = false) => {
      let next: Block[] = []
      mutate(clientId, (c) => {
        next = updater(c.blocks)
        return { ...c, blocks: next }
      })
      queuePatch(clientId, { blocks: next }, immediate)
    },
    [mutate, queuePatch]
  )

  /* ---------- universities ---------- */
  const addUni = useCallback(
    async (clientId: string, name: string, source: 'explorer' | 'manual') => {
      const trimmed = name.trim()
      if (!trimmed) return
      try {
        const res = await fetch(`/api/crm/clients/${clientId}/universities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ universityName: trimmed, universitySource: source }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error ?? 'Не удалось добавить')
        mutate(clientId, (c) => ({ ...c, universities: [...c.universities, data.university] }))
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Ошибка')
      }
    },
    [mutate, showToast]
  )
  const removeUni = useCallback(
    async (clientId: string, uniId: number) => {
      try {
        const res = await fetch(`/api/crm/clients/${clientId}/universities?uniId=${uniId}`, {
          method: 'DELETE',
          credentials: 'same-origin',
        })
        if (!res.ok) {
          const d = await res.json().catch(() => null)
          throw new Error(d?.error ?? 'Не удалось убрать')
        }
        mutate(clientId, (c) => ({ ...c, universities: c.universities.filter((u) => u.id !== uniId) }))
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Ошибка')
      }
    },
    [mutate, showToast]
  )

  /* ---------- create / delete client ---------- */
  const createClient = useCallback(async () => {
    const name = naName.trim()
    if (!name) {
      showToast('Укажи имя студента')
      return
    }
    try {
      const res = await fetch('/api/crm/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ name, parentName: naParent.trim(), telegramId: naTg.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Не удалось создать')
      setClients((prev) => [data.client, ...prev])
      setNaName('')
      setNaParent('')
      setNaTg('')
      setShowAdd(false)
      showToast('Студент добавлен')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка')
    }
  }, [naName, naParent, naTg, showToast])

  const deleteClient = useCallback(
    async (clientId: string, name: string) => {
      if (!confirm(`Удалить студента «${name}»? Это действие нельзя отменить.`)) return
      try {
        const res = await fetch(`/api/crm/clients/${clientId}`, { method: 'DELETE', credentials: 'same-origin' })
        if (!res.ok) {
          const d = await res.json().catch(() => null)
          throw new Error(d?.error ?? 'Не удалось удалить')
        }
        setClients((prev) => prev.filter((c) => c.id !== clientId))
        if (peekId === clientId) setPeekId(null)
        showToast('Студент удалён')
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Ошибка')
      }
    },
    [peekId, showToast]
  )

  /* ---------- peek open/close ---------- */
  const openPeek = useCallback((id: string) => {
    setPeekId(id)
    setEditingBlockId(null)
  }, [])
  const closePeek = useCallback(() => {
    flushAll()
    setPeekId(null)
    setEditingBlockId(null)
    setAddBlockFor(null)
  }, [flushAll])

  /* ---------- popover ---------- */
  const openPopover = useCallback(
    (kind: NonNullable<Popover>['kind'], clientId: string, e: React.MouseEvent, field?: 'parentName' | 'telegramId') => {
      e.stopPropagation()
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const width = kind === 'text' ? 240 : 280
      let left = rect.left
      if (left + width > window.innerWidth - 10) left = window.innerWidth - width - 10
      let top = rect.bottom + 6
      if (top + 260 > window.innerHeight) top = Math.max(10, rect.top - 6 - 260)
      setPopQuery('')
      setUniResults([])
      setPopover({ kind, clientId, field, top, left })
    },
    []
  )
  const closePopover = useCallback(() => setPopover(null), [])

  // outside click + escape
  useEffect(() => {
    if (!popover) return
    const onDown = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) closePopover()
    }
    const t = setTimeout(() => document.addEventListener('mousedown', onDown, true), 0)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', onDown, true)
    }
  }, [popover, closePopover])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (popover) closePopover()
      else if (peekId) closePeek()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [popover, peekId, closePopover, closePeek])

  // uni autocomplete fetch (for uni popover + peek inline add)
  const fetchUnis = useCallback(async (query: string) => {
    try {
      const res = await fetch(`/api/crm/universities?q=${encodeURIComponent(query)}`, { credentials: 'same-origin' })
      const data = await res.json()
      if (res.ok) setUniResults(data.universities ?? [])
    } catch {
      /* ignore */
    }
  }, [])
  useEffect(() => {
    if (popover?.kind !== 'uni') return
    const h = setTimeout(() => fetchUnis(popQuery), 180)
    return () => clearTimeout(h)
  }, [popover, popQuery, fetchUnis])

  /* ---------- derived: filtered list ---------- */
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return clients.filter((c) => {
      if (
        query &&
        !(
          c.name.toLowerCase().includes(query) ||
          (c.parentName ?? '').toLowerCase().includes(query) ||
          (c.telegramId ?? '').toLowerCase().includes(query)
        )
      )
        return false
      if (fStage && c.stage !== fStage) return false
      if (fProgram && c.program !== fProgram) return false
      if (fAnketa === 'done' && !c.anketaDone) return false
      if (fAnketa === 'pending' && c.anketaDone) return false
      if (fDeadline) {
        const info = deadlineInfo(c.stageDeadline, now)
        if (fDeadline === 'overdue' && info.bucket !== 'overdue') return false
        if (fDeadline === 'urgent' && info.bucket !== 'urgent') return false
        if (fDeadline === 'soon' && !(info.bucket === 'soon' || info.bucket === 'urgent')) return false
      }
      return true
    })
  }, [clients, q, fStage, fProgram, fAnketa, fDeadline, now])

  const peekClient = peekId ? clients.find((c) => c.id === peekId) ?? null : null
  const popClient = popover ? clients.find((c) => c.id === popover.clientId) ?? null : null

  const programLabel = (id: string) => PROGRAMS.find((p) => p.id === id)?.label ?? id

  /* ============================================================ RENDER ============================================================ */
  return (
    <div className="crm-scope">
      <div className="wrap">
        {/* topbar */}
        <div className="topbar">
          <div className="brand">
            <div className="mark">
              <Users className="icon" style={{ width: 18, height: 18, stroke: '#fff' }} />
            </div>
            <div>
              <h1>CRM</h1>
              <span>KayKitay · сопровождение клиентов</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <ThemeSwitch />
            <button className="btn btn-primary" onClick={() => setShowAdd((s) => !s)}>
              <Plus className="icon" style={{ stroke: '#fff' }} />
              Добавить студента
            </button>
            <button className="btn btn-outline" onClick={() => logout()}>
              <LogOut className="icon" />
              Выйти
            </button>
          </div>
        </div>

        {/* filter bar */}
        <div className="filterbar">
          <input
            className="search-input"
            placeholder="Поиск по имени студента, родителю, Telegram..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="filter-select" value={fStage} onChange={(e) => setFStage(e.target.value)}>
            <option value="">Этап: все</option>
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <select className="filter-select" value={fProgram} onChange={(e) => setFProgram(e.target.value)}>
            <option value="">Программа: все</option>
            {PROGRAMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <select className="filter-select" value={fAnketa} onChange={(e) => setFAnketa(e.target.value)}>
            <option value="">Анкета: любая</option>
            <option value="done">Заполнена</option>
            <option value="pending">Не заполнена</option>
          </select>
          <select className="filter-select" value={fDeadline} onChange={(e) => setFDeadline(e.target.value)}>
            <option value="">Дедлайн: любой</option>
            <option value="overdue">Просрочен</option>
            <option value="urgent">Меньше суток</option>
            <option value="soon">Меньше 3 дней</option>
          </select>
          <button
            className="filter-clear"
            onClick={() => {
              setQ('')
              setFStage('')
              setFProgram('')
              setFAnketa('')
              setFDeadline('')
            }}
          >
            Сбросить
          </button>
          <span className="filter-count">
            {filtered.length} из {clients.length}
          </span>
        </div>

        {/* table */}
        <div className="table-card">
          <div className="thead-row">
            <div>Студент</div>
            <div>Родитель</div>
            <div>Telegram ID</div>
            <div>Анкета</div>
            <div>Этап</div>
            <div>Программа</div>
            <div>Вузы</div>
            <div>Экзамены</div>
            <div>Чек-лист</div>
          </div>

          {loading ? (
            <div className="empty-state">Загрузка…</div>
          ) : error ? (
            <div className="empty-state" style={{ color: 'rgb(190,40,40)' }}>{error}</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              {clients.length === 0 ? 'Пока нет студентов. Нажми «Добавить студента».' : 'Ничего не найдено по текущим фильтрам.'}
            </div>
          ) : (
            filtered.map((c) => {
              const stage = STAGE_BY_ID[c.stage] ?? { label: c.stage, color: 'gray' as CrmStageColor }
              const dInfo = deadlineInfo(c.stageDeadline, now)
              const uniPreview = c.universities.slice(0, 2).map((u) => u.universityName).join(', ')
              const examRows = c.blocks.filter((b) => b.type === 'exam_table').flatMap((b) => (b as any).rows)
              const examsDone = examRows.filter((r: any) => r.status === 'Сдан').length
              const checklistItems = c.blocks.filter((b) => b.type === 'checklist').flatMap((b) => (b as any).items)
              const docsDone = checklistItems.filter((i: any) => i.done).length
              const docsPct = checklistItems.length ? Math.round((docsDone / checklistItems.length) * 100) : 0

              return (
                <div key={c.id} className={`data-row ${peekId === c.id ? 'active-row' : ''}`}>
                  <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => openPeek(c.id)}>
                    <span className="open-pill">
                      <Maximize2 style={{ width: 11, height: 11, stroke: '#fff' }} />
                      Открыть
                    </span>
                    <div className="cell-name-wrap">
                      <div className="cell-name">{c.name}</div>
                    </div>
                  </div>
                  <div className="clickable-cell" onClick={(e) => openPopover('text', c.id, e, 'parentName')}>
                    <div className="cell-sub">{c.parentName || '—'}</div>
                  </div>
                  <div className="clickable-cell" onClick={(e) => openPopover('text', c.id, e, 'telegramId')}>
                    <div className="cell-tg">{c.telegramId || '—'}</div>
                  </div>
                  <div className="clickable-cell" onClick={(e) => openPopover('anketa', c.id, e)}>
                    <span className={`anketa-dot ${c.anketaDone ? 'done' : 'pending'}`} title={c.anketaDone ? 'Заполнена' : 'Не заполнена'} />
                  </div>
                  <div className="clickable-cell" onClick={(e) => openPopover('stage', c.id, e)}>
                    <div className="stage-cell">
                      <span className="stage-pill" style={{ background: pillBg(stage.color), color: pillFg(stage.color) }}>
                        {stage.label}
                      </span>
                      <span className={`deadline-chip ${dInfo.cls}`}>
                        <Clock style={{ width: 10, height: 10 }} />
                        {dInfo.text}
                      </span>
                    </div>
                  </div>
                  <div className="clickable-cell" onClick={(e) => openPopover('program', c.id, e)}>
                    <span className="program-pill">{programLabel(c.program)}</span>
                  </div>
                  <div className="clickable-cell" onClick={(e) => openPopover('uni', c.id, e)}>
                    <div className="uni-cell">{uniPreview || '—'}</div>
                    {c.universities.length > 2 && <div className="uni-count">+{c.universities.length - 2} ещё</div>}
                  </div>
                  <div style={{ cursor: 'pointer' }} onClick={() => openPeek(c.id)}>
                    <div className="cell-sub">{examRows.length ? `${examsDone}/${examRows.length} сдано` : '—'}</div>
                  </div>
                  <div style={{ cursor: 'pointer' }} onClick={() => openPeek(c.id)}>
                    <div className="mini-progress">
                      <div className="mini-bar">
                        <div className="mini-bar-fill" style={{ width: `${docsPct}%` }} />
                      </div>
                      <span className="mini-label">
                        {docsDone}/{checklistItems.length || 0}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          )}

          {showAdd && (
            <div className="add-row-form">
              <div className="field-grid">
                <input placeholder="Имя студента" value={naName} onChange={(e) => setNaName(e.target.value)} />
                <input placeholder="Имя родителя" value={naParent} onChange={(e) => setNaParent(e.target.value)} />
                <input placeholder="@username" value={naTg} onChange={(e) => setNaTg(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline" onClick={() => setShowAdd(false)}>
                  Отмена
                </button>
                <button className="btn btn-primary" onClick={createClient}>
                  Создать
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* side peek */}
      <div className={`peek-backdrop ${peekClient ? 'show' : ''}`} onClick={closePeek} />
      <div className={`peek-panel ${peekClient ? 'show' : ''}`}>
        {peekClient && (
          <PeekContent
            key={peekClient.id}
            client={peekClient}
            now={now}
            editingBlockId={editingBlockId}
            setEditingBlockId={setEditingBlockId}
            addBlockFor={addBlockFor}
            setAddBlockFor={setAddBlockFor}
            onClose={closePeek}
            setField={setField}
            setBlocks={setBlocks}
            addUni={addUni}
            removeUni={removeUni}
            deleteClient={deleteClient}
            fetchUnis={fetchUnis}
            uniResults={uniResults}
            setUniResults={setUniResults}
          />
        )}
      </div>

      {/* cell popover */}
      {popover && popClient && (
        <div className="cell-popover" ref={popRef} style={{ top: popover.top, left: popover.left, width: popover.kind === 'text' ? 240 : 280 }}>
          {popover.kind === 'stage' && (
            <>
              <div className="cp-input-row">
                <span className="cp-chip" style={{ background: pillBg(STAGE_BY_ID[popClient.stage]?.color ?? 'gray'), color: pillFg(STAGE_BY_ID[popClient.stage]?.color ?? 'gray') }}>
                  {STAGE_BY_ID[popClient.stage]?.label ?? popClient.stage}
                </span>
              </div>
              <div className="cp-hint">Выбери этап</div>
              <div className="cp-options">
                {STAGES.map((st) => (
                  <div
                    key={st.id}
                    className="cp-option"
                    onClick={() => {
                      setField(popClient.id, 'stage', st.id, true)
                      closePopover()
                    }}
                  >
                    <span className="cp-dots"><GripVertical style={{ width: 12, height: 12 }} /></span>
                    <span className="cp-tag" style={{ background: pillBg(st.color), color: pillFg(st.color) }}>
                      {st.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="cp-locked-note">Список этапов фиксированный — от него зависят дедлайны и фильтры.</div>
            </>
          )}

          {popover.kind === 'anketa' && (
            <>
              <div className="cp-hint">Статус анкеты</div>
              <div className="cp-options">
                {[
                  { v: false, label: 'Не заполнена', color: 'gray' as CrmStageColor },
                  { v: true, label: 'Заполнена', color: 'green' as CrmStageColor },
                ].map((o) => (
                  <div
                    key={String(o.v)}
                    className="cp-option"
                    onClick={() => {
                      setField(popClient.id, 'anketaDone', o.v, true)
                      closePopover()
                    }}
                  >
                    <span className="cp-dots"><GripVertical style={{ width: 12, height: 12 }} /></span>
                    <span className="cp-tag" style={{ background: pillBg(o.color), color: pillFg(o.color) }}>
                      {o.label}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {popover.kind === 'program' && (
            <>
              <div className="cp-hint">Выбери программу</div>
              <div className="cp-options">
                {PROGRAMS.map((p) => (
                  <div
                    key={p.id}
                    className="cp-option"
                    onClick={() => {
                      setField(popClient.id, 'program', p.id, true)
                      closePopover()
                    }}
                  >
                    <span className="cp-dots"><GripVertical style={{ width: 12, height: 12 }} /></span>
                    <span className="cp-tag" style={{ background: pillBg('brown'), color: pillFg('brown') }}>
                      {p.label}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {popover.kind === 'uni' && (
            <>
              <div className="cp-input-row">
                {popClient.universities.map((u) => (
                  <span key={u.id} className="cp-chip" style={{ background: pillBg('brown'), color: pillFg('brown') }}>
                    {u.universityName}
                    <button onMouseDown={(e) => { e.preventDefault(); removeUni(popClient.id, u.id) }}>
                      <X style={{ width: 10, height: 10 }} />
                    </button>
                  </span>
                ))}
                <input
                  className="cp-caret-input"
                  autoFocus
                  placeholder="Искать вуз..."
                  value={popQuery}
                  onChange={(e) => setPopQuery(e.target.value)}
                />
              </div>
              <div className="cp-hint">Вузы, куда подаём</div>
              <div className="cp-options">
                {uniResults
                  .filter((u) => !popClient.universities.some((x) => x.universityName.toLowerCase() === u.name.toLowerCase()))
                  .map((u) => (
                    <div key={u.name} className="cp-option" onClick={() => addUni(popClient.id, u.name, 'explorer')}>
                      <span className="cp-dots"><GripVertical style={{ width: 12, height: 12 }} /></span>
                      <span className="cp-tag" style={{ background: pillBg('brown'), color: pillFg('brown') }}>
                        {u.name} <span style={{ opacity: 0.6, fontWeight: 500 }}>· {u.city}</span>
                      </span>
                    </div>
                  ))}
              </div>
              {popQuery.trim() && !uniResults.some((u) => u.name.toLowerCase() === popQuery.trim().toLowerCase()) && (
                <div className="cp-create" onClick={() => addUni(popClient.id, popQuery, 'manual')}>
                  + Добавить <b>«{popQuery.trim()}»</b> как новый вуз
                </div>
              )}
            </>
          )}

          {popover.kind === 'text' && popover.field && (
            <>
              <div className="cp-input-row">
                <input
                  className="cp-caret-input"
                  style={{ width: '100%' }}
                  autoFocus
                  defaultValue={(popClient[popover.field] as string) ?? ''}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setField(popClient.id, popover.field!, (e.target as HTMLInputElement).value, true)
                      closePopover()
                    }
                  }}
                  onBlur={(e) => setField(popClient.id, popover.field!, e.target.value, true)}
                />
              </div>
              <div className="cp-locked-note">Enter или клик вне поля — сохранить.</div>
            </>
          )}
        </div>
      )}

      {/* toast */}
      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  )
}

/* ============================================================
   PEEK CONTENT — its own component so it re-mounts per client
   (key=client.id) and keeps uncontrolled sub-state clean.
   ============================================================ */
function PeekContent(props: {
  client: CrmClient
  now: number
  editingBlockId: string | null
  setEditingBlockId: (id: string | null) => void
  addBlockFor: string | null
  setAddBlockFor: (id: string | null) => void
  onClose: () => void
  setField: (clientId: string, field: keyof CrmClient, value: unknown, immediate?: boolean) => void
  setBlocks: (clientId: string, updater: (blocks: Block[]) => Block[], immediate?: boolean) => void
  addUni: (clientId: string, name: string, source: 'explorer' | 'manual') => void
  removeUni: (clientId: string, uniId: number) => void
  deleteClient: (clientId: string, name: string) => void
  fetchUnis: (q: string) => void
  uniResults: { name: string; city: string }[]
  setUniResults: (r: { name: string; city: string }[]) => void
}) {
  const {
    client: s,
    now,
    editingBlockId,
    setEditingBlockId,
    addBlockFor,
    setAddBlockFor,
    onClose,
    setField,
    setBlocks,
    addUni,
    removeUni,
    deleteClient,
    fetchUnis,
    uniResults,
    setUniResults,
  } = props

  const dInfo = deadlineInfo(s.stageDeadline, now)
  const [uniInput, setUniInput] = useState('')
  const [showUniInput, setShowUniInput] = useState(false)

  useEffect(() => {
    if (!showUniInput) return
    const h = setTimeout(() => fetchUnis(uniInput), 180)
    return () => clearTimeout(h)
  }, [uniInput, showUniInput, fetchUnis])

  const toLocalDT = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : '')
  const toLocalDate = (v: string | null) => (v ? new Date(v).toISOString().slice(0, 10) : '')

  return (
    <>
      <div className="peek-cover" style={{ background: 'linear-gradient(120deg, rgb(var(--brown)), rgb(var(--orange)))' }}>
        <div className="peek-topbar">
          <button className="peek-icon-btn" onClick={onClose} title="Закрыть">
            <X style={{ width: 15, height: 15 }} />
          </button>
          <button className="peek-icon-btn" onClick={() => deleteClient(s.id, s.name)} title="Удалить студента">
            <Trash2 style={{ width: 15, height: 15 }} />
          </button>
        </div>
      </div>
      <div className="peek-scroll">
        <input className="peek-title" value={s.name} onChange={(e) => setField(s.id, 'name', e.target.value)} />

        <PropRow icon={<Users className="icon" />} label="Родитель">
          <input value={s.parentName ?? ''} onChange={(e) => setField(s.id, 'parentName', e.target.value)} />
        </PropRow>

        <PropRow icon={<MessageCircle className="icon" />} label="Telegram ID">
          <input value={s.telegramId ?? ''} onChange={(e) => setField(s.id, 'telegramId', e.target.value)} />
        </PropRow>

        <PropRow icon={<CheckSquare className="icon" />} label="Анкета">
          <select
            className="tag-select"
            style={{ background: s.anketaDone ? pillBg('green') : pillBg('gray'), color: s.anketaDone ? pillFg('green') : pillFg('gray') }}
            value={s.anketaDone ? 'true' : 'false'}
            onChange={(e) => setField(s.id, 'anketaDone', e.target.value === 'true', true)}
          >
            <option value="false">Не заполнена</option>
            <option value="true">Заполнена</option>
          </select>
        </PropRow>

        <PropRow icon={<Link2 className="icon" />} label="Ссылка на анкету">
          <LinkField value={s.anketaLink} onSave={(v) => setField(s.id, 'anketaLink', v, true)} />
        </PropRow>

        <PropRow icon={<Clock className="icon" />} label="Этап">
          <select
            className="tag-select"
            style={{ background: pillBg(STAGE_BY_ID[s.stage]?.color ?? 'gray'), color: pillFg(STAGE_BY_ID[s.stage]?.color ?? 'gray') }}
            value={s.stage}
            onChange={(e) => setField(s.id, 'stage', e.target.value, true)}
          >
            {STAGES.map((st) => (
              <option key={st.id} value={st.id}>
                {st.label}
              </option>
            ))}
          </select>
        </PropRow>

        <PropRow icon={<Clock className="icon" />} label="Дедлайн этапа">
          <input
            type="datetime-local"
            value={toLocalDT(s.stageDeadline)}
            onChange={(e) => setField(s.id, 'stageDeadline', e.target.value ? new Date(e.target.value).toISOString() : null, true)}
          />
          <div className="stage-deadline-inline">
            <span className={`deadline-tag-line ${dInfo.cls}`}>
              <Clock style={{ width: 12, height: 12 }} />
              {dInfo.text}
            </span>
          </div>
        </PropRow>

        <PropRow icon={<Calendar className="icon" />} label="Дата X">
          <input
            type="date"
            value={toLocalDate(s.dateX)}
            onChange={(e) => setField(s.id, 'dateX', e.target.value || null, true)}
          />
        </PropRow>

        <PropRow icon={<BookOpen className="icon" />} label="Программа">
          <select
            className="tag-select"
            style={{ background: pillBg('brown'), color: pillFg('brown') }}
            value={s.program}
            onChange={(e) => setField(s.id, 'program', e.target.value, true)}
          >
            {PROGRAMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </PropRow>

        <PropRow icon={<MapPin className="icon" />} label="Вузы">
          <div className="tag-list">
            {s.universities.map((u) => (
              <span key={u.id} className="tag">
                {u.universityName}
                <button onClick={() => removeUni(s.id, u.id)}>
                  <X style={{ width: 10, height: 10 }} />
                </button>
              </span>
            ))}
            <span className="tag-add-wrap">
              <button
                className="tag-add-btn"
                onClick={() => {
                  setShowUniInput((v) => !v)
                  setUniInput('')
                  setUniResults([])
                }}
              >
                <Plus style={{ width: 12, height: 12 }} />
              </button>
              {showUniInput && (
                <>
                  <input
                    className="tag-input"
                    autoFocus
                    placeholder="Найти вуз..."
                    value={uniInput}
                    onChange={(e) => setUniInput(e.target.value)}
                    onBlur={() => setTimeout(() => setShowUniInput(false), 150)}
                  />
                  {uniInput.trim() && (
                    <div className="uni-suggest">
                      {uniResults
                        .filter((u) => !s.universities.some((x) => x.universityName.toLowerCase() === u.name.toLowerCase()))
                        .map((u) => (
                          <div
                            key={u.name}
                            className="uni-suggest-item"
                            onMouseDown={() => {
                              addUni(s.id, u.name, 'explorer')
                              setUniInput('')
                              setShowUniInput(false)
                            }}
                          >
                            {u.name} <span style={{ color: 'rgb(var(--gray))' }}>· {u.city}</span>
                          </div>
                        ))}
                      {!uniResults.some((u) => u.name.toLowerCase() === uniInput.trim().toLowerCase()) && (
                        <div
                          className="uni-suggest-item"
                          style={{ color: 'rgb(var(--brown))', fontWeight: 600 }}
                          onMouseDown={() => {
                            addUni(s.id, uniInput, 'manual')
                            setUniInput('')
                            setShowUniInput(false)
                          }}
                        >
                          + Добавить «{uniInput.trim()}» как новый вуз
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </span>
          </div>
        </PropRow>

        <PropRow icon={<Link2 className="icon" />} label="Ссылка на подбор">
          <LinkField value={s.podborLink} onSave={(v) => setField(s.id, 'podborLink', v, true)} />
        </PropRow>

        <div className="peek-divider" />

        {s.blocks.map((b) => (
          <BlockView
            key={b.id}
            client={s}
            block={b}
            editingBlockId={editingBlockId}
            setEditingBlockId={setEditingBlockId}
            setBlocks={setBlocks}
          />
        ))}

        <div className="add-block-row">
          <button className="add-block-btn" onClick={() => setAddBlockFor(addBlockFor === s.id ? null : s.id)}>
            <Plus style={{ width: 14, height: 14 }} />
            Добавить блок
          </button>
          {addBlockFor === s.id && (
            <div className="add-block-menu">
              {[
                { type: 'text', label: '📝 Текст' },
                { type: 'checklist', label: '☑️ Чек-лист' },
                { type: 'exam_table', label: '📊 Таблица экзаменов' },
              ].map((o) => (
                <div
                  key={o.type}
                  className="add-block-menu-item"
                  onClick={() => {
                    setBlocks(
                      s.id,
                      (blocks) => {
                        let block: Block
                        if (o.type === 'text') block = { id: genId('blk'), type: 'text', title: '', text: '', size: 'md' }
                        else if (o.type === 'checklist') block = { id: genId('blk'), type: 'checklist', title: 'Новый чек-лист', items: [] }
                        else block = { id: genId('blk'), type: 'exam_table', title: 'Новая таблица', rows: [] }
                        return [...blocks, block]
                      },
                      true
                    )
                    setAddBlockFor(null)
                  }}
                >
                  {o.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function PropRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="prop-row">
      <div className="prop-label">
        {icon}
        {label}
      </div>
      <div className="prop-value">{children}</div>
    </div>
  )
}

function LinkField({ value, onSave }: { value: string | null; onSave: (v: string) => void }) {
  const [v, setV] = useState(value ?? '')
  useEffect(() => setV(value ?? ''), [value])
  const has = !!v.trim()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input value={v} placeholder="Вставь ссылку..." style={{ flex: 1 }} onChange={(e) => setV(e.target.value)} onBlur={() => onSave(v)} />
      {has && (
        <a
          href={v}
          target="_blank"
          rel="noopener noreferrer"
          title="Открыть"
          style={{ width: 26, height: 26, borderRadius: 7, background: 'rgb(var(--bg))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgb(var(--brown))', flex: '0 0 auto' }}
        >
          <ExternalLink style={{ width: 13, height: 13 }} />
        </a>
      )}
    </div>
  )
}

/* ---------- blocks ---------- */
function BlockView(props: {
  client: CrmClient
  block: Block
  editingBlockId: string | null
  setEditingBlockId: (id: string | null) => void
  setBlocks: (clientId: string, updater: (blocks: Block[]) => Block[], immediate?: boolean) => void
}) {
  const { client: s, block, editingBlockId, setEditingBlockId, setBlocks } = props

  const updateBlock = (updater: (b: Block) => Block, immediate = false) =>
    setBlocks(s.id, (blocks) => blocks.map((b) => (b.id === block.id ? updater(b) : b)), immediate)
  const removeBlock = () => setBlocks(s.id, (blocks) => blocks.filter((b) => b.id !== block.id), true)

  const toolbarDelete = (
    <button className="bt-btn" title="Удалить блок" onClick={removeBlock}>
      <Trash2 style={{ width: 13, height: 13 }} />
    </button>
  )

  if (block.type === 'text') {
    const isEditing = editingBlockId === block.id
    const sizeClass = block.size === 'sm' ? 'size-sm' : block.size === 'lg' ? 'size-lg' : ''
    const wrapSel = (marker: string) => {
      const ta = document.getElementById(`blk-edit-${block.id}`) as HTMLTextAreaElement | null
      if (!ta) return
      const { selectionStart: a, selectionEnd: b, value } = ta
      if (a === b) return
      const wrapped = value.slice(0, a) + marker + value.slice(a, b) + marker + value.slice(b)
      ta.value = wrapped
      updateBlock((bl) => ({ ...(bl as any), text: wrapped }))
      ta.focus()
      ta.setSelectionRange(a, b + marker.length * 2)
    }

    return (
      <div className={`block-wrap ${isEditing ? 'editing' : ''}`}>
        <div className="block-toolbar">
          <button className="bt-btn" title="Жирный" onMouseDown={(e) => e.preventDefault()} onClick={() => wrapSel('**')}>
            <b>B</b>
          </button>
          <button className="bt-btn" title="Курсив" onMouseDown={(e) => e.preventDefault()} onClick={() => wrapSel('*')}>
            <i>I</i>
          </button>
          <div className="bt-sep" />
          <button className={`bt-btn ${block.size === 'sm' ? 'active' : ''}`} onClick={() => updateBlock((b) => ({ ...(b as any), size: 'sm' }), true)}>
            A-
          </button>
          <button className={`bt-btn ${!block.size || block.size === 'md' ? 'active' : ''}`} onClick={() => updateBlock((b) => ({ ...(b as any), size: 'md' }), true)}>
            A
          </button>
          <button className={`bt-btn ${block.size === 'lg' ? 'active' : ''}`} onClick={() => updateBlock((b) => ({ ...(b as any), size: 'lg' }), true)}>
            A+
          </button>
          {toolbarDelete}
        </div>
        <input
          className="block-title-input"
          placeholder="Заголовок блока"
          value={block.title}
          onChange={(e) => updateBlock((b) => ({ ...(b as any), title: e.target.value }))}
        />
        {isEditing ? (
          <textarea
            className={`block-text-edit ${sizeClass}`}
            id={`blk-edit-${block.id}`}
            autoFocus
            defaultValue={block.text}
            onChange={(e) => updateBlock((b) => ({ ...(b as any), text: e.target.value }))}
            onBlur={() => setEditingBlockId(null)}
          />
        ) : (
          <div
            className={`block-text-display ${sizeClass} ${!block.text ? 'empty' : ''}`}
            onClick={() => setEditingBlockId(block.id)}
            dangerouslySetInnerHTML={{ __html: block.text ? markdownLiteToHtml(block.text) : 'Нажми, чтобы добавить текст...' }}
          />
        )}
      </div>
    )
  }

  if (block.type === 'checklist') {
    return (
      <div className="block-wrap">
        <div className="block-toolbar">{toolbarDelete}</div>
        <input
          className="block-title-input"
          placeholder="Заголовок чек-листа"
          value={block.title}
          onChange={(e) => updateBlock((b) => ({ ...(b as any), title: e.target.value }))}
        />
        {block.items.length === 0 && <p style={{ fontSize: 12, color: 'rgb(var(--gray))', margin: '4px 0' }}>Пусто — добавь пункт ниже.</p>}
        {block.items.map((item) => (
          <div key={item.id} className={`checklist-item ${item.done ? 'done' : ''}`}>
            <input
              type="checkbox"
              checked={item.done}
              onChange={(e) => updateBlock((b) => ({ ...(b as any), items: (b as any).items.map((i: any) => (i.id === item.id ? { ...i, done: e.target.checked } : i)) }), true)}
            />
            <label>{item.text}</label>
            <button
              className="basket-remove"
              title="Удалить пункт"
              onClick={() => updateBlock((b) => ({ ...(b as any), items: (b as any).items.filter((i: any) => i.id !== item.id) }), true)}
            >
              <X style={{ width: 13, height: 13 }} />
            </button>
          </div>
        ))}
        <AddInline
          placeholder="Новый пункт..."
          onAdd={(val) => updateBlock((b) => ({ ...(b as any), items: [...(b as any).items, { id: genId('item'), text: val, done: false }] }), true)}
        />
      </div>
    )
  }

  // exam_table
  return (
    <div className="block-wrap">
      <div className="block-toolbar">{toolbarDelete}</div>
      <input
        className="block-title-input"
        placeholder="Заголовок"
        value={block.title}
        onChange={(e) => updateBlock((b) => ({ ...(b as any), title: e.target.value }))}
      />
      {block.rows.map((row) => (
        <div key={row.id} className="exam-row">
          <input
            style={{ border: 'none', background: 'transparent', fontWeight: 600, fontSize: 13, padding: '6px 0' }}
            value={row.name}
            onChange={(e) => updateBlock((b) => ({ ...(b as any), rows: (b as any).rows.map((r: any) => (r.id === row.id ? { ...r, name: e.target.value } : r)) }))}
          />
          <select
            value={row.status}
            onChange={(e) => updateBlock((b) => ({ ...(b as any), rows: (b as any).rows.map((r: any) => (r.id === row.id ? { ...r, status: e.target.value } : r)) }), true)}
          >
            {EXAM_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              placeholder="балл"
              style={{ flex: 1 }}
              value={row.score}
              onChange={(e) => updateBlock((b) => ({ ...(b as any), rows: (b as any).rows.map((r: any) => (r.id === row.id ? { ...r, score: e.target.value } : r)) }))}
            />
            <button
              className="basket-remove"
              title="Удалить экзамен"
              onClick={() => updateBlock((b) => ({ ...(b as any), rows: (b as any).rows.filter((r: any) => r.id !== row.id) }), true)}
            >
              <X style={{ width: 12, height: 12 }} />
            </button>
          </div>
        </div>
      ))}
      <AddInline
        placeholder="Название экзамена..."
        onAdd={(val) => updateBlock((b) => ({ ...(b as any), rows: [...(b as any).rows, { id: genId('row'), name: val, status: 'Не сдан', score: '' }] }), true)}
      />
    </div>
  )
}

function AddInline({ placeholder, onAdd }: { placeholder: string; onAdd: (val: string) => void }) {
  const [v, setV] = useState('')
  const commit = () => {
    const val = v.trim()
    if (!val) return
    onAdd(val)
    setV('')
  }
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
      <input
        placeholder={placeholder}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
        }}
        style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1.5px solid rgb(var(--lightgray))', fontFamily: 'inherit', fontSize: 12.5 }}
      />
      <button className="btn btn-outline btn-sm" onClick={commit}>
        +
      </button>
    </div>
  )
}
