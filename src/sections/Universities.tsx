'use client'

import { useState, useMemo } from 'react'
import { ExternalLink, Search, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react'
import rawData from '@/data/China_Universities_Programs.json'
import explorerData from '@/data/universityExplorer.json'
import UniTracker from '@/sections/UniTracker'
import { useApp } from '@/context/AppContext'

type RawEntry = { University?: string; Link?: string; Program?: string }

type UniEntry = {
  name: string
  link: string
  programs: string[]
  categories: string[]
}

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
        map.set(current, { name: current, link: row.Link ?? '', programs: [], categories: [] })
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
    <div className="bg-study-card rounded-xl card-shadow p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
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
          <h3 className="font-bold text-study-dark text-sm leading-snug">{highlight(uni.name, query)}</h3>
        </div>
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

      {uni.programs.length === 0 ? (
        <span className="text-xs text-study-gray bg-study-bg rounded-lg px-2.5 py-1.5 self-start">
          Программы не указаны
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

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return ALL_UNIVERSITIES.filter((uni) => {
      if (activeFilter !== 'Все' && !uni.categories.includes(activeFilter)) return false
      if (!q || q.length < 2) return true
      return (
        uni.name.toLowerCase().includes(q) ||
        uni.programs.some((p) => p.toLowerCase().includes(q))
      )
    })
  }, [query, activeFilter])

  // On the dashboard only preview a handful of universities; full DB lives on the Вузы page.
  const visible = compact ? filtered.slice(0, PREVIEW_COUNT) : filtered

  return (
    <div className="space-y-6">
      {/* Personal application tracker */}
      <UniTracker />

      {/* Browse full university / program database */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-study-dark">База вузов и программ</h2>
          <p className="text-xs text-study-gray mt-0.5">
            {compact
              ? 'Популярные вузы — вся база из 182 университетов на странице «Вузы»'
              : 'Найдите вуз по специальности и добавьте его в свою воронку выше'}
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

            <div className="flex gap-2 flex-wrap">
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
            </div>

            <p className="text-xs text-study-gray">
              Найдено: <span className="font-semibold text-study-dark">{filtered.length}</span> университетов
            </p>
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
