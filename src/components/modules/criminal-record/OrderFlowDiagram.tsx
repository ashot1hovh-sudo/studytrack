import { Laptop, Bot, ClipboardCheck, Clock, CheckCircle, Scan, Upload } from 'lucide-react'

const steps = [
  { Icon: Laptop,        label: 'Госуслуги',              note: 'Войдите в аккаунт' },
  { Icon: Bot,           label: 'Чат с помощником',       note: 'Напишите "справка о несудимости"' },
  { Icon: ClipboardCheck,label: 'Выбрать формат',          note: 'Бумажная, электронная или с апостилем' },
  { Icon: Clock,         label: 'Дождаться готовности',   note: 'До 30 календарных дней' },
  { Icon: CheckCircle,   label: 'Проверить данные',        note: 'Имя, дата, печать' },
  { Icon: Scan,          label: 'Отсканировать',           note: 'Сохранить в PDF' },
  { Icon: Upload,        label: 'Загрузить в вуз',         note: 'С переводом, если требуется' },
]

export default function OrderFlowDiagram() {
  return (
    <div className="py-3 flex flex-col">
      {steps.map((step, i) => {
        const { Icon } = step
        return (
          <div key={i} className="flex gap-0">
            <div className="flex flex-col items-center w-11 shrink-0">
              <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0 z-[1]">
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
