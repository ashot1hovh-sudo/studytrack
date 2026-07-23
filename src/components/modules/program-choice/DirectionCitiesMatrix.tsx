import { Briefcase, Cpu, Settings, Languages, Truck, Palette } from 'lucide-react'

const data = [
  { direction: 'Торговля и бизнес',    Icon: Briefcase, cities: ['Гуанчжоу', 'Шанхай', 'Шэньчжэнь', 'Иу'],       why: 'Выставки, торговые компании, логистика' },
  { direction: 'IT и технологии',       Icon: Cpu,       cities: ['Шэньчжэнь', 'Ханчжоу', 'Пекин', 'Шанхай'],     why: 'Технопарки, стартапы, крупные IT-компании' },
  { direction: 'Инженерия',             Icon: Settings,  cities: ['Харбин', 'Нанкин', 'Уханъ', 'Сиань'],           why: 'Производство, заводы, технические вузы' },
  { direction: 'Китайский язык',        Icon: Languages, cities: ['Пекин', 'Шанхай', 'Харбин', 'Нанкин'],          why: 'Сильная языковая среда, педагогические вузы' },
  { direction: 'Логистика',             Icon: Truck,     cities: ['Шанхай', 'Гуанчжоу', 'Тяньцзинь', 'Циндао'],   why: 'Порты, транспортные узлы, торговые зоны' },
  { direction: 'Дизайн / Архитектура', Icon: Palette,   cities: ['Шанхай', 'Пекин', 'Гуанчжоу', 'Ханчжоу'],      why: 'Городская среда, проекты, портфолио' },
]

const cityColors: Record<string, string> = {
  'Шанхай':     '#4A90D9',
  'Пекин':      '#7B68EE',
  'Гуанчжоу':  '#E8944A',
  'Шэньчжэнь': '#52B788',
  'Ханчжоу':   '#F4A261',
  'Харбин':    '#6BB5C8',
  'Нанкин':    '#C77DFF',
  'Иу':        '#E76F51',
  'Уханъ':     '#84A98C',
  'Сиань':     '#D4A373',
  'Тяньцзинь': '#5FA8D3',
  'Циндао':    '#48CAE4',
}

/**
 * Read-only reference: which Chinese cities are strongest for which field.
 *
 * The cards used to be clickable and drew a border on the selected one, but
 * selecting did nothing at all — the caption told you to highlight a card and
 * the highlight led nowhere. A control that looks interactive and isn't reads
 * as broken, so this is now plainly a table of information.
 */
export default function DirectionCitiesMatrix() {
  return (
    <div className="py-2">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.map((item, i) => {
          const { Icon } = item
          return (
            <div
              key={i}
              className="bg-study-card rounded-xl p-4 border border-study-lightgray"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-study-gray shrink-0" />
                <span className="font-semibold text-sm text-study-dark">{item.direction}</span>
              </div>
              <p className="text-xs text-study-gray mb-3">{item.why}</p>
              <div className="flex flex-wrap gap-1.5">
                {item.cities.map((city, j) => {
                  const color = cityColors[city] ?? '#888'
                  return (
                    <span
                      key={j}
                      className="text-xs font-medium px-2.5 py-0.5 rounded-full"
                      style={{ background: color + '22', color, border: `1px solid ${color}55` }}
                    >
                      {city}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-study-gray mt-3">
        Города, где направление представлено сильнее всего: больше профильных вузов,
        стажировок и работодателей рядом.
      </p>
    </div>
  )
}
