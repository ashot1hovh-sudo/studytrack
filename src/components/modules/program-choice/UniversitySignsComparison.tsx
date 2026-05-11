import { CheckCircle, AlertCircle, Check, X } from 'lucide-react'

const goodSigns = [
  'Быстро отвечает на письма',
  'Понятно объясняет требования',
  'Присылает актуальные документы',
  'Помогает разобраться с порталом',
  'Даёт контакты international office',
  'Честно отвечает на вопросы',
  'Объясняет общежитие, визу, оплату и регистрацию',
]

const badSigns = [
  'Долго не отвечает',
  'Присылает противоречивую информацию',
  'Не может объяснить требования',
  'Не даёт учебный план',
  'Не отвечает на вопросы про иностранцев',
  'Меняет условия без объяснений',
  'Отправляет искать всё самостоятельно',
]

export default function UniversitySignsComparison() {
  return (
    <div className="grid sm:grid-cols-2 gap-3 py-2">
      <div className="rounded-xl border border-study-lightgray overflow-hidden">
        <div className="bg-study-green/10 px-4 py-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-study-green shrink-0" />
          <span className="font-semibold text-sm text-study-green">Хороший знак</span>
        </div>
        <ul className="px-4 py-3 space-y-2 bg-white">
          {goodSigns.map((sign, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-study-dark">
              <Check className="w-4 h-4 text-study-green mt-0.5 shrink-0" />
              {sign}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-study-lightgray overflow-hidden">
        <div className="bg-red-50 px-4 py-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span className="font-semibold text-sm text-red-500">Плохой знак</span>
        </div>
        <ul className="px-4 py-3 space-y-2 bg-white">
          {badSigns.map((sign, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-study-dark">
              <X className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              {sign}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
