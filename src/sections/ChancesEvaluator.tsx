'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, X, Trophy, XCircle, Clock, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import type { StudentCase } from '@/app/api/cases/route'

// ── Outcome helpers ───────────────────────────────────────────────────────────
type OutcomeKey = 'admitted' | 'rejected' | 'pre'

function outcomeKey(result: string): OutcomeKey {
  const r = result.toLowerCase()
  if (r.includes('reject') || r.includes('отказ')) return 'rejected'
  if (r.includes('pre')) return 'pre'
  return 'admitted'
}

const OUTCOME_CFG: Record<OutcomeKey, {
  label: string
  bg: string
  text: string
  border: string
  Icon: React.ComponentType<{ className?: string }>
}> = {
  admitted: { label: 'Поступление', bg: '#f0fdf4', text: '#166534', border: '#86efac', Icon: Trophy   },
  rejected: { label: 'Отказ',       bg: '#fef2f2', text: '#991b1b', border: '#fca5a5', Icon: XCircle  },
  pre:      { label: 'Предварит.',  bg: '#fffbeb', text: '#92400e', border: '#fcd34d', Icon: Clock    },
}

// ── Main component ────────────────────────────────────────────────────────────
/** Admissions, then pre-admissions, then rejections. */
function outcomeRank(c: StudentCase) {
  const k = outcomeKey(c.result)
  return k === 'admitted' ? 0 : k === 'pre' ? 1 : 2
}

/** How many of the reported fields a case actually carries — used to rank rows. */
function completeness(c: StudentCase) {
  return [
    c.gpa, c.ielts, c.toefl, c.duolingo, c.sat,
    c.hskLevel, c.csca_math, c.csca_physics, c.csca_chinese,
    c.direction || null, c.activities || null,
  ].filter(v => v != null && v !== '').length
}

/**
 * The bits that no longer have their own column, as one readable line.
 *
 * Направление, SAT and HSK were dropped from the table — each was filled in
 * under 20% of cases, so they were mostly dashes — but the handful of cases
 * that do report them are exactly the interesting ones. They live here instead
 * of being lost.
 */
function caseDetail(c: StudentCase) {
  const bits: string[] = []
  if (c.direction) bits.push(c.direction)
  if (c.sat != null) bits.push(`SAT ${c.sat}`)
  if (c.hskLevel != null) bits.push(`HSK ${c.hskLevel}${c.hskScore != null ? ` (${c.hskScore})` : ''}`)
  if (c.csca_chinese != null) bits.push(`CSCA Chinese ${c.csca_chinese}`)
  if (c.csca_chemistry != null) bits.push(`CSCA Chemistry ${c.csca_chemistry}`)
  if (c.activities) bits.push(c.activities)
  if (c.note) bits.push(c.note)
  return bits.join(' · ')
}

