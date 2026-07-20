'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

/**
 * Pill-style theme switch: a track carrying both icons with a knob that slides
 * to the active side.
 *
 * Reads as a setting with two states, where the icon button reads as an action.
 * Kept as a separate component from the icon toggle in Sidebar so both can be
 * live at once and compared before one is dropped.
 */
export default function ThemeSwitch({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Включить светлую тему' : 'Включить ночную тему'}
      title={isDark ? 'Светлая тема' : 'Ночная тема'}
      className={`relative inline-flex items-center w-[64px] h-8 rounded-full transition-colors duration-300 shrink-0 ${
        isDark ? 'bg-study-inverse' : 'bg-study-lightgray'
      } ${className}`}
    >
      {/* Icons sit on the track; the knob slides over the inactive one. */}
      <Sun
        className={`absolute left-[7px] w-4 h-4 transition-opacity duration-200 ${
          isDark ? 'opacity-40 text-white' : 'opacity-0'
        }`}
      />
      <Moon
        className={`absolute right-[7px] w-4 h-4 transition-opacity duration-200 ${
          isDark ? 'opacity-0' : 'opacity-45 text-study-dark'
        }`}
      />
      <span
        className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-study-card card-shadow flex items-center justify-center transition-transform duration-300 ease-out ${
          isDark ? 'translate-x-8' : 'translate-x-0'
        }`}
      >
        {isDark
          ? <Moon className="w-3.5 h-3.5 text-study-brown" />
          : <Sun className="w-3.5 h-3.5 text-study-orange" />}
      </span>
    </button>
  )
}
