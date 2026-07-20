export default function AdmissionBenchmarks() {
  const gradeBenchmarks = [
    { label: 'Платное обучение', grade: 'от 4.0 / 5', color: 'warning' as const },
    { label: 'Грант / стипендия', grade: 'от 4.5 / 5', color: 'success' as const },
  ]

  const cscaBenchmarks = [
    { label: 'Платное поступление', range: 'зависит от вуза', bar: 45, color: '#888780' },
    { label: 'Частичная стипендия', range: 'высокий результат', bar: 68, color: '#BA7517' },
    { label: 'Полная стипендия', range: '75–85+ из 100', bar: 85, color: '#3B6D11' },
  ]

  const colorMap = {
    warning: { bg: 'bg-study-orange/10', border: 'border-study-orange/20', text: 'text-study-orange' },
    success: { bg: 'bg-study-green/10', border: 'border-study-green/20', text: 'text-study-green' },
  }

  return (
    <div className="py-3 flex flex-col gap-6">
      <div>
        <p className="text-xs font-medium text-study-gray mb-2.5">Средний балл — ориентир</p>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {gradeBenchmarks.map((b, i) => {
            const c = colorMap[b.color]
            return (
              <div key={i} className={`${c.bg} border ${c.border} rounded-xl p-4`}>
                <p className={`text-xs ${c.text} mb-1.5`}>{b.label}</p>
                <p className={`text-2xl font-medium ${c.text}`}>{b.grade}</p>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-study-gray mt-2">
          Чем выше средний балл — тем больше вариантов университетов и выше шансы на стипендию
        </p>
      </div>

      <div>
        <p className="text-xs font-medium text-study-gray mb-2.5">CSCA — ориентиры по баллам</p>
        <div className="bg-study-card border border-study-lightgray rounded-xl p-4 flex flex-col gap-3.5">
          {cscaBenchmarks.map((b, i) => (
            <div key={i}>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-xs font-medium text-study-dark">{b.label}</span>
                <span className="text-xs text-study-gray">{b.range}</span>
              </div>
              <div className="h-1.5 bg-study-bg rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${b.bar}%`, background: b.color, transition: 'width 0.4s ease' }}
                />
              </div>
            </div>
          ))}
          <p className="text-xs text-study-gray">
            Для полной стипендии нужно набрать высокий балл по каждому требуемому предмету
          </p>
        </div>
      </div>
    </div>
  )
}
