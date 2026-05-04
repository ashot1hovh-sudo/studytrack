import { useEffect, useState } from 'react'
import { CalendarDays, AlertCircle } from 'lucide-react'
import { EmptyState, ErrorState, LoadingState } from '@/components/SectionState'
import type { Deadline } from '@/types/studytrack'

export default function Deadlines() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDeadlines = () => {
    setIsLoading(true)
    setError(null)

    fetch('/api/deadlines')
      .then((response) => {
        if (!response.ok) throw new Error('Не удалось загрузить дедлайны')
        return response.json()
      })
      .then((data) => setDeadlines(data.deadlines ?? []))
      .catch((err) => {
        setDeadlines([])
        setError(err instanceof Error ? err.message : 'Не удалось загрузить дедлайны')
      })
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadDeadlines()
  }, [])

  return (
    <div className="bg-white rounded-xl card-shadow p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-bold text-study-dark">Календарь дедлайнов</h2>
        <CalendarDays className="w-5 h-5 text-study-gray" />
      </div>

      {isLoading && <LoadingState heightClass="h-28" />}

      {!isLoading && error && (
        <ErrorState title="Дедлайны не загрузились" description={error} onAction={loadDeadlines} />
      )}

      {!isLoading && !error && deadlines.length === 0 && (
        <EmptyState
          title="Дедлайны пока не добавлены"
          description="Когда появятся важные даты, они будут показаны здесь."
        />
      )}

      {!error && deadlines.length > 0 && <div className="flex overflow-x-auto -mx-1 px-1 pb-2 sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {deadlines.map((d) => (
          <div
            key={d.id}
            className={`shrink-0 w-[260px] sm:w-auto p-3 sm:p-4 rounded-xl border transition-all duration-200 hover:card-shadow-hover ${
              d.isUrgent
                ? 'border-study-orange/30 bg-study-orange/5'
                : 'border-study-lightgray bg-white'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`text-center shrink-0 ${d.isUrgent ? 'text-study-orange' : 'text-study-dark'}`}>
                <p className="text-xl sm:text-2xl font-bold leading-none">{d.date}</p>
                <p className="text-[10px] sm:text-xs font-semibold mt-0.5">{d.month}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-study-dark leading-tight">{d.title}</p>
                <p className="text-xs text-study-gray mt-1">{d.university}</p>
              </div>
              {d.isUrgent && (
                <AlertCircle className="w-4 h-4 text-study-orange shrink-0" />
              )}
            </div>
            <p className="text-xs text-study-gray mt-2.5 leading-relaxed">{d.context}</p>
          </div>
        ))}
      </div>}
    </div>
  )
}
