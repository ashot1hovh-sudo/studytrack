'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, X } from 'lucide-react'
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

export default function UniversityExplorer() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeMajor, setActiveMajor] = useState<UEMajor | null>(null)
  const [activeProgram, setActiveProgram] = useState<UEProgram | null>(null)
  const [cityFilter, setCityFilter] = useState('all')
  const [showNoEnglish, setShowNoEnglish] = useState(false)
  const [selectedUni, setSelectedUni] = useState<{
    uni: UEUniversity
    prog: UEProgram
    major: UEMajor
  } | null>(null)

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
    if (activeProgram?.id === prog.id) {
      setActiveProgram(null)
      return
    }
    setActiveProgram(prog)
    setCityFilter('all')
  }

  function cityMatch(uni: UEUniversity) {
    if (cityFilter === 'all') return true
    if (cityFilter === 'other') return !MAIN_CITIES.includes(uni.city)
    return uni.city === cityFilter
  }

  const visibleUnis = activeProgram?.universities.filter(cityMatch) ?? []
  const lc = activeMajor ? MAJOR_LIGHT[activeMajor.id] : null

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

              {/* City filter + count */}
              {activeProgram && (
                <div>
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
                      onClick={() => setSelectedUni({ uni, prog: activeProgram, major: activeMajor })}
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

          {/* No-English accordion */}
          <div className="border-t border-study-lightgray pt-3">
            <button
              onClick={() => setShowNoEnglish(v => !v)}
              className="flex items-center gap-1.5 text-xs text-study-gray hover:text-study-dark transition-colors"
            >
              {showNoEnglish
                ? <ChevronUp className="w-3.5 h-3.5" />
                : <ChevronDown className="w-3.5 h-3.5" />
              }
              <span>Вузы без программ на английском: {data.universitiesNoEnglish.length}</span>
            </button>
            {showNoEnglish && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {data.universitiesNoEnglish.map((u, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2 py-1 rounded-md bg-study-bg text-study-gray border border-study-lightgray"
                  >
                    {u.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail modal — matches the app's existing modal pattern */}
      {selectedUni && (
        <div
          className="fixed inset-0 bg-study-dark/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelectedUni(null)}
        >
          <div
            className="bg-white sm:rounded-2xl rounded-t-2xl card-shadow-hover w-full sm:max-w-md max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom-10 sm:fade-in sm:zoom-in-95 duration-200"
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
              <div className="flex items-center gap-3 text-sm py-1">
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
                  className="flex items-center justify-center gap-2 w-full py-3 mt-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: MAJOR_LIGHT[selectedUni.major.id]?.text ?? '#2B2D42' }}
                  onClick={e => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4" />
                  Открыть сайт университета
                </a>
              ) : (
                <p className="text-xs text-center text-study-gray py-2">Сайт не указан</p>
              )}
            </div>

            {/* Mobile close button */}
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
