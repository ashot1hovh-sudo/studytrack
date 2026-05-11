import { Eye, Mic, Layers, Move, Heart, Activity, Wind, Droplet, Stethoscope } from 'lucide-react'

const doctors = [
  {
    Icon: Eye,
    name: 'Окулист',
    fields: ['Vision', 'Corrected vision', 'Eyes', 'Colour sense'],
    color: 'blue' as const,
  },
  {
    Icon: Mic,
    name: 'ЛОР',
    fields: ['Ears', 'Nose', 'Tonsils'],
    color: 'blue' as const,
  },
  {
    Icon: Layers,
    name: 'Дерматолог',
    fields: ['Skin', 'Lymph nodes'],
    color: 'blue' as const,
  },
  {
    Icon: Move,
    name: 'Ортопед',
    fields: ['Spine', 'Extremities', 'Development'],
    color: 'blue' as const,
  },
  {
    Icon: Heart,
    name: 'Кардиолог',
    fields: ['Heart', 'Blood pressure', 'ECG'],
    color: 'red' as const,
  },
  {
    Icon: Activity,
    name: 'УЗИ брюшной полости',
    fields: ['Abdomen'],
    color: 'blue' as const,
  },
  {
    Icon: Wind,
    name: 'Флюорография',
    fields: ['Chest X-ray exam'],
    color: 'blue' as const,
  },
  {
    Icon: Droplet,
    name: 'Анализы крови',
    fields: ['AIDS', 'Syphilis', 'Hepatitis B/C'],
    color: 'blue' as const,
  },
  {
    Icon: Stethoscope,
    name: 'Терапевт',
    fields: ['Nourishment', 'Neck', 'Lungs', 'Nervous system', 'общий вывод'],
    color: 'green' as const,
  },
]

const colorMap = {
  blue:  { circle: 'bg-blue-50 border-blue-200', icon: 'text-blue-500', tag: 'bg-blue-50 text-blue-500' },
  red:   { circle: 'bg-red-50 border-red-200', icon: 'text-red-500', tag: 'bg-red-50 text-red-500' },
  green: { circle: 'bg-study-green/10 border-study-green/20', icon: 'text-study-green', tag: 'bg-study-green/10 text-study-green' },
}

export default function DoctorsTable() {
  return (
    <div className="py-3 grid sm:grid-cols-2 gap-2.5">
      {doctors.map((d, i) => {
        const { Icon } = d
        const c = colorMap[d.color]
        return (
          <div key={i} className="bg-white border border-study-lightgray rounded-xl flex items-start gap-3 px-4 py-3">
            <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${c.circle}`}>
              <Icon className={`w-4 h-4 ${c.icon}`} />
            </div>
            <div className="flex flex-col gap-1.5 min-w-0">
              <p className="text-sm font-medium text-study-dark">{d.name}</p>
              <div className="flex flex-wrap gap-1">
                {d.fields.map((f, j) => (
                  <span key={j} className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.tag}`}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
