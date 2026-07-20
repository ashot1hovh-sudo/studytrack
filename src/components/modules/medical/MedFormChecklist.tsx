'use client'
import { useState } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'

const items = [
  'Приклеена фотография',
  'Печать заходит на угол фото',
  'Печать не закрывает лицо',
  'У каждого врача стоит "normal"',
  'У каждого врача есть подпись',
  'У каждого врача есть личная печать',
  'Есть ЭКГ',
  'Есть УЗИ брюшной полости',
  'Есть флюорография',
  'Есть анализы (ВИЧ, сифилис и др.)',
  'Терапевт заполнил недостающие поля',
  'Внизу формы есть подпись врача',
  'Стоит Official Stamp клиники',
  'Стоит дата прохождения обследования',
  'Все страницы читаются',
]

export default function MedFormChecklist() {
  const [checked, setChecked] = useState<Set<number>>(new Set())

  const toggle = (i: number) => {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const done = checked.size
  const total = items.length

  return (
    <div className="py-3">
      <div className="bg-study-card border border-study-lightgray rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-study-lightgray flex items-center justify-between">
          <span className="text-sm font-semibold text-study-dark">Чек-лист перед сканированием</span>
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              done === total
                ? 'bg-study-green/10 text-study-green'
                : 'bg-study-bg text-study-gray'
            }`}
          >
            {done}/{total}
          </span>
        </div>
        <div className="divide-y divide-study-lightgray">
          {items.map((item, i) => {
            const isChecked = checked.has(i)
            return (
              <button
                key={i}
                onClick={() => toggle(i)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-study-bg transition-colors"
              >
                {isChecked ? (
                  <CheckCircle2 className="w-4 h-4 text-study-green shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-study-lightgray shrink-0" />
                )}
                <span
                  className={`text-sm leading-snug ${
                    isChecked ? 'line-through text-study-gray' : 'text-study-dark'
                  }`}
                >
                  {item}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
