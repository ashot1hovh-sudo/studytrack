import { HelpCircle } from 'lucide-react'

const questions = [
  'Почему вы выбрали эту специальность?',
  'Почему хотите учиться именно в Китае?',
  'Почему выбрали этот университет?',
  'Почему вы справитесь с программой?',
  'Как вы планируете использовать образование после выпуска?',
]

export default function FiveQuestionsCard() {
  return (
    <div className="py-3">
      <div className="bg-white border border-study-lightgray rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-study-brown/10 border-b border-study-brown/20">
          <p className="text-sm font-semibold text-study-brown">5 вопросов, на которые отвечает хорошее письмо</p>
        </div>
        <div className="divide-y divide-study-lightgray">
          {questions.map((q, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3">
              <div className="w-6 h-6 rounded-full bg-study-brown/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-study-brown">{i + 1}</span>
              </div>
              <p className="text-sm text-study-dark leading-snug pt-0.5">{q}</p>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 bg-study-bg border-t border-study-lightgray flex items-start gap-2">
          <HelpCircle className="w-4 h-4 text-study-gray shrink-0 mt-0.5" />
          <p className="text-xs text-study-gray leading-relaxed">
            Если после прочтения письма на эти вопросы нет ответа — письмо нужно доработать.
          </p>
        </div>
      </div>
    </div>
  )
}
