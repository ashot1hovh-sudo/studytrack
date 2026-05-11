'use client'
import { useState } from 'react'
import { CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react'

const fields = [
  { key: 'gpa',             label: 'Средний балл',            placeholder: 'напр. 4.3 / 5' },
  { key: 'grade10',         label: 'Оценки за 10 класс',      placeholder: 'напр. хорошие / отличные' },
  { key: 'grade11',         label: 'Оценки за 11 класс',      placeholder: 'напр. хорошие / отличные' },
  { key: 'profile_subjects',label: 'Профильные предметы',     placeholder: 'напр. математика 5, физика 4' },
  { key: 'hsk',             label: 'HSK',                     placeholder: 'напр. HSK 4, 210 баллов' },
  { key: 'english',         label: 'IELTS / TOEFL / Duolingo',placeholder: 'напр. IELTS 6.5' },
  { key: 'csca_math',       label: 'CSCA Math',               placeholder: 'напр. 82 / 100' },
  { key: 'csca_physics',    label: 'CSCA Physics',            placeholder: 'напр. 78 / 100' },
  { key: 'csca_chemistry',  label: 'CSCA Chemistry',          placeholder: 'напр. нет' },
  { key: 'csca_chinese',    label: 'CSCA Chinese',            placeholder: 'напр. нет' },
  { key: 'olympiads',       label: 'Олимпиады / конкурсы',   placeholder: 'напр. призёр школьной олимпиады по математике' },
  { key: 'projects',        label: 'Проекты / портфолио',     placeholder: 'напр. личный проект на Python' },
  { key: 'target_program',  label: 'Целевая программа',       placeholder: 'напр. Computer Science' },
  { key: 'target_unis',     label: 'Целевые университеты',    placeholder: 'напр. SJTU, Tongji, ECNU' },
] as const

type FieldKey = typeof fields[number]['key']
type Data = Partial<Record<FieldKey, string>>

type ProfileResult = {
  level: string
  note: string
  color: 'success' | 'warning' | 'danger'
  Icon: React.ComponentType<{ className?: string }>
}

function getProfileLevel(data: Data): ProfileResult | null {
  const gpa = parseFloat(data.gpa ?? '')
  const hasLanguage = !!(data.hsk || data.english)
  const hasCsca = !!(data.csca_math || data.csca_physics)
  const hasAchievements = !!(data.olympiads || data.projects)
  if (!data.gpa || isNaN(gpa)) return null
  if (gpa >= 4.5 && hasLanguage && hasCsca && hasAchievements) {
    return { level: 'Сильный профиль', note: 'Можно рассматривать топовые университеты и гранты', color: 'success', Icon: CheckCircle }
  }
  if (gpa >= 4.0) {
    return { level: 'Средний профиль', note: 'Подходит для платного поступления, для гранта нужно усиливать', color: 'warning', Icon: AlertTriangle }
  }
  return { level: 'Рискованный профиль', note: 'Нужно либо выбирать реалистичные варианты, либо сначала усилить профиль', color: 'danger', Icon: AlertCircle }
}

const colorMap = {
  success: { bg: 'bg-study-green/10', border: 'border-study-green/20', icon: 'text-study-green', text: 'text-study-green' },
  warning: { bg: 'bg-study-orange/10', border: 'border-study-orange/20', icon: 'text-study-orange', text: 'text-study-orange' },
  danger:  { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-500', text: 'text-red-500' },
}

export default function StudentProfileTable() {
  const [data, setData] = useState<Data>({})
  const update = (key: FieldKey, val: string) => setData((prev) => ({ ...prev, [key]: val }))
  const profile = getProfileLevel(data)

  return (
    <div className="py-3">
      {profile && (() => {
        const c = colorMap[profile.color]
        const { Icon } = profile
        return (
          <div className={`${c.bg} border ${c.border} rounded-xl px-5 py-3 flex items-start gap-2.5 mb-4`}>
            <Icon className={`w-5 h-5 ${c.icon} shrink-0 mt-0.5`} />
            <div>
              <p className={`font-medium text-sm ${c.text}`}>{profile.level}</p>
              <p className={`text-xs ${c.text} mt-0.5`}>{profile.note}</p>
            </div>
          </div>
        )
      })()}

      <div className="bg-white border border-study-lightgray rounded-xl overflow-hidden">
        <table className="w-full" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '42%' }} />
            <col style={{ width: '58%' }} />
          </colgroup>
          <thead>
            <tr className="bg-study-bg border-b border-study-lightgray">
              <th className="px-3 py-2.5 text-xs font-medium text-study-gray text-left">Критерий</th>
              <th className="px-3 py-2.5 text-xs font-medium text-study-gray text-left">Ваш результат</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, i) => (
              <tr key={field.key} className={i % 2 === 0 ? 'bg-white' : 'bg-study-bg/50'}>
                <td className="px-3 py-2 text-xs text-study-gray border-b border-study-lightgray align-middle">
                  {field.label}
                </td>
                <td className="px-2.5 py-1.5 border-b border-study-lightgray align-middle">
                  <input
                    type="text"
                    value={data[field.key] ?? ''}
                    onChange={(e) => update(field.key as FieldKey, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full text-xs rounded-lg border border-study-lightgray bg-study-bg text-study-dark px-2 py-1.5 focus:outline-none focus:border-study-brown"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-study-gray mt-2.5">
        Заполните средний балл — и мы покажем примерный уровень вашего профиля
      </p>
    </div>
  )
}
