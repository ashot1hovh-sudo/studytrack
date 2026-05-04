import { useEffect, useState } from 'react'
import { useApp } from '@/context/AppContext'
import { ExternalLink, Clock, ChevronRight, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { EmptyState, ErrorState, LoadingState } from '@/components/SectionState'
import type { University } from '@/types/studytrack'

const statusConfig = {
  applied: { label: 'Подана заявка', variant: 'warning' as const, color: 'bg-study-orange/10 text-study-orange border-study-orange/30' },
  response: { label: 'Ответ получен', variant: 'default' as const, color: 'bg-study-brown/10 text-study-brown border-study-brown/30' },
  enrolled: { label: 'Зачислен', variant: 'success' as const, color: 'bg-study-green/10 text-study-green border-study-green/30' },
  rejected: { label: 'Отказ', variant: 'destructive' as const, color: 'bg-study-red/10 text-study-red border-study-red/30' },
  planned: { label: 'В плане', variant: 'secondary' as const, color: 'bg-study-lightgray text-study-gray border-study-gray/30' },
}

export default function Universities() {
  const { isParentMode } = useApp()
  const [universities, setUniversities] = useState<University[]>([])
  const [selectedUni, setSelectedUni] = useState<University | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadUniversities = () => {
    setIsLoading(true)
    setError(null)

    fetch('/api/universities')
      .then((response) => {
        if (!response.ok) throw new Error('Не удалось загрузить список вузов')
        return response.json()
      })
      .then((data) => setUniversities(data.universities ?? []))
      .catch((err) => {
        setUniversities([])
        setError(err instanceof Error ? err.message : 'Не удалось загрузить список вузов')
      })
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadUniversities()
  }, [])

  return (
    <div className="bg-white rounded-xl card-shadow p-4 sm:p-6">
      <h2 className="text-base sm:text-lg font-bold text-study-dark mb-3 sm:mb-4">Вузы — воронка заявок</h2>

      {isLoading && <LoadingState heightClass="h-40" />}

      {!isLoading && error && (
        <ErrorState title="Вузы не загрузились" description={error} onAction={loadUniversities} />
      )}

      {!isLoading && !error && universities.length === 0 && (
        <EmptyState
          title="Список вузов пока пуст"
          description="Когда консультант добавит заявки, они появятся здесь."
        />
      )}

      {!error && universities.length > 0 && <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2">
        {universities.map((uni) => {
          const status = statusConfig[uni.status]
          return (
            <button
              key={uni.id}
              onClick={() => setSelectedUni(uni)}
              className="text-left p-3 sm:p-4 rounded-xl border border-study-lightgray hover:border-study-gray/50 hover:card-shadow-hover transition-all duration-200 group active:scale-[0.98]"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-study-dark text-sm leading-tight pr-1">{uni.name}</h3>
                <Badge className={`${status.color} text-[10px] sm:text-xs shrink-0`}>
                  {status.label}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-study-gray mt-2">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{uni.deadline}</span>
                </div>
                <div className="flex items-center gap-1 group/link hover:text-study-green transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="text-xs">Портал</span>
                </div>
              </div>

              {!isParentMode && uni.consultantNote && (
                <div className="mt-2.5 pt-2.5 border-t border-study-lightgray">
                  <p className="text-[11px] text-study-gray italic leading-relaxed">{uni.consultantNote}</p>
                </div>
              )}

              <div className="mt-2.5 flex items-center text-xs text-study-green font-medium">
                <span>Подробнее</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          )
        })}
      </div>}

      {/* Modal */}
      {selectedUni && (
        <div
          className="fixed inset-0 bg-study-dark/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelectedUni(null)}
        >
          <div
            className="bg-white sm:rounded-2xl rounded-t-2xl card-shadow-hover w-full sm:max-w-lg max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-10 sm:fade-in sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white sm:rounded-t-2xl rounded-t-2xl p-4 sm:p-6 border-b border-study-lightgray z-10">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-study-dark leading-tight">{selectedUni.name}</h3>
                  <Badge className={`${statusConfig[selectedUni.status].color} mt-2 text-xs`}>
                    {statusConfig[selectedUni.status].label}
                  </Badge>
                </div>
                <button
                  onClick={() => setSelectedUni(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-study-bg transition-colors shrink-0"
                >
                  <X className="w-5 h-5 text-study-gray" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-study-gray shrink-0" />
                  <span className="text-study-dark">Дедлайн: <span className="font-medium">{selectedUni.deadline}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-study-gray shrink-0" />
                  <a href={selectedUni.portalUrl} className="text-study-green hover:underline break-all" target="_blank" rel="noopener noreferrer">
                    Портал вуза
                  </a>
                </div>
              </div>

              {!isParentMode && selectedUni.consultantNote && (
                <div className="p-3 bg-study-bg rounded-xl">
                  <p className="text-xs font-medium text-study-dark mb-1">Примечание консультанта</p>
                  <p className="text-sm text-study-gray">{selectedUni.consultantNote}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-study-dark mb-3">История</p>
                <div className="space-y-3">
                  {selectedUni.history.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-study-green mt-1.5 shrink-0" />
                      <div>
                        <p className="text-xs text-study-gray">{item.date}</p>
                        <p className="text-sm text-study-dark">{item.event}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile Close Button */}
            <div className="p-4 sm:hidden border-t border-study-lightgray">
              <button
                onClick={() => setSelectedUni(null)}
                className="w-full py-3 text-sm font-medium text-study-dark bg-study-bg rounded-xl"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
