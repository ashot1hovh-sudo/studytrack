'use client'

import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Clock, ChevronRight, X, Plus, Trash2 } from 'lucide-react'
import { EmptyState, ErrorState, LoadingState } from '@/components/SectionState'
import type { ApplicationStatus, University } from '@/types/studytrack'
import rawData from '@/data/China_Universities_Programs.json'
import explorerData from '@/data/universityExplorer.json'

type RawEntry = { University?: string; Link?: string; Program?: string }

type UniSuggestion = { name: string; link: string; programs: string[] }

// Build unique university index from the same DB the explorer uses
const UNI_INDEX: UniSuggestion[] = (() => {
  const map = new Map<string, UniSuggestion>()
  let current = ''
  for (const row of rawData as RawEntry[]) {
    if (row.University) {
      current = row.University
      if (!map.has(current)) map.set(current, { name: current, link: row.Link ?? '', programs: [] })
    }
    if (current && row.Program) map.get(current)!.programs.push(row.Program)
  }
  return Array.from(map.values())
})()

const LOGO_MAP: Record<string, string> = (explorerData as { logos: Record<string, string> }).logos

function getInitials(name: string): string {
  return name.split(' ').filter((w) => w.length > 2).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

function getSuggestions(query: string): UniSuggestion[] {
  const q = query.toLowerCase().trim()
  if (!q || q.length < 2) return []
  return UNI_INDEX.filter((u) => u.name.toLowerCase().includes(q)).slice(0, 8)
}

const statusConfig: Record<ApplicationStatus, { label: string; color: string }> = {
  applied:  { label: 'Подана заявка', color: 'bg-study-orange/10 text-study-orange border-study-orange/30' },
  response: { label: 'Ответ получен', color: 'bg-study-brown/10 text-study-brown border-study-brown/30' },
  enrolled: { label: 'Зачислен',      color: 'bg-study-green/10 text-study-green border-study-green/30' },
  rejected: { label: 'Отказ',         color: 'bg-study-red/10 text-study-red border-study-red/30' },
  planned:  { label: 'В плане',        color: 'bg-study-lightgray text-study-gray border-study-gray/30' },
}

function UniLogo({ name }: { name: string }) {
  const logoUrl = LOGO_MAP[name]
  const initials = getInitials(name)
  return (
    <div className="shrink-0 w-9 h-9 rounded-xl overflow-hidden bg-study-bg flex items-center justify-center">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={name}
          className="w-full h-full object-contain p-0.5"
          onError={(e) => {
            const t = e.currentTarget
            t.style.display = 'none'
            t.nextElementSibling?.classList.remove('hidden')
          }}
        />
      ) : null}
      <span className={`text-[11px] font-bold text-study-brown ${logoUrl ? 'hidden' : ''}`}>{initials}</span>
    </div>
  )
}

