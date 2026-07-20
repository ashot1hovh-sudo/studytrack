import { Users, GraduationCap, Shuffle, Cpu } from 'lucide-react'

const types = [
  {
    icon: Users,
    title: 'Приёмная комиссия',
    desc: 'Базовые вопросы о себе, мотивации и выборе университета',
    color: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600',
    circle: 'bg-blue-100 dark:bg-blue-500/20',
  },
  {
    icon: GraduationCap,
    title: 'Профессор кафедры',
    desc: 'Академические вопросы по профильным предметам специальности',
    color: 'bg-study-brown/10 text-study-brown',
    circle: 'bg-study-brown/20',
  },
  {
    icon: Shuffle,
    title: 'Смешанное',
    desc: 'Вопросы о себе + академические вопросы от профессора',
    color: 'bg-study-orange/10 text-study-orange',
    circle: 'bg-study-orange/20',
  },
  {
    icon: Cpu,
    title: 'Интервью с ИИ',
    desc: 'Система задаёт вопросы голосом и записывает ответы',
    color: 'bg-study-green/10 text-study-green',
    circle: 'bg-study-green/20',
  },
]

export default function InterviewTypesCards() {
  return (
    <div className="py-3">
      <div className="bg-study-card border border-study-lightgray rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-study-bg border-b border-study-lightgray">
          <p className="text-sm font-semibold text-study-dark">Виды интервью</p>
          <p className="text-xs text-study-gray mt-0.5">Формат зависит от университета и программы</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-study-lightgray">
          {types.map((t, i) => {
            const Icon = t.icon
            return (
              <div key={i} className={`flex items-start gap-3 p-4 ${i >= 2 ? 'sm:border-t border-study-lightgray' : ''}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${t.circle}`}>
                  <Icon className={`w-4 h-4 ${t.color.split(' ')[1]}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-study-dark">{t.title}</p>
                  <p className="text-xs text-study-gray mt-0.5 leading-snug">{t.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
