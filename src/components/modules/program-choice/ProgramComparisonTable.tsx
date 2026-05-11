'use client'
import { useState } from 'react'

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

export default function ProgramComparisonTable() {
  const [programs, setPrograms] = useState<Program[]>([emptyProgram(), emptyProgram(), emptyProgram()])
  const [names, setNames] = useState(['Программа 1', 'Программа 2', 'Программа 3'])

  const update = (pi: number, key: FieldKey, val: string) =>
    setPrograms((prev) => prev.map((p, i) => (i === pi ? { ...p, [key]: val } : p)))

  const updateName = (pi: number, val: string) =>
    setNames((prev) => prev.map((n, i) => (i === pi ? val : n)))

  return (
    <div className="py-2 overflow-x-auto">
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
            <tr key={field.key} className={fi % 2 === 0 ? 'bg-white' : 'bg-study-bg/50'}>
              <td className="p-2 text-xs font-semibold text-study-gray border-b border-study-lightgray align-middle leading-tight">
                {field.label}
              </td>
              {programs.map((prog, pi) => (
                <td key={pi} className="p-1.5 border-b border-study-lightgray align-middle">
                  {'options' in field ? (
                    <select
                      value={prog[field.key]}
                      onChange={(e) => update(pi, field.key as FieldKey, e.target.value)}
                      className="w-full text-xs rounded-lg border border-study-lightgray bg-white text-study-dark px-2 py-1.5 focus:outline-none focus:border-study-brown"
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
                      className="w-full text-xs rounded-lg border border-study-lightgray bg-white text-study-dark px-2 py-1.5 focus:outline-none focus:border-study-brown"
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-study-gray mt-3">
        Заполните таблицу по каждой программе, которую вы рассматриваете
      </p>
    </div>
  )
}
