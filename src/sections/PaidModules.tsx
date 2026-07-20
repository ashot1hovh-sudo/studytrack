export default function PaidModules() {
  const modules = [
    { title: 'Модуль 1', description: 'Скоро будет доступно' },
    { title: 'Модуль 2', description: 'Скоро будет доступно' },
    { title: 'Модуль 3', description: 'Скоро будет доступно' },
    { title: 'Модуль 4', description: 'Скоро будет доступно' },
    { title: 'Модуль 5', description: 'Скоро будет доступно' },
  ]

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {modules.map((mod, i) => (
        <div key={i} className="bg-study-card rounded-2xl card-shadow p-6 flex flex-col gap-4 border border-study-lightgray">
          <div className="w-12 h-12 rounded-xl bg-study-brown/10 flex items-center justify-center">
            <span className="text-study-brown font-bold text-lg">{i + 1}</span>
          </div>
          <div>
            <p className="font-bold text-study-dark text-base">{mod.title}</p>
            <p className="text-sm text-study-gray mt-1">{mod.description}</p>
          </div>
          <div className="mt-auto pt-2 border-t border-study-lightgray">
            <div className="h-3 w-2/3 rounded-full bg-study-lightgray/70" />
            <div className="h-3 w-1/2 rounded-full bg-study-lightgray/50 mt-2" />
          </div>
        </div>
      ))}
    </div>
  )
}
