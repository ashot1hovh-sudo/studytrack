import { useEffect, useState } from 'react'
import { useApp } from '@/context/AppContext'
import { Check, X, FileText, ArrowUp, ExternalLink, Trash2, Plus } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { EmptyState, ErrorState, LoadingState } from '@/components/SectionState'
import type { StudentDocument, University } from '@/types/studytrack'

const statusConfig = {
  not_started: { label: 'Не начато', icon: X, color: 'text-study-gray bg-study-lightgray' },
  in_progress: { label: 'В работе', icon: FileText, color: 'text-study-orange bg-study-orange/10' },
  completed: { label: 'Готово', icon: Check, color: 'text-study-green bg-study-green/10' },
  uploaded: { label: 'На рассмотрении', icon: FileText, color: 'text-study-brown bg-study-brown/10' },
}

// DIY users see simplified statuses without upload workflow
const diyStatusConfig = {
  not_started: { label: 'Не готово', icon: X, color: 'text-study-gray bg-study-lightgray' },
  completed: { label: 'Готово', icon: Check, color: 'text-study-green bg-study-green/10' },
}

export default function Checklist() {
  const { user } = useApp()
  const isPremium = user?.serviceType === 'premium'
  const [documents, setDocuments] = useState<StudentDocument[]>([])
  const [universities, setUniversities] = useState<University[]>([])
  const [selectedDoc, setSelectedDoc] = useState<StudentDocument | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newDocument, setNewDocument] = useState({
    name: '',
    deadline: '',
    targetUniversityId: 'all',
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  // Deletion is confirmed in a dialog rather than done on the click: the row is
  // small, sits next to the status toggle, and the delete is not undoable.
  // Names are truncated in the row. Tapping the text (not the status tick) opens
  // this — the full name and details — so a long document name is always readable.
  const [infoDoc, setInfoDoc] = useState<StudentDocument | null>(null)
  const [docToDelete, setDocToDelete] = useState<StudentDocument | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeletingDoc, setIsDeletingDoc] = useState(false)

  const confirmDeleteDocument = async () => {
    if (!docToDelete) return
    setIsDeletingDoc(true)
    setDeleteError(null)
    try {
      const response = await fetch(`/api/documents/${docToDelete.id}`, { method: 'DELETE' })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error ?? 'Не удалось удалить документ')

      setDocuments((current) => current.filter((item) => item.id !== docToDelete.id))
      setDocToDelete(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Не удалось удалить документ')
    } finally {
      setIsDeletingDoc(false)
    }
  }

  const loadDocuments = () => {
    setIsLoading(true)
    setError(null)

    fetch('/api/documents')
      .then((response) => {
        if (!response.ok) {
          return response.json().catch(() => null).then((data) => {
            throw new Error(data?.error ?? 'Не удалось загрузить документы')
          })
        }
        return response.json()
      })
      .then((data) => setDocuments(data.documents ?? []))
      .catch((err) => {
        setDocuments([])
        setError(err instanceof Error ? err.message : 'Не удалось загрузить документы')
      })
      .finally(() => setIsLoading(false))
  }

  const loadUniversities = () => {
    fetch('/api/universities')
      .then((response) => (response.ok ? response.json() : { universities: [] }))
      .then((data) => setUniversities(data.universities ?? []))
      .catch(() => setUniversities([]))
  }

  useEffect(() => {
    loadDocuments()
    loadUniversities()

    // Adding or deleting a university reseeds and reschedules the checklist on
    // the server. Both sections can be mounted at once, so without this the
    // student sees stale dates until a reload.
    const reload = () => {
      loadDocuments()
      loadUniversities()
    }
    window.addEventListener('st:documents-changed', reload)
    return () => window.removeEventListener('st:documents-changed', reload)
  }, [])

  const openUploadModal = (document: StudentDocument) => {
    if (!isPremium) return
    setSelectedDoc(document)
    setSelectedFile(null)
    setUploadError(null)
  }

  const closeUploadModal = () => {
    if (isUploading || isDeleting) return
    setSelectedDoc(null)
    setSelectedFile(null)
    setUploadError(null)
  }

  const uploadSelectedFile = async () => {
    if (!selectedDoc || !selectedFile) return

    setIsUploading(true)
    setUploadError(null)

    const formData = new FormData()
    formData.append('documentId', String(selectedDoc.id))
    formData.append('file', selectedFile)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error ?? 'Не удалось загрузить файл')
      }

      setDocuments((current) =>
        current.map((document) =>
          document.id === data.document.id ? { ...document, ...data.document } : document
        )
      )
      setSelectedDoc(null)
      setSelectedFile(null)
      setUploadError(null)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Не удалось загрузить файл')
    } finally {
      setIsUploading(false)
    }
  }

  const openUploadedFile = async () => {
    if (!selectedDoc?.fileUrl) return

    setIsOpening(true)
    setUploadError(null)

    try {
      const response = await fetch(`/api/documents/${selectedDoc.id}/file`)
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error ?? 'Не удалось открыть файл')
      }

      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Не удалось открыть файл')
    } finally {
      setIsOpening(false)
    }
  }

  const deleteUploadedFile = async () => {
    if (!selectedDoc?.fileUrl) return

    setIsDeleting(true)
    setUploadError(null)

    try {
      const response = await fetch(`/api/documents/${selectedDoc.id}/file`, {
        method: 'DELETE',
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error ?? 'Не удалось удалить файл')
      }

      setDocuments((current) =>
        current.map((document) =>
          document.id === data.document.id ? { ...document, ...data.document } : document
        )
      )
      setSelectedDoc((current) => (current ? { ...current, ...data.document } : current))
      setSelectedFile(null)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Не удалось удалить файл')
    } finally {
      setIsDeleting(false)
    }
  }

  const openReviewFile = async () => {
    if (!selectedDoc?.reviewFileUrl) return

    setIsOpening(true)
    setUploadError(null)

    try {
      const response = await fetch(`/api/documents/${selectedDoc.id}/review-file`)
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error ?? 'Не удалось открыть файл')
      }

      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Не удалось открыть файл')
    } finally {
      setIsOpening(false)
    }
  }

  const addDocument = async () => {
    setIsSaving(true)
    setUploadError(null)

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDocument.name,
          deadline: newDocument.deadline,
          targetUniversityId: newDocument.targetUniversityId === 'all' ? null : newDocument.targetUniversityId,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error ?? 'Не удалось добавить документ')

      setDocuments((current) => [...current, data.document])
      setNewDocument({ name: '', deadline: '', targetUniversityId: 'all' })
      setIsAddOpen(false)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Не удалось добавить документ')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleDocument = async (document: StudentDocument) => {
    const nextStatus = document.status === 'completed' ? 'not_started' : 'completed'
    setUploadError(null)

    setDocuments((current) =>
      current.map((item) => (item.id === document.id ? { ...item, status: nextStatus } : item))
    )

    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error ?? 'Не удалось обновить документ')
    } catch (err) {
      setDocuments((current) =>
        current.map((item) => (item.id === document.id ? document : item))
      )
      setUploadError(err instanceof Error ? err.message : 'Не удалось обновить документ')
    }
  }

  const completedCount = documents.filter((d) => d.status === 'completed').length
  const progress = documents.length > 0 ? (completedCount / documents.length) * 100 : 0

  if (isLoading) {
    return (
      <div className="bg-study-card rounded-xl card-shadow p-4 sm:p-6">
        <LoadingState heightClass="h-36" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-study-card rounded-xl card-shadow p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-bold text-study-dark mb-4">
          Чек-лист документов
        </h2>
        <ErrorState title="Документы не загрузились" description={error} onAction={loadDocuments} />
      </div>
    )
  }

  return (
    <div className="bg-study-card rounded-xl card-shadow p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg font-bold text-study-dark">Чек-лист документов</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-study-gray">{completedCount}/{documents.length}</span>
          <button
            onClick={() => setIsAddOpen(true)}
            className="w-8 h-8 rounded-lg bg-study-brown text-white flex items-center justify-center hover:bg-study-brown/90"
            title="Добавить документ"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mb-3 sm:mb-4">
        <Progress value={progress} className="h-2" />
      </div>

      {documents.length === 0 && (
        <EmptyState
          title="Чек-лист документов пока пуст"
          description="Нажмите плюс, чтобы добавить первый документ."
        />
      )}

      {documents.length > 0 && <div className="space-y-1">
        {documents.map((doc) => {
          const isDone = doc.status === 'completed'
          const config = isPremium ? statusConfig : diyStatusConfig
          const status = isDone
            ? config.completed
            : config.not_started
          const Icon = status.icon
          return (
            // A row, not a <button>: the delete control is a button of its own,
            // and nesting buttons is invalid HTML with unpredictable clicks.
            <div
              key={doc.id}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-study-bg transition-colors group"
            >
              {/* The status tick is its own button now: it toggles / opens
                  upload. Tapping the text opens the info card instead, so the
                  two actions no longer share one click target. */}
              <button
                onClick={() => isPremium ? openUploadModal(doc) : toggleDocument(doc)}
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 active:opacity-70 ${status.color}`}
                title={isPremium ? 'Загрузить файл' : isDone ? 'Отметить как не готово' : 'Отметить как готово'}
                aria-label={status.label}
              >
                <Icon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setInfoDoc(doc)}
                // title = native hover tooltip on desktop; the tap opens the full
                // card on mobile. Either way the full name is reachable.
                title={doc.name}
                className="flex-1 min-w-0 text-left active:opacity-70"
              >
                <p className={`text-sm font-medium truncate ${isDone ? 'text-study-gray line-through' : 'text-study-dark'}`}>
                  {doc.name}
                </p>
                {doc.hint && !isDone && (
                  <p className="text-xs text-study-orange/90 mt-0.5 truncate">{doc.hint}</p>
                )}
                {doc.deadline && (
                  <p className="text-xs text-study-gray">
                    {/* Lead-time documents are ordered, not submitted, so the
                        date means "start by", not "hand in by". */}
                    {doc.leadTimeDays ? 'Заказать до' : 'Дедлайн'}: {doc.deadline}
                    {doc.deadlineManual && ' · вручную'}
                  </p>
                )}
                <p className="text-xs text-study-gray truncate">
                  Вуз: {doc.targetUniversityName ?? 'Все'}
                </p>
              </button>
              <span className={`text-xs font-medium shrink-0 ${status.color.split(' ')[0]}`}>
                {status.label}
              </span>
              <button
                onClick={() => setDocToDelete(doc)}
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-study-gray hover:text-study-red hover:bg-study-red/10 transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                title="Удалить документ"
                aria-label={`Удалить документ «${doc.name}»`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )
        })}
      </div>}

      {/* Document info — the full name and details, for when the row truncates */}
      {infoDoc && (
        <div
          className="fixed inset-0 bg-study-overlay/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setInfoDoc(null)}
        >
          <div
            className="bg-study-card sm:rounded-2xl rounded-t-2xl card-shadow-hover w-full sm:max-w-md p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-base font-bold text-study-dark leading-snug">{infoDoc.name}</h3>
              <button
                onClick={() => setInfoDoc(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-study-bg shrink-0"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5 text-study-gray" />
              </button>
            </div>

            {infoDoc.hint && (
              <p className="text-sm text-study-orange/90 mb-3 leading-relaxed">{infoDoc.hint}</p>
            )}

            <div className="space-y-1.5 text-sm">
              {infoDoc.deadline && (
                <p className="text-study-dark">
                  {infoDoc.leadTimeDays ? 'Заказать до' : 'Дедлайн'}:{' '}
                  <span className="font-medium">{infoDoc.deadline}</span>
                  {infoDoc.deadlineManual && <span className="text-study-gray"> · вручную</span>}
                </p>
              )}
              <p className="text-study-dark">Вуз: <span className="font-medium">{infoDoc.targetUniversityName ?? 'Все'}</span></p>
              <p className="text-study-gray">
                Статус: {infoDoc.status === 'completed' ? 'Готово' : 'Не готово'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {docToDelete && (
        <div
          className="fixed inset-0 bg-study-overlay/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => !isDeletingDoc && setDocToDelete(null)}
        >
          <div
            className="bg-study-card sm:rounded-2xl rounded-t-2xl card-shadow-hover w-full sm:max-w-sm p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-study-dark">Удалить документ?</h3>
            <p className="text-sm text-study-gray mt-2">
              «{docToDelete.name}» будет удалён из чек-листа
              {docToDelete.fileUrl ? ' вместе с загруженным файлом' : ''}. Отменить это действие нельзя.
            </p>
            {docToDelete.templateKey && (
              <p className="text-xs text-study-gray mt-2">
                Это стандартный документ. Он не вернётся при добавлении новых вузов —
                чтобы он появился снова, добавьте его вручную.
              </p>
            )}
            {deleteError && (
              <p className="text-xs text-study-red mt-3">{deleteError}</p>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setDocToDelete(null)}
                disabled={isDeletingDoc}
                className="flex-1 py-2.5 rounded-xl border border-study-lightgray text-sm font-medium text-study-dark hover:bg-study-bg disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={confirmDeleteDocument}
                disabled={isDeletingDoc}
                className="flex-1 py-2.5 rounded-xl bg-study-red text-white text-sm font-semibold hover:bg-study-red/90 disabled:opacity-50"
              >
                {isDeletingDoc ? 'Удаляем...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {selectedDoc && (
        <div
          className="fixed inset-0 bg-study-overlay/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={closeUploadModal}
        >
          <div
            className="bg-study-card sm:rounded-2xl rounded-t-2xl card-shadow-hover w-full sm:max-w-md animate-in slide-in-from-bottom-10 sm:fade-in sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-study-dark">{selectedDoc.name}</h3>
                  {selectedDoc.deadline && (
                    <p className="text-sm text-study-orange mt-1">Дедлайн: {selectedDoc.deadline}</p>
                  )}
                  {selectedDoc.status === 'uploaded' && (
                    <p className="text-xs font-semibold text-study-brown mt-1">Файл на рассмотрении</p>
                  )}
                  {selectedDoc.status === 'in_progress' && selectedDoc.reviewComment && (
                    <p className="text-xs font-semibold text-study-red mt-1">Загрузка возвращена</p>
                  )}
                </div>
                <button
                  onClick={closeUploadModal}
                  disabled={isUploading || isDeleting}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-study-bg transition-colors shrink-0"
                >
                  <X className="w-5 h-5 text-study-gray" />
                </button>
              </div>

              {selectedDoc.status === 'in_progress' && selectedDoc.reviewComment && (
                <div className="mb-4 p-3 bg-study-red/10 border border-study-red/20 rounded-xl">
                  <p className="text-xs font-semibold text-study-red mb-1">Комментарий консультанта</p>
                  <p className="text-sm text-study-dark">{selectedDoc.reviewComment}</p>
                  {selectedDoc.reviewFileUrl && (
                    <button
                      type="button"
                      onClick={openReviewFile}
                      disabled={isOpening}
                      className="mt-3 inline-flex items-center gap-2 px-3 py-2 bg-study-card border border-study-red/20 rounded-lg text-xs font-semibold text-study-dark hover:bg-study-red/5 disabled:opacity-50"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {isOpening ? 'Открываем...' : selectedDoc.reviewFileName ?? 'Открыть пример'}
                    </button>
                  )}
                </div>
              )}

              {selectedDoc.fileUrl && (
                <div className="mb-4 p-3 bg-study-bg rounded-xl border border-study-lightgray">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-study-brown/10 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-study-brown" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-study-dark truncate">
                        {selectedDoc.fileName ?? 'Загруженный файл'}
                      </p>
                      <p className="text-xs text-study-gray mt-0.5">
                        {selectedDoc.uploadedAt
                          ? `Загружено: ${selectedDoc.uploadedAt}`
                          : 'Файл ожидает проверки консультантом'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={openUploadedFile}
                      disabled={isOpening || isUploading || isDeleting}
                      className="inline-flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold text-study-dark bg-study-card border border-study-lightgray rounded-lg hover:bg-study-bg transition-colors disabled:opacity-50"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {isOpening ? 'Открываем...' : 'Открыть'}
                    </button>
                    <button
                      type="button"
                      onClick={deleteUploadedFile}
                      disabled={isDeleting || isUploading}
                      className="inline-flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold text-study-red bg-study-card border border-study-red/20 rounded-lg hover:bg-study-red/5 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {isDeleting ? 'Удаляем...' : 'Удалить'}
                    </button>
                  </div>
                </div>
              )}

              <label className="relative border-2 border-dashed border-study-lightgray rounded-xl p-6 sm:p-8 flex flex-col items-center gap-3 hover:border-study-green hover:bg-study-green/5 transition-colors cursor-pointer active:bg-study-green/10">
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  className="sr-only"
                  disabled={isUploading || isDeleting}
                  onChange={(event) => {
                    setSelectedFile(event.target.files?.[0] ?? null)
                    setUploadError(null)
                  }}
                />
                <div className="w-12 h-12 rounded-full bg-study-green/10 flex items-center justify-center">
                  <ArrowUp className="w-6 h-6 text-study-green" />
                </div>
                <p className="text-sm font-medium text-study-dark">
                  {selectedFile ? selectedFile.name : 'Нажмите для выбора файла'}
                </p>
                <p className="text-xs text-study-gray">
                  {selectedFile
                    ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} МБ`
                    : selectedDoc.fileUrl
                      ? 'Выберите новый файл, чтобы заменить текущий'
                      : 'PDF, JPG, PNG до 10 МБ'}
                </p>
              </label>

              {uploadError && (
                <div className="mt-3 p-3 bg-study-red/10 border border-study-red/20 rounded-xl">
                  <p className="text-xs text-study-red font-medium">{uploadError}</p>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={closeUploadModal}
                  disabled={isUploading || isDeleting}
                  className="flex-1 py-3 sm:py-2.5 text-sm font-medium text-study-dark bg-study-bg rounded-xl sm:rounded-lg hover:bg-study-lightgray transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={uploadSelectedFile}
                  disabled={!selectedFile || isUploading || isDeleting}
                  className="flex-1 py-3 sm:py-2.5 text-sm font-medium text-white bg-study-green rounded-xl sm:rounded-lg hover:bg-study-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Загрузка...' : selectedDoc.fileUrl ? 'Заменить' : 'Загрузить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddOpen && (
        <div
          className="fixed inset-0 bg-study-overlay/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setIsAddOpen(false)}
        >
          <div
            className="bg-study-card sm:rounded-2xl rounded-t-2xl card-shadow-hover w-full sm:max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6 border-b border-study-lightgray flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-study-dark">Добавить документ</h3>
                <p className="text-sm text-study-gray mt-1">Укажите документ и к какому вузу он относится</p>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="w-8 h-8 rounded-full hover:bg-study-bg flex items-center justify-center">
                <X className="w-5 h-5 text-study-gray" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-3">
              <input
                value={newDocument.name}
                onChange={(event) => setNewDocument((current) => ({ ...current, name: event.target.value }))}
                placeholder="Название документа"
                className="w-full rounded-xl border border-study-lightgray px-4 py-3 text-sm"
              />
              <input
                type="date"
                value={newDocument.deadline}
                onChange={(event) => setNewDocument((current) => ({ ...current, deadline: event.target.value }))}
                className="w-full rounded-xl border border-study-lightgray px-4 py-3 text-sm"
              />
              <select
                value={newDocument.targetUniversityId}
                onChange={(event) => setNewDocument((current) => ({ ...current, targetUniversityId: event.target.value }))}
                className="w-full rounded-xl border border-study-lightgray px-4 py-3 text-sm"
              >
                <option value="all">Все вузы</option>
                {universities.map((university) => (
                  <option key={university.id} value={university.id}>{university.name}</option>
                ))}
              </select>

              {uploadError && <p className="rounded-xl bg-study-red/10 px-3 py-2 text-sm font-semibold text-study-red">{uploadError}</p>}

              <button
                onClick={addDocument}
                disabled={!newDocument.name || isSaving}
                className="w-full rounded-xl bg-study-green text-white py-3 text-sm font-bold disabled:opacity-50"
              >
                {isSaving ? 'Добавляем...' : 'Добавить документ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
