import { Building2, Users, TestTube2, UserCheck, BadgeCheck, ScanLine, Upload } from 'lucide-react'

const steps = [
  { Icon: Building2,  label: 'Клиника',          note: 'Берёте оригинальный бланк формы' },
  { Icon: Users,      label: 'Специалисты',       note: 'Каждый ставит отметку, подпись и личную печать' },
  { Icon: TestTube2,  label: 'Анализы',           note: 'ЭКГ, флюорография, анализы крови' },
  { Icon: UserCheck,  label: 'Терапевт',          note: 'Закрывает оставшиеся поля и пишет общий вывод' },
  { Icon: BadgeCheck, label: 'Общая печать',      note: 'Official Stamp клиники в конце документа' },
  { Icon: ScanLine,   label: 'Сканирование',      note: 'Все страницы + анализы в один PDF' },
  { Icon: Upload,     label: 'Загрузить в вуз',   note: 'Вместе с остальными документами пакета' },
]

export default function MedExamFlow() {
  return (
    <div className="py-3 flex flex-col">
      {steps.map((step, i) => {
        const { Icon } = step
        return (
          <div key={i} className="flex gap-0">
            <div className="flex flex-col items-center w-11 shrink-0">
              <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center shrink-0 z-[1]">
                <Icon className="w-4 h-4 text-blue-500" />
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
