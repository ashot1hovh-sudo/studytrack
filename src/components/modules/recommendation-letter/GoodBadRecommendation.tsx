import { X, Check } from 'lucide-react'

export default function GoodBadRecommendation() {
  return (
    <div className="py-3 grid sm:grid-cols-2 gap-3">
      <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
            <X className="w-3 h-3 text-red-500" />
          </div>
          <span className="text-xs font-bold text-red-600 uppercase tracking-wide">Плохая рекомендация</span>
        </div>
        <p className="text-sm text-red-700 italic leading-relaxed">
          "Студент хороший, ответственный, рекомендую."
        </p>
        <p className="text-xs text-red-400 mt-auto">Нет конкретики — непонятно, чем студент выделяется</p>
      </div>

      <div className="bg-study-green/10 border border-study-green/20 rounded-xl p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-study-green/20 flex items-center justify-center shrink-0">
            <Check className="w-3 h-3 text-study-green" />
          </div>
          <span className="text-xs font-bold text-study-green uppercase tracking-wide">Хорошая рекомендация</span>
        </div>
        <p className="text-sm text-study-dark italic leading-relaxed">
          "Студент проявил упорство при изучении сложной темы, приходил на дополнительные консультации, улучшил результат и показал способность работать над ошибками."
        </p>
        <p className="text-xs text-study-gray mt-auto">Конкретная ситуация + поведение + результат</p>
      </div>
    </div>
  )
}
