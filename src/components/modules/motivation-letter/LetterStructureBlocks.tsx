import { Sparkles, BookOpen, Trophy, Globe, Building2, Languages, Target, CheckCircle } from 'lucide-react'

const blocks = [
  { Icon: Sparkles,    label: 'Вступление',              note: 'Главный интерес — почему привлекла выбранная сфера' },
  { Icon: BookOpen,    label: 'Академический интерес',    note: 'Предметы, навыки, учебные проекты, связь с программой' },
  { Icon: Trophy,      label: 'Достижения и опыт',        note: 'Олимпиады, конкурсы, курсы, проекты, портфолио' },
  { Icon: Globe,       label: 'Почему Китай',             note: 'Связь Китая с выбранной сферой и будущими планами' },
  { Icon: Building2,   label: 'Почему этот университет',  note: 'Программа, учебный план, возможности вуза' },
  { Icon: Languages,   label: 'Языковая подготовка',      note: 'Уровень языка, экзамены, готовность учиться' },
  { Icon: Target,      label: 'Планы после выпуска',      note: 'Как образование помогает достичь целей' },
  { Icon: CheckCircle, label: 'Заключение',               note: 'Подтверждение мотивации и интереса к программе' },
]

export default function LetterStructureBlocks() {
  return (
    <div className="py-3 flex flex-col">
      {blocks.map((b, i) => {
        const { Icon } = b
        return (
          <div key={i} className="flex gap-0">
            <div className="flex flex-col items-center w-11 shrink-0">
              <div className="w-9 h-9 rounded-full bg-study-brown/10 border border-study-brown/20 flex items-center justify-center shrink-0 z-[1]">
                <Icon className="w-4 h-4 text-study-brown" />
              </div>
              {i < blocks.length - 1 && (
                <div className="w-px flex-1 bg-study-lightgray my-1" />
              )}
            </div>
            <div className={`flex-1 pl-3 ${i < blocks.length - 1 ? 'pb-5' : ''}`}>
              <p className="font-medium text-sm text-study-dark mt-1.5 mb-0.5">{b.label}</p>
              <p className="text-xs text-study-gray">{b.note}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
