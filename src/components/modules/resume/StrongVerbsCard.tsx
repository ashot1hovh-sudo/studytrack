const verbs = [
  { en: 'Analyzed',    ru: 'Проанализировал' },
  { en: 'Developed',   ru: 'Разработал' },
  { en: 'Organized',   ru: 'Организовал' },
  { en: 'Created',     ru: 'Создал' },
  { en: 'Conducted',   ru: 'Провёл' },
  { en: 'Presented',   ru: 'Представил' },
  { en: 'Improved',    ru: 'Улучшил' },
  { en: 'Assisted',    ru: 'Помогал' },
  { en: 'Coordinated', ru: 'Координировал' },
  { en: 'Researched',  ru: 'Исследовал' },
]

export default function StrongVerbsCard() {
  return (
    <div className="py-3">
      <div className="bg-study-card border border-study-lightgray rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-study-bg border-b border-study-lightgray">
          <p className="text-sm font-semibold text-study-dark">Сильные глаголы для резюме</p>
          <p className="text-xs text-study-gray mt-0.5">Используйте активный залог и конкретные действия</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-y divide-study-lightgray">
          {verbs.map((v, i) => (
            <div key={i} className="flex flex-col items-center justify-center px-3 py-3 text-center gap-0.5">
              <span className="text-sm font-semibold text-study-brown">{v.en}</span>
              <span className="text-xs text-study-gray">{v.ru}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
