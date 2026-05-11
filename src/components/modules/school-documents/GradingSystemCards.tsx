import { CalendarDays, Calendar, BarChart2, SlidersHorizontal } from 'lucide-react'

const systems = [
  {
    Icon: CalendarDays,
    color: 'success' as const,
    title: 'Четверти',
    text: 'Оценки за последнюю закрытую четверть',
  },
  {
    Icon: Calendar,
    color: 'warning' as const,
    title: 'Семестры',
    text: 'Оценки за последний закрытый семестр',
  },
  {
    Icon: BarChart2,
    color: 'info' as const,
    title: 'Триместры',
    text: 'Оценки за последний закрытый триместр',
  },
  {
    Icon: SlidersHorizontal,
    color: 'neutral' as const,
    title: 'Индивидуальная система',
    text: 'Последнюю официальную выписку с оценками',
  },
]

const colorMap = {
  success: { header: 'bg-study-green/10', icon: 'text-study-green', border: 'border-study-green/20' },
  warning: { header: 'bg-study-orange/10', icon: 'text-study-orange', border: 'border-study-orange/20' },
  info:    { header: 'bg-blue-50', icon: 'text-blue-500', border: 'border-blue-200' },
  neutral: { header: 'bg-study-bg', icon: 'text-study-gray', border: 'border-study-lightgray' },
}

export default function GradingSystemCards() {
  return (
    <div className="py-3 grid sm:grid-cols-2 gap-3">
      {systems.map((s, i) => {
        const { Icon } = s
        const c = colorMap[s.color]
        return (
          <div key={i} className={`bg-white border ${c.border} rounded-xl overflow-hidden`}>
            <div className={`${c.header} px-4 py-2.5 flex items-center gap-2`}>
              <Icon className={`w-4 h-4 ${c.icon} shrink-0`} />
              <span className={`font-medium text-sm ${c.icon}`}>{s.title}</span>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-study-dark">{s.text}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
