const sections = [
  { label: 'Personal Information',        note: 'Имя, email, телефон, страна, программа' },
  { label: 'Education',                   note: 'Школа/колледж, годы, ГПА, профильные предметы' },
  { label: 'Academic Achievements',       note: 'Олимпиады, конкурсы, сертификаты, языковые экзамены' },
  { label: 'Research / School Projects',  note: 'Тема, метод, результат, оценка защиты' },
  { label: 'Extracurricular Activities',  note: 'Клубы, волонтёрство, медиа, творчество, организация мероприятий' },
  { label: 'Work / Volunteer Experience', note: 'Роль, навыки, ответственность, результат' },
  { label: 'Languages',                   note: 'Уровень + сертификат (IELTS, Duolingo, HSK)' },
  { label: 'Skills',                      note: 'Excel, Python, Canva, public speaking, academic writing...' },
  { label: 'Courses and Certificates',    note: 'Онлайн-курсы, летние школы, профильные сертификаты' },
]

export default function CVStructureList() {
  return (
    <div className="py-3">
      <div className="bg-study-card border border-study-lightgray rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-study-bg border-b border-study-lightgray">
          <p className="text-sm font-semibold text-study-dark">Возможная структура резюме</p>
          <p className="text-xs text-study-gray mt-0.5">Не обязательно использовать все разделы — оставляйте только сильные</p>
        </div>
        <div className="divide-y divide-study-lightgray">
          {sections.map((s, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3">
              <div className="w-6 h-6 rounded-full bg-study-brown/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-study-brown">{i + 1}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-study-dark">{s.label}</p>
                <p className="text-xs text-study-gray mt-0.5">{s.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
