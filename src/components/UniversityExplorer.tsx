'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, X, Search, Plus, Check } from 'lucide-react'
import explorerData from '@/data/universityExplorer.json'

type UEUniversity = {
  name: string
  city: string
  url: string | null
  isDualDegree: boolean
  dualDegreeNote: string | null
  tuition: number | null
}

type UEProgram = {
  id: string
  label: string
  universities: UEUniversity[]
}

type UEMajor = {
  id: string
  label: string
  icon: string
  color: string
  bg: string
  programs: UEProgram[]
}

type ExplorerData = {
  meta: { totalUniversities: number }
  universitiesNoEnglish: { name: string; city: string }[]
  majors: UEMajor[]
}

type SelectedUni = {
  uni: UEUniversity
  prog: UEProgram
  major: UEMajor
}

const MAJOR_LIGHT: Record<string, { bg: string; border: string; text: string }> = {
  business:      { bg: '#fff7ed', border: '#fdba74', text: '#9a3412' },
  economics:     { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8' },
  medicine:      { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
  engineering:   { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
  law:           { bg: '#faf5ff', border: '#c4b5fd', text: '#6d28d9' },
  finance:       { bg: '#f0fdfa', border: '#5eead4', text: '#0f766e' },
  international: { bg: '#fdf4ff', border: '#d8b4fe', text: '#7c3aed' },
}

const MAIN_CITIES = ['Пекин', 'Шанхай', 'Ухань', 'Нанкин']
const data = explorerData as unknown as ExplorerData

// Flat search index — one entry per unique university name (first occurrence wins)
type SearchResult = { uni: UEUniversity; prog: UEProgram; major: UEMajor }

const SEARCH_INDEX: SearchResult[] = (() => {
  const seen = new Set<string>()
  const results: SearchResult[] = []
  for (const major of data.majors) {
    for (const prog of major.programs) {
      for (const uni of prog.universities) {
        if (!seen.has(uni.name)) {
          seen.add(uni.name)
          results.push({ uni, prog, major })
        }
      }
    }
  }
  return results
})()

export default function UniversityExplorer() {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeMajor, setActiveMajor] = useState<UEMajor | null>(null)
  const [activeProgram, setActiveProgram] = useState<UEProgram | null>(null)
  const [cityFilter, setCityFilter] = useState('all')
  const [showNoEnglish, setShowNoEnglish] = useState(false)
  const [selectedUni, setSelectedUni] = useState<SelectedUni | null>(null)
  const [addState, setAddState] = useState<'idle' | 'loading' | 'added' | 'error'>('idle')
  const [addError, setAddError] = useState<string | null>(null)

  const searchResults = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (q.length < 2) return null
    return SEARCH_INDEX.filter(({ uni, prog, major }) =>
      uni.name.toLowerCase().includes(q) ||
      uni.city.toLowerCase().includes(q) ||
      prog.label.toLowerCase().includes(q) ||
      major.label.toLowerCase().includes(q)
    )
  }, [search])

  function selectMajor(major: UEMajor) {
    if (activeMajor?.id === major.id) {
      setActiveMajor(null)
      setActiveProgram(null)
      setCityFilter('all')
      return
    }
    setActiveMajor(major)
    setActiveProgram(null)
    setCityFilter('all')
  }

  function selectProgram(prog: UEProgram) {
    setActiveProgram(activeProgram?.id === prog.id ? null : prog)
    setCityFilter('all')
  }

  function cityMatch(uni: UEUniversity) {
    if (cityFilter === 'all') return true
    if (cityFilter === 'other') return !MAIN_CITIES.includes(uni.city)
    return uni.city === cityFilter
  }

  function openModal(result: SelectedUni) {
    setSelectedUni(result)
    setAddState('idle')
    setAddError(null)
  }

  async function addToDashboard() {
    if (!selectedUni) return
    setAddState('loading')
    setAddError(null)
    try {
      const { uni, prog, major } = selectedUni
      const res = await fetch('/api/universities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: uni.name,
          city: uni.city,
          portalUrl: uni.url ?? '',
          price: uni.tuition ? `¥${uni.tuition.toLocaleString()}/год` : '',
          major: `${major.label} — ${prog.label}`,
          deadline: '',
          examRequirements: '',
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        throw new Error(d?.error ?? 'Не удалось добавить')
      }
      setAddState('added')
    } catch (err) {
      setAddState('error')
      setAddError(err instanceof Error ? err.message : 'Ошибка при добавлении')
    }
  }

  const visibleUnis = activeProgram?.universities.filter(cityMatch) ?? []
  const lc = activeMajor ? MAJOR_LIGHT[activeMajor.id] : null
  const isSearching = searchResults !== null

  return (
    <div className="mb-4">
      {/* Collapsed header */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-white card-shadow hover:card-shadow-hover transition-all text-left group"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🗺️</span>
          <div>
            <p className="text-sm font-bold text-study-dark">База университетов</p>
            <p className="text-xs text-study-gray mt-0.5">120 вузов с английскими программами · 68 без</p>
          </div>
        </div>
        {isOpen
          ? <ChevronUp className="w-4 h-4 text-study-gray" />
          : <ChevronDown className="w-4 h-4 text-study-gray group-hover:translate-y-0.5 transition-transform" />
        }
      </button>

      {isOpen && (
        <div className="mt-2 bg-white rounded-xl card-shadow p-4 sm:p-5 space-y-4">

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-study-gray pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по названию, городу или программе..."
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-study-lightgray text-sm focus:outline-none focus:border-study-gray/60 transition-colors bg-study-bg"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-study-gray hover:text-study-dark transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search results */}
          {isSearching ? (
            searchResults!.length === 0 ? (
              <p className="text-center text-xs text-study-gray py-8">
                Ничего не найдено по запросу «{search}»
              </p>
            ) : (
              <div>
                <p className="text-[11px] font-medium text-study-gray uppercase tracking-wide mb-2">
                  Найдено: {searchResults!.length}
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {searchResults!.map(({ uni, prog, major }, i) => {
                    const mlc = MAJOR_LIGHT[major.id]
                    return (
                      <button
                        key={i}
                        onClick={() => openModal({ uni, prog, major })}
                        className="text-left p-3 rounded-xl border transition-all hover:shadow-sm active:scale-[0.98]"
                        style={{ borderColor: mlc.border, background: mlc.bg }}
                      >
                        <p className="text-xs font-semibold leading-snug" style={{ color: mlc.text }}>
                          {uni.name}
                          {uni.isDualDegree && <span className="ml-1.5">🔗</span>}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[11px] text-study-gray">📍 {uni.city}</span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{ background: mlc.border + '66', color: mlc.text }}
                          >
                            {major.icon} {prog.label}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          ) : (
            <>
              {/* Major selector */}
              <div>
                <p className="text-[11px] font-medium text-study-gray uppercase tracking-wide mb-2">Направление</p>
                <div className="flex flex-wrap gap-2">
                  {data.majors.map(major => {
                    const mlc = MAJOR_LIGHT[major.id]
                    const isActive = activeMajor?.id === major.id
                    return (
                      <button
                        key={major.id}
                        onClick={() => selectMajor(major)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all active:scale-95"
                        style={isActive
                          ? { background: mlc.bg, borderColor: mlc.border, color: mlc.text }
                          : { background: '#F2F4F8', borderColor: 'transparent', color: '#8D99AE' }
                        }
                      >
                        <span className="text-base">{major.icon}</span>
                        <span className="hidden sm:inline">{major.label}</span>
                        <span className="sm:hidden">{major.label.split(' ')[0]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {activeMajor && lc && (
                <>
                  {/* Program chips */}
                  <div>
                    <p className="text-[11px] font-medium text-study-gray uppercase tracking-wide mb-2">Программа</p>
                    <div className="flex flex-wrap gap-2">
                      {activeMajor.programs.map(prog => {
                        const isActive = activeProgram?.id === prog.id
                        return (
                          <button
                            key={prog.id}
                            onClick={() => selectProgram(prog)}
                            className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95"
                            style={isActive
                              ? { background: lc.bg, borderColor: lc.border, color: lc.text }
                              : { background: 'white', borderColor: '#E2E8F0', color: '#8D99AE' }
                            }
                          >
                            {prog.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* City filter */}
                  {activeProgram && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {['all', ...MAIN_CITIES, 'other'].map(city => (
                        <button
                          key={city}
                          onClick={() => setCityFilter(city)}
                          className="px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all"
                          style={cityFilter === city
                            ? { background: '#2B2D42', borderColor: '#2B2D42', color: 'white' }
                            : { background: 'white', borderColor: '#E2E8F0', color: '#8D99AE' }
                          }
                        >
                          {city === 'all' ? 'Все' : city === 'other' ? 'Другие' : city}
                        </button>
                      ))}
                      <span className="text-[11px] text-study-gray ml-1">
                        {visibleUnis.length} из {activeProgram.universities.length}
                      </span>
                    </div>
                  )}

                  {/* University grid */}
                  {activeProgram && (
                    <div className="grid sm:grid-cols-2 gap-2">
                      {visibleUnis.length === 0 && (
                        <p className="col-span-2 text-center text-xs text-study-gray py-6">
                          Нет университетов по выбранным фильтрам
                        </p>
                      )}
                      {visibleUnis.map((uni, i) => (
                        <button
                          key={i}
                          onClick={() => openModal({ uni, prog: activeProgram, major: activeMajor })}
                          className="text-left p-3 rounded-xl border transition-all hover:shadow-sm active:scale-[0.98] group"
                          style={{ borderColor: lc.border, background: lc.bg }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold leading-snug" style={{ color: lc.text }}>
                              {uni.name}
                            </p>
                            {uni.isDualDegree && (
                              <span className="text-sm shrink-0" title={uni.dualDegreeNote ?? ''}>🔗</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="text-[11px] text-study-gray">📍 {uni.city}</span>
                            {uni.tuition && (
                              <span className="text-[11px] font-semibold" style={{ color: lc.text }}>
                                ¥{uni.tuition.toLocaleString()}/г.
                              </span>
                            )}
                            {uni.url && (
                              <span className="text-[11px] text-study-gray group-hover:text-study-green transition-colors ml-auto flex items-center gap-0.5">
                                <ExternalLink className="w-3 h-3" /> Сайт
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* No-English — redesigned as a clean list */}
          <div className="border-t border-study-lightgray pt-3">
            <button
              onClick={() => setShowNoEnglish(v => !v)}
              className="flex items-center gap-1.5 text-xs text-study-gray hover:text-study-dark transition-colors w-full text-left"
            >
              {showNoEnglish
                ? <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                : <ChevronDown className="w-3.5 h-3.5 shrink-0" />
              }
              <span>Вузы без программ на английском ({data.universitiesNoEnglish.length})</span>
            </button>
            {showNoEnglish && (
              <div className="mt-2.5 rounded-xl border border-study-lightgray overflow-y-auto max-h-60 divide-y divide-study-lightgray">
                {data.universitiesNoEnglish.map((u, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2 hover:bg-study-bg transition-colors"
                  >
                    <span className="text-xs text-study-dark">{u.name}</span>
                    <span className="text-[11px] text-study-gray shrink-0 ml-3">📍 {u.city}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selectedUni && (
        <div
          className="fixed inset-0 bg-study-dark/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelectedUni(null)}
        >
          <div
            className="bg-white sm:rounded-2xl rounded-t-2xl card-shadow-hover w-full sm:max-w-md max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-10 sm:fade-in sm:zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="sticky top-0 bg-white sm:rounded-t-2xl rounded-t-2xl p-4 sm:p-5 border-b border-study-lightgray">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className="text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: MAJOR_LIGHT[selectedUni.major.id].text }}
                  >
                    {selectedUni.major.icon} {selectedUni.major.label} · {selectedUni.prog.label}
                  </p>
                  <h3 className="text-base font-bold text-study-dark mt-1 leading-tight">
                    {selectedUni.uni.name}
                  </h3>
                  <p className="text-xs text-study-gray mt-0.5">📍 {selectedUni.uni.city}</p>
                </div>
                <button
                  onClick={() => setSelectedUni(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-study-bg transition-colors shrink-0 mt-1"
                >
                  <X className="w-4 h-4 text-study-gray" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-3">
              {/* Dual degree note */}
              {selectedUni.uni.isDualDegree && selectedUni.uni.dualDegreeNote && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-study-bg border border-study-lightgray">
                  <span className="text-base mt-0.5">🔗</span>
                  <p className="text-xs text-study-dark leading-relaxed">{selectedUni.uni.dualDegreeNote}</p>
                </div>
              )}

              {/* Tuition */}
              <div className="flex items-center gap-3 py-1">
                <span className="text-study-gray text-xs w-24 shrink-0">Стоимость</span>
                <span className="text-study-dark font-medium text-sm">
                  {selectedUni.uni.tuition
                    ? `¥${selectedUni.uni.tuition.toLocaleString()}/год`
                    : 'Уточняйте на сайте'}
                </span>
              </div>

              {/* Website button */}
              {selectedUni.uni.url ? (
                <a
                  href={selectedUni.uni.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: MAJOR_LIGHT[selectedUni.major.id]?.text ?? '#2B2D42' }}
                  onClick={e => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4" />
                  Открыть сайт университета
                </a>
              ) : (
                <p className="text-xs text-center text-study-gray py-1">Сайт не указан</p>
              )}

              {/* Add to dashboard */}
              <button
                onClick={addToDashboard}
                disabled={addState === 'loading' || addState === 'added'}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold border-2 transition-all active:scale-[0.98] disabled:opacity-70"
                style={addState === 'added'
                  ? { background: '#f0fdf4', borderColor: '#86efac', color: '#166534' }
                  : { background: 'white', borderColor: '#E2E8F0', color: '#2B2D42' }
                }
              >
                {addState === 'added' ? (
                  <><Check className="w-4 h-4" /> Добавлено в мой список</>
                ) : addState === 'loading' ? (
                  'Добавляем...'
                ) : (
                  <><Plus className="w-4 h-4" /> Добавить в мой список</>
                )}
              </button>
              {addState === 'error' && addError && (
                <p className="text-xs text-study-red text-center">{addError}</p>
              )}
            </div>

            {/* Mobile close */}
            <div className="p-4 sm:hidden border-t border-study-lightgray">
              <button
                onClick={() => setSelectedUni(null)}
                className="w-full py-3 text-sm font-medium text-study-dark bg-study-bg rounded-xl"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
