import { Mic, MessageSquare, FileCheck, BookOpen, Video } from 'lucide-react'

const steps = [
  {
    icon: Mic,
    title: 'Рассказ о себе',
    note: '40–60 секунд: кто вы, откуда, почему эта программа и Китай',
    color: 'text-blue-600',
    circle: 'bg-blue-100',
  },
  {
    icon: MessageSquare,
    title: 'Ответы на базовые вопросы',
    note: 'Почему Китай, почему этот вуз, почему эта специальность, планы после выпуска',
    color: 'text-study-brown',
    circle: 'bg-study-brown/20',
  },
  {
    icon: FileCheck,
    title: 'Сверьтесь с заявкой',
    note: 'Ответы должны совпадать с мотивационным письмом, резюме и видео-визиткой',
    color: 'text-study-orange',
    circle: 'bg-study-orange/20',
  },
  {
    icon: BookOpen,
    title: 'Повторите теорию',
    note: 'Базовые темы по специальности — на случай вопросов от профессора',
    color: 'text-purple-600',
    circle: 'bg-purple-100',
  },
  {
    icon: Video,
    title: 'Пробный прогон',
    note: 'Ответьте вслух — запишите себя или попрактикуйтесь с кем-то',
    color: 'text-study-green',
    circle: 'bg-study-green/20',
  },
]

export default function InterviewPrepFlow() {
  return (
    <div className="py-3">
      <div className="bg-white border border-study-lightgray rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-study-bg border-b border-study-lightgray">
          <p className="text-sm font-semibold text-study-dark">5 шагов подготовки</p>
          <p className="text-xs text-study-gray mt-0.5">Пройдите все шаги перед днём интервью</p>
        </div>
        <div className="divide-y divide-study-lightgray">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${step.circle}`}>
                  <Icon className={`w-4 h-4 ${step.color}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-study-gray">{i + 1}</span>
                    <p className="text-sm font-semibold text-study-dark">{step.title}</p>
                  </div>
                  <p className="text-xs text-study-gray mt-0.5 leading-snug">{step.note}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
