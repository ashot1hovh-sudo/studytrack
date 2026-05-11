import {
  Play, Clock, Send,
  CreditCard, ShieldCheck, FileText, GraduationCap,
  Camera, Stethoscope, Landmark, Languages,
  PenLine, Video, UserCheck, ClipboardList,
} from 'lucide-react'

const phases = [
  {
    phase: 'Сначала',
    Icon: Play,
    color: 'danger' as const,
    note: 'Документы с длинным сроком изготовления',
    items: [
      { Icon: CreditCard,  text: 'Проверить загранпаспорт' },
      { Icon: ShieldCheck, text: 'Заказать справку о несудимости' },
      { Icon: FileText,    text: 'Запросить оценки за 10–11 класс или колледж' },
      { Icon: GraduationCap, text: 'Получить справку из школы / колледжа (если ещё учится)' },
    ],
  },
  {
    phase: 'Потом',
    Icon: Clock,
    color: 'warning' as const,
    note: 'Документы со сроком действия 6 месяцев',
    items: [
      { Icon: Camera,      text: 'Подготовить фото' },
      { Icon: Stethoscope, text: 'Пройти медицинское обследование' },
      { Icon: Landmark,    text: 'Сделать банковскую выписку' },
      { Icon: Languages,   text: 'Подготовить переводы документов, если нужны' },
    ],
  },
  {
    phase: 'После этого',
    Icon: Send,
    color: 'success' as const,
    note: 'Финальные шаги перед подачей',
    items: [
      { Icon: PenLine,      text: 'Написать мотивационное письмо' },
      { Icon: Video,        text: 'Подготовить видео-визитку' },
      { Icon: UserCheck,    text: 'Запросить рекомендательные письма' },
      { Icon: ClipboardList,text: 'Заполнить онлайн-заявку на портале университета' },
    ],
  },
]

const colorMap = {
  danger:  { circle: 'bg-red-50 border-red-200', icon: 'text-red-500' },
  warning: { circle: 'bg-study-orange/10 border-study-orange/20', icon: 'text-study-orange' },
  success: { circle: 'bg-study-green/10 border-study-green/20', icon: 'text-study-green' },
}

export default function PreparationTimeline() {
  return (
    <div className="py-3 flex flex-col">
      {phases.map((p, pi) => {
        const { Icon } = p
        const c = colorMap[p.color]
        return (
          <div key={pi} className="flex gap-0">
            <div className="flex flex-col items-center w-10 shrink-0">
              <div className={`w-9 h-9 rounded-full border ${c.circle} flex items-center justify-center shrink-0 z-[1]`}>
                <Icon className={`w-4 h-4 ${c.icon}`} />
              </div>
              {pi < phases.length - 1 && (
                <div className="w-px flex-1 bg-study-lightgray my-1" />
              )}
            </div>

            <div className={`flex-1 pl-4 ${pi < phases.length - 1 ? 'pb-6' : ''}`}>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-medium text-sm text-study-dark">{p.phase}</span>
                <span className="text-xs text-study-gray">{p.note}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {p.items.map((item, ii) => {
                  const { Icon: ItemIcon } = item
                  return (
                    <div key={ii} className="flex items-center gap-2">
                      <ItemIcon className="w-4 h-4 text-study-gray shrink-0" />
                      <span className="text-xs text-study-dark">{item.text}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
