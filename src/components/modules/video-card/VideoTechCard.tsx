import { Monitor, Sun, Mic, Gauge, ImageOff, Shirt, CameraOff, Volume2 } from 'lucide-react'

const requirements = [
  { Icon: Monitor,  text: 'Горизонтальное видео' },
  { Icon: Sun,      text: 'Хорошее освещение' },
  { Icon: Mic,      text: 'Хороший звук' },
  { Icon: Gauge,    text: 'Хорошее качество' },
  { Icon: ImageOff, text: 'Нейтральный фон' },
  { Icon: Shirt,    text: 'Аккуратная одежда' },
  { Icon: CameraOff,text: 'Без трясущейся камеры' },
  { Icon: Volume2,  text: 'Без шума на фоне' },
]

export default function VideoTechCard() {
  return (
    <div className="py-3 flex flex-col gap-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {requirements.map((r, i) => {
          const { Icon } = r
          return (
            <div key={i} className="bg-study-card border border-study-lightgray rounded-xl flex flex-col items-center gap-2 px-3 py-3 text-center">
              <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-xs text-study-dark leading-tight">{r.text}</span>
            </div>
          )
        })}
      </div>
      <div className="bg-study-brown/10 border border-study-brown/20 rounded-xl px-4 py-3 text-center">
        <p className="text-sm font-semibold text-study-brown">Длительность: 1–2 минуты</p>
        <p className="text-xs text-study-gray mt-0.5">Монтаж разрешается — склейка, вырезка пауз, субтитры</p>
      </div>
    </div>
  )
}
