import { Printer, CreditCard, ShieldCheck, Stethoscope, User } from 'lucide-react'

const rules = [
  {
    Icon: Printer,
    color: 'info' as const,
    title: 'Только печатный формат',
    text: 'Документы, заполненные от руки, университет может не принять. Всё — в печатной версии с подписью и печатью.',
  },
  {
    Icon: CreditCard,
    color: 'warning' as const,
    title: 'Паспорт — на весь срок бакалавриата',
    text: 'Если паспорт скоро заканчивается — сначала оформите новый. Менять данные после подачи неудобно.',
  },
  {
    Icon: ShieldCheck,
    color: 'danger' as const,
    title: 'Справку о несудимости заказывайте заранее',
    text: 'Сроки изготовления сильно разнятся: через Госуслуги её иногда делают за несколько дней, но официально это может занять до 30 дней. Ориентир — заказать примерно за 2 месяца до дедлайна, с запасом. При этом справка действует 6 месяцев, поэтому слишком рано брать её тоже не стоит.',
  },
  {
    Icon: Stethoscope,
    color: 'danger' as const,
    title: 'Медицинская форма — срок 6 месяцев',
    text: 'Не делайте слишком рано. Форма должна быть актуальна на момент подачи и приезда.',
  },
  {
    Icon: User,
    color: 'info' as const,
    title: 'Имя во всех документах должно совпадать',
    text: 'Если в паспорте и аттестате разные данные — нужен документ, подтверждающий смену ФИО.',
  },
]

const colorMap = {
  danger: { circle: 'bg-red-50 dark:bg-red-500/10', icon: 'text-red-500' },
  warning: { circle: 'bg-study-orange/10', icon: 'text-study-orange' },
  info:    { circle: 'bg-blue-50 dark:bg-blue-500/10', icon: 'text-blue-500' },
}

export default function ImportantRulesCards() {
  return (
    <div className="py-3 flex flex-col gap-2.5">
      {rules.map((r, i) => {
        const { Icon } = r
        const c = colorMap[r.color]
        return (
          <div key={i} className="bg-study-card border border-study-lightgray rounded-xl px-5 py-3.5 flex items-start gap-3">
            <div className={`w-9 h-9 rounded-full ${c.circle} flex items-center justify-center shrink-0`}>
              <Icon className={`w-4 h-4 ${c.icon}`} />
            </div>
            <div>
              <p className="font-medium text-sm text-study-dark mb-0.5">{r.title}</p>
              <p className="text-xs text-study-gray leading-relaxed">{r.text}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
