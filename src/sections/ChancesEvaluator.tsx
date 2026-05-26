'use client'

import { useState, useCallback } from 'react'
import { Search, Loader2, AlertCircle, Trophy, XCircle, Clock, HelpCircle } from 'lucide-react'
import type { StudentCase } from '@/app/api/cases/route'

// ── Field definitions ─────────────────────────────────────────────────────────
const FIELDS = [
  { key: 'gpa',           label: 'GPA',           unit: '/5',   range: 5,   weight: 1.5, placeholder: '4.5',  min: 0,   max: 5,    step: 0.01 },
  { key: 'ielts',         label: 'IELTS',         unit: '',     range: 9,   weight: 1.5, placeholder: '7.0',  min: 0,   max: 9,    step: 0.5  },
  { key: 'csca_math',     label: 'CSCA Math',     unit: '/100', range: 100, weight: 1.5, placeholder: '75',   min: 0,   max: 100,  step: 0.5  },
  { key: 'csca_physics',  label: 'CSCA Physics',  unit: '/100', range: 100, weight: 1.5, placeholder: '70',   min: 0,   max: 100,  step: 0.5  },
  { key: 'toefl',         label: 'TOEFL',         unit: '',     range: 60,  weight: 1.0, placeholder: '90',   min: 60,  max: 120,  step: 1    },
  { key: 'duolingo',      label: 'Duolingo',      unit: '',     range: 80,  weight: 1.0, placeholder: '110',  min: 80,  max: 160,  step: 1    },
  { key: 'sat',           label: 'SAT',           unit: '',     range: 800, weight: 1.0, placeholder: '1400', min: 800, max: 1600, step: 10   },
  { key: 'csca_chinese',  label: 'CSCA Chinese',  unit: '/100', range: 100, weight: 1.0, placeholder: '80',   min: 0,   max: 100,  step: 0.5  },
  { key: 'csca_chemistry',label: 'CSCA Chemistry',unit: '/100', range: 100, weight: 1.0, placeholder: '70',   min: 0,   max: 100,  step: 0.5  },
  { key: 'hskLevel',      label: 'HSK Level',     unit: '',     range: 6,   weight: 0.5, placeholder: '',     min: 1,   max: 6,    step: 1,   isDropdown: true },
] as const

type FieldKey = (typeof FIELDS)[number]['key']

type StudentInput = Partial<Record<FieldKey, string>>

// ── Matching types ────────────────────────────────────────────────────────────
type MatchResult = {
  case: StudentCase
  score: number          // 0 = perfect, 1 = worst
  overlaps: number       // number of matched fields
  quality: 'strong' | 'partial' | 'weak'
}

// ── Outcome display config ────────────────────────────────────────────────────
function outcomeStyle(result: string): { label: string; bg: string; text: string; border: string; icon: typeof Trophy } {
  const r = result.toLowerCase()
  if (r.includes('reject') || r.includes('отказ')) {
    return { label: 'Отказ', bg: '#fef2f2', text: '#991b1b', border: '#fca5a5', icon: XCircle }
  }
  if (r.includes('поступление') || r.includes('admitted') || r.includes('accepted') || r.includes('offer')) {
    return { label: result, bg: '#f0fdf4', text: '#166534', border: '#86efac', icon: Trophy }
  }
  if (r.includes('pre-admission') || r.includes('pre-admitted')) {
    return { label: 'Предварительное', bg: '#fffbeb', text: '#92400e', border: '#fcd34d', icon: Clock }
  }
  return { label: result, bg: '#f8fafc', text: '#475569', border: '#e2e8f0', icon: HelpCircle }
}

function qualityConfig(q: 'strong' | 'partial' | 'weak') {
  if (q === 'strong') return { label: 'Похожий кейс', bg: '#f0fdf4', text: '#166534', dot: '#22c55e' }
  if (q === 'partial') return { label: 'Частичное совпадение', bg: '#fffbeb', text: '#92400e', dot: '#f59e0b' }
  return { label: 'Слабое совпадение', bg: '#f8fafc', text: '#475569', dot: '#94a3b8' }
}

// ── Matching algorithm ────────────────────────────────────────────────────────
function runMatching(input: StudentInput, cases: StudentCase[]): MatchResult[] {
  const studentFields: { key: FieldKey; value: number; range: number; weight: number }[] = []

  for (const f of FIELDS) {
    const raw = input[f.key]
    if (!raw || raw.trim() === '') continue
    const val = parseFloat(raw)
    if (isNaN(val)) continue
    studentFields.push({ key: f.key, value: val, range: f.range, weight: f.weight })
  }

  if (studentFields.length === 0) return []

  const results: MatchResult[] = []

  for (const c of cases) {
    let weightedDistSum = 0
    let weightSum = 0
    let overlaps = 0

    for (const sf of studentFields) {
      const caseVal = c[sf.key as keyof StudentCase] as number | null
      if (caseVal == null) continue
      const dist = Math.abs(sf.value - caseVal) / sf.range
      weightedDistSum += dist * sf.weight
      weightSum += sf.weight
      overlaps++
    }

    if (overlaps < 2) continue

    const score = weightSum > 0 ? weightedDistSum / weightSum : 1

    let quality: MatchResult['quality']
    if (score <= 0.15 && overlaps >= 4) quality = 'strong'
    else if (score <= 0.30 || overlaps >= 3) quality = 'partial'
    else quality = 'weak'

    results.push({ case: c, score, overlaps, quality })
  }

  results.sort((a, b) => a.score - b.score)
  return results.slice(0, 5)
}

