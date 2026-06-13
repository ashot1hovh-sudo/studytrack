'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, X, Trophy, XCircle, Clock, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import type { StudentCase } from '@/app/api/cases/route'

// ── Outcome helpers ───────────────────────────────────────────────────────────
type OutcomeKey = 'admitted' | 'rejected' | 'pre'
type FilterOutcome = OutcomeKey | 'all'

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
  admitted: { label: 'Поступление', bg: '#f0fdf4', text: '#166534', border: '#86efac', Icon: Trophy },
  rejected: { label: 'Отказ',       bg: '#fef2f2', text: '#991b1b', border: '#fca5a5', Icon: XCircle },
  pre:      { label: 'Предварит.',  bg: '#fffbeb', text: '#92400e', border: '#fcd34d', Icon: Clock },
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Chip({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-study-bg text-[11px] text-study-dark">
      <span className="text-study-gray">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  )
}

function CaseCard({ c }: { c: StudentCase }) {
  const ok = outcomeKey(c.result)
  const cfg = OUTCOME_CFG[ok]
  const { Icon } = cfg

  const engExam: [string, number] | null =
    c.ielts    != null ? ['IELTS',    c.ielts]    :
    c.toefl    != null ? ['TOEFL',    c.toefl]    :
    c.duolingo != null ? ['Duolingo', c.duolingo] :
    null

  const gpaDisplay = c.gpa != null ? Math.round(c.gpa * 100) / 100 : null

  return (
    <div
      className="bg-white rounded-xl card-shadow p-4 border-l-4"
      style={{ borderLeftColor: cfg.border }}
    >
      {/* University + outcome */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="min-w-0">
          <p className="text-sm font-bold text-study-dark leading-snug">{c.university}</p>
          {c.direction && <p className="text-[11px] text-study-gray mt-0.5">{c.direction}</p>}
        </div>
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 border"
          style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}
        >
          <Icon className="w-3 h-3" />
          {cfg.label}
        </span>
      </div>

      {/* Stats chips */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {gpaDisplay != null        && <Chip label="GPA"        value={gpaDisplay} />}
        {engExam                   && <Chip label={engExam[0]} value={engExam[1]} />}
        {c.csca_math    != null    && <Chip label="CSCA Math"  value={c.csca_math} />}
        {c.csca_physics != null    && <Chip label="CSCA Phys"  value={c.csca_physics} />}
        {c.hskLevel     != null    && <Chip label="HSK"        value={c.hskLevel} />}
        {c.sat          != null    && <Chip label="SAT"        value={c.sat} />}
        {c.csca_chinese != null    && <Chip label="CSCA CN"    value={c.csca_chinese} />}
        {c.csca_chemistry != null  && <Chip label="CSCA Chem"  value={c.csca_chemistry} />}
      </div>

      {/* Grant */}
      {c.grant && c.grant !== '—' && c.grant !== '' && (
        <p className="text-[11px] text-study-dark mb-1.5">🎓 {c.grant}</p>
      )}

      {/* Activities + note */}
      {(c.activities || c.note) && (
        <p className="text-[11px] text-study-gray leading-relaxed line-clamp-2">
          {[c.activities, c.note].filter(Boolean).join(' · ')}
        </p>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ChancesEvaluator() {
  const [cases, setCases] = useState<StudentCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch]   = useState('')
  const [outcome, setOutcome] = useState<FilterOutcome>('all')
  const [gpaMin, setGpaMin]   = useState('')
  const [ieltsMin, setIeltsMin] = useState('')
  const [cscaMin, setCscaMin] = useState('')
  const [showNumFilters, setShowNumFilters] = useState(false)

  useEffect(() => {
    fetch('/api/cases')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => setCases(d.cases))
      .catch(() => setError('Не удалось загрузить данные'))
      .finally(() => setLoading(false))
  }, [])

  const counts = useMemo(() => {
    const c = { admitted: 0, rejected: 0, pre: 0 }
    cases.forEach(x => { c[outcomeKey(x.result)]++ })
    return c
  }, [cases])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const gMin = gpaMin   ? parseFloat(gpaMin)   : null
    const iMin = ieltsMin ? parseFloat(ieltsMin) : null
    const cMin = cscaMin  ? parseFloat(cscaMin)  : null

    return cases.filter(c => {
      if (outcome !== 'all' && outcomeKey(c.result) !== outcome) return false
      if (q.length >= 2 && !c.university.toLowerCase().includes(q) && !(c.direction ?? '').toLowerCase().includes(q)) return false
      if (gMin != null && (c.gpa == null || c.gpa < gMin)) return false
      if (iMin != null && (c.ielts == null || c.ielts < iMin)) return false
      if (cMin != null && (c.csca_math == null || c.csca_math < cMin)) return false
      return true
    })
  }, [cases, search, outcome, gpaMin, ieltsMin, cscaMin])

  const hasFilters     = outcome !== 'all' || search.length >= 2 || !!gpaMin || !!ieltsMin || !!cscaMin
  const numFilterActive = !!(gpaMin || ieltsMin || cscaMin)

  function reset() {
    setSearch(''); setOutcome('all'); setGpaMin(''); setIeltsMin(''); setCscaMin('')
  }

  // ── Loading / Error states ──────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-study-brown" />
    </div>
  )

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
      <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
      <p className="text-sm text-red-700">{error}</p>
    </div>
  )

  return (
    <div className="space-y-4">

      {/* Summary stat cards — clickable to toggle outcome filter */}
      <div className="grid grid-cols-3 gap-2">
        {(['admitted', 'pre', 'rejected'] as const).map(k => {
          const cfg = OUTCOME_CFG[k]
          const active = outcome === k
          return (
            <button
              key={k}
              onClick={() => setOutcome(active ? 'all' : k)}
              className="bg-white rounded-xl card-shadow p-3 text-center transition-all hover:opacity-80 active:scale-[0.97]"
              style={active ? { boxShadow: `0 0 0 2px ${cfg.border}` } : {}}
            >
              <p className="text-xl font-bold text-study-dark">{counts[k]}</p>
              <p className="text-[11px] text-study-gray mt-0.5">{cfg.label}</p>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-study-gray pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по университету или направлению..."
          className="w-full rounded-xl border border-study-lightgray bg-white pl-10 pr-10 py-3 text-sm focus:outline-none focus:border-study-brown transition-colors"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-study-gray" />
          </button>
        )}
      </div>

      {/* Outcome pills */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'admitted', 'pre', 'rejected'] as const).map(k => (
          <button
            key={k}
            onClick={() => setOutcome(k)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              outcome === k
                ? 'bg-study-brown text-white'
                : 'bg-white border border-study-lightgray text-study-gray hover:border-study-brown/50'
            }`}
          >
            {k === 'all'      ? `Все · ${cases.length}`              :
             k === 'admitted' ? `Поступление · ${counts.admitted}`   :
             k === 'pre'      ? `Предварит. · ${counts.pre}`         :
                                `Отказ · ${counts.rejected}`}
          </button>
        ))}
      </div>

      {/* Numeric filters (collapsible) */}
      <div className="bg-white rounded-xl border border-study-lightgray overflow-hidden">
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
                value={gpaMin} onChange={e => setGpaMin(e.target.value)}
                placeholder="0"
                className="w-full mt-1 px-2.5 py-2 rounded-lg border border-study-lightgray text-sm focus:outline-none focus:border-study-brown"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-study-gray uppercase tracking-wide">IELTS мин</label>
              <input
                type="number" min="0" max="9" step="0.5"
                value={ieltsMin} onChange={e => setIeltsMin(e.target.value)}
                placeholder="0"
                className="w-full mt-1 px-2.5 py-2 rounded-lg border border-study-lightgray text-sm focus:outline-none focus:border-study-brown"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-study-gray uppercase tracking-wide">CSCA Math мин</label>
              <input
                type="number" min="0" max="100" step="5"
                value={cscaMin} onChange={e => setCscaMin(e.target.value)}
                placeholder="0"
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

      {/* Cases list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-study-gray text-sm">
          Ничего не найдено — попробуйте изменить фильтры
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c, i) => <CaseCard key={i} c={c} />)}
        </div>
      )}

      {/* Footer */}
      <div className="bg-study-bg rounded-xl p-3.5 flex items-start gap-2.5">
        <span className="text-base shrink-0">ℹ️</span>
        <p className="text-[11px] text-study-gray leading-relaxed">
          База содержит реальные кейсы поступления 2025–2026 года. Данные обновляются по мере поступления новых кейсов.
        </p>
      </div>

    </div>
  )
}
