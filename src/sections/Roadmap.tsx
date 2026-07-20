import { useEffect, useState } from 'react'
import { Check, Circle } from 'lucide-react'
import { EmptyState, ErrorState, LoadingState } from '@/components/SectionState'
import type { RoadmapStage } from '@/types/studytrack'

export default function Roadmap() {
  const [stages, setStages] = useState<RoadmapStage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStages = () => {
    setIsLoading(true)
    setError(null)

    fetch('/api/roadmap')
      .then((response) => {
        if (!response.ok) throw new Error('Не удалось загрузить дорожную карту')
        return response.json()
      })
      .then((data) => setStages(data.stages ?? []))
      .catch((err) => {
        setStages([])
        setError(err instanceof Error ? err.message : 'Не удалось загрузить дорожную карту')
      })
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadStages()
  }, [])

  const completedCount = stages.filter((stage) => stage.status === 'completed').length
  const progressWidth = stages.length > 1
    ? `${Math.min(100, Math.max(0, (completedCount / (stages.length - 1)) * 100))}%`
    : '0%'

  return (
    <div className="bg-study-card rounded-xl card-shadow p-4 sm:p-6">
      <h2 className="text-base sm:text-lg font-bold text-study-dark mb-4 sm:mb-6">Дорожная карта поступления</h2>

      {isLoading && <LoadingState heightClass="h-24" />}

      {!isLoading && error && (
        <ErrorState title="Дорожная карта недоступна" description={error} onAction={loadStages} />
      )}

      {!isLoading && !error && stages.length === 0 && (
        <EmptyState
          title="Дорожная карта пока не заполнена"
          description="Когда консультант добавит этапы, они появятся здесь."
        />
      )}

      {/* Mobile: horizontal scroll */}
      {!error && stages.length > 0 && <div className="sm:hidden overflow-x-auto -mx-1 px-1 pb-2">
        <div className="flex items-start gap-2 min-w-max px-1">
          {stages.map((stage, idx) => {
            const isCompleted = stage.status === 'completed'
            const isCurrent = stage.status === 'current'
            const isLast = idx === stages.length - 1

            return (
              <div key={stage.id} className="flex items-center">
                <div className="flex flex-col items-center w-[100px]">
                  {/* Node */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      isCompleted
                        ? 'bg-study-green'
                        : isCurrent
                          ? 'bg-study-card border-[3px] border-study-orange'
                          : 'bg-study-card border-2 border-study-gray'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : isCurrent ? (
                      <Circle className="w-2.5 h-2.5 text-study-orange fill-study-orange" />
                    ) : (
                      <Circle className="w-2.5 h-2.5 text-study-gray" />
                    )}
                  </div>
                  {/* Label */}
                  <p className={`mt-2 text-[10px] font-medium text-center leading-tight ${
                    isCompleted ? 'text-study-green' : isCurrent ? 'text-study-orange font-semibold' : 'text-study-gray'
                  }`}>
                    {stage.name}
                  </p>
                </div>
                {!isLast && (
                  <div className={`w-6 h-0.5 shrink-0 mt-4 ${
                    isCompleted ? 'bg-study-green' : 'bg-study-lightgray'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      </div>}

      {/* Desktop: full layout */}
      {!error && stages.length > 0 && <div className="hidden sm:block relative">
        {/* Connection line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-study-lightgray">
          <div className="h-full bg-study-green" style={{ width: progressWidth }} />
        </div>

        {/* Stages */}
        <div className="relative flex justify-between">
          {stages.map((stage) => {
            const isCompleted = stage.status === 'completed'
            const isCurrent = stage.status === 'current'

            return (
              <div key={stage.id} className="flex flex-col items-center group" style={{ width: '20%' }}>
                {/* Node */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all duration-300 ${
                    isCompleted
                      ? 'bg-study-green shadow-lg shadow-study-green/30'
                      : isCurrent
                        ? 'bg-study-card border-[3px] border-study-orange shadow-lg shadow-study-orange/20'
                        : 'bg-study-card border-2 border-study-gray'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : isCurrent ? (
                    <Circle className="w-3 h-3 text-study-orange fill-study-orange" />
                  ) : (
                    <Circle className="w-3 h-3 text-study-gray" />
                  )}
                </div>

                {/* Label */}
                <p className={`mt-3 text-xs font-medium text-center leading-tight ${
                  isCompleted ? 'text-study-green' : isCurrent ? 'text-study-orange font-semibold' : 'text-study-gray'
                }`}>
                  {stage.name}
                </p>

                {/* Tooltip */}
                <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 top-16 bg-study-inverse text-white text-xs rounded-lg px-3 py-2 max-w-[160px] text-center pointer-events-none z-20">
                  {stage.description}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-study-inverse rotate-45" />
                </div>
              </div>
            )
          })}
        </div>
      </div>}
    </div>
  )
}