// ── Stat pill component ────────────────────────────────────────────────────────
function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-study-bg text-[11px] font-medium text-study-dark">
      <span className="text-study-gray">{label}</span>
      <span>{value}</span>
    </span>
  )
}

// ── Result card ───────────────────────────────────────────────────────────────
function ResultCard({ result, rank }: { result: MatchResult; rank: number }) {
  const c = result.case
  const outcome = outcomeStyle(c.result)
  const qc = qualityConfig(result.quality)
  const OutcomeIcon = outcome.icon

  const statPills: { label: string; value: number }[] = [
    c.gpa != null            && { label: 'GPA',      value: Math.round(c.gpa * 100) / 100 },
    c.ielts != null          && { label: 'IELTS',    value: c.ielts },
    c.toefl != null          && { label: 'TOEFL',    value: c.toefl },
    c.duolingo != null       && { label: 'Duolingo', value: c.duolingo },
    c.sat != null            && { label: 'SAT',      value: c.sat },
    c.hskLevel != null       && { label: `HSK`,      value: c.hskLevel },
    c.csca_math != null      && { label: 'CSCA M',   value: c.csca_math },
    c.csca_physics != null   && { label: 'CSCA Ph',  value: c.csca_physics },
    c.csca_chinese != null   && { label: 'CSCA Ch',  value: c.csca_chinese },
    c.csca_chemistry != null && { label: 'CSCA Chem',value: c.csca_chemistry },
  ].filter(Boolean) as { label: string; value: number }[]

  return (
    <div
      className="bg-white rounded-2xl card-shadow p-4 sm:p-5 border-l-4 transition-all"
      style={{ borderLeftColor: outcome.border }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-start gap-2.5 min-w-0">
          {/* Rank bubble */}
          <div className="w-7 h-7 rounded-full bg-study-bg flex items-center justify-center text-xs font-bold text-study-gray shrink-0 mt-0.5">
            {rank}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-study-dark leading-snug">{c.university}</p>
            {c.direction && (
              <p className="text-[11px] text-study-gray mt-0.5">{c.direction}</p>
            )}
          </div>
        </div>
        {/* Outcome badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0"
          style={{ background: outcome.bg, color: outcome.text }}
        >
          <OutcomeIcon className="w-3.5 h-3.5" />
          {outcome.label}
        </div>
      </div>

      {/* Grant */}
      {c.grant && c.grant !== '—' && c.grant !== '' && (
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-base">🎓</span>
          <span className="text-xs text-study-dark font-medium">{c.grant}</span>
        </div>
      )}

      {/* Stats pills */}
      {statPills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {statPills.map(sp => (
            <StatPill key={sp.label} label={sp.label} value={sp.value} />
          ))}
        </div>
      )}

      {/* Activities */}
      {c.activities && (
        <div className="flex items-start gap-1.5 mb-3">
          <span className="text-base mt-0.5">⭐</span>
          <p className="text-[11px] text-study-gray leading-relaxed">{c.activities}</p>
        </div>
      )}

      {/* Note */}
      {c.note && (
        <div className="flex items-start gap-1.5 mb-3">
          <span className="text-base mt-0.5">💬</span>
          <p className="text-[11px] text-study-gray leading-relaxed italic">{c.note}</p>
        </div>
      )}

      {/* Footer: match quality + source */}
      <div className="flex items-center justify-between pt-2.5 border-t border-study-lightgray gap-2 flex-wrap">
        <div
          className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: qc.bg, color: qc.text }}
        >
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: qc.dot }} />
          {qc.label} · {result.overlaps} полей совпало
        </div>
        {c.source && c.source !== 'internal' && (
          <span className="text-[10px] text-study-gray">{c.source}</span>
        )}
      </div>
    </div>
  )
}

