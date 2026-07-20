'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Deadline, DeadlineKind } from '@/types/studytrack'

/**
 * Month grid for the Дедлайны tab.
 *
 * Everything is derived from the deadline feed, which already merges document
 * dates, university dates and student-created events — the calendar never
 * fetches anything itself.
 */

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

export const KIND_STYLES: Record<DeadlineKind, { dot: string; label: string }> = {
  document: { dot: 'bg-study-orange', label: 'Документ' },
  university: { dot: 'bg-study-green', label: 'Заявка в вуз' },
  interview: { dot: 'bg-study-brown', label: 'Собеседование' },
  exam: { dot: 'bg-study-dark', label: 'Экзамен' },
  custom: { dot: 'bg-study-gray', label: 'Событие' },
}

function toISODate(date: Date) {
  // Local date parts, not toISOString(): that converts to UTC and can land on
  // the previous day for anyone east of Greenwich — which is the whole audience.
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Days of the grid, padded so the month starts on the correct weekday. */
function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1)
  // getDay() is Sunday-based; Russian calendars start on Monday.
  const leading = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (Date | null)[] = Array.from({ length: leading }, () => null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day))
  }
  while (cells.length % 7 !== 0) cells.push(null)

  return cells
}

type Props = {
  deadlines: Deadline[]
  onSelectDay: (isoDate: string | null) => void
  selectedDay: string | null
}

export default function DeadlineCalendar({ deadlines, onSelectDay, selectedDay }: Props) {
  const today = useMemo(() => new Date(), [])
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))

  const byDay = useMemo(() => {
    const map = new Map<string, Deadline[]>()
    for (const deadline of deadlines) {
      if (!deadline.dateValue) continue
      const list = map.get(deadline.dateValue) ?? []
      list.push(deadline)
      map.set(deadline.dateValue, list)
    }
    return map
  }, [deadlines])

  const cells = useMemo(
    () => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor]
  )

  const todayIso = toISODate(today)
  const shiftMonth = (delta: number) =>
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => shiftMonth(-1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-study-bg text-study-gray"
          aria-label="Предыдущий месяц"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <p className="text-sm font-bold text-study-dark">
          {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
        </p>
        <button
          onClick={() => shiftMonth(1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-study-bg text-study-gray"
          aria-label="Следующий месяц"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-[10px] font-semibold text-study-gray py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, index) => {
          if (!cell) return <div key={`pad-${index}`} />

          const iso = toISODate(cell)
          const items = byDay.get(iso) ?? []
          const isToday = iso === todayIso
          const isSelected = iso === selectedDay
          const hasOverdue = items.some((item) => item.isOverdue)

          // Deduplicated so a day with four documents shows one dot, not four.
          const kinds = Array.from(new Set(items.map((item) => item.kind ?? 'custom')))

          return (
            <button
              key={iso}
              onClick={() => onSelectDay(isSelected ? null : iso)}
              disabled={items.length === 0}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-1 text-xs transition-colors ${
                isSelected
                  ? 'bg-study-brown text-white'
                  : isToday
                    ? 'bg-study-bg font-bold text-study-dark ring-1 ring-study-brown/30'
                    : items.length
                      ? 'hover:bg-study-bg text-study-dark'
                      : 'text-study-gray/50 cursor-default'
              }`}
            >
              <span className={hasOverdue && !isSelected ? 'text-study-red font-bold' : ''}>
                {cell.getDate()}
              </span>
              {kinds.length > 0 && (
                <span className="flex gap-0.5">
                  {kinds.slice(0, 3).map((kind) => (
                    <span
                      key={kind}
                      className={`w-1 h-1 rounded-full ${
                        // Sits on the brown selected-day fill in both themes,
                        // so it stays literal white rather than the card token.
                        isSelected ? 'bg-white/80' : KIND_STYLES[kind].dot
                      }`}
                    />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 pt-3 border-t border-study-lightgray">
        {(Object.keys(KIND_STYLES) as DeadlineKind[]).map((kind) => (
          <span key={kind} className="flex items-center gap-1.5 text-[10px] text-study-gray">
            <span className={`w-1.5 h-1.5 rounded-full ${KIND_STYLES[kind].dot}`} />
            {KIND_STYLES[kind].label}
          </span>
        ))}
      </div>
    </div>
  )
}
