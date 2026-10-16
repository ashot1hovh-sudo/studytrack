'use client'

/**
 * Date field with our own calendar, replacing the browser's <input type="date">
 * (small, English, different on every OS). Value is 'YYYY-MM-DD' or null, same
 * as the native input, so it drops in where one was used.
 *
 * The calendar renders in a portal with fixed positioning, so it is never
 * clipped by a scrolling or rounded parent, and opens upwards when there is
 * no room below. Keyboard: arrows move the day, PageUp/PageDown the month,
 * Enter picks, Escape closes.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const EASE = [0.16, 1, 0.3, 1] as const
const POP_W = 320
const POP_H = 372

type Ymd = { y: number; m: number; d: number }
const parse = (v: string | null | undefined): Ymd | null => {
  const m = v?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : null
}
const fmt = ({ y, m, d }: Ymd) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
const todayYmd = (): Ymd => { const t = new Date(); return { y: t.getFullYear(), m: t.getMonth(), d: t.getDate() } }
const same = (a: Ymd | null, b: Ymd | null) => !!a && !!b && a.y === b.y && a.m === b.m && a.d === b.d
const addDays = (a: Ymd, n: number): Ymd => { const t = new Date(a.y, a.m, a.d + n); return { y: t.getFullYear(), m: t.getMonth(), d: t.getDate() } }
const addMonths = (a: Ymd, n: number): Ymd => {
  const first = new Date(a.y, a.m + n, 1)
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  return { y: first.getFullYear(), m: first.getMonth(), d: Math.min(a.d, last) }
}

/** 6 weeks starting on Monday, so the grid never changes height between months. */
function grid(y: number, m: number): Ymd[] {
  const lead = (new Date(y, m, 1).getDay() + 6) % 7
  return Array.from({ length: 42 }, (_, i) => addDays({ y, m, d: 1 }, i - lead))
}

