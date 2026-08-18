'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Download,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'

/* ============================================================
   Types (camelCase, as the API returns them)
   ============================================================ */
type BankRecord = {
  id: number
  universityName: string
  program: string
  city: string | null
  link: string | null
  arwu: string | null
  chinaRank: string | null
  tuition: string | null
  examRequirements: string | null
  deadline: string | null
  dormCost: string | null
  notes: string | null
  verifiedAt: string | null
  verifiedBy: string | null
}

type ShortlistItem = Omit<BankRecord, 'verifiedAt' | 'verifiedBy'> & {
  bankId: number | null
  addedAt: string
}

type ShortlistSummary = {
  id: string
  studentName: string
  parentName: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
  itemCount: number
}

/* ============================================================
   Small helpers
   ============================================================ */
function formatDate(value?: string | null) {
  if (!value) return '—'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function freshness(dateStr?: string | null): { cls: string; label: string } {
  if (!dateStr) return { cls: 'bg-study-lightgray', label: 'Нет данных о проверке' }
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (days <= 90) return { cls: 'bg-study-green', label: `Проверено ${days} дн. назад` }
  if (days <= 180)
    return { cls: 'bg-study-orange', label: `Проверено ${Math.floor(days / 30)} мес. назад — стоит перепроверить` }
  return { cls: 'bg-study-red', label: `Проверено ${Math.floor(days / 30)} мес. назад — устарело` }
}

const emptyNewRecord = {
  universityName: '',
  program: '',
  city: '',
  link: '',
  arwu: '',
  chinaRank: '',
  tuition: '',
  examRequirements: '',
  deadline: '',
  dormCost: '',
  notes: '',
  verifiedBy: 'Ашот',
}

/* ============================================================
   Component
   ============================================================ */
export default function UniversityBankTool() {
  const [view, setView] = useState<'list' | 'workspace'>('list')
  const [shortlists, setShortlists] = useState<ShortlistSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // new-shortlist modal
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [newStudentName, setNewStudentName] = useState('')
  const [newParentName, setNewParentName] = useState('')
  const [newCreatedBy, setNewCreatedBy] = useState('Ашот')
  const [creating, setCreating] = useState(false)

  // workspace
  const [current, setCurrent] = useState<ShortlistSummary | null>(null)
  const [items, setItems] = useState<ShortlistItem[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BankRecord[]>([])
  const [searching, setSearching] = useState(false)
  const [busy, setBusy] = useState(false)

  // new bank record form (inside workspace)
  const [showNewRecord, setShowNewRecord] = useState(false)
  const [newRecord, setNewRecord] = useState(emptyNewRecord)
  const [savingRecord, setSavingRecord] = useState(false)

  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((text: string) => {
    setToast(text)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }, [])

  /* ---------- load shortlists ---------- */
  const loadShortlists = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/shortlists', { credentials: 'same-origin' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Не удалось загрузить шорт-листы')
      setShortlists(data.shortlists ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadShortlists()
  }, [loadShortlists])

  /* ---------- open one shortlist ---------- */
  const openShortlist = useCallback(async (id: string) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/shortlists/${id}`, { credentials: 'same-origin' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Не удалось открыть шорт-лист')
      setCurrent({
        id: data.shortlist.id,
        studentName: data.shortlist.studentName,
        parentName: data.shortlist.parentName,
        createdBy: data.shortlist.createdBy,
        createdAt: data.shortlist.createdAt,
        updatedAt: data.shortlist.updatedAt,
        itemCount: (data.items ?? []).length,
      })
      setItems(data.items ?? [])
      setQuery('')
      setResults([])
      setShowNewRecord(false)
      setView('workspace')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setBusy(false)
    }
  }, [showToast])

  /* ---------- create shortlist ---------- */
  const createShortlist = useCallback(async () => {
    const name = newStudentName.trim()
    if (!name) {
      showToast('Укажите имя студента')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/admin/shortlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          studentName: name,
          parentName: newParentName.trim(),
          createdBy: newCreatedBy,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Не удалось создать шорт-лист')
      setIsNewOpen(false)
      setNewStudentName('')
      setNewParentName('')
      await openShortlist(data.shortlist.id)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setCreating(false)
    }
  }, [newStudentName, newParentName, newCreatedBy, openShortlist, showToast])

  /* ---------- delete shortlist ---------- */
  const deleteShortlist = useCallback(
    async (id: string, name: string) => {
      if (!confirm(`Удалить шорт-лист «${name}»? Это действие нельзя отменить.`)) return
      try {
        const res = await fetch(`/api/admin/shortlists/${id}`, {
          method: 'DELETE',
          credentials: 'same-origin',
        })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error ?? 'Не удалось удалить')
        }
        setShortlists((prev) => prev.filter((s) => s.id !== id))
        showToast('Шорт-лист удалён')
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Ошибка')
      }
    },
    [showToast]
  )

  /* ---------- search the bank (debounced) ---------- */
  useEffect(() => {
    if (view !== 'workspace') return
    let cancelled = false
    setSearching(true)
    const handle = setTimeout(async () => {
      try {
        const url = query.trim()
          ? `/api/admin/university-bank?q=${encodeURIComponent(query.trim())}`
          : '/api/admin/university-bank'
        const res = await fetch(url, { credentials: 'same-origin' })
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) throw new Error(data?.error ?? 'Ошибка поиска')
        setResults(data.records ?? [])
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [query, view])

  const addedBankIds = new Set(items.map((i) => i.bankId).filter((id): id is number => id != null))

  /* ---------- add to basket ---------- */
  const addToBasket = useCallback(
    async (bankId: number) => {
      if (!current) return
      setBusy(true)
      try {
        const res = await fetch(`/api/admin/shortlists/${current.id}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ bankId }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error ?? 'Не удалось добавить')
        setItems((prev) => [...prev, data.item])
        showToast(`Добавлено: ${data.item.universityName} — ${data.item.program}`)
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Ошибка')
      } finally {
        setBusy(false)
      }
    },
    [current, showToast]
  )

  /* ---------- remove from basket ---------- */
  const removeFromBasket = useCallback(
    async (itemId: number) => {
      if (!current) return
      setBusy(true)
      try {
        const res = await fetch(`/api/admin/shortlists/${current.id}/items?itemId=${itemId}`, {
          method: 'DELETE',
          credentials: 'same-origin',
        })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error ?? 'Не удалось убрать')
        }
        setItems((prev) => prev.filter((i) => i.id !== itemId))
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Ошибка')
      } finally {
        setBusy(false)
      }
    },
    [current, showToast]
  )

  /* ---------- save a brand-new bank record and add it ---------- */
  const saveNewRecord = useCallback(async () => {
    if (!current) return
    const university = newRecord.universityName.trim()
    const program = newRecord.program.trim()
    if (!university || !program) {
      showToast('Укажите как минимум университет и программу')
      return
    }
    setSavingRecord(true)
    try {
      const res = await fetch('/api/admin/university-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(newRecord),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Не удалось сохранить запись')

      // then add the fresh bank record to the current shortlist
      const addRes = await fetch(`/api/admin/shortlists/${current.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ bankId: data.record.id }),
      })
      const addData = await addRes.json()
      if (!addRes.ok) throw new Error(addData?.error ?? 'Запись сохранена, но не добавлена в список')

      setItems((prev) => [...prev, addData.item])
      setShowNewRecord(false)
      setNewRecord(emptyNewRecord)
      setQuery('')
      showToast('Новая запись сохранена в базу и добавлена в список')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setSavingRecord(false)
    }
  }, [current, newRecord, showToast])

  /* ---------- export XLSX (faithful to the manual template) ---------- */
  const exportXlsx = useCallback(async () => {
    if (!current || items.length === 0) {
      showToast('В шорт-листе пока нет программ')
      return
    }
    try {
      const ExcelJS = (await import('exceljs')).default

      const COL_WIDTHS = [38.13, 12.63, 12.63, 12.63, 12.63, 38.13, 12.63, 12.63, 27.5, 19.38, 12.63]
      const FILL = { yellow: 'FFFFE599', blue: 'FFCFE2F3', green: 'FFD9EAD3' }
      const COL_GROUP: Record<string, keyof typeof FILL> = {
        A: 'yellow', B: 'yellow', C: 'yellow', D: 'yellow', E: 'yellow',
        F: 'blue', G: 'blue', H: 'blue', I: 'blue',
        J: 'green', K: 'green',
      }
      const RIGHT_BORDER_COLS = new Set(['E', 'I', 'K'])
      const SUB_HEADERS: [string, string][] = [
        ['A', 'Название ВУЗа'],
        ['B', 'Ссылка'],
        ['C', 'Локация'],
        ['D', 'Мировой рейтинг ShanghaiRanking (ARWU 2025)'],
        ['E', 'Рейтинг в Китае ShanghaiRanking (Best Chinese Universities Ranking 2025)'],
        ['F', 'Программы бакалавриата (на английском языке)'],
        ['G', 'Стоимость обучения/год (цены бакалавриат)'],
        ['H', 'Требования к вступительным экзаменам'],
        ['I', 'Срок подачи на коммерцию (бакалавр)'],
        ['J', 'Стоимость общежития (цены, академ.год 9 месяцев)'],
        ['K', 'Заметки'],
      ]

      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('Sheet1', {
        views: [{ state: 'frozen', xSplit: 1, ySplit: 2 }],
      })
      ws.columns = COL_WIDTHS.map((w) => ({ width: w }))

      const setGroupHeaderCell = (cell: import('exceljs').Cell, text: string, color: string) => {
        cell.value = text
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
        cell.font = { name: 'Arial', bold: true, size: 10 }
        cell.alignment = { horizontal: 'center', vertical: 'bottom', wrapText: true }
        cell.border = { right: { style: 'thin' } }
      }

      // row 1: merged group bands
      ws.mergeCells('B1:E1')
      ws.mergeCells('F1:I1')
      ws.mergeCells('J1:K1')
      ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FILL.yellow } }
      setGroupHeaderCell(ws.getCell('B1'), 'Университет', FILL.yellow)
      setGroupHeaderCell(ws.getCell('F1'), 'Бакалавриат', FILL.blue)
      setGroupHeaderCell(ws.getCell('J1'), 'Условия жизни', FILL.green)

      // row 2: sub-headers
      SUB_HEADERS.forEach(([col, text]) => {
        const cell = ws.getCell(col + '2')
        cell.value = text
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FILL[COL_GROUP[col]] } }
        cell.font = { name: 'Arial', bold: true, size: 10 }
        cell.alignment = { vertical: 'bottom', wrapText: true }
        cell.border = {
          bottom: { style: 'thin' },
          right: RIGHT_BORDER_COLS.has(col) ? { style: 'thin' } : undefined,
        }
      })

      // data rows
      items.forEach((it, i) => {
        const r = i + 3
        const row = ws.getRow(r)
        row.getCell(1).value = it.universityName || ''
        const linkCell = row.getCell(2)
        if (it.link) {
          linkCell.value = { text: it.link, hyperlink: it.link }
          linkCell.font = { name: 'Arial', size: 10, color: { argb: 'FF0000FF' }, underline: true }
        } else {
          linkCell.value = ''
        }
        row.getCell(3).value = it.city || ''
        row.getCell(4).value = it.arwu || ''
        row.getCell(5).value = it.chinaRank || ''
        row.getCell(6).value = it.program || ''
        row.getCell(7).value = it.tuition || ''
        row.getCell(8).value = (it.examRequirements || '').replace(/;\s*/g, '\n')
        row.getCell(9).value = it.deadline || ''
        row.getCell(10).value = (it.dormCost || '').replace(/;\s*/g, '\n')
        row.getCell(11).value = (it.notes || '').replace(/;\s*/g, '\n')

        for (let c = 1; c <= 11; c++) {
          const cell = row.getCell(c)
          if (!cell.font) cell.font = { name: 'Arial', size: 10 }
          cell.alignment = { wrapText: true, vertical: 'top' }
        }
      })

      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const cleanName = current.studentName.replace(/[\\/:*?"<>|—]/g, '-').replace(/\s+/g, ' ').replace(/\.+$/, '').trim()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Шорт-лист ${cleanName}.xlsx`
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 1000)
      showToast('Файл экспортирован')
    } catch (err) {
      showToast('Не получилось сформировать файл: ' + (err instanceof Error ? err.message : ''))
    }
  }, [current, items, showToast])

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <div>
      {/* ---------- LIST VIEW ---------- */}
      {view === 'list' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-study-dark">Шорт-листы студентов</h2>
              <p className="text-sm text-study-gray">
                {isLoading ? '—' : `${shortlists.length} активных шорт-листов`}
              </p>
            </div>
            <button
              onClick={() => {
                setNewStudentName('')
                setNewParentName('')
                setIsNewOpen(true)
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-study-brown text-white text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              Новый шорт-лист
            </button>
          </div>

          {error && (
            <div className="bg-study-red/10 text-study-red rounded-xl p-4 text-sm">{error}</div>
          )}

          <div className="bg-study-card rounded-xl card-shadow overflow-hidden">
            {isLoading ? (
              <div className="p-10 text-center text-study-gray text-sm">Загрузка…</div>
            ) : shortlists.length === 0 ? (
              <div className="p-12 text-center text-study-gray text-sm">
                Пока нет ни одного шорт-листа. Нажмите «Новый шорт-лист», чтобы начать.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-study-lightgray">
                    <th className="text-left text-[11px] font-bold uppercase tracking-wide text-study-gray px-4 py-3">Студент</th>
                    <th className="text-left text-[11px] font-bold uppercase tracking-wide text-study-gray px-4 py-3">Вузов</th>
                    <th className="text-left text-[11px] font-bold uppercase tracking-wide text-study-gray px-4 py-3">Обновлено</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {shortlists.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => openShortlist(s.id)}
                      className="border-b border-study-lightgray last:border-0 cursor-pointer hover:bg-study-bg"
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-study-dark text-sm">{s.studentName}</div>
                        {s.parentName && <div className="text-xs text-study-gray">родитель: {s.parentName}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-study-brown/10 text-study-brown font-bold text-xs">
                          {s.itemCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-study-gray">{formatDate(s.updatedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => deleteShortlist(s.id, s.studentName)}
                            className="p-2 text-study-gray hover:text-study-red rounded-lg"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-study-gray" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ---------- WORKSPACE VIEW ---------- */}
      {view === 'workspace' && current && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => {
                setView('list')
                setCurrent(null)
                loadShortlists()
              }}
              className="w-9 h-9 rounded-lg border border-study-lightgray bg-study-card flex items-center justify-center text-study-dark"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-study-dark truncate">Шорт-лист: {current.studentName}</h2>
              <p className="text-xs text-study-gray">
                {current.parentName ? `родитель: ${current.parentName} · ` : ''}создан {formatDate(current.createdAt)}
              </p>
            </div>
            <div className="flex-1" />
            <button
              onClick={exportXlsx}
              disabled={items.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-study-brown text-white text-sm font-semibold disabled:opacity-40"
            >
              <Download className="w-4 h-4" />
              Экспорт XLSX
            </button>
          </div>

          <div className="grid lg:grid-cols-[1.3fr_1fr] gap-5 items-start">
            {/* search / bank panel */}
            <div className="bg-study-card rounded-xl card-shadow p-4 sm:p-6">
              <h3 className="text-sm font-bold text-study-dark mb-3 flex items-center gap-2">
                <Search className="w-4 h-4" />
                Найти вуз и программы в базе
              </h3>
              <div className="relative mb-4">
                <Search className="w-4 h-4 text-study-gray absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Например: Sichuan University или Software engineering"
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-study-lightgray bg-study-card text-sm text-study-dark focus:outline-none focus:border-study-brown"
                />
              </div>

              <div className="space-y-2">
                {searching && results.length === 0 ? (
                  <div className="py-6 text-center text-study-gray text-sm">Поиск…</div>
                ) : results.length === 0 ? (
                  <div className="py-6 text-center text-study-gray text-sm">
                    {query.trim() ? `Ничего не найдено по «${query.trim()}».` : 'База пуста или ничего не найдено.'}
                  </div>
                ) : (
                  results.map((b) => {
                    const isAdded = addedBankIds.has(b.id)
                    const f = freshness(b.verifiedAt)
                    return (
                      <div
                        key={b.id}
                        className="flex items-start gap-3 p-3 rounded-xl border border-study-lightgray"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-study-dark leading-snug">{b.universityName}</p>
                          <p className="text-xs text-study-brown font-semibold mb-1">{b.program}</p>
                          <div className="flex flex-wrap gap-x-2 gap-y-1 items-center text-[11px] text-study-gray">
                            <span className={`w-[7px] h-[7px] rounded-full ${f.cls}`} />
                            <span>{f.label}</span>
                            {b.city && <span>· {b.city}</span>}
                            <span>· {b.tuition ? `${b.tuition} ¥/год` : 'цена не указана'}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => !isAdded && addToBasket(b.id)}
                          disabled={isAdded || busy}
                          title={isAdded ? 'Уже в списке' : 'Добавить в шорт-лист'}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-none ${
                            isAdded ? 'bg-study-lightgray text-study-gray' : 'bg-study-green text-white'
                          }`}
                        >
                          {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </button>
                      </div>
                    )
                  })
                )}
              </div>

              {!showNewRecord && (
                <div className="mt-3 flex items-center justify-between gap-3 p-3.5 rounded-xl bg-study-orange/10 border border-dashed border-study-orange/40">
                  <span className="text-xs text-study-dark">Нет нужного вуза или программы в базе?</span>
                  <button
                    onClick={() => {
                      setNewRecord({ ...emptyNewRecord, universityName: query.trim() })
                      setShowNewRecord(true)
                    }}
                    className="px-3 py-1.5 rounded-lg border border-study-lightgray bg-study-card text-xs font-semibold text-study-dark whitespace-nowrap"
                  >
                    + Новая запись
                  </button>
                </div>
              )}

              {showNewRecord && (
                <div className="mt-3 pt-4 border-t border-study-lightgray">
                  <p className="text-xs font-bold text-study-dark mb-3">Новая запись в базе</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Университет">
                      <input value={newRecord.universityName} onChange={(e) => setNewRecord((r) => ({ ...r, universityName: e.target.value }))} className={inputCls} />
                    </Field>
                    <Field label="Программа">
                      <input value={newRecord.program} onChange={(e) => setNewRecord((r) => ({ ...r, program: e.target.value }))} placeholder="Software Engineering" className={inputCls} />
                    </Field>
                    <Field label="Город">
                      <input value={newRecord.city} onChange={(e) => setNewRecord((r) => ({ ...r, city: e.target.value }))} className={inputCls} />
                    </Field>
                    <Field label="Ссылка">
                      <input value={newRecord.link} onChange={(e) => setNewRecord((r) => ({ ...r, link: e.target.value }))} placeholder="https://" className={inputCls} />
                    </Field>
                    <Field label="Рейтинг ARWU">
                      <input value={newRecord.arwu} onChange={(e) => setNewRecord((r) => ({ ...r, arwu: e.target.value }))} className={inputCls} />
                    </Field>
                    <Field label="Рейтинг в Китае">
                      <input value={newRecord.chinaRank} onChange={(e) => setNewRecord((r) => ({ ...r, chinaRank: e.target.value }))} className={inputCls} />
                    </Field>
                    <Field label="Стоимость обучения (¥/год)">
                      <input value={newRecord.tuition} onChange={(e) => setNewRecord((r) => ({ ...r, tuition: e.target.value }))} className={inputCls} />
                    </Field>
                    <Field label="Кто проверил">
                      <select value={newRecord.verifiedBy} onChange={(e) => setNewRecord((r) => ({ ...r, verifiedBy: e.target.value }))} className={inputCls}>
                        <option>Ашот</option>
                        <option>Яна</option>
                      </select>
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Требования к экзаменам">
                        <textarea value={newRecord.examRequirements} onChange={(e) => setNewRecord((r) => ({ ...r, examRequirements: e.target.value }))} className={`${inputCls} min-h-[52px] resize-y`} />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Срок подачи">
                        <input value={newRecord.deadline} onChange={(e) => setNewRecord((r) => ({ ...r, deadline: e.target.value }))} className={inputCls} />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Стоимость общежития">
                        <textarea value={newRecord.dormCost} onChange={(e) => setNewRecord((r) => ({ ...r, dormCost: e.target.value }))} className={`${inputCls} min-h-[52px] resize-y`} />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Заметки / стипендии">
                        <textarea value={newRecord.notes} onChange={(e) => setNewRecord((r) => ({ ...r, notes: e.target.value }))} className={`${inputCls} min-h-[52px] resize-y`} />
                      </Field>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setShowNewRecord(false)}
                      className="flex-1 justify-center inline-flex items-center px-4 py-2 rounded-lg border border-study-lightgray bg-study-card text-sm font-semibold text-study-dark"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={saveNewRecord}
                      disabled={savingRecord}
                      className="flex-1 justify-center inline-flex items-center px-4 py-2 rounded-lg bg-study-brown text-white text-sm font-semibold disabled:opacity-40"
                    >
                      {savingRecord ? 'Сохранение…' : 'Сохранить и добавить'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* basket panel */}
            <div className="bg-study-card rounded-xl card-shadow p-4 sm:p-6">
              <h3 className="text-sm font-bold text-study-dark mb-3">
                В шорт-листе ({items.length})
              </h3>
              <div className="space-y-2">
                {items.length === 0 ? (
                  <div className="py-8 text-center text-study-gray text-sm">
                    Пока пусто — найди и добавь программы слева.
                  </div>
                ) : (
                  items.map((it) => (
                    <div key={it.id} className="flex items-start gap-2.5 p-3 rounded-xl bg-study-bg">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-study-dark leading-snug">{it.universityName}</p>
                        <p className="text-[11px] text-study-brown">{it.program}</p>
                        <p className="text-[11px] text-study-gray">
                          {it.tuition ? `${it.tuition} ¥/год` : 'цена не указана'} · {it.city || '—'}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromBasket(it.id)}
                        disabled={busy}
                        className="w-7 h-7 rounded-lg text-study-gray hover:text-study-red flex items-center justify-center flex-none"
                        title="Убрать из списка"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="pt-3 mt-1 border-t border-study-lightgray">
                <p className="text-[11px] text-study-gray">
                  Экспорт соберёт файл в том же формате, что и обычная ручная таблица.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- NEW SHORTLIST MODAL ---------- */}
      {isNewOpen && (
        <div className="fixed inset-0 bg-study-overlay/50 flex items-center justify-center z-50 p-5" onClick={() => setIsNewOpen(false)}>
          <div className="bg-study-card rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-study-dark mb-1">Новый шорт-лист</h3>
            <p className="text-xs text-study-gray mb-4">Укажи, для кого собираем список — дальше перейдём к подбору вузов.</p>
            <Field label="Имя студента">
              <input value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} placeholder="Например: Милана А." className={inputCls} autoFocus />
            </Field>
            <div className="mt-3">
              <Field label="Имя родителя">
                <input value={newParentName} onChange={(e) => setNewParentName(e.target.value)} placeholder="Например: Ирина А." className={inputCls} />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Кто создаёт">
                <select value={newCreatedBy} onChange={(e) => setNewCreatedBy(e.target.value)} className={inputCls}>
                  <option>Ашот</option>
                  <option>Яна</option>
                </select>
              </Field>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setIsNewOpen(false)} className="flex-1 justify-center inline-flex items-center px-4 py-2 rounded-lg border border-study-lightgray bg-study-card text-sm font-semibold text-study-dark">
                Отмена
              </button>
              <button onClick={createShortlist} disabled={creating} className="flex-1 justify-center inline-flex items-center px-4 py-2 rounded-lg bg-study-brown text-white text-sm font-semibold disabled:opacity-40">
                {creating ? 'Создание…' : 'Создать и перейти'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- TOAST ---------- */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-study-dark text-white text-sm font-semibold px-5 py-2.5 rounded-full z-[60] shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

const inputCls =
  'w-full px-3 py-2.5 rounded-lg border border-study-lightgray bg-study-card text-sm text-study-dark focus:outline-none focus:border-study-brown'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-study-dark mb-1.5">{label}</span>
      {children}
    </label>
  )
}
