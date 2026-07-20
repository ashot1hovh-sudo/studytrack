'use client'

import { useState, useMemo } from 'react'
import { ArrowLeft, Search, ExternalLink, X, MapPin, Building2 } from 'lucide-react'
import universities from '@/data/universities.json'

interface University {
  id: number
  nameRu: string
  nameEn: string
  nameCn: string
  url: string
  city: string
  province: string
  arwu: string
  chinaRank: string
  climate: string
  dorm: string
  tuitionBachelor: string
  tuitionLanguageYear: string
  regFee: number
  hasLanguageYear: boolean
  hasBachelor: boolean
}

const allUniversities = universities as University[]

type ProgramFilter = 'all' | 'language-year' | 'bachelor'

export default function UniversityDatabase({ onBack }: { onBack: () => void }) {
  const [search, setSearch] = useState('')
  const [programFilter, setProgramFilter] = useState<ProgramFilter>('all')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return allUniversities.filter((u) => {
      const matchSearch =
        !q ||
        u.nameRu.toLowerCase().includes(q) ||
        u.nameEn.toLowerCase().includes(q) ||
        u.city.toLowerCase().includes(q) ||
        u.province.toLowerCase().includes(q)

      const matchProgram =
        programFilter === 'all' ||
        (programFilter === 'language-year' && u.hasLanguageYear) ||
        (programFilter === 'bachelor' && u.hasBachelor)

      return matchSearch && matchProgram
    })
  }, [search, programFilter])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-study-card card-shadow hover:card-shadow-hover transition-all shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-study-dark" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-study-dark">База университетов</h2>
          <p className="text-xs text-study-gray">{allUniversities.length} университетов Китая</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-study-gray" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию, городу..."
            className="w-full pl-9 pr-8 py-2.5 text-sm bg-study-card rounded-lg card-shadow border-0 outline-none focus:ring-2 focus:ring-study-brown/20 text-study-dark placeholder-study-gray"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-3.5 h-3.5 text-study-gray" />
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {([
            { value: 'all', label: 'Все программы' },
            { value: 'language-year', label: 'Языковой год' },
            { value: 'bachelor', label: 'Бакалавриат' },
          ] as { value: ProgramFilter; label: string }[]).map((f) => (
            <button
              key={f.value}
              onClick={() => setProgramFilter(f.value)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                programFilter === f.value
                  ? 'bg-study-brown text-white'
                  : 'bg-study-card card-shadow text-study-dark hover:card-shadow-hover'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-study-gray mb-4">
        Найдено: <span className="font-semibold text-study-dark">{filtered.length}</span>
      </p>

      {/* Cards Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((u) => {
          const isExpanded = expandedId === u.id
          return (
            <div
              key={u.id}
              className="bg-study-card rounded-xl card-shadow overflow-hidden flex flex-col"
            >
              {/* Card header */}
              <div className="p-4 sm:p-5 flex-1">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-study-brown/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-study-brown" />
                  </div>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {u.hasLanguageYear && (
                      <span className="text-[10px] font-bold text-study-green bg-study-green/10 rounded-full px-2 py-0.5">Яз. год</span>
                    )}
                    {u.hasBachelor && (
                      <span className="text-[10px] font-bold text-study-brown bg-study-brown/10 rounded-full px-2 py-0.5">Бакалавр</span>
                    )}
                  </div>
                </div>

                <p className="font-bold text-study-dark text-sm leading-snug">{u.nameRu}</p>
                <p className="text-xs text-study-gray mt-0.5">{u.nameEn}</p>
                {u.nameCn && <p className="text-xs text-study-gray">{u.nameCn}</p>}

                <div className="flex items-center gap-1.5 mt-2">
                  <MapPin className="w-3 h-3 text-study-gray shrink-0" />
                  <span className="text-xs text-study-gray">{u.city}, {u.province}</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  {u.arwu && (
                    <div>
                      <span className="text-study-gray">ARWU: </span>
                      <span className="font-medium text-study-dark">{u.arwu}</span>
                    </div>
                  )}
                  {u.chinaRank && (
                    <div>
                      <span className="text-study-gray">Рейтинг КНР: </span>
                      <span className="font-medium text-study-dark">{u.chinaRank}</span>
                    </div>
                  )}
                  {u.tuitionLanguageYear && u.hasLanguageYear && (
                    <div className="col-span-2">
                      <span className="text-study-gray">Яз. год: </span>
                      <span className="font-medium text-study-dark">{u.tuitionLanguageYear}</span>
                    </div>
                  )}
                  {u.tuitionBachelor && u.hasBachelor && (
                    <div className="col-span-2">
                      <span className="text-study-gray">Бакалавр: </span>
                      <span className="font-medium text-study-dark">{u.tuitionBachelor}</span>
                    </div>
                  )}
                  {u.dorm && (
                    <div className="col-span-2">
                      <span className="text-study-gray">Общежитие: </span>
                      <span className="font-medium text-study-dark">{u.dorm}</span>
                    </div>
                  )}
                </div>

                {/* Expanded details */}
                {isExpanded && u.climate && (
                  <div className="mt-3 pt-3 border-t border-study-lightgray">
                    <p className="text-xs font-medium text-study-dark mb-1">Климат</p>
                    <p className="text-xs text-study-gray leading-relaxed">{u.climate}</p>
                    {u.regFee && (
                      <p className="text-xs text-study-gray mt-2">
                        <span className="font-medium text-study-dark">Регистрационный взнос: </span>
                        {u.regFee} ¥
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Card footer */}
              <div className="px-4 sm:px-5 pb-4 sm:pb-5 flex items-center gap-2">
                <a
                  href={u.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-study-brown text-white rounded-lg text-xs font-medium hover:bg-study-brown/90 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Открыть сайт
                </a>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : u.id)}
                  className="px-3 py-2 bg-study-bg text-study-dark rounded-lg text-xs font-medium hover:bg-study-lightgray transition-colors whitespace-nowrap"
                >
                  {isExpanded ? 'Свернуть' : 'Подробнее'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-study-gray">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Ничего не найдено</p>
          <p className="text-xs mt-1">Попробуйте изменить параметры поиска</p>
        </div>
      )}
    </div>
  )
}
