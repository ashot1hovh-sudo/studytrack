import { User, Lightbulb, Globe, Trophy, Target, Heart } from 'lucide-react'

const steps = [
  { Icon: User,      label: 'Представиться',                 note: 'Имя, страна, программа, университет' },
  { Icon: Lightbulb, label: 'Почему это направление',        note: '1–2 предложения о вашем академическом интересе' },
  { Icon: Globe,     label: 'Почему Китай и этот вуз',       note: 'Связь выбора с вашими целями — не случайно' },
  { Icon: Trophy,    label: 'Сильные стороны',               note: 'Учёба, предметы, проекты, конкурсы, языковая подготовка' },
  { Icon: Target,    label: 'Планы после обучения',          note: 'Как хотите использовать полученные знания' },
  { Icon: Heart,     label: 'Благодарность',                 note: '"Thank you for watching. I hope to meet you on campus soon."' },
]

export default function VideoScriptFlow() {
  return (
    <div className="py-3 flex flex-col">
      {steps.map((step, i) => {
        const { Icon } = step
        return (
          <div key={i} className="flex gap-0">
            <div className="flex flex-col items-center w-11 shrink-0">
              <div className="w-9 h-9 rounded-full bg-study-brown/10 border border-study-brown/20 flex items-center justify-center shrink-0 z-[1]">
                <Icon className="w-4 h-4 text-study-brown" />
              </div>
              {i < steps.length - 1 && (
                <div className="w-px flex-1 bg-study-lightgray my-1" />
              )}
            </div>
            <div className={`flex-1 pl-3 ${i < steps.length - 1 ? 'pb-5' : ''}`}>
              <p className="font-medium text-sm text-study-dark mt-1.5 mb-0.5">{step.label}</p>
              <p className="text-xs text-study-gray">{step.note}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
