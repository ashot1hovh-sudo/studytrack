'use client'
import { useEffect, useState } from 'react'
import { Download, Eraser } from 'lucide-react'

const fields = [
  { key: 'university',  label: 'Университет',           type: 'text'   },
  { key: 'city',        label: 'Город',                 type: 'text'   },
  { key: 'language',    label: 'Язык обучения',         type: 'select', options: ['Китайский', 'Английский', 'Оба'] },
  { key: 'focus',       label: 'Основной фокус',        type: 'text'   },
  { key: 'math',        label: 'Есть математика',       type: 'select', options: ['Да', 'Нет', 'Не знаю'] },
  { key: 'chinese',     label: 'Есть китайский язык',   type: 'select', options: ['Да', 'Нет', 'Не знаю'] },
  { key: 'internship',  label: 'Есть стажировка',       type: 'select', options: ['Да', 'Нет', 'Не знаю'] },
  { key: 'exchange',    label: 'Есть обмены',           type: 'select', options: ['Да', 'Нет', 'Не знаю'] },
  { key: 'exams',       label: 'Экзамены',              type: 'text'   },
  { key: 'cost',        label: 'Стоимость (в год)',     type: 'text'   },
  { key: 'career',      label: 'Карьерная логика',      type: 'text'   },
  { key: 'risks',       label: 'Риски',                 type: 'text'   },
] as const

type FieldKey = typeof fields[number]['key']
type Program = Record<FieldKey, string>

const emptyProgram = (): Program =>
  Object.fromEntries(fields.map((f) => [f.key, ''])) as Program

const DEFAULT_NAMES = ['Программа 1', 'Программа 2', 'Программа 3']
// Bumped if the field set changes, so an old saved shape can't half-populate.
const STORAGE_KEY = 'st_program_comparison_v1'

/** Wrap a value for CSV: quote, and double any inner quotes. */
function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

export default function ProgramComparisonTable() {
  const [programs, setPrograms] = useState<Program[]>(() => [emptyProgram(), emptyProgram(), emptyProgram()])
  const [names, setNames] = useState<string[]>(DEFAULT_NAMES)
  const [confirmClear, setConfirmClear] = useState(false)
  // Gates the save effect so the initial empty state can't overwrite saved work
  // before the load has run.
  const [loaded, setLoaded] = useState(false)

  // The table is filled in over days while comparing programmes, so it has to
  // survive leaving the lesson. Per-device localStorage is enough — these are
  // the student's own working notes, not account data.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as { programs?: Program[]; names?: string[] }
        if (saved.programs?.length === 3) setPrograms(saved.programs.map((p) => ({ ...emptyProgram(), ...p })))
        if (saved.names?.length === 3) setNames(saved.names)
      }
    } catch {
      // Corrupt or blocked storage: start empty rather than throw.
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ programs, names }))
    } catch {
      // Private mode / quota: the table still works this session, just isn't saved.
    }
  }, [programs, names, loaded])

  const update = (pi: number, key: FieldKey, val: string) =>
    setPrograms((prev) => prev.map((p, i) => (i === pi ? { ...p, [key]: val } : p)))

  const updateName = (pi: number, val: string) =>
    setNames((prev) => prev.map((n, i) => (i === pi ? val : n)))

  const clearAll = () => {
    setPrograms([emptyProgram(), emptyProgram(), emptyProgram()])
    setNames(DEFAULT_NAMES)
    setConfirmClear(false)
  }

  const download = () => {
    const header = ['Критерий', ...names].map(csvCell).join(',')
    const rows = fields.map((f) =>
      [f.label, ...programs.map((p) => p[f.key])].map(csvCell).join(',')
    )
    // ﻿ (BOM) so Excel opens the Cyrillic as UTF-8 rather than mojibake.
    const csv = '﻿' + [header, ...rows].join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'sravnenie-programm.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="py-2">
      <div className="flex items-center justify-end gap-2 mb-2">
        <button
          onClick={download}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-study-brown px-2.5 py-1.5 rounded-lg hover:bg-study-brown/10 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Скачать таблицу
        </button>
        {confirmClear ? (
          <span className="inline-flex items-center gap-1.5 text-xs">
            <span className="text-study-gray">Очистить всё?</span>
            <button onClick={clearAll} className="font-semibold text-study-red hover:underline">Да</button>
            <button onClick={() => setConfirmClear(false)} className="text-study-gray hover:underline">Нет</button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmClear(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-study-gray px-2.5 py-1.5 rounded-lg hover:bg-study-bg transition-colors"
          >
            <Eraser className="w-3.5 h-3.5" />
            Очистить
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm" style={{ minWidth: 560 }}>
          <colgroup>
            <col style={{ width: 148 }} />
            {programs.map((_, i) => <col key={i} style={{ width: '33%' }} />)}
          </colgroup>
          <thead>
            <tr>
              <th className="p-2 bg-study-bg border-b border-study-lightgray" />
              {names.map((name, pi) => (
                <th key={pi} className="p-2 bg-study-bg border-b border-study-lightgray">
                  <input
                    value={name}
                    onChange={(e) => updateName(pi, e.target.value)}
                    className="w-full text-center text-xs font-semibold bg-transparent border-b border-study-lightgray text-study-dark focus:outline-none focus:border-study-brown py-1"
                    placeholder={`Программа ${pi + 1}`}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map((field, fi) => (
              <tr key={field.key} className={fi % 2 === 0 ? 'bg-study-card' : 'bg-study-bg/50'}>
                <td className="p-2 text-xs font-semibold text-study-gray border-b border-study-lightgray align-middle leading-tight">
                  {field.label}
                </td>
                {programs.map((prog, pi) => (
                  <td key={pi} className="p-1.5 border-b border-study-lightgray align-middle">
                    {'options' in field ? (
                      <select
                        value={prog[field.key]}
                        onChange={(e) => update(pi, field.key as FieldKey, e.target.value)}
                        className="w-full text-xs rounded-lg border border-study-lightgray bg-study-card text-study-dark px-2 py-1.5 focus:outline-none focus:border-study-brown"
                      >
                        <option value="">—</option>
                        {field.options.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={prog[field.key]}
                        onChange={(e) => update(pi, field.key as FieldKey, e.target.value)}
                        placeholder="—"
                        className="w-full text-xs rounded-lg border border-study-lightgray bg-study-card text-study-dark px-2 py-1.5 focus:outline-none focus:border-study-brown"
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-study-gray mt-3">
        Заполните таблицу по каждой программе, которую вы рассматриваете. Всё сохраняется
        на этом устройстве — можно вернуться и дозаполнить позже.
      </p>
    </div>
  )
}
