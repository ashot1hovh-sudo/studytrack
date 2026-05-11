import { ArrowRight, Clock, Check } from 'lucide-react'

const paths = [
  {
    title: 'Иди сразу на бакалавриат',
    Icon: ArrowRight,
    color: 'success' as const,
    condition: 'Подходит, если вы успеваете собрать нужный профиль',
    items: [
      'Подходящий средний балл',
      'Хорошие профильные предметы',
      'Нужный HSK или IELTS / Duolingo',
      'Нужные баллы CSCA',
      'Готовые документы',
      'Достаточно времени до дедлайна',
    ],
    footer: 'Если вы проходите по требованиям — нет смысла терять год',
  },
  {
    title: 'Взять паузу и усилить профиль',
    Icon: Clock,
    color: 'warning' as const,
    condition: 'Имеет смысл, если текущий профиль сильно не дотягивает',
    items: [
      'Gap year — пересдать экзамены, усилить профиль',
      'Языковой год — подтянуть HSK или английский',
      'Foundation / предвузовская подготовка',
      'Подготовиться к более сильной подаче в следующем цикле',
    ],
    footer: 'Сильный университет через год лучше, чем слабый прямо сейчас',
  },
]

const colorMap = {
  success: { header: 'bg-study-green/10', icon: 'text-study-green', footer: 'bg-study-green/10 text-study-green' },
  warning: { header: 'bg-study-orange/10', icon: 'text-study-orange', footer: 'bg-study-orange/10 text-study-orange' },
}

export default function BachelorOrGapYear() {
  return (
    <div className="py-3 grid sm:grid-cols-2 gap-3">
      {paths.map((p, i) => {
        const { Icon } = p
        const c = colorMap[p.color]
        return (
          <div key={i} className="bg-white border border-study-lightgray rounded-xl overflow-hidden flex flex-col">
            <div className={`${c.header} px-5 py-3 flex items-center gap-2`}>
              <Icon className={`w-4 h-4 ${c.icon} shrink-0`} />
              <span className={`font-medium text-sm ${c.icon}`}>{p.title}</span>
            </div>
            <div className="px-5 py-3 flex-1 flex flex-col gap-3">
              <p className="text-xs text-study-gray">{p.condition}</p>
              <ul className="flex flex-col gap-1.5">
                {p.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-xs text-study-dark">
                    <Check className={`w-3.5 h-3.5 ${c.icon} mt-0.5 shrink-0`} />
                    {item}
                  </li>
                ))}
              </ul>
              <p className={`text-xs font-medium ${c.footer} rounded-lg px-2.5 py-1.5 mt-auto`}>
                {p.footer}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
