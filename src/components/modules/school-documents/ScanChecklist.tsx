import { Eye, Crop, PenLine, BadgeCheck, ZoomIn, Contrast, ListOrdered, FileArchive, User, Printer } from 'lucide-react'

const items = [
  { Icon: Eye,         text: 'Текст читается' },
  { Icon: Crop,        text: 'Нет обрезанных углов' },
  { Icon: PenLine,     text: 'Видны подписи' },
  { Icon: BadgeCheck,  text: 'Видна печать' },
  { Icon: ZoomIn,      text: 'Файл не размытый' },
  { Icon: Contrast,    text: 'Нет теней и бликов' },
  { Icon: ListOrdered, text: 'Страницы в правильном порядке' },
  { Icon: FileArchive, text: 'Несколько страниц объединены в один PDF' },
  { Icon: User,        text: 'Имя совпадает с паспортом' },
  { Icon: Printer,     text: 'Документ напечатан, не написан от руки' },
]

export default function ScanChecklist() {
  return (
    <div className="py-3">
      <div className="grid sm:grid-cols-2 gap-2">
        {items.map((item, i) => {
          const { Icon } = item
          return (
            <div key={i} className="flex items-center gap-2.5 bg-white border border-study-lightgray rounded-xl px-3.5 py-2.5">
              <div className="w-7 h-7 rounded-full bg-study-green/10 flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5 text-study-green" />
              </div>
              <span className="text-xs text-study-dark">{item.text}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
