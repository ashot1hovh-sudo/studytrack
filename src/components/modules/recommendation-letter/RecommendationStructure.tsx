import { UserCircle, BookOpen, Star, CheckCircle } from 'lucide-react'

const parts = [
  {
    Icon: UserCircle,
    label: 'Вступление',
    note: 'Кто пишет письмо, как долго знает студента и по какому предмету его учил',
    color: 'blue' as const,
  },
  {
    Icon: BookOpen,
    label: 'Академическая работа',
    note: 'Как студент относится к учёбе, выполняет домашние, самостоятельные и контрольные работы',
    color: 'blue' as const,
  },
  {
    Icon: Star,
    label: 'Личностные качества',
    note: 'Примеры дисциплины, упорства, ответственности и умения справляться со сложными задачами',
    color: 'orange' as const,
  },
  {
    Icon: CheckCircle,
    label: 'Заключение',
    note: 'Итоговая фраза о готовности студента к обучению в университете',
    color: 'green' as const,
  },
]

const colorMap = {
  blue:   { circle: 'bg-blue-50 border-blue-200', icon: 'text-blue-500' },
  orange: { circle: 'bg-study-orange/10 border-study-orange/20', icon: 'text-study-orange' },
  green:  { circle: 'bg-study-green/10 border-study-green/20', icon: 'text-study-green' },
}

export default function RecommendationStructure() {
  return (
    <div className="py-3 flex flex-col">
      {parts.map((p, i) => {
        const { Icon } = p
        const c = colorMap[p.color]
        return (
          <div key={i} className="flex gap-0">
            <div className="flex flex-col items-center w-11 shrink-0">
              <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 z-[1] ${c.circle}`}>
                <Icon className={`w-4 h-4 ${c.icon}`} />
              </div>
              {i < parts.length - 1 && (
                <div className="w-px flex-1 bg-study-lightgray my-1" />
              )}
            </div>
            <div className={`flex-1 pl-3 ${i < parts.length - 1 ? 'pb-5' : ''}`}>
              <p className="font-medium text-sm text-study-dark mt-1.5 mb-0.5">{p.label}</p>
              <p className="text-xs text-study-gray">{p.note}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
