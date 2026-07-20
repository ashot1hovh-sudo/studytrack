'use client'
import { useState } from 'react'
import { GraduationCap, BookOpen, Building2, Award, FileText, ClipboardList, ScrollText } from 'lucide-react'

const situations = [
  {
    id: 'finished-11',
    label: 'Окончил 11 класс',
    Icon: GraduationCap,
    color: 'success' as const,
    docs: [
      { Icon: ScrollText,    text: 'Аттестат об окончании 11 класса' },
      { Icon: FileText,      text: 'Вкладыш с оценками (академический транскрипт)' },
    ],
    note: 'Если оценки показывают положительную динамику — можно приложить дополнительные справки по профильным предметам.',
  },
  {
    id: 'studying-11',
    label: 'Ещё учусь в 11 классе',
    Icon: BookOpen,
    color: 'warning' as const,
    docs: [
      { Icon: ClipboardList, text: 'Справка об обучении (с датой предполагаемого выпуска)' },
      { Icon: FileText,      text: 'Годовые оценки за 10 класс' },
      { Icon: FileText,      text: 'Последние доступные оценки за 11 класс' },
    ],
    note: 'Дата выпуска в справке должна быть реалистичной — университет будет ожидать аттестат в указанный срок.',
  },
  {
    id: 'college',
    label: 'Учусь в колледже',
    Icon: Building2,
    color: 'info' as const,
    docs: [
      { Icon: ClipboardList, text: 'Справка об обучении / зачислении' },
      { Icon: FileText,      text: 'Оценки за каждый год обучения' },
    ],
    note: 'Укажите специальность, курс и предполагаемую дату выпуска.',
  },
  {
    id: 'finished-college',
    label: 'Окончил колледж',
    Icon: Award,
    color: 'neutral' as const,
    docs: [
      { Icon: ScrollText,    text: 'Диплом колледжа' },
      { Icon: FileText,      text: 'Оценки за каждый год обучения' },
    ],
    note: 'Нужны оценки за все годы обучения в колледже.',
  },
]

const colorMap = {
  success: { icon: 'text-study-green', label: 'text-study-green', active: 'border-study-green bg-study-green/10' },
  warning: { icon: 'text-study-orange', label: 'text-study-orange', active: 'border-study-orange bg-study-orange/10' },
  info:    { icon: 'text-blue-500', label: 'text-blue-500', active: 'border-blue-400 bg-blue-50 dark:bg-blue-500/10' },
  neutral: { icon: 'text-study-gray', label: 'text-study-gray', active: 'border-study-gray bg-study-bg' },
}

export default function SituationSelector() {
  const [selected, setSelected] = useState<string | null>(null)
  const active = situations.find(s => s.id === selected)

  return (
    <div className="py-3 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {situations.map((s) => {
          const { Icon } = s
          const c = colorMap[s.color]
          const isActive = selected === s.id
          return (
            <button
              key={s.id}
              onClick={() => setSelected(isActive ? null : s.id)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-center transition-all ${
                isActive ? c.active : 'border-study-lightgray bg-study-card'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? c.icon : 'text-study-gray'}`} />
              <span className={`text-xs font-medium leading-tight ${isActive ? c.label : 'text-study-dark'}`}>
                {s.label}
              </span>
            </button>
          )
        })}
      </div>

      {active && (
        <div className="bg-study-card border border-study-lightgray rounded-xl px-4 py-3 flex flex-col gap-2.5">
          <p className="text-xs font-medium text-study-gray">Что подготовить:</p>
          <ul className="flex flex-col gap-1.5">
            {active.docs.map((doc, i) => {
              const { Icon: DocIcon } = doc
              return (
                <li key={i} className="flex items-start gap-2 text-xs text-study-dark">
                  <DocIcon className="w-3.5 h-3.5 text-study-gray shrink-0 mt-0.5" />
                  {doc.text}
                </li>
              )
            })}
          </ul>
          {active.note && (
            <p className="text-xs text-study-gray bg-study-bg rounded-lg px-2.5 py-2">
              {active.note}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
