'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, AlertCircle, Plus, X, Trash2 } from 'lucide-react'
import { EmptyState, ErrorState, LoadingState } from '@/components/SectionState'
import DeadlineCalendar, { KIND_STYLES } from '@/components/DeadlineCalendar'
import type { Deadline } from '@/types/studytrack'

/**
 * `compact` is the strip on Главная; `calendar` is the Дедлайны tab.
 *
 * Same data either way — a month grid on the dashboard would crowd out
 * everything else on that page, and the strip is useless as a planning view.
 */
type Props = { variant?: 'compact' | 'calendar' }

const EVENT_KINDS = [
  { value: 'interview', label: 'Собеседование' },
  { value: 'exam', label: 'Экзамен' },
  { value: 'custom', label: 'Другое' },
] as const

function DeadlineCard({ d, onDelete }: { d: Deadline; onDelete?: (d: Deadline) => void }) {
  return (
    <div
      className={`shrink-0 w-[260px] sm:w-auto p-3 sm:p-4 rounded-xl border transition-all duration-200 hover:card-shadow-hover ${
        d.isOverdue
          ? 'border-study-red/40 bg-study-red/5'
          : d.isUrgent
            ? 'border-study-orange/30 bg-study-orange/5'
            : 'border-study-lightgray bg-study-card'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`text-center shrink-0 ${
          d.isOverdue ? 'text-study-red' : d.isUrgent ? 'text-study-orange' : 'text-study-dark'
        }`}>
          <p className="text-xl sm:text-2xl font-bold leading-none">{d.date}</p>
          <p className="text-[10px] sm:text-xs font-semibold mt-0.5">{d.month}</p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-study-dark leading-tight">{d.title}</p>
          <p className="text-xs text-study-gray mt-1">{d.university}</p>
          {d.isOverdue && (
            <p className="text-[11px] font-semibold text-study-red mt-1">Просрочено</p>
          )}
        </div>
        {(d.isUrgent || d.isOverdue) && (
          <AlertCircle className={`w-4 h-4 shrink-0 ${d.isOverdue ? 'text-study-red' : 'text-study-orange'}`} />
        )}
        {d.canDelete && onDelete && (
          <button
            onClick={() => onDelete(d)}
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-study-gray hover:text-study-red hover:bg-study-red/10"
            title="Удалить событие"
            aria-label={`Удалить событие «${d.title}»`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {d.context && <p className="text-xs text-study-gray mt-2.5 leading-relaxed">{d.context}</p>}
    </div>
  )
}

export default function Deadlines({ variant = 'compact' }: Props) {
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [newEvent, setNewEvent] = useState({
    kind: 'interview' as (typeof EVENT_KINDS)[number]['value'],
    title: '',
    date: '',
    universityName: '',
    context: '',
  })

  const isCalendar = variant === 'calendar'

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
    // Documents and universities feed this calendar, so a change there changes
    // what belongs on it.
    const reload = () => loadDeadlines()
    window.addEventListener('st:documents-changed', reload)
    return () => window.removeEventListener('st:documents-changed', reload)
  }, [])

  const daysWithEvents = useMemo(
    () => deadlines.filter((d) => d.dateValue === selectedDay),
    [deadlines, selectedDay]
  )

  const addEvent = async () => {
    setIsSaving(true)
    setFormError(null)
    try {
      const response = await fetch('/api/deadlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error ?? 'Не удалось добавить событие')

      setIsAddOpen(false)
      setNewEvent({ kind: 'interview', title: '', date: '', universityName: '', context: '' })
      loadDeadlines()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Не удалось добавить событие')
    } finally {
      setIsSaving(false)
    }
  }

  const deleteEvent = async (deadline: Deadline) => {
    setDeadlines((current) => current.filter((item) => item.id !== deadline.id))
    const response = await fetch(`/api/deadlines/${deadline.id}`, { method: 'DELETE' })
    // Put it back if the server disagreed, rather than leaving the list lying.
    if (!response.ok) loadDeadlines()
  }

  const listToShow = isCalendar && selectedDay ? daysWithEvents : deadlines

  return (
    <div className="bg-study-card rounded-xl card-shadow p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-bold text-study-dark">Календарь дедлайнов</h2>
        {isCalendar ? (
          <button
            onClick={() => setIsAddOpen(true)}
            className="shrink-0 w-9 h-9 rounded-lg bg-study-brown text-white flex items-center justify-center hover:bg-study-brown/90"
            title="Добавить событие"
            aria-label="Добавить событие"
          >
            <Plus className="w-5 h-5" />
          </button>
        ) : (
          <CalendarDays className="w-5 h-5 text-study-gray" />
        )}
      </div>

      {isLoading && <LoadingState heightClass="h-28" />}

      {!isLoading && error && (
        <ErrorState title="Дедлайны не загрузились" description={error} onAction={loadDeadlines} />
      )}

      {!isLoading && !error && isCalendar && (
        <div className="mb-5">
          <DeadlineCalendar
            deadlines={deadlines}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
          />
        </div>
      )}

      {!isLoading && !error && selectedDay && (
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-study-dark">
            События за {selectedDay.split('-').reverse().join('.')}
          </p>
          <button
            onClick={() => setSelectedDay(null)}
            className="text-xs text-study-gray hover:text-study-dark"
          >
            Показать все
          </button>
        </div>
      )}

      {!isLoading && !error && deadlines.length === 0 && (
        <EmptyState
          title="Дедлайны пока не добавлены"
          description={
            isCalendar
              ? 'Добавьте вуз с дедлайном — документы и даты появятся здесь автоматически. Собеседования и экзамены можно добавить кнопкой «плюс».'
              : 'Когда появятся важные даты, они будут показаны здесь.'
          }
        />
      )}

      {!error && listToShow.length > 0 && (
        <div
          className={
            isCalendar
              ? 'grid gap-3 sm:grid-cols-2'
              : 'flex overflow-x-auto -mx-1 px-1 pb-2 sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4'
          }
        >
          {listToShow.map((d) => (
            <DeadlineCard key={d.id} d={d} onDelete={isCalendar ? deleteEvent : undefined} />
          ))}
        </div>
      )}

      {/* Add event */}
      {isAddOpen && (
        <div
          className="fixed inset-0 bg-study-overlay/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => !isSaving && setIsAddOpen(false)}
        >
          <div
            className="bg-study-card sm:rounded-2xl rounded-t-2xl card-shadow-hover w-full sm:max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6 border-b border-study-lightgray flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-study-dark">Добавить событие</h3>
                <p className="text-sm text-study-gray mt-1">Собеседование, экзамен или своя дата</p>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-study-bg flex items-center justify-center shrink-0"
              >
                <X className="w-5 h-5 text-study-gray" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-3">
              <div>
                <label className="block text-xs font-medium text-study-dark mb-1.5">Тип</label>
                <div className="grid grid-cols-3 gap-2">
                  {EVENT_KINDS.map((kind) => (
                    <button
                      key={kind.value}
                      onClick={() => setNewEvent((c) => ({ ...c, kind: kind.value }))}
                      className={`py-2 rounded-xl text-xs font-medium border transition-colors ${
                        newEvent.kind === kind.value
                          ? 'border-study-brown bg-study-brown/10 text-study-brown'
                          : 'border-study-lightgray text-study-gray hover:bg-study-bg'
                      }`}
                    >
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${KIND_STYLES[kind.value].dot}`} />
                      {kind.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-study-dark mb-1.5">Название</label>
                <input
                  value={newEvent.title}
                  onChange={(e) => setNewEvent((c) => ({ ...c, title: e.target.value }))}
                  placeholder="Например: собеседование в Tsinghua"
                  className="w-full rounded-xl border border-study-lightgray px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-study-dark mb-1.5">Дата</label>
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent((c) => ({ ...c, date: e.target.value }))}
                  className="w-full rounded-xl border border-study-lightgray px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-study-dark mb-1.5">
                  Вуз <span className="text-study-gray font-normal">— необязательно</span>
                </label>
                <input
                  value={newEvent.universityName}
                  onChange={(e) => setNewEvent((c) => ({ ...c, universityName: e.target.value }))}
                  className="w-full rounded-xl border border-study-lightgray px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-study-dark mb-1.5">
                  Заметка <span className="text-study-gray font-normal">— необязательно</span>
                </label>
                <textarea
                  value={newEvent.context}
                  onChange={(e) => setNewEvent((c) => ({ ...c, context: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-study-lightgray px-4 py-3 text-sm resize-none"
                />
              </div>

              {formError && <p className="text-xs text-study-red">{formError}</p>}

              <button
                onClick={addEvent}
                disabled={isSaving || !newEvent.title.trim() || !newEvent.date}
                className="w-full py-3 rounded-xl bg-study-brown text-white text-sm font-semibold hover:bg-study-brown/90 disabled:opacity-50"
              >
                {isSaving ? 'Добавляем...' : 'Добавить событие'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
