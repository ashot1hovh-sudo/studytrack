import { CheckCircle, AlertTriangle, AlertCircle, Circle } from 'lucide-react'

const profiles = [
  {
    level: 'Сильный профиль',
    Icon: CheckCircle,
    color: 'success' as const,
    outcome: 'Топовые университеты и гранты',
    criteria: [
      'Средний балл 4.5 / 5 и выше',
      'Сильные оценки по профильным предметам',
      'Высокий HSK или IELTS / Duolingo',
      'Хорошие результаты CSCA',
      'Есть профильные достижения',
      'Подготовка началась заранее',
    ],
  },
  {
    level: 'Средний профиль',
    Icon: AlertTriangle,
    color: 'warning' as const,
    outcome: 'Платное поступление, часть вузов — грант с усилением',
    criteria: [
      'Средний балл около 4.0–4.4 / 5',
      'Профильные предметы не провальные',
      'Язык есть, но не максимальный',
      'CSCA не сдан или результат средний',
      'Достижений мало или не профильные',
    ],
  },
  {
    level: 'Рискованный профиль',
    Icon: AlertCircle,
    color: 'danger' as const,
    outcome: 'Нужно усилить профиль или выбрать реалистичные варианты',
    criteria: [
      'Средний балл ниже 4.0 / 5',
      'Слабые профильные предметы',
      'Нет языкового сертификата',
      'Нет результатов CSCA',
      'Нет профильных достижений',
      'Подготовка началась поздно',
    ],
  },
]

const colorMap = {
  success: { header: 'bg-study-green/10', icon: 'text-study-green', text: 'text-study-green', dot: 'text-study-green' },
  warning: { header: 'bg-study-orange/10', icon: 'text-study-orange', text: 'text-study-orange', dot: 'text-study-orange' },
  danger:  { header: 'bg-red-50 dark:bg-red-500/10', icon: 'text-red-500', text: 'text-red-500', dot: 'text-red-500' },
}

export default function ProfileLevelCards() {
  return (
    <div className="py-3 flex flex-col gap-3">
      {profiles.map((p, i) => {
        const { Icon } = p
        const c = colorMap[p.color]
        return (
          <div key={i} className="bg-study-card border border-study-lightgray rounded-xl overflow-hidden">
            <div className={`${c.header} px-5 py-3 flex items-start gap-2.5`}>
              <Icon className={`w-5 h-5 ${c.icon} shrink-0 mt-0.5`} />
              <div>
                <p className={`font-medium text-sm ${c.text}`}>{p.level}</p>
                <p className={`text-xs ${c.text}`}>{p.outcome}</p>
              </div>
            </div>
            <ul className="px-5 py-3 flex flex-col gap-1.5">
              {p.criteria.map((criterion, j) => (
                <li key={j} className="flex items-start gap-2 text-xs text-study-dark">
                  <Circle className={`w-2 h-2 ${c.dot} fill-current mt-1 shrink-0`} />
                  {criterion}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
