import { X, Check } from 'lucide-react'

const examples = [
  {
    topic: 'Репетиторство',
    bad: 'Helped students with English.',
    good: 'Tutored 3 students in English and helped one of them improve from grade 3 to grade 5 within one semester.',
  },
  {
    topic: 'Школьный проект',
    bad: 'Participated in a school project.',
    good: 'Conducted a survey of 120 students and presented the results in a 15-slide presentation.',
  },
  {
    topic: 'Спорт',
    bad: 'Was involved in sports.',
    good: 'Trained 12 hours per week for 6 years and participated in regional competitions.',
  },
]

export default function ResultExamples() {
  return (
    <div className="py-3 flex flex-col gap-3">
      {examples.map((ex, i) => (
        <div key={i} className="bg-white border border-study-lightgray rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-study-bg border-b border-study-lightgray">
            <span className="text-xs font-bold text-study-dark uppercase tracking-wide">{ex.topic}</span>
          </div>
          <div className="p-4 flex flex-col sm:grid sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-2.5 bg-red-50 rounded-xl px-3.5 py-3">
              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                <X className="w-3 h-3 text-red-500" />
              </div>
              <p className="text-xs text-red-700 leading-relaxed italic">"{ex.bad}"</p>
            </div>
            <div className="flex items-start gap-2.5 bg-study-green/10 rounded-xl px-3.5 py-3">
              <div className="w-5 h-5 rounded-full bg-study-green/20 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-study-green" />
              </div>
              <p className="text-xs text-study-dark leading-relaxed italic">"{ex.good}"</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
