'use client'

import { useState, useMemo } from 'react'
import { ExternalLink, Search, ChevronDown, ChevronUp } from 'lucide-react'
import rawData from '@/data/China_Universities_Programs.json'

type RawEntry = { University?: string; Link?: string; Program?: string }

type UniEntry = {
  name: string
  link: string
  programs: string[]
  categories: string[]
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
    const text = uni.programs.join(' ').toLowerCase()
    const cats: string[] = []
    if (/mbbs|medicine|medical|health/.test(text)) cats.push('Медицина')
    if (/business|economics?|finance|accounting|management|marketing|commerce|trade/.test(text)) cats.push('Бизнес')
    if (/computer|data|software|\bit\b|digital|fintech|cyber|artificial|information/.test(text)) cats.push('IT')
    if (/engineering|civil|mechanical|electrical|chemical|structural|architecture/.test(text)) cats.push('Инженерия')
    if (/science|biology|chemistry|physics|math|environmental/.test(text)) cats.push('Науки')
    if (/communication|sociology|politics|law|governance|history|philosophy|education|language|translation|media/.test(text)) cats.push('Гуманитарные')
    uni.categories = cats
  }
  return Array.from(map.values())
})()

const FILTERS = ['Все', 'Бизнес', 'IT', 'Инженерия', 'Медицина', 'Науки', 'Гуманитарные']
const SHOW_LIMIT = 5

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

function UniCard({ uni, query }: { uni: UniEntry; query: string }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? uni.programs : uni.programs.slice(0, SHOW_LIMIT)
  const hasMore = uni.programs.length > SHOW_LIMIT

  return (
    <div className="bg-white rounded-xl card-shadow p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-study-dark text-sm leading-snug">{highlight(uni.name, query)}</h3>
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
          {visible.map((p, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-[5px] w-1.5 h-1.5 rounded-full bg-study-brown/40 shrink-0" />
              <span className="text-xs text-study-dark leading-snug">{highlight(p, query)}</span>
            </div>
          ))}
          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-study-brown font-medium mt-1 hover:underline self-start"
            >
              {expanded
                ? <><ChevronUp className="w-3.5 h-3.5" />Свернуть</>
                : <><ChevronDown className="w-3.5 h-3.5" />Ещё {uni.programs.length - SHOW_LIMIT}</>
              }
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function Universities() {
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

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-study-gray pointer-events-none" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по университету или специальности..."
          className="w-full rounded-xl border border-study-lightgray bg-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-study-brown transition-colors"
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
                : 'bg-white border border-study-lightgray text-study-gray hover:border-study-brown/50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <p className="text-xs text-study-gray">
        Найдено: <span className="font-semibold text-study-dark">{filtered.length}</span> университетов
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-study-gray text-sm">
          Ничего не найдено — попробуйте другой запрос
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map((uni) => (
            <UniCard key={uni.name} uni={uni} query={query} />
          ))}
        </div>
      )}
    </div>
  )
}
