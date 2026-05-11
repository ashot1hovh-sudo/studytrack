'use client'

import { useState } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'

const items = [
  'Financial Guarantee подписан спонсором',
  'Имя студента написано правильно',
  'Имя спонсора совпадает с Bank Statement',
  'Указаны паспортные данные спонсора',
  'Bank Statement свежий (не устаревший)',
  'Сумма на счёте достаточная',
  'Валюта понятна (или указан эквивалент)',
  'Есть дата выдачи справки',
  'Есть название банка',
  'Есть печать или подпись банка',
  'Документ читаемый и не обрезанный',
  'Сделан нотариальный перевод (если справка на русском)',
]

export default function FinanceChecklist() {
  const [checked, setChecked] = useState<Set<number>>(new Set())

  const toggle = (i: number) => {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const done = checked.size

  return (
    <div className="py-3">
      <div className="bg-white border border-study-lightgray rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-study-bg border-b border-study-lightgray flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-study-dark">Чек-лист перед загрузкой</p>
            <p className="text-xs text-study-gray mt-0.5">Отметьте всё, что готово</p>
          </div>
          <span className="text-sm font-bold text-study-brown whitespace-nowrap">{done}/{items.length}</span>
        </div>
        <div className="divide-y divide-study-lightgray">
          {items.map((item, i) => {
            const isDone = checked.has(i)
            return (
              <button
                key={i}
                onClick={() => toggle(i)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-study-bg/50"
              >
                {isDone
                  ? <CheckCircle2 className="w-5 h-5 text-study-green shrink-0 mt-0.5" />
                  : <Circle className="w-5 h-5 text-study-gray shrink-0 mt-0.5" />}
                <span className={`text-sm leading-snug ${isDone ? 'line-through text-study-gray' : 'text-study-dark'}`}>
                  {item}
                </span>
              </button>
            )
          })}
        </div>
        {done === items.length && (
          <div className="px-4 py-3 bg-study-green/10 border-t border-study-lightgray">
            <p className="text-xs font-semibold text-study-green">Отлично! Все пункты выполнены — документы готовы к загрузке.</p>
          </div>
        )}
      </div>
    </div>
  )
}
