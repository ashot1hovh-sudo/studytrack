import { GraduationCap, Home, ShoppingBag, Shield, PlusCircle } from 'lucide-react'

const items = [
  { icon: GraduationCap, label: 'Обучение (1 год)',   range: '$2 000 – $4 000',  color: 'bg-blue-50 text-blue-600',         circle: 'bg-blue-100' },
  { icon: Home,          label: 'Общежитие (1 год)',  range: '$1 200 – $2 400',  color: 'bg-study-green/10 text-study-green', circle: 'bg-study-green/20' },
  { icon: ShoppingBag,   label: 'Расходы на жизнь',  range: '$1 500 – $2 500',  color: 'bg-study-orange/10 text-study-orange', circle: 'bg-study-orange/20' },
  { icon: Shield,        label: 'Страховка',          range: '$200 – $400',      color: 'bg-purple-50 text-purple-600',       circle: 'bg-purple-100' },
]

export default function AmountGuideCard() {
  return (
    <div className="py-3">
      <div className="bg-white border border-study-lightgray rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-study-bg border-b border-study-lightgray">
          <p className="text-sm font-semibold text-study-dark">Из чего складывается нужная сумма</p>
          <p className="text-xs text-study-gray mt-0.5">Ориентировочно — точную цифру проверяйте в требованиях вуза</p>
        </div>
        <div className="divide-y divide-study-lightgray">
          {items.map((item, i) => {
            const Icon = item.icon
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${item.circle}`}>
                  <Icon className={`w-4 h-4 ${item.color.split(' ')[1]}`} />
                </div>
                <p className="text-sm text-study-dark flex-1">{item.label}</p>
                <span className="text-sm font-semibold text-study-dark whitespace-nowrap">{item.range}</span>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-3 px-4 py-3 bg-study-brown/5 border-t border-study-lightgray">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-study-brown/20">
            <PlusCircle className="w-4 h-4 text-study-brown" />
          </div>
          <p className="text-sm font-bold text-study-dark flex-1">Итого (ориентир)</p>
          <span className="text-sm font-bold text-study-brown whitespace-nowrap">$5 000 – $7 000+</span>
        </div>
        <div className="px-4 py-3 border-t border-study-lightgray">
          <p className="text-xs text-study-gray">Справка может быть в любой валюте — рублях, юанях, долларах. Главное, чтобы сумма соответствовала нужному бюджету в пересчёте.</p>
        </div>
      </div>
    </div>
  )
}