export default function DatePicker({
  value,
  onChange,
  disabled,
  placeholder = 'Выбрать дату',
  size = 'md',
  className = '',
  title,
  clearable = true,
}: {
  value: string | null | undefined
  onChange: (v: string | null) => void
  disabled?: boolean
  placeholder?: string
  size?: 'sm' | 'md'
  className?: string
  title?: string
  clearable?: boolean
}) {
  const selected = parse(value)
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState<Ymd>(selected ?? todayYmd())
  const [view, setView] = useState<'days' | 'months'>('days')
  const [dir, setDir] = useState(0)
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const pop = useRef<HTMLDivElement>(null)

  const place = useCallback(() => {
    const r = trigger.current?.getBoundingClientRect()
    if (!r) return
    const below = window.innerHeight - r.bottom
    const up = below < POP_H + 12 && r.top > below
    const left = Math.max(12, Math.min(r.left, window.innerWidth - POP_W - 12))
    setPos({ top: up ? r.top - POP_H - 8 : r.bottom + 8, left, up })
  }, [])

  function openIt() {
    if (disabled) return
    setCursor(selected ?? todayYmd())
    setView('days')
    setDir(0)
    place()
    setOpen(true)
  }
  const close = useCallback((refocus = true) => {
    setOpen(false)
    if (refocus) trigger.current?.focus()
  }, [])

  // Follow the trigger while the page or any parent scrolls; close on outside click.
  useLayoutEffect(() => {
    if (!open) return
    const onMove = () => place()
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!pop.current?.contains(t) && !trigger.current?.contains(t)) close(false)
    }
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    document.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open, place, close])

  useEffect(() => {
    if (open) pop.current?.focus({ preventScroll: true })
  }, [open])

  function pick(d: Ymd) {
    onChange(fmt(d))
    close()
  }
  function shiftMonth(n: number) {
    setDir(n)
    setCursor((c) => addMonths(c, n))
  }

  function onKey(e: React.KeyboardEvent) {
    const move: Record<string, () => Ymd> = {
      ArrowLeft: () => addDays(cursor, -1),
      ArrowRight: () => addDays(cursor, 1),
      ArrowUp: () => addDays(cursor, -7),
      ArrowDown: () => addDays(cursor, 7),
      PageUp: () => addMonths(cursor, -1),
      PageDown: () => addMonths(cursor, 1),
    }
    if (e.key === 'Escape') { e.preventDefault(); close(); return }
    if (view !== 'days') return
    if (e.key === 'Enter') { e.preventDefault(); pick(cursor); return }
    const f = move[e.key]
    if (!f) return
    e.preventDefault()
    const next = f()
    if (next.m !== cursor.m || next.y !== cursor.y) setDir(next.y * 12 + next.m > cursor.y * 12 + cursor.m ? 1 : -1)
    setCursor(next)
  }

  const today = todayYmd()
  const days = grid(cursor.y, cursor.m)
  const h = size === 'sm' ? 'h-9 text-[13px]' : 'h-10 text-sm'

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => (open ? close() : openIt())}
        disabled={disabled}
        title={title}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`group inline-flex w-full items-center gap-2 rounded-lg border px-3 ${h} text-left bg-study-card transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          open ? 'border-study-brown ring-2 ring-study-brown/20' : 'border-study-lightgray hover:border-study-brown/50'
        } ${className}`}
      >
        <CalendarDays className={`w-4 h-4 shrink-0 ${selected ? 'text-study-brown' : 'text-study-gray'}`} />
        <span className={`flex-1 truncate tabular-nums ${selected ? 'text-study-dark font-medium' : 'text-study-gray'}`}>
          {selected ? `${selected.d} ${MONTHS_SHORT[selected.m]} ${selected.y}` : placeholder}
        </span>
        {clearable && selected && !disabled && (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Очистить дату"
            onClick={(e) => { e.stopPropagation(); onChange(null) }}
            className="shrink-0 -mr-1 p-0.5 rounded text-study-gray opacity-0 group-hover:opacity-100 hover:text-study-red transition-opacity"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <motion.div
                ref={pop}
                role="dialog"
                aria-label="Выбор даты"
                tabIndex={-1}
                onKeyDown={onKey}
                initial={{ opacity: 0, y: pos.up ? 8 : -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: pos.up ? 6 : -6, scale: 0.98, transition: { duration: 0.12 } }}
                transition={{ duration: 0.22, ease: EASE }}
                style={{ position: 'fixed', top: pos.top, left: pos.left, width: POP_W, transformOrigin: pos.up ? 'bottom left' : 'top left' }}
                className="z-[1000] rounded-2xl border border-study-lightgray bg-study-card p-3 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)] outline-none"
              >
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => setView((v) => (v === 'days' ? 'months' : 'days'))}
                    className="px-2 py-1.5 rounded-lg text-[15px] font-bold text-study-dark hover:bg-study-bg transition-colors"
                  >
                    {view === 'days' ? `${MONTHS[cursor.m]} ${cursor.y}` : cursor.y}
                  </button>
                  <div className="flex items-center gap-1">
                    <NavBtn label={view === 'days' ? 'Предыдущий месяц' : 'Предыдущий год'} onClick={() => (view === 'days' ? shiftMonth(-1) : setCursor((c) => addMonths(c, -12)))}>
                      <ChevronLeft className="w-4 h-4" />
                    </NavBtn>
                    <NavBtn label={view === 'days' ? 'Следующий месяц' : 'Следующий год'} onClick={() => (view === 'days' ? shiftMonth(1) : setCursor((c) => addMonths(c, 12)))}>
                      <ChevronRight className="w-4 h-4" />
                    </NavBtn>
                  </div>
                </div>

                {view === 'days' ? (
                  <>
                    <div className="grid grid-cols-7 mb-1">
                      {WEEKDAYS.map((w, i) => (
                        <span key={w} className={`h-7 grid place-items-center text-[11px] font-semibold uppercase tracking-wide ${i >= 5 ? 'text-study-orange/80' : 'text-study-gray'}`}>{w}</span>
                      ))}
                    </div>
                    <div className="relative overflow-hidden" style={{ height: 6 * 42 }}>
                      <AnimatePresence initial={false} custom={dir} mode="popLayout">
                        <motion.div
                          key={`${cursor.y}-${cursor.m}`}
                          custom={dir}
                          initial={{ x: dir * 40, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          exit={{ x: dir * -40, opacity: 0 }}
                          transition={{ duration: 0.22, ease: EASE }}
                          className="grid grid-cols-7 gap-y-0.5"
                        >
                          {days.map((d) => {
                            const out = d.m !== cursor.m
                            const isSel = same(d, selected)
                            const isToday = same(d, today)
                            const isCur = same(d, cursor)
                            const weekend = (new Date(d.y, d.m, d.d).getDay() + 6) % 7 >= 5
                            return (
                              <button
                                key={fmt(d)}
                                type="button"
                                tabIndex={-1}
                                onClick={() => pick(d)}
                                onMouseEnter={() => !out && setCursor(d)}
                                aria-label={`${d.d} ${MONTHS_SHORT[d.m]} ${d.y}`}
                                aria-pressed={isSel}
                                className={`relative mx-auto h-10 w-10 rounded-xl text-sm tabular-nums transition-colors ${
                                  isSel
                                    ? 'bg-study-brown text-white font-bold shadow-[0_6px_16px_-6px_rgb(var(--study-brown)/0.7)]'
                                    : isCur
                                      ? 'bg-study-bg text-study-dark font-semibold'
                                      : out
                                        ? 'text-study-gray/40 hover:bg-study-bg'
                                        : `${weekend ? 'text-study-orange' : 'text-study-dark'} hover:bg-study-bg`
                                }`}
                              >
                                {d.d}
                                {isToday && <span className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full ${isSel ? 'bg-white' : 'bg-study-orange'}`} />}
                              </button>
                            )
                          })}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5 py-1" style={{ height: 28 + 6 * 42 }}>
                    {MONTHS.map((name, m) => {
                      const isSel = selected?.y === cursor.y && selected?.m === m
                      const isNow = today.y === cursor.y && today.m === m
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => { setDir(0); setCursor((c) => ({ y: c.y, m, d: Math.min(c.d, new Date(c.y, m + 1, 0).getDate()) })); setView('days') }}
                          className={`rounded-xl text-sm transition-colors ${isSel ? 'bg-study-brown text-white font-bold' : isNow ? 'bg-study-bg text-study-dark font-semibold ring-1 ring-study-orange/50' : 'text-study-dark hover:bg-study-bg'}`}
                        >
                          {name}
                        </button>
                      )
                    })}
                  </div>
                )}

                <div className="mt-2 pt-2 border-t border-study-lightgray flex items-center justify-between">
                  <button type="button" onClick={() => pick(today)} className="px-2.5 py-1.5 rounded-lg text-sm font-semibold text-study-brown hover:bg-study-bg transition-colors">
                    Сегодня
                  </button>
                  {clearable && selected && (
                    <button type="button" onClick={() => { onChange(null); close() }} className="px-2.5 py-1.5 rounded-lg text-sm font-semibold text-study-gray hover:text-study-red hover:bg-study-bg transition-colors">
                      Очистить
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  )
}

function NavBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="h-8 w-8 grid place-items-center rounded-lg text-study-dark hover:bg-study-bg transition-colors">
      {children}
    </button>
  )
}