export default function UniTracker() {
  const [universities, setUniversities] = useState<University[]>([])
  const [selectedUni, setSelectedUni] = useState<University | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newUniversity, setNewUniversity] = useState({
    name: '', deadline: '', price: '', examRequirements: '', city: '', major: '', portalUrl: '',
  })
  const [suggestions, setSuggestions] = useState<UniSuggestion[]>([])
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [uniToDelete, setUniToDelete] = useState<University | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const confirmDeleteUniversity = async () => {
    if (!uniToDelete) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const response = await fetch(`/api/universities/${uniToDelete.id}`, { method: 'DELETE' })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error ?? 'Не удалось удалить вуз')

      setUniversities((current) => current.filter((item) => item.id !== uniToDelete.id))
      setUniToDelete(null)
      setSelectedUni(null)
      // Removing a university can change the earliest deadline, which the server
      // has just used to reschedule the checklist. Tell the rest of the app so
      // Чек-лист doesn't keep showing dates derived from a vuz that is gone.
      window.dispatchEvent(new Event('st:documents-changed'))
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Не удалось удалить вуз')
    } finally {
      setIsDeleting(false)
    }
  }

  const loadUniversities = () => {
    setIsLoading(true)
    setError(null)
    fetch('/api/universities')
      .then((r) => { if (!r.ok) throw new Error('Не удалось загрузить список вузов'); return r.json() })
      .then((data) => setUniversities(data.universities ?? []))
      .catch((err) => {
        setUniversities([])
        setError(err instanceof Error ? err.message : 'Не удалось загрузить список вузов')
      })
      .finally(() => setIsLoading(false))
  }

  useEffect(() => { loadUniversities() }, [])

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
      setNewUniversity({ name: '', deadline: '', price: '', examRequirements: '', city: '', major: '', portalUrl: '' })
      setIsAddOpen(false)
      // The server just seeded the standard checklist for this vuz and
      // rescheduled the shared documents; Чек-лист needs to re-read them.
      if (data.documentsChanged) window.dispatchEvent(new Event('st:documents-changed'))
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
      setUniversities((current) => current.map((item) => (item.id === university.id ? nextUniversity : item)))
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Не удалось обновить статус')
    }
  }

  return (
    <div className="bg-study-card rounded-xl card-shadow p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-study-dark">Мои вузы — воронка заявок</h2>
          <p className="text-xs text-study-gray mt-0.5">Добавляйте вузы из списка ниже и отслеживайте статус заявок</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="shrink-0 w-9 h-9 rounded-lg bg-study-brown text-white flex items-center justify-center hover:bg-study-brown/90"
          title="Добавить вуз"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {isLoading && <LoadingState heightClass="h-40" />}

      {!isLoading && error && (
        <ErrorState title="Вузы не загрузились" description={error} onAction={loadUniversities} />
      )}

      {!isLoading && !error && universities.length === 0 && (
        <EmptyState title="Список вузов пока пуст" description="Нажмите плюс, чтобы добавить первый вуз." />
      )}

      {!error && universities.length > 0 && (
        <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2">
          {universities.map((uni) => {
            const cfg = statusConfig[uni.status]
            return (
              <button
                key={uni.id}
                onClick={() => setSelectedUni(uni)}
                className="text-left p-3 sm:p-4 rounded-xl border border-study-lightgray hover:border-study-gray/50 hover:card-shadow-hover transition-all duration-200 group active:scale-[0.98]"
              >
                <div className="flex items-start gap-3 mb-2">
                  <UniLogo name={uni.name} />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-study-dark text-sm leading-tight pr-1">{uni.name}</h3>
                    <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full border ${cfg.color}`}>{cfg.label}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-study-gray mt-2">
                  {uni.deadline && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{uni.deadline}</span>
                    </div>
                  )}
                  {uni.city && <span>{uni.city}</span>}
                  {uni.portalUrl && (
                    <div className="flex items-center gap-1 hover:text-study-green transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="text-xs">Портал</span>
                    </div>
                  )}
                </div>

                <div className="mt-2.5 flex items-center text-xs text-study-green font-medium">
                  <span>Подробнее</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Detail modal */}
      {selectedUni && (
        <div
          className="fixed inset-0 bg-study-overlay/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelectedUni(null)}
        >
          <div
            className="bg-study-card sm:rounded-2xl rounded-t-2xl card-shadow-hover w-full sm:max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-study-card rounded-t-2xl p-4 sm:p-6 border-b border-study-lightgray z-10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <UniLogo name={selectedUni.name} />
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-study-dark leading-tight">{selectedUni.name}</h3>
                    <p className="text-xs text-study-gray mt-1">Статус можно менять вручную</p>
                  </div>
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
                {selectedUni.deadline && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-study-gray shrink-0" />
                    <span className="text-study-dark">Дедлайн: <span className="font-medium">{selectedUni.deadline}</span></span>
                  </div>
                )}
                {selectedUni.portalUrl && (
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-study-gray shrink-0" />
                    <a href={selectedUni.portalUrl} className="text-study-green hover:underline break-all" target="_blank" rel="noopener noreferrer">
                      Портал вуза
                    </a>
                  </div>
                )}
                {selectedUni.price && <div className="text-study-dark">Стоимость: <span className="font-medium">{selectedUni.price}</span></div>}
                {selectedUni.examRequirements && <div className="text-study-dark">Экзамены: <span className="font-medium">{selectedUni.examRequirements}</span></div>}
                {selectedUni.city && <div className="text-study-dark">Город: <span className="font-medium">{selectedUni.city}</span></div>}
                {selectedUni.major && <div className="text-study-dark">Специальность: <span className="font-medium">{selectedUni.major}</span></div>}
              </div>

              {selectedUni.history.length > 0 && (
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
              )}
            </div>

            <div className="px-4 sm:px-6 pb-4">
              <button
                onClick={() => setUniToDelete(selectedUni)}
                className="w-full py-2.5 rounded-xl border border-study-red/30 text-sm font-medium text-study-red hover:bg-study-red/10 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Удалить вуз
              </button>
            </div>

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

      {/* Delete confirmation */}
      {uniToDelete && (
        <div
          className="fixed inset-0 bg-study-overlay/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => !isDeleting && setUniToDelete(null)}
        >
          <div
            className="bg-study-card sm:rounded-2xl rounded-t-2xl card-shadow-hover w-full sm:max-w-sm p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-study-dark">Удалить вуз?</h3>
            <p className="text-sm text-study-gray mt-2">
              «{uniToDelete.name}» и его история будут удалены. Отменить это действие нельзя.
            </p>
            <p className="text-xs text-study-gray mt-2">
              Общие документы останутся в чек-листе, но их сроки пересчитаются по ближайшему из
              оставшихся дедлайнов. Мотивационное письмо для этого вуза будет удалено.
            </p>
            {deleteError && <p className="text-xs text-study-red mt-3">{deleteError}</p>}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setUniToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-study-lightgray text-sm font-medium text-study-dark hover:bg-study-bg disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={confirmDeleteUniversity}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-study-red text-white text-sm font-semibold hover:bg-study-red/90 disabled:opacity-50"
              >
                {isDeleting ? 'Удаляем...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add modal */}
      {isAddOpen && (
        <div
          className="fixed inset-0 bg-study-overlay/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setIsAddOpen(false)}
        >
          <div
            className="bg-study-card sm:rounded-2xl rounded-t-2xl card-shadow-hover w-full sm:max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6 border-b border-study-lightgray flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-study-dark">Добавить вуз</h3>
                <p className="text-sm text-study-gray mt-1">Выберите университет из базы</p>
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
                    setSuggestions(getSuggestions(val))
                  }}
                  onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                  placeholder="Начните вводить название университета..."
                  className="w-full rounded-xl border border-study-lightgray px-4 py-3 text-sm"
                  autoComplete="off"
                />
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-study-card rounded-xl card-shadow-hover border border-study-lightgray z-10 overflow-hidden">
                    {suggestions.map((u, i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={() => {
                          setNewUniversity((current) => ({
                            ...current,
                            name: u.name,
                            portalUrl: u.link,
                          }))
                          setSuggestions([])
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-study-bg transition-colors border-b border-study-lightgray last:border-0 flex items-center gap-3"
                      >
                        <UniLogo name={u.name} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-study-dark truncate">{u.name}</p>
                          <p className="text-xs text-study-gray mt-0.5">{u.programs.length} программ</p>
                        </div>
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
                  value={newUniversity.major}
                  onChange={(event) => setNewUniversity((current) => ({ ...current, major: event.target.value }))}
                  placeholder="Специальность"
                  className="rounded-xl border border-study-lightgray px-4 py-3 text-sm"
                />
              </div>
              <input
                value={newUniversity.examRequirements}
                onChange={(event) => setNewUniversity((current) => ({ ...current, examRequirements: event.target.value }))}
                placeholder="Экзамены и требования, например HSK / IELTS"
                className="w-full rounded-xl border border-study-lightgray px-4 py-3 text-sm"
              />
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
  )
}
