import { X, Check } from 'lucide-react'

const examples = [
  {
    topic: 'Начало письма',
    bad: 'My name is Hanna, I am 18 years old, and I want to study in China.',
    good: 'My interest in international trade started when I saw how strongly Chinese manufacturers influence everyday business in my region.',
  },
  {
    topic: 'Почему Китай',
    bad: 'I love Chinese culture and want to study in China.',
    good: 'I want to study international trade in China because China plays a major role in global supply chains, and understanding this market from inside will help me build a career connected with Chinese companies.',
  },
  {
    topic: 'Почему этот вуз',
    bad: 'Your university is famous and has excellent teachers.',
    good: 'I am interested in your International Economics and Trade program because it combines courses in economics, business communication, and China\'s foreign trade, which matches my goal to work with Chinese companies.',
  },
]

export default function GoodBadExamples() {
  return (
    <div className="py-3 flex flex-col gap-3">
      {examples.map((ex, i) => (
        <div key={i} className="bg-study-card border border-study-lightgray rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-study-bg border-b border-study-lightgray">
            <span className="text-xs font-bold text-study-dark uppercase tracking-wide">{ex.topic}</span>
          </div>
          <div className="p-4 flex flex-col sm:grid sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-500/10 rounded-xl px-3.5 py-3">
              <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
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
