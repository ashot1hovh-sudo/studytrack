'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { initials } from './derive'

/** Pill group: one active value. */
export function Seg<T extends string>({ value, options, onChange, label }: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="dash-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={value === o.value ? 'is-on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Pill button that opens a small menu of options. */
export function Dropdown<T extends string>({ value, options, onChange, icon, label }: {
  value: T
  options: { value: T; label: string; dot?: string }[]
  onChange: (v: T) => void
  icon?: ReactNode
  label: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])
  const current = options.find((o) => o.value === value)
  return (
    <div className="dash-dd" ref={ref}>
      <button type="button" className={`dash-pill${open ? ' is-open' : ''}`} aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => setOpen((v) => !v)}>
        {icon}
        <span>{current?.label ?? label}</span>
        <ChevronDown className="dash-pill-chev" />
      </button>
      {open && (
        <ul className="dash-menu" role="listbox">
          {options.map((o) => (
            <li key={o.value}>
              <button type="button" role="option" aria-selected={o.value === value} className={o.value === value ? 'is-on' : ''} onClick={() => { onChange(o.value); setOpen(false) }}>
                {o.dot && <i style={{ background: o.dot }} />}
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return <span className="dash-ava" style={{ width: size, height: size }}>{initials(name)}</span>
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" className="dash-toggle" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span>{label}</span>
      <i className={on ? 'is-on' : ''}><b /></i>
    </button>
  )
}
