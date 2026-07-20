import { FileCheck, FileDown, Award, Check, Minus } from 'lucide-react'

const formats = [
  {
    title: 'Бумажная справка с печатью',
    Icon: FileCheck,
    tag: 'Лучший вариант',
    tagColor: 'success' as const,
    featured: true,
    pros: [
      'Выглядит официально для университета',
      'Есть печать и подпись',
      'Принимается без вопросов',
    ],
    cons: ['До 30 календарных дней'],
    note: 'Заказывайте первой — не оставляйте на последний момент.',
  },
  {
    title: 'Электронная справка',
    Icon: FileDown,
    tag: 'Если сроки горят',
    tagColor: 'warning' as const,
    featured: false,
    pros: ['Быстрее бумажной', 'Можно распечатать через МФЦ'],
    cons: [
      'Распечатанная дома — не лучший вариант для вуза',
      'Нужно идти в МФЦ для официальной копии',
    ],
    note: 'Электронную справку лучше распечатать через МФЦ — тогда она считается официальной.',
  },
  {
    title: 'Справка с апостилем',
    Icon: Award,
    tag: 'Только если вуз требует',
    tagColor: 'info' as const,
    featured: false,
    pros: ['Подтверждение документа для использования за рубежом'],
    cons: [
      'Дополнительное время на оформление',
      'Нужна не всегда — только по требованию вуза',
    ],
    note: 'Заказывайте апостиль только если университет прямо это указал в требованиях.',
  },
]

const tagColorMap = {
  success: { bg: 'bg-study-green/10', text: 'text-study-green', note: 'bg-study-green/10 text-study-green' },
  warning: { bg: 'bg-study-orange/10', text: 'text-study-orange', note: 'bg-study-orange/10 text-study-orange' },
  info:    { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-500', note: 'bg-blue-50 dark:bg-blue-500/10 text-blue-500' },
}

export default function FormatChoiceCards() {
  return (
    <div className="py-3 grid sm:grid-cols-3 gap-2.5">
      {formats.map((f, i) => {
        const { Icon } = f
        const tc = tagColorMap[f.tagColor]
        return (
          <div
            key={i}
            className={`bg-study-card rounded-xl overflow-hidden flex flex-col ${
              f.featured ? 'border-2 border-study-green' : 'border border-study-lightgray'
            }`}
          >
            <div className="px-4 pt-4 pb-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Icon className="w-5 h-5 text-study-gray shrink-0" />
                <span className="font-medium text-sm text-study-dark leading-snug">{f.title}</span>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full self-start ${tc.bg} ${tc.text}`}>
                {f.tag}
              </span>
            </div>

            <div className="px-4 pb-4 flex-1 flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                {f.pros.map((p, j) => (
                  <div key={j} className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-study-green mt-0.5 shrink-0" />
                    <span className="text-xs text-study-dark">{p}</span>
                  </div>
                ))}
                {f.cons.map((c, j) => (
                  <div key={j} className="flex items-start gap-1.5">
                    <Minus className="w-3.5 h-3.5 text-study-gray mt-0.5 shrink-0" />
                    <span className="text-xs text-study-gray">{c}</span>
                  </div>
                ))}
              </div>
              <p className={`text-xs rounded-lg px-2.5 py-2 mt-auto leading-relaxed ${tc.note}`}>
                {f.note}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
