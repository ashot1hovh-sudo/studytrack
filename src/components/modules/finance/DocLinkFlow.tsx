import { User, FileSignature, Landmark, Upload } from 'lucide-react'

const steps = [
  {
    icon: User,
    label: 'Спонсор',
    note: 'Мама, папа или другой родственник',
    color: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600',
    circle: 'bg-blue-100 dark:bg-blue-500/20',
  },
  {
    icon: FileSignature,
    label: 'Financial Guarantee',
    note: 'Спонсор подписывает документ',
    color: 'bg-study-brown/10 text-study-brown',
    circle: 'bg-study-brown/20',
  },
  {
    icon: Landmark,
    label: 'Bank Statement',
    note: 'Оформляется на имя того же спонсора',
    color: 'bg-study-green/10 text-study-green',
    circle: 'bg-study-green/20',
  },
  {
    icon: Upload,
    label: 'Загрузка в портал',
    note: 'Оба документа подаются вместе',
    color: 'bg-study-orange/10 text-study-orange',
    circle: 'bg-study-orange/20',
  },
]

export default function DocLinkFlow() {
  return (
    <div className="py-3">
      <div className="bg-study-card border border-study-lightgray rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-study-bg border-b border-study-lightgray">
          <p className="text-sm font-semibold text-study-dark">Как связаны документы</p>
          <p className="text-xs text-study-gray mt-0.5">Спонсор должен быть одним и тем же человеком в обоих документах</p>
        </div>
        <div className="p-4 flex flex-col sm:flex-row items-center gap-2">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={i} className="flex sm:flex-col items-center gap-2 sm:gap-0 w-full sm:flex-1">
                <div className="flex sm:flex-col items-center gap-2 sm:gap-1 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${step.circle}`}>
                    <Icon className={`w-5 h-5 ${step.color.split(' ')[1]}`} />
                  </div>
                  <div className="sm:text-center">
                    <p className="text-xs font-semibold text-study-dark leading-tight">{step.label}</p>
                    <p className="text-xs text-study-gray mt-0.5 leading-tight">{step.note}</p>
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <span className="text-study-gray font-bold sm:hidden">→</span>
                )}
                {i < steps.length - 1 && (
                  <div className="hidden sm:flex w-full justify-center my-2">
                    <span className="text-study-brown font-bold text-lg">↓</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="mx-4 mb-4 bg-study-orange/10 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-study-orange">Важно</p>
          <p className="text-xs text-study-dark mt-0.5">Имя спонсора в Financial Guarantee и имя владельца счёта в Bank Statement должны совпадать.</p>
        </div>
      </div>
    </div>
  )
}
