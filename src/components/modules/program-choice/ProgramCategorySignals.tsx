import { CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react'

const categories = [
  {
    signal: 'green' as const,
    label: 'Сильный выбор для Китая',
    Icon: CheckCircle,
    programs: [
      { name: 'Инженерия',              note: 'Самое популярное направление среди иностранных студентов' },
      { name: 'IT и технологии',        note: 'Активное развитие AI, digital economy, инженерных решений' },
      { name: 'Международная торговля', note: 'Прямая связь с китайским экспортом, логистикой, бизнесом' },
      { name: 'Business Administration',note: 'Понятный карьерный маршрут, много программ' },
      { name: 'Китайский язык',         note: 'Сильная языковая среда, широкое применение' },
      { name: 'Логистика',              note: 'Практика рядом — порты, торговые зоны, компании' },
    ],
  },
  {
    signal: 'yellow' as const,
    label: 'Выбирать внимательно',
    Icon: AlertTriangle,
    programs: [
      { name: 'Финансы / Бухучёт',     note: 'Хороший выбор, но нужно проверить признание диплома' },
      { name: 'Перевод',               note: 'Зависит от качества программы и языка обучения' },
      { name: 'Медицина',              note: 'Требует проверки языка, длительности и признания диплома' },
      { name: 'Дизайн / Архитектура', note: 'Может стоить дороже, нужно проверять портфолио и перспективы' },
    ],
  },
  {
    signal: 'red' as const,
    label: 'Требует чёткого понимания зачем',
    Icon: AlertCircle,
    programs: [
      { name: 'Международные отношения', note: 'Подача с государственной позиции, ограниченная карьера вне Китая' },
      { name: 'Творческие направления',  note: 'Высокая стоимость, культурный контекст, сложные перспективы' },
    ],
  },
]

const config = {
  green:  { header: 'bg-study-green/10',  icon: 'text-study-green',  note: 'bg-study-green/10 text-study-green' },
  yellow: { header: 'bg-study-orange/10', icon: 'text-study-orange', note: 'bg-study-orange/10 text-study-orange' },
  red:    { header: 'bg-red-50',          icon: 'text-red-500',      note: 'bg-red-50 text-red-600' },
}

export default function ProgramCategorySignals() {
  return (
    <div className="space-y-3 py-2">
      {categories.map((cat, ci) => {
        const { Icon } = cat
        const c = config[cat.signal]
        return (
          <div key={ci} className="rounded-xl border border-study-lightgray overflow-hidden">
            <div className={`${c.header} px-4 py-3 flex items-center gap-2`}>
              <Icon className={`w-5 h-5 ${c.icon} shrink-0`} />
              <span className={`font-semibold text-sm ${c.icon}`}>{cat.label}</span>
            </div>
            <div className="px-4 py-3 space-y-2.5 bg-white">
              {cat.programs.map((prog, pi) => (
                <div key={pi} className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
                  <span className="font-semibold text-sm text-study-dark shrink-0 min-w-[160px]">
                    {prog.name}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-lg leading-relaxed ${c.note}`}>
                    {prog.note}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
