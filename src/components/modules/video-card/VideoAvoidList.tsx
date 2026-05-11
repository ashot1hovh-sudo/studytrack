import { X } from 'lucide-react'

const items = [
  'Вертикальное видео (если вуз не просит)',
  'Говорить слишком быстро',
  'Читать текст с листа так, чтобы это было видно',
  'Перегружать видео биографией',
  'Пересказывать всё мотивационное письмо',
  'Шумный фон',
  'Слишком сложный монтаж',
  'Музыка громче голоса',
  'Неуместные шутки',
  'Критика прошлой школы, страны или университета',
  'Только общие фразы: "I like China", "Your university is famous"',
]

export default function VideoAvoidList() {
  return (
    <div className="py-3">
      <div className="bg-white border border-study-lightgray rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-red-50 border-b border-red-100">
          <p className="text-sm font-semibold text-red-600">Чего не стоит делать в видео-визитке</p>
        </div>
        <div className="divide-y divide-study-lightgray">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-2.5">
              <div className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                <X className="w-3 h-3 text-red-500" />
              </div>
              <p className="text-sm text-study-dark leading-snug">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
