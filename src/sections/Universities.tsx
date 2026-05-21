import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/context/AppContext'
import { ExternalLink, Clock, ChevronRight, X, Plus } from 'lucide-react'
import { EmptyState, ErrorState, LoadingState } from '@/components/SectionState'
import type { ApplicationStatus, University } from '@/types/studytrack'
import uniDb from '@/data/universities.json'
import UniversityExplorer from '@/components/UniversityExplorer'

type UniDbEntry = typeof uniDb[0]

function getDbSuggestions(query: string): UniDbEntry[] {
  const q = query.toLowerCase().trim()
  if (!q || q.length < 2) return []
  return uniDb.filter(
    (u) =>
      u.nameRu.toLowerCase().includes(q) ||
      u.nameEn.toLowerCase().includes(q) ||
      u.city.toLowerCase().includes(q),
  ).slice(0, 6)
}

function buildPrice(u: UniDbEntry): string {
  const parts: string[] = []
  if (u.tuitionBachelor) parts.push(`Бакалавр: ${u.tuitionBachelor}`)
  if (u.tuitionLanguageYear) parts.push(`Яз. год: ${u.tuitionLanguageYear}`)
  return parts.join(' / ')
}

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
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newUniversity, setNewUniversity] = useState({
    name: '',
    deadline: '',
    price: '',
    examRequirements: '',
    city: '',
    major: '',
    portalUrl: '',
  })
  const [suggestions, setSuggestions] = useState<UniDbEntry[]>([])
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

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

  const addUniversity = async () => {
    setIsSaving(true)
    setFormError(null)

    try {
      const response = await fetch('/api/universities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUniversity),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error ?? 'Не удалось добавить вуз')

      setUniversities((current) => [...current, data.university])
      setNewUniversity({
        name: '',
        deadline: '',
        price: '',
        examRequirements: '',
        city: '',
        major: '',
        portalUrl: '',
      })
      setIsAddOpen(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Не удалось добавить вуз')
    } finally {
      setIsSaving(false)
    }
  }

  const updateUniversityStatus = async (university: University, status: ApplicationStatus) => {
    setFormError(null)

    try {
      const response = await fetch(`/api/universities/${university.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error ?? 'Не удалось обновить статус')

      const nextUniversity = { ...university, status }
      setSelectedUni(nextUniversity)
      setUniversities((current) =>
        current.map((item) => (item.id === university.id ? nextUniversity : item))
      )
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Не удалось обновить статус')
    }
  }

  return (
    <>
    <UniversityExplorer />
    <div className="bg-white rounded-xl card-shadow p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg font-bold text-study-dark">Вузы — воронка заявок</h2>
        {!isParentMode && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="w-9 h-9 rounded-lg bg-study-brown text-white flex items-center justify-center hover:bg-study-brown/90"
            title="Добавить вуз"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {isLoading && <LoadingState heightClass="h-40" />}

      {!isLoading && error && (
        <ErrorState title="Вузы не загрузились" description={error} onAction={loadUniversities} />
      )}

      {!isLoading && !error && universities.length === 0 && (
        <EmptyState
          title="Список вузов пока пуст"
          description="Нажмите плюс, чтобы добавить первый вуз."
        />
      )}

      {!error && universities.length > 0 && <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2">
        {universities.map((uni) => {
          return (
            <button
              key={uni.id}
              onClick={() => setSelectedUni(uni)}
              className="text-left p-3 sm:p-4 rounded-xl border border-study-lightgray hover:border-study-gray/50 hover:card-shadow-hover transition-all duration-200 group active:scale-[0.98]"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-study-dark text-sm leading-tight pr-1">{uni.name}</h3>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-study-gray mt-2">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{uni.deadline}</span>
                </div>
                {uni.city && (
                  <div className="flex items-center gap-1">
                    <span>{uni.city}</span>
                  </div>
                )}
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
                  <p className="text-xs text-study-gray mt-1">Статус можно менять вручную</p>
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
              <div>
                <label className="text-xs font-medium text-study-dark mb-1.5 block">Статус для себя</label>
                <select
                  value={selectedUni.status}
                  onChange={(event) => updateUniversityStatus(selectedUni, event.target.value as ApplicationStatus)}
                  className="w-full rounded-xl border border-study-lightgray px-4 py-3 text-sm"
                >
                  {Object.entries(statusConfig).map(([value, config]) => (
                    <option key={value} value={value}>{config.label}</option>
                  ))}
                </select>
                {formError && <p className="text-xs text-study-red mt-2">{formError}</p>}
              </div>

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
                {selectedUni.price && (
                  <div className="text-study-dark">Стоимость: <span className="font-medium">{selectedUni.price}</span></div>
                )}
                {selectedUni.examRequirements && (
                  <div className="text-study-dark">Экзамены: <span className="font-medium">{selectedUni.examRequirements}</span></div>
                )}
                {selectedUni.city && (
                  <div className="text-study-dark">Город: <span className="font-medium">{selectedUni.city}</span></div>
                )}
                {selectedUni.major && (
                  <div className="text-study-dark">Специальность: <span className="font-medium">{selectedUni.major}</span></div>
                )}
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

      {isAddOpen && (
        <div
          className="fixed inset-0 bg-study-dark/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setIsAddOpen(false)}
        >
          <div
            className="bg-white sm:rounded-2xl rounded-t-2xl card-shadow-hover w-full sm:max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6 border-b border-study-lightgray flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-study-dark">Добавить вуз</h3>
                <p className="text-sm text-study-gray mt-1">Заполните данные выбранного университета</p>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="w-8 h-8 rounded-full hover:bg-study-bg flex items-center justify-center">
                <X className="w-5 h-5 text-study-gray" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-3">
              <div className="relative" ref={suggestionsRef}>
                <input
                  value={newUniversity.name}
                  onChange={(e) => {
                    const val = e.target.value
                    setNewUniversity((current) => ({ ...current, name: val }))
                    setSuggestions(getDbSuggestions(val))
                  }}
                  onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                  placeholder="Начните вводить название университета..."
                  className="w-full rounded-xl border border-study-lightgray px-4 py-3 text-sm"
                  autoComplete="off"
                />
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl card-shadow-hover border border-study-lightgray z-10 overflow-hidden">
                    {suggestions.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onMouseDown={() => {
                          setNewUniversity((current) => ({
                            ...current,
                            name: u.nameRu,
                            city: u.city,
                            portalUrl: u.url,
                            price: buildPrice(u),
                          }))
                          setSuggestions([])
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-study-bg transition-colors border-b border-study-lightgray last:border-0"
                      >
                        <p className="text-sm font-medium text-study-dark">{u.nameRu}</p>
                        <p className="text-xs text-study-gray mt-0.5">{u.city} · {u.nameEn}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  type="date"
                  value={newUniversity.deadline}
                  onChange={(event) => setNewUniversity((current) => ({ ...current, deadline: event.target.value }))}
                  className="rounded-xl border border-study-lightgray px-4 py-3 text-sm"
                />
                <input
                  value={newUniversity.price}
                  onChange={(event) => setNewUniversity((current) => ({ ...current, price: event.target.value }))}
                  placeholder="Стоимость за год/семестр"
                  className="rounded-xl border border-study-lightgray px-4 py-3 text-sm"
                />
              </div>
              <input
                value={newUniversity.examRequirements}
                onChange={(event) => setNewUniversity((current) => ({ ...current, examRequirements: event.target.value }))}
                placeholder="Экзамены и требования, например HSK / IELTS"
                className="w-full rounded-xl border border-study-lightgray px-4 py-3 text-sm"
              />
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  value={newUniversity.city}
                  onChange={(event) => setNewUniversity((current) => ({ ...current, city: event.target.value }))}
                  placeholder="Город"
                  className="rounded-xl border border-study-lightgray px-4 py-3 text-sm"
                />
                <input
                  value={newUniversity.major}
                  onChange={(event) => setNewUniversity((current) => ({ ...current, major: event.target.value }))}
                  placeholder="Специальность"
                  className="rounded-xl border border-study-lightgray px-4 py-3 text-sm"
                />
              </div>
              <input
                value={newUniversity.portalUrl}
                onChange={(event) => setNewUniversity((current) => ({ ...current, portalUrl: event.target.value }))}
                placeholder="Ссылка на портал"
                className="w-full rounded-xl border border-study-lightgray px-4 py-3 text-sm"
              />

              {formError && <p className="rounded-xl bg-study-red/10 px-3 py-2 text-sm font-semibold text-study-red">{formError}</p>}

              <button
                onClick={addUniversity}
                disabled={!newUniversity.name || isSaving}
                className="w-full rounded-xl bg-study-green text-white py-3 text-sm font-bold disabled:opacity-50"
              >
                {isSaving ? 'Добавляем...' : 'Добавить вуз'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
