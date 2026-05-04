import { useEffect, useState } from 'react'
import { useApp } from '@/context/AppContext'
import { Check, X, FileText, ArrowUp, ExternalLink, Trash2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { EmptyState, ErrorState, LoadingState } from '@/components/SectionState'
import type { StudentDocument } from '@/types/studytrack'

const statusConfig = {
  not_started: { label: 'Не начато', icon: X, color: 'text-study-gray bg-study-lightgray' },
  in_progress: { label: 'В работе', icon: FileText, color: 'text-study-orange bg-study-orange/10' },
  completed: { label: 'Готово', icon: Check, color: 'text-study-green bg-study-green/10' },
  uploaded: { label: 'На рассмотрении', icon: FileText, color: 'text-study-brown bg-study-brown/10' },
}

export default function Checklist() {
  const { isParentMode } = useApp()
  const [documents, setDocuments] = useState<StudentDocument[]>([])
  const [selectedDoc, setSelectedDoc] = useState<StudentDocument | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

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

  useEffect(() => {
    loadDocuments()
  }, [])

  const openUploadModal = (document: StudentDocument) => {
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

  const completedCount = documents.filter((d) => d.status === 'completed').length
  const progress = documents.length > 0 ? (completedCount / documents.length) * 100 : 0

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl card-shadow p-4 sm:p-6">
        <LoadingState heightClass="h-36" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl card-shadow p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-bold text-study-dark mb-4">
          {isParentMode ? 'Статус документов' : 'Чек-лист документов'}
        </h2>
        <ErrorState title="Документы не загрузились" description={error} onAction={loadDocuments} />
      </div>
    )
  }

  if (isParentMode) {
    return (
      <div className="bg-white rounded-xl card-shadow p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-bold text-study-dark mb-4">Статус документов</h2>
        <div className="flex items-center gap-4 p-3 sm:p-4 bg-study-bg rounded-xl">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-study-green/10 flex items-center justify-center shrink-0">
            <Check className="w-5 h-5 sm:w-6 sm:h-6 text-study-green" />
          </div>
          <div>
            <p className="text-sm font-medium text-study-dark">
              {completedCount} из {documents.length} документов готово
            </p>
            <p className="text-xs text-study-gray mt-0.5">Студент работает над оставшимися документами</p>
          </div>
        </div>
        <div className="mt-4">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-study-gray mt-2 text-right">{Math.round(progress)}%</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl card-shadow p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg font-bold text-study-dark">Чек-лист документов</h2>
        <span className="text-xs text-study-gray">{completedCount}/{documents.length}</span>
      </div>

      <div className="mb-3 sm:mb-4">
        <Progress value={progress} className="h-2" />
      </div>

      {documents.length === 0 && (
        <EmptyState
          title="Чек-лист документов пока пуст"
          description="Когда консультант добавит документы, они появятся здесь."
        />
      )}

      {documents.length > 0 && <div className="space-y-1">
        {documents.map((doc) => {
          const isReturned = doc.status === 'in_progress' && Boolean(doc.reviewComment)
          const visibleComment = Boolean(doc.reviewComment) && doc.status !== 'completed'
          const status = isReturned
            ? { label: 'Возвращено', icon: X, color: 'text-study-red bg-study-red/10' }
            : statusConfig[doc.status]
          const Icon = status.icon
          return (
            <button
              key={doc.id}
              onClick={() => doc.status !== 'completed' && openUploadModal(doc)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-study-bg transition-colors text-left active:bg-study-bg/70"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${status.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${doc.status === 'completed' ? 'text-study-gray line-through' : 'text-study-dark'}`}>
                  {doc.name}
                </p>
                {doc.deadline && (
                  <p className="text-xs text-study-gray">Дедлайн: {doc.deadline}</p>
                )}
                {visibleComment && (
                  <p className="text-xs text-study-red mt-0.5 truncate">Комментарий: {doc.reviewComment}</p>
                )}
              </div>
              <span className={`text-xs font-medium shrink-0 ${status.color.split(' ')[0]}`}>
                {status.label}
              </span>
            </button>
          )
        })}
      </div>}

      {/* Upload Modal */}
      {selectedDoc && (
        <div
          className="fixed inset-0 bg-study-dark/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={closeUploadModal}
        >
          <div
            className="bg-white sm:rounded-2xl rounded-t-2xl card-shadow-hover w-full sm:max-w-md animate-in slide-in-from-bottom-10 sm:fade-in sm:zoom-in-95 duration-200"
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
                      className="mt-3 inline-flex items-center gap-2 px-3 py-2 bg-white border border-study-red/20 rounded-lg text-xs font-semibold text-study-dark hover:bg-study-red/5 disabled:opacity-50"
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
                      className="inline-flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold text-study-dark bg-white border border-study-lightgray rounded-lg hover:bg-study-bg transition-colors disabled:opacity-50"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {isOpening ? 'Открываем...' : 'Открыть'}
                    </button>
                    <button
                      type="button"
                      onClick={deleteUploadedFile}
                      disabled={isDeleting || isUploading}
                      className="inline-flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold text-study-red bg-white border border-study-red/20 rounded-lg hover:bg-study-red/5 transition-colors disabled:opacity-50"
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
    </div>
  )
}
