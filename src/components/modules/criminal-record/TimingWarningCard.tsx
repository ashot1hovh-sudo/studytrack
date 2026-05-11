import { Clock, CalendarX, CalendarCheck, Languages } from 'lucide-react'

const points = [
  {
    Icon: Clock,
    color: 'warning' as const,
    text: 'Справка делается до 30 календарных дней — не оставляйте на последний момент',
  },
  {
    Icon: CalendarX,
    color: 'danger' as const,
    text: 'Срок действия справки — 6 месяцев. Заказывать слишком рано тоже не стоит',
  },
  {
    Icon: CalendarCheck,
    color: 'success' as const,
    text: 'Справка должна быть актуальна на момент загрузки документов в университет',
  },
  {
    Icon: Languages,
    color: 'info' as const,
    text: 'Оставьте время на нотариальный перевод после получения справки',
  },
]

const colorMap = {
  warning: { circle: 'bg-study-orange/10', icon: 'text-study-orange' },
  danger:  { circle: 'bg-red-50', icon: 'text-red-500' },
  success: { circle: 'bg-study-green/10', icon: 'text-study-green' },
  info:    { circle: 'bg-blue-50', icon: 'text-blue-500' },
}

export default function TimingWarningCard() {
  return (
    <div className="py-3">
      <div className="bg-white border border-study-lightgray rounded-xl px-5 py-4 flex flex-col gap-3">
        {points.map((p, i) => {
          const { Icon } = p
          const c = colorMap[p.color]
          return (
            <div key={i} className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full ${c.circle} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${c.icon}`} />
              </div>
              <p className="text-sm text-study-dark mt-1 leading-relaxed">{p.text}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