export default function ChancesEvaluator() {
  const [cases, setCases]       = useState<StudentCase[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [search, setSearch]     = useState('')
  const [gpaMin, setGpaMin]     = useState('')
  const [ieltsMin, setIeltsMin] = useState('')
  const [cscaMin, setCscaMin]   = useState('')
  const [showNumFilters, setShowNumFilters] = useState(false)

  useEffect(() => {
    fetch('/api/cases')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => setCases(d.cases))
      .catch(() => setError('Не удалось загрузить данные'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q    = search.toLowerCase().trim()
    const gMin = gpaMin   ? parseFloat(gpaMin)   : null
    const iMin = ieltsMin ? parseFloat(ieltsMin) : null
    const cMin = cscaMin  ? parseFloat(cscaMin)  : null

    return cases
      .filter(c => {
        if (q.length >= 2 && !c.university.toLowerCase().includes(q) && !(c.direction ?? '').toLowerCase().includes(q)) return false
        if (gMin != null && (c.gpa == null || c.gpa < gMin)) return false
        if (iMin != null && (c.ielts == null || c.ielts < iMin)) return false
        if (cMin != null && (c.csca_math == null || c.csca_math < cMin)) return false
        return true
      })
      // Admissions first, rejections last; best-documented first within each
      // group. Two things drove this: in source order the table opened on a
      // case with zero reported fields and read as broken, and sorting purely
      // by completeness floated rejections to the top — an accurate but
      // needlessly discouraging first screen. Rejections stay in the table:
      // a base that only shows wins is not a useful benchmark.
      .sort((a, b) => outcomeRank(a) - outcomeRank(b) || completeness(b) - completeness(a))
  }, [cases, search, gpaMin, ieltsMin, cscaMin])

  const hasFilters     = search.length >= 2 || !!gpaMin || !!ieltsMin || !!cscaMin
  const numFilterActive = !!(gpaMin || ieltsMin || cscaMin)

  function reset() {
    setSearch(''); setGpaMin(''); setIeltsMin(''); setCscaMin('')
  }

  // ── Loading / Error ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-study-brown" />
    </div>
  )

  if (error) return (
    <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl p-4 flex items-center gap-3">
      <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
      <p className="text-sm text-red-700">{error}</p>
    </div>
  )

  return (
    <div className="space-y-4">

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-study-gray pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по университету или направлению..."
          className="w-full rounded-xl border border-study-lightgray bg-study-card pl-10 pr-10 py-3 text-sm focus:outline-none focus:border-study-brown transition-colors"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-study-gray" />
          </button>
        )}
      </div>

      {/* Numeric filters (collapsible) */}
      <div className="bg-study-card rounded-xl border border-study-lightgray overflow-hidden">
        <button
          onClick={() => setShowNumFilters(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm"
        >
          <span className="font-medium text-study-dark flex items-center gap-2">
            Фильтры по показателям
            {numFilterActive && <span className="w-2 h-2 rounded-full bg-study-brown inline-block" />}
          </span>
          {showNumFilters
            ? <ChevronUp className="w-4 h-4 text-study-gray" />
            : <ChevronDown className="w-4 h-4 text-study-gray" />}
        </button>

        {showNumFilters && (
          <div className="px-4 pb-4 pt-3 border-t border-study-lightgray grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-study-gray uppercase tracking-wide">GPA мин</label>
              <input
                type="number" min="0" max="5" step="0.1"
                value={gpaMin} onChange={e => setGpaMin(e.target.value)} placeholder="0"
                className="w-full mt-1 px-2.5 py-2 rounded-lg border border-study-lightgray text-sm focus:outline-none focus:border-study-brown"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-study-gray uppercase tracking-wide">IELTS мин</label>
              <input
                type="number" min="0" max="9" step="0.5"
                value={ieltsMin} onChange={e => setIeltsMin(e.target.value)} placeholder="0"
                className="w-full mt-1 px-2.5 py-2 rounded-lg border border-study-lightgray text-sm focus:outline-none focus:border-study-brown"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-study-gray uppercase tracking-wide">CSCA Math мин</label>
              <input
                type="number" min="0" max="100" step="5"
                value={cscaMin} onChange={e => setCscaMin(e.target.value)} placeholder="0"
                className="w-full mt-1 px-2.5 py-2 rounded-lg border border-study-lightgray text-sm focus:outline-none focus:border-study-brown"
              />
            </div>
          </div>
        )}
      </div>

      {/* Count + reset */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-study-gray">
          Показано: <span className="font-semibold text-study-dark">{filtered.length}</span> из {cases.length} кейсов
        </p>
        {hasFilters && (
          <button onClick={reset} className="text-xs text-study-brown hover:underline flex items-center gap-1">
            <X className="w-3 h-3" /> Сбросить
          </button>
        )}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-study-gray text-sm">
          Ничего не найдено — попробуйте изменить фильтры
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-study-lightgray bg-study-card">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-study-bg border-b border-study-lightgray">
                <th className="sticky left-0 z-10 bg-study-bg px-3 py-2.5 text-left text-[10px] font-semibold text-study-gray uppercase tracking-wide whitespace-nowrap min-w-[160px]">
                  Университет
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-study-gray uppercase tracking-wide whitespace-nowrap">
                  Итог
                </th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-study-gray uppercase tracking-wide whitespace-nowrap">
                  GPA
                </th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-study-gray uppercase tracking-wide whitespace-nowrap">
                  Английский
                </th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-study-gray uppercase tracking-wide whitespace-nowrap">
                  CSCA Math
                </th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-study-gray uppercase tracking-wide whitespace-nowrap">
                  CSCA Phys
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-study-gray uppercase tracking-wide whitespace-nowrap min-w-[120px]">
                  Грант
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const ok  = outcomeKey(c.result)
                const cfg = OUTCOME_CFG[ok]
                const { Icon } = cfg

                const engExam =
                  c.ielts    != null ? `IELTS ${c.ielts}`       :
                  c.toefl    != null ? `TOEFL ${c.toefl}`       :
                  c.duolingo != null ? `Duo ${c.duolingo}`      :
                  null

                const gpaDisplay = c.gpa != null
                  ? (Math.round(c.gpa * 100) / 100).toFixed(2)
                  : null

                const row = (
                  <tr
                    key={i}
                    className="group border-b border-study-lightgray last:border-0"
                  >
                    {/* University — sticky */}
                    <td className="sticky left-0 z-10 bg-study-card group-hover:bg-study-bg/60 px-3 py-2.5 font-semibold text-study-dark transition-colors">
                      <div className="max-w-[180px] leading-snug">{c.university}</div>
                    </td>

                    {/* Outcome badge */}
                    <td className="px-3 py-2.5 group-hover:bg-study-bg/60 transition-colors whitespace-nowrap">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border"
                        style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}
                      >
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>

                    {/* GPA */}
                    <td className="px-3 py-2.5 text-center text-study-dark group-hover:bg-study-bg/60 transition-colors whitespace-nowrap">
                      {gpaDisplay ?? <span className="text-study-gray/40">—</span>}
                    </td>

                    {/* English exam */}
                    <td className="px-3 py-2.5 text-center text-study-dark group-hover:bg-study-bg/60 transition-colors whitespace-nowrap">
                      {engExam ?? <span className="text-study-gray/40">—</span>}
                    </td>

                    {/* CSCA Math */}
                    <td className="px-3 py-2.5 text-center text-study-dark group-hover:bg-study-bg/60 transition-colors whitespace-nowrap">
                      {c.csca_math ?? <span className="text-study-gray/40">—</span>}
                    </td>

                    {/* CSCA Physics */}
                    <td className="px-3 py-2.5 text-center text-study-dark group-hover:bg-study-bg/60 transition-colors whitespace-nowrap">
                      {c.csca_physics ?? <span className="text-study-gray/40">—</span>}
                    </td>

                    {/* Grant */}
                    <td className="px-3 py-2.5 text-study-gray group-hover:bg-study-bg/60 transition-colors">
                      <div className="max-w-[160px] leading-snug">
                        {c.grant && c.grant !== '—' && c.grant !== '' ? c.grant : <span className="text-study-gray/40">—</span>}
                      </div>
                    </td>
                  </tr>
                )

                // Everything the columns don't carry, as a sentence. Rendered
                // as its own row so it can use the full width instead of being
                // squeezed into a cell — and skipped entirely when empty, so it
                // never adds a blank line.
                const detail = caseDetail(c)

                return detail
                  ? [
                      row,
                      <tr key={`${i}-detail`} className="border-b border-study-lightgray last:border-0">
                        <td colSpan={7} className="px-3 pb-2.5 -mt-1">
                          <p className="text-[11px] leading-snug text-study-gray">{detail}</p>
                        </td>
                      </tr>,
                    ]
                  : row
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer — provenance. The previous wording ("реальные кейсы") read as
          if these were our own students, which they are not. */}
      <div className="bg-study-bg rounded-xl p-3.5 flex items-start gap-2.5">
        <span className="text-base shrink-0">ℹ️</span>
        <div className="text-[11px] text-study-gray leading-relaxed space-y-1.5">
          <p>
            <span className="font-semibold text-study-dark">Это не кейсы наших студентов.</span>{' '}
            Мы собрали их из открытых источников: форумы, telegram-чаты абитуриентов, публичные
            отзывы и объявления вузов о результатах приёма за 2025–2026 годы.
          </p>
          <p>
            Данные приводятся <span className="font-semibold text-study-dark">только для ориентира</span> —
            мы не можем проверить каждую цифру и не гарантируем их точность. Требования вузов
            меняются каждый год, поэтому решение принимайте по официальной странице приёма.
          </p>
          <p>
            Результаты наших студентов мы не публикуем — ни здесь, ни где-либо ещё — без
            письменного согласия самого студента и его родителей.
          </p>
        </div>
      </div>
    </div>
  )
}
