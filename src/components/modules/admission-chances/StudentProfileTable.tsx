'use client'
import { useEffect, useState } from 'react'
import { CheckCircle, AlertTriangle, AlertCircle, Download, Eraser } from 'lucide-react'

const fields = [
  { key: 'gpa',             label: 'Средний балл (10 + 11 класс)', placeholder: 'напр. 4.3 / 5' },
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

// Bumped if the field set changes, so an old saved shape can't half-populate.
const STORAGE_KEY = 'st_student_profile_v1'

/** Wrap a value for CSV: quote, and double any inner quotes. */
function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

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
  danger:  { bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-red-200 dark:border-red-500/30', icon: 'text-red-500', text: 'text-red-500' },
}

export default function StudentProfileTable() {
  const [data, setData] = useState<Data>({})
  const [confirmClear, setConfirmClear] = useState(false)
  // Gates the save effect so the initial empty state can't overwrite saved work
  // before the load has run.
  const [loaded, setLoaded] = useState(false)

  // Filled in over time as the student gathers results, so it has to survive
  // leaving the lesson. Per-device localStorage — the student's own notes.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setData(JSON.parse(raw) as Data)
    } catch {
      // Corrupt or blocked storage: start empty.
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Private mode / quota: still works this session, just isn't saved.
    }
  }, [data, loaded])

  const update = (key: FieldKey, val: string) => setData((prev) => ({ ...prev, [key]: val }))
  const profile = getProfileLevel(data)

  const clearAll = () => {
    setData({})
    setConfirmClear(false)
  }

  const download = () => {
    const header = ['Критерий', 'Ваш результат'].map(csvCell).join(',')
    const rows = fields.map((f) => [f.label, data[f.key] ?? ''].map(csvCell).join(','))
    // ﻿ (BOM) so Excel opens the Cyrillic as UTF-8 rather than mojibake.
    const csv = '﻿' + [header, ...rows].join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'moy-profil.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="py-3">
      <p className="text-sm text-study-dark mb-3">
        Заполните таблицу по себе — так вы увидите свой профиль целиком и вернётесь к нему
        позже. Всё сохраняется на этом устройстве, таблицу можно скачать.
      </p>

      <div className="flex items-center justify-end gap-2 mb-2">
        <button
          onClick={download}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-study-brown px-2.5 py-1.5 rounded-lg hover:bg-study-brown/10 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Скачать таблицу
        </button>
        {confirmClear ? (
          <span className="inline-flex items-center gap-1.5 text-xs">
            <span className="text-study-gray">Очистить всё?</span>
            <button onClick={clearAll} className="font-semibold text-study-red hover:underline">Да</button>
            <button onClick={() => setConfirmClear(false)} className="text-study-gray hover:underline">Нет</button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmClear(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-study-gray px-2.5 py-1.5 rounded-lg hover:bg-study-bg transition-colors"
          >
            <Eraser className="w-3.5 h-3.5" />
            Очистить
          </button>
        )}
      </div>

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

      <div className="bg-study-card border border-study-lightgray rounded-xl overflow-hidden">
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
              <tr key={field.key} className={i % 2 === 0 ? 'bg-study-card' : 'bg-study-bg/50'}>
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

      <div className="text-xs text-study-gray mt-2.5 space-y-1.5">
        <p>Заполните средний балл — и мы покажем примерный уровень вашего профиля.</p>
        <p>
          <span className="font-semibold text-study-dark">Средний балл</span> считается за два
          года — 10 и 11 класс вместе, а не только за выпускной.
        </p>
        <p>
          Некоторые вузы смотрят не только на итоговый балл, но и на оценки за 10 класс и их
          динамику: стабильно высокие или растущие оценки работают в плюс.
        </p>
      </div>
    </div>
  )
}
