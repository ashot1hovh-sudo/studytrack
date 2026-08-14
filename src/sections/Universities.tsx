'use client'

import { useState, useMemo } from 'react'
import { ExternalLink, Search, ChevronDown, ChevronUp, ArrowRight, MapPin, Calendar, Award, X, Info, ArrowUpRight } from 'lucide-react'
import rawData from '@/data/China_Universities_Programs.json'
import explorerData from '@/data/universityExplorer.json'
import cityData from '@/data/universityCities.json'
import introData from '@/data/universityIntros.json'
import UniTracker from '@/sections/UniTracker'
import { useApp } from '@/context/AppContext'

type UniIntro = { nameRu: string; founded: string; ranking: string; blurb: string; source: string; draft: boolean }
const INTRO_MAP: Record<string, UniIntro> = introData as Record<string, UniIntro>

type RawEntry = { University?: string; Link?: string; Program?: string }

type UniEntry = {
  name: string
  link: string
  city: string
  programs: string[]
  categories: string[]
}

const CITY_MAP: Record<string, string> = cityData

const CATEGORY_RULES: { name: string; re: RegExp }[] = [
  { name: 'Медицина',      re: /mbbs|medicine|medical|health/ },
  { name: 'Бизнес',        re: /business|economics?|finance|accounting|management|marketing|commerce|trade/ },
  { name: 'IT',            re: /computer|data|software|\bit\b|digital|fintech|cyber|artificial|information/ },
  { name: 'Инженерия',     re: /engineering|civil|mechanical|electrical|chemical|structural|architecture/ },
  { name: 'Науки',         re: /science|biology|chemistry|physics|math|environmental/ },
  { name: 'Гуманитарные',  re: /communication|sociology|politics|law|governance|history|philosophy|education|language|translation|media/ },
]

function programCategories(program: string): string[] {
  const t = program.toLowerCase()
  return CATEGORY_RULES.filter((r) => r.re.test(t)).map((r) => r.name)
}

const ALL_UNIVERSITIES: UniEntry[] = (() => {
  const map = new Map<string, UniEntry>()
  let current = ''
  for (const row of rawData as RawEntry[]) {
    if (row.University) {
      current = row.University
      if (!map.has(current)) {
        map.set(current, { name: current, link: row.Link ?? '', city: CITY_MAP[current] ?? '', programs: [], categories: [] })
      }
    }
    if (current && row.Program) {
      map.get(current)!.programs.push(row.Program)
    }
  }
  for (const uni of map.values()) {
    const allCats = new Set<string>()
    for (const p of uni.programs) programCategories(p).forEach((c) => allCats.add(c))
    uni.categories = Array.from(allCats)
  }
  return Array.from(map.values())
})()

const LOGO_MAP: Record<string, string> = (explorerData as { logos: Record<string, string> }).logos

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

const FILTERS = ['Все', 'Бизнес', 'IT', 'Инженерия', 'Медицина', 'Науки', 'Гуманитарные']
// Cities that actually occur among the 182 universities, sorted RU-alphabetically.
const CITY_OPTIONS = Array.from(new Set(ALL_UNIVERSITIES.map((u) => u.city).filter(Boolean)))
  .sort((a, b) => a.localeCompare(b, 'ru'))
const SHOW_LIMIT = 5
const PREVIEW_COUNT = 6