// ── Input field component ─────────────────────────────────────────────────────
function FormField({
  field,
  value,
  onChange,
}: {
  field: (typeof FIELDS)[number]
  value: string
  onChange: (v: string) => void
}) {
  if ('isDropdown' in field && field.isDropdown) {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold text-study-gray uppercase tracking-wide">
          {field.label}
        </label>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-study-lightgray text-sm bg-white focus:outline-none focus:border-study-gray/60 transition-colors text-study-dark"
        >
          <option value="">—</option>
          {[1, 2, 3, 4, 5, 6].map(n => (
            <option key={n} value={String(n)}>HSK {n}</option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-study-gray uppercase tracking-wide flex items-center gap-1">
        {field.label}
        {field.unit && <span className="text-study-gray/60 normal-case font-normal">{field.unit}</span>}
      </label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder}
        min={field.min}
        max={field.max}
        step={field.step}
        className="w-full px-3 py-2.5 rounded-xl border border-study-lightgray text-sm focus:outline-none focus:border-study-gray/60 transition-colors bg-white text-study-dark placeholder:text-study-gray/50"
      />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ChancesEvaluator() {
  const [input, setInput] = useState<StudentInput>({})
  const [cases, setCases] = useState<StudentCase[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [results, setResults] = useState<MatchResult[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Load cases from API on first evaluation
  const ensureCases = useCallback(async (): Promise<StudentCase[] | null> => {
    if (cases) return cases
    setIsLoading(true)
    setLoadError(null)
    try {
      const res = await fetch('/api/cases')
      if (!res.ok) throw new Error('Не удалось загрузить базу кейсов')
      const data = await res.json()
      setCases(data.cases)
      return data.cases
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Ошибка загрузки')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [cases])

  async function handleEvaluate() {
    const filledFields = FIELDS.filter(f => input[f.key]?.trim())
    if (filledFields.length === 0) return

    const allCases = await ensureCases()
    if (!allCases) return

    setHasSearched(true)
    const matched = runMatching(input, allCases)
    setResults(matched)
  }

  function handleReset() {
    setInput({})
    setResults(null)
    setHasSearched(false)
  }

  const filledCount = FIELDS.filter(f => input[f.key]?.trim()).length
  const hasEnough = filledCount >= 1
  const tooFewResults = hasSearched && results !== null && results.length < 3

  return (
    <div className="space-y-5">

      {/* Form card */}
      <div className="bg-white rounded-2xl card-shadow p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-bold text-study-dark">Оцени свои шансы</h2>
            <p className="text-xs text-study-gray mt-1">
              Введи свои статы — система найдёт похожие реальные кейсы поступления.
              Заполни хотя бы 2 поля для точного результата.
            </p>
          </div>
          <span className="text-2xl shrink-0">🎯</span>
        </div>

        {/* Input grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
          {FIELDS.map(f => (
            <FormField
              key={f.key}
              field={f}
              value={input[f.key] ?? ''}
              onChange={v => setInput(prev => ({ ...prev, [f.key]: v }))}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleEvaluate}
            disabled={!hasEnough || isLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-study-brown hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Загружаем...</>
              : <><Search className="w-4 h-4" /> Найти похожие кейсы</>
            }
          </button>
          {(hasSearched || filledCount > 0) && (
            <button
              onClick={handleReset}
              className="text-xs text-study-gray hover:text-study-dark transition-colors"
            >
              Сбросить
            </button>
          )}
          {filledCount > 0 && (
            <span className="text-xs text-study-gray ml-auto">
              Заполнено полей: <span className="font-semibold text-study-dark">{filledCount}</span>
            </span>
          )}
        </div>

        {/* Load error */}
        {loadError && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {loadError}
          </div>
        )}
      </div>

      {/* Too-few-matches warning */}
      {tooFewResults && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Недостаточно данных для сравнения</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Найдено только {results!.length} совпадений. Попробуй заполнить больше полей или добавить другие типы тестов.
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {hasSearched && results !== null && results.length >= 3 && (
        <div>
          <p className="text-[11px] font-semibold text-study-gray uppercase tracking-wide mb-3">
            Найдено похожих кейсов: {results.length}
          </p>
          <div className="space-y-3">
            {results.map((r, i) => (
              <ResultCard key={i} result={r} rank={i + 1} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state after search with 0 results */}
      {hasSearched && results !== null && results.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl card-shadow">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-sm font-semibold text-study-dark">Кейсов не найдено</p>
          <p className="text-xs text-study-gray mt-1 max-w-xs mx-auto">
            Ни один кейс не имеет достаточного перекрытия с вашими статами.
            Попробуйте заполнить больше полей.
          </p>
        </div>
      )}

      {/* Info footer */}
      <div className="bg-study-bg rounded-xl p-3.5 flex items-start gap-2.5">
        <span className="text-base shrink-0">ℹ️</span>
        <p className="text-[11px] text-study-gray leading-relaxed">
          База содержит реальные кейсы поступления 2025–2026 года.
          Совпадение основано на математическом расстоянии по заполненным полям — результаты носят ориентировочный характер.
          База пополняется. Для получения персональной оценки свяжитесь с консультантом.
        </p>
      </div>
    </div>
  )
}