function highlight(text: string, query: string): React.ReactNode {
  if (!query || query.length < 2) return text
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  const idx = lower.indexOf(q)
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-study-brown/20 text-study-dark rounded-sm not-italic">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

function UniCard({ uni, query, activeFilter }: { uni: UniEntry; query: string; activeFilter: string }) {
  const [expanded, setExpanded] = useState(false)
  const [introOpen, setIntroOpen] = useState(false)
  const [programsOpen, setProgramsOpen] = useState(false)
  const intro = INTRO_MAP[uni.name]

  const isFiltered = activeFilter !== 'Все'

  // When a filter is active, split programs into matching and rest
  const matchingPrograms = isFiltered
    ? uni.programs.filter((p) => programCategories(p).includes(activeFilter))
    : []
  const otherPrograms = isFiltered
    ? uni.programs.filter((p) => !programCategories(p).includes(activeFilter))
    : uni.programs

  // In unfiltered mode apply show/expand logic to all programs
  const visibleOthers = expanded ? otherPrograms : otherPrograms.slice(0, SHOW_LIMIT)
  const hasMore = otherPrograms.length > SHOW_LIMIT

  const logoUrl = LOGO_MAP[uni.name]
  const initials = getInitials(uni.name)

  return (
    <div className="relative group overflow-hidden bg-study-card rounded-xl card-shadow p-4 sm:p-5 flex flex-col gap-3 sm:min-h-[220px] transition-shadow hover:card-shadow-hover">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => intro && setIntroOpen(true)}
          disabled={!intro}
          className="flex items-center gap-3 min-w-0 text-left group/head disabled:cursor-default"
        >
          <div className="shrink-0 w-10 h-10 rounded-xl overflow-hidden bg-study-bg flex items-center justify-center">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={uni.name}
                className="w-full h-full object-contain p-0.5"
                onError={(e) => {
                  const target = e.currentTarget
                  target.style.display = 'none'
                  target.nextElementSibling?.classList.remove('hidden')
                }}
              />
            ) : null}
            <span className={`text-xs font-bold text-study-brown ${logoUrl ? 'hidden' : ''}`}>{initials}</span>
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-study-dark text-sm leading-snug group-hover/head:text-study-brown transition-colors">{highlight(uni.name, query)}</h3>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-study-gray">
              {uni.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {uni.city}
                </span>
              )}
              {intro && (
                <span className="inline-flex items-center gap-0.5 text-study-brown font-medium">
                  <Info className="w-3 h-3 shrink-0" />
                  О вузе
                </span>
              )}
            </div>
          </div>
        </button>
        {uni.link && (
          <a
            href={uni.link}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 w-8 h-8 rounded-lg bg-study-green/10 flex items-center justify-center hover:bg-study-green/20 transition-colors"
            title="Открыть страницу программ"
          >
            <ExternalLink className="w-3.5 h-3.5 text-study-green" />
          </a>
        )}
      </div>

      {/* Desktop hover overlay — slides up the intro. Mobile has no hover, so it
          relies on the tap-to-open modal instead (see the header button). */}
      {intro && (
        <div className="hidden sm:flex absolute inset-0 z-10 flex-col justify-end p-5 bg-study-brown text-white opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto">
          <div className="space-y-2 translate-y-6 group-hover:translate-y-0 transition-all duration-300">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt=""
                    className="w-full h-full object-contain p-0.5"
                    onError={(e) => { const t = e.currentTarget; t.style.display = 'none'; t.nextElementSibling?.classList.remove('hidden') }}
                  />
                ) : null}
                <span className={`text-[10px] font-bold text-study-brown ${logoUrl ? 'hidden' : ''}`}>{initials}</span>
              </div>
              <h3 className="font-bold text-sm leading-snug">{intro.nameRu || uni.name}</h3>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-white/80">
              {uni.city && <span>{uni.city}</span>}
              {intro.founded && <span>Основан в {intro.founded}</span>}
              {intro.ranking && <span>{intro.ranking}</span>}
            </div>
            <p className="text-xs leading-snug text-white/95 line-clamp-4">{intro.blurb}</p>
            <button
              onClick={() => setIntroOpen(true)}
              className="mt-1 inline-flex items-center gap-1 rounded-lg bg-black/25 hover:bg-black/40 px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              Подробнее <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Intro detail modal */}
      {introOpen && intro && (
        <div
          className="fixed inset-0 z-50 bg-study-overlay/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setIntroOpen(false)}
        >
          <div
            className="bg-study-card sm:rounded-2xl rounded-t-2xl card-shadow-hover w-full sm:max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-study-card rounded-t-2xl p-4 sm:p-5 border-b border-study-lightgray flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="shrink-0 w-11 h-11 rounded-xl overflow-hidden bg-study-bg flex items-center justify-center">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={uni.name}
                      className="w-full h-full object-contain p-0.5"
                      onError={(e) => { const t = e.currentTarget; t.style.display = 'none'; t.nextElementSibling?.classList.remove('hidden') }}
                    />
                  ) : null}
                  <span className={`text-xs font-bold text-study-brown ${logoUrl ? 'hidden' : ''}`}>{initials}</span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-study-dark text-base leading-snug">{intro.nameRu || uni.name}</h3>
                  <p className="text-xs text-study-gray mt-0.5">{uni.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {uni.link && (
                  <a
                    href={uni.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Перейти на портал вуза"
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-study-brown/10 text-study-brown hover:bg-study-brown/20 transition-colors"
                  >
                    <ArrowUpRight className="w-5 h-5" />
                  </a>
                )}
                <button onClick={() => setIntroOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-study-bg">
                  <X className="w-5 h-5 text-study-gray" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                {uni.city && (
                  <span className="inline-flex items-center gap-1 text-xs bg-study-bg rounded-lg px-2.5 py-1.5 text-study-dark">
                    <MapPin className="w-3.5 h-3.5 text-study-gray" />{uni.city}
                  </span>
                )}
                {intro.founded && (
                  <span className="inline-flex items-center gap-1 text-xs bg-study-bg rounded-lg px-2.5 py-1.5 text-study-dark">
                    <Calendar className="w-3.5 h-3.5 text-study-gray" />Основан в {intro.founded}
                  </span>
                )}
                {intro.ranking && (
                  <span className="inline-flex items-center gap-1 text-xs bg-study-bg rounded-lg px-2.5 py-1.5 text-study-dark">
                    <Award className="w-3.5 h-3.5 text-study-gray" />{intro.ranking}
                  </span>
                )}
              </div>

              {intro.blurb && <p className="text-sm text-study-dark leading-relaxed">{intro.blurb}</p>}

              {uni.programs.length > 0 && (
                <div>
                  <button
                    onClick={() => setProgramsOpen((o) => !o)}
                    className="flex items-center gap-1.5 text-xs text-study-brown font-medium hover:underline"
                  >
                    <span className="text-study-gray">Программ на английском:</span>
                    <span className="font-semibold text-study-dark">{uni.programs.length}</span>
                    {programsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    <span>{programsOpen ? 'Скрыть' : 'Показать'}</span>
                  </button>
                  {programsOpen && (
                    <ul className="mt-2 space-y-1 max-h-52 overflow-y-auto pr-1">
                      {uni.programs.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-study-dark leading-snug">
                          <span className="mt-[5px] w-1.5 h-1.5 rounded-full bg-study-brown/40 shrink-0" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2 pt-1">
                {uni.link && (
                  <a href={uni.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-study-green text-white py-2.5 text-sm font-semibold hover:bg-study-green/90">
                    <ExternalLink className="w-4 h-4" />Открыть страницу программ
                  </a>
                )}
                {intro.source && (
                  <a href={intro.source} target="_blank" rel="noopener noreferrer" className="text-center text-[11px] text-study-gray hover:text-study-brown">
                    Источник: Wikipedia
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {uni.programs.length === 0 ? (
        // 67 of the 182 universities land here. "Программы не указаны" read as
        // missing data; the useful reading is that the university has no
        // English-taught bachelor programmes in our base — you would be
        // studying in Chinese.
        <span className="text-xs text-study-gray bg-study-bg rounded-lg px-2.5 py-2 self-start leading-snug">
          Англоязычных программ бакалавриата нет — обучение на китайском.
          Требования уточняйте на сайте вуза.
        </span>
      ) : (
        <div className="flex flex-col gap-1.5">
          {/* Highlighted matching programs shown first when filter is active */}
          {isFiltered && matchingPrograms.map((p, i) => (
            <div key={`match-${i}`} className="flex items-start gap-2 bg-study-brown/8 rounded-lg px-2 py-1.5 -mx-1">
              <span className="mt-[5px] w-1.5 h-1.5 rounded-full bg-study-brown shrink-0" />
              <span className="text-xs text-study-dark font-semibold leading-snug">{highlight(p, query)}</span>
            </div>
          ))}

          {/* Divider between matched and rest when both present */}
          {isFiltered && matchingPrograms.length > 0 && otherPrograms.length > 0 && (
            <div className="border-t border-study-lightgray my-1" />
          )}

          {/* Other programs (dimmed when filter is active) */}
          {visibleOthers.map((p, i) => (
            <div key={`other-${i}`} className="flex items-start gap-2">
              <span className={`mt-[5px] w-1.5 h-1.5 rounded-full shrink-0 ${isFiltered ? 'bg-study-gray/30' : 'bg-study-brown/40'}`} />
              <span className={`text-xs leading-snug ${isFiltered ? 'text-study-gray' : 'text-study-dark'}`}>
                {highlight(p, query)}
              </span>
            </div>
          ))}

          {!isFiltered && hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-study-brown font-medium mt-1 hover:underline self-start"
            >
              {expanded
                ? <><ChevronUp className="w-3.5 h-3.5" />Свернуть</>
                : <><ChevronDown className="w-3.5 h-3.5" />Ещё {otherPrograms.length - SHOW_LIMIT}</>
              }
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function Universities({ compact = false }: { compact?: boolean }) {
  const { setActiveTab } = useApp()
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('Все')
  const [cityFilter, setCityFilter] = useState('Все города')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return ALL_UNIVERSITIES.filter((uni) => {
      if (activeFilter !== 'Все' && !uni.categories.includes(activeFilter)) return false
      if (cityFilter !== 'Все города' && uni.city !== cityFilter) return false
      if (!q || q.length < 2) return true
      return (
        uni.name.toLowerCase().includes(q) ||
        uni.programs.some((p) => p.toLowerCase().includes(q))
      )
    })
  }, [query, activeFilter, cityFilter])

  // On the dashboard only preview a handful of universities; full DB lives on the Вузы page.
  const visible = compact ? filtered.slice(0, PREVIEW_COUNT) : filtered

  return (
    <div className="space-y-6">
      {/* Personal application tracker */}
      <UniTracker />

      {/* Browse full university / program database */}
      <div className="space-y-4">
        <div>
          {/* The list under each university is its English-taught programmes —
              not a "best of" selection. Saying so here, because the bullets
              read as a shortlist otherwise. */}
          <h2 className="text-base sm:text-lg font-bold text-study-dark">
            База вузов и программ на английском
          </h2>
          <p className="text-xs text-study-gray mt-0.5">
            {compact
              ? 'Популярные вузы — вся база из 182 университетов на странице «Вузы»'
              : 'Под каждым вузом — все его программы бакалавриата на английском языке. Найдите подходящую и добавьте вуз в свою воронку выше'}
          </p>
        </div>

        {!compact && (
          <>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-study-gray pointer-events-none" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск по университету или специальности..."
                className="w-full rounded-xl border border-study-lightgray bg-study-card pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-study-brown transition-colors"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    activeFilter === f
                      ? 'bg-study-brown text-white'
                      : 'bg-study-card border border-study-lightgray text-study-gray hover:border-study-brown/50'
                  }`}
                >
                  {f}
                </button>
              ))}

              {/* City filter — a dropdown rather than pills (55 cities). */}
              <div className="relative">
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-study-gray pointer-events-none" />
                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className={`appearance-none rounded-full border pl-7 pr-7 py-1.5 text-xs font-semibold cursor-pointer transition-colors focus:outline-none ${
                    cityFilter !== 'Все города'
                      ? 'bg-study-brown text-white border-study-brown'
                      : 'bg-study-card border-study-lightgray text-study-gray hover:border-study-brown/50'
                  }`}
                >
                  <option value="Все города">Все города</option>
                  {CITY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none opacity-70" />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs text-study-gray">
                Найдено: <span className="font-semibold text-study-dark">{filtered.length}</span> университетов
              </p>
              {(activeFilter !== 'Все' || cityFilter !== 'Все города' || query) && (
                <button
                  onClick={() => { setActiveFilter('Все'); setCityFilter('Все города'); setQuery('') }}
                  className="text-xs font-medium text-study-brown hover:underline"
                >
                  Сбросить фильтры
                </button>
              )}
            </div>
          </>
        )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-study-gray text-sm">
          Ничего не найдено — попробуйте другой запрос
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {visible.map((uni) => (
            <UniCard key={uni.name} uni={uni} query={query} activeFilter={activeFilter} />
          ))}
        </div>
      )}

      {compact && (
        <button
          onClick={() => setActiveTab('universities')}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-study-lightgray bg-study-card px-4 py-3 text-sm font-semibold text-study-brown hover:border-study-brown/50 hover:bg-study-bg transition-colors"
        >
          Показать больше
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
      </div>
    </div>
  )
}
