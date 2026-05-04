import { useEffect, useState } from 'react'
import { AlertCircle, Check, ExternalLink, FileText, GraduationCap, LogOut, RefreshCw, UserPlus, X } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { EmptyState, ErrorState, LoadingState } from '@/components/SectionState'
import type { AdminStudentSummary, AdminUniversity, AdminUpload, ApplicationStatus, DocumentStatus, StudentDocument } from '@/types/studytrack'

const universityStatuses: { value: ApplicationStatus; label: string }[] = [
  { value: 'planned', label: 'В плане' },
  { value: 'applied', label: 'Подана заявка' },
  { value: 'response', label: 'Ответ получен' },
  { value: 'enrolled', label: 'Зачислен' },
  { value: 'rejected', label: 'Отказ' },
]

const documentStatuses: { value: DocumentStatus; label: string }[] = [
  { value: 'not_started', label: 'Не начато' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'uploaded', label: 'На рассмотрении' },
  { value: 'completed', label: 'Готово' },
]

const defaultDocumentOptions = [
  'Аттестат о среднем образовании',
  'Справка о здоровье',
  'Перевод документов',
  'Рекомендательное письмо',
  'Мотивационное письмо',
  'Копия паспорта',
]

const emptyUniversityForm = {
  name: '',
  status: 'planned' as ApplicationStatus,
  deadline: '',
  portalUrl: '',
  consultantNote: '',
}

const emptyDocumentForm = {
  name: '',
  status: 'not_started' as DocumentStatus,
  deadline: '',
  reviewComment: '',
}

type StudentProgram = 'language_year' | 'bachelor' | 'master'

const programLabels: Record<StudentProgram, string> = {
  language_year: 'Language year',
  bachelor: "Bachelor's",
  master: "Master's",
}

const emptyStudentForm = {
  fullName: '',
  email: '',
  password: '',
  age: '',
  program: 'bachelor' as StudentProgram,
  universitiesText: '',
  selectedDocuments: defaultDocumentOptions,
  documentChoice: '',
  customDocument: '',
}

export default function AdminDashboard() {
  const { user, logout } = useApp()
  const [students, setStudents] = useState<AdminStudentSummary[]>([])
  const [selectedStudent, setSelectedStudent] = useState<AdminStudentSummary | null>(null)
  const [activeUniversityId, setActiveUniversityId] = useState<number | null>(null)
  const [studentUniversities, setStudentUniversities] = useState<AdminUniversity[]>([])
  const [universityDrafts, setUniversityDrafts] = useState<Record<number, typeof emptyUniversityForm>>({})
  const [newUniversity, setNewUniversity] = useState(emptyUniversityForm)
  const [studentDocuments, setStudentDocuments] = useState<StudentDocument[]>([])
  const [documentDrafts, setDocumentDrafts] = useState<Record<number, typeof emptyDocumentForm>>({})
  const [newDocument, setNewDocument] = useState(emptyDocumentForm)
  const [uploads, setUploads] = useState<AdminUpload[]>([])
  const [comments, setComments] = useState<Record<number, string>>({})
  const [reviewFiles, setReviewFiles] = useState<Record<number, File | null>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [isStudentLoading, setIsStudentLoading] = useState(false)
  const [studentError, setStudentError] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newStudent, setNewStudent] = useState(emptyStudentForm)
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreatingStudent, setIsCreatingStudent] = useState(false)

  const loadDashboard = () => {
    setIsLoading(true)
    setError(null)

    Promise.all([
      fetch('/api/admin/students').then((response) => {
        if (!response.ok) {
          return response.json().catch(() => null).then((data) => {
            throw new Error(data?.error ?? 'Не удалось загрузить студентов')
          })
        }
        return response.json()
      }),
      fetch('/api/admin/uploads').then((response) => {
        if (!response.ok) {
          return response.json().catch(() => null).then((data) => {
            throw new Error(data?.error ?? 'Не удалось загрузить новые файлы')
          })
        }
        return response.json()
      }),
    ])
      .then(([studentsData, uploadsData]) => {
        const nextStudents = studentsData.students ?? []
        const nextUploads = uploadsData.uploads ?? []
        setStudents(nextStudents)
        setSelectedStudent((current) =>
          current ? nextStudents.find((student: AdminStudentSummary) => student.id === current.id) ?? current : current
        )
        setUploads(nextUploads)
        setComments(
          Object.fromEntries(nextUploads.map((upload: AdminUpload) => [upload.id, upload.reviewComment ?? '']))
        )
        setReviewFiles({})
      })
      .catch((err) => {
        setStudents([])
        setUploads([])
        setError(err instanceof Error ? err.message : 'Не удалось загрузить админ-панель')
      })
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const openFile = async (upload: AdminUpload) => {
    setBusyId(upload.id)
    try {
      const response = await fetch(`/api/admin/documents/${upload.id}/file`)
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error ?? 'Не удалось открыть файл')
      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось открыть файл')
    } finally {
      setBusyId(null)
    }
  }

  const reviewUpload = async (upload: AdminUpload, decision: 'approve' | 'reject') => {
    setBusyId(upload.id)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('decision', decision)
      formData.append('reviewComment', comments[upload.id] ?? '')
      const reviewFile = reviewFiles[upload.id]
      if (reviewFile) formData.append('reviewFile', reviewFile)

      const response = await fetch(`/api/admin/documents/${upload.id}/review`, {
        method: 'PATCH',
        body: formData,
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error ?? 'Не удалось сохранить решение')
      setUploads((current) => current.filter((item) => item.id !== upload.id))
      loadDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить решение')
    } finally {
      setBusyId(null)
    }
  }

  const loadStudentUniversities = (student: AdminStudentSummary) => {
    setSelectedStudent(student)
    setActiveUniversityId(null)
    setIsStudentLoading(true)
    setStudentError(null)

    Promise.all([
      fetch(`/api/admin/students/${student.id}/universities`, { credentials: 'same-origin' }).then((response) => {
        if (!response.ok) {
          return response.json().catch(() => null).then((data) => {
            throw new Error(data?.error === 'Unauthorized' ? 'Сессия админа истекла. Выйдите и войдите как admin@gmail.com.' : data?.error ?? 'Не удалось загрузить вузы')
          })
        }
        return response.json()
      }),
      fetch(`/api/admin/students/${student.id}/documents`, { credentials: 'same-origin' }).then((response) => {
        if (!response.ok) {
          return response.json().catch(() => null).then((data) => {
            throw new Error(data?.error === 'Unauthorized' ? 'Сессия админа истекла. Выйдите и войдите как admin@gmail.com.' : data?.error ?? 'Не удалось загрузить документы')
          })
        }
        return response.json()
      }),
    ])
      .then(([universitiesData, documentsData]) => {
        const universities = universitiesData.universities ?? []
        const documents = documentsData.documents ?? []
        setStudentUniversities(universities)
        setActiveUniversityId(universities[0]?.id ?? null)
        setUniversityDrafts(
          Object.fromEntries(
            universities.map((university: AdminUniversity) => [
              university.id,
              {
                name: university.name,
                status: university.status,
                deadline: university.rawDeadline ?? '',
                portalUrl: university.portalUrl ?? '',
                consultantNote: university.consultantNote ?? '',
              },
            ])
          )
        )
        setStudentDocuments(documents)
        setDocumentDrafts(
          Object.fromEntries(
            documents.map((document: StudentDocument) => [
              document.id,
              {
                name: document.name,
                status: document.status,
                deadline: document.rawDeadline ?? '',
                reviewComment: document.reviewComment ?? '',
              },
            ])
          )
        )
      })
      .catch((err) => {
        setStudentUniversities([])
        setUniversityDrafts({})
        setStudentDocuments([])
        setDocumentDrafts({})
        setStudentError(err instanceof Error ? err.message : 'Не удалось загрузить вузы')
      })
      .finally(() => setIsStudentLoading(false))
  }

  const updateUniversityDraft = (id: number, field: keyof typeof emptyUniversityForm, value: string) => {
    setUniversityDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [field]: value,
      },
    }))
  }

  const updateDocumentDraft = (id: number, field: keyof typeof emptyDocumentForm, value: string) => {
    setDocumentDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [field]: value,
      },
    }))
  }

  const saveUniversity = async (university: AdminUniversity) => {
    const draft = universityDrafts[university.id]
    if (!draft) return

    setBusyId(university.id)
    setStudentError(null)

    try {
      const response = await fetch(`/api/admin/universities/${university.id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error ?? 'Не удалось сохранить вуз')
      setStudentUniversities((current) =>
        current.map((item) => (item.id === data.university.id ? data.university : item))
      )
      loadDashboard()
    } catch (err) {
      setStudentError(err instanceof Error ? err.message : 'Не удалось сохранить вуз')
    } finally {
      setBusyId(null)
    }
  }

  const deleteUniversity = async (university: AdminUniversity) => {
    setBusyId(university.id)
    setStudentError(null)

    try {
      const response = await fetch(`/api/admin/universities/${university.id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error ?? 'Не удалось удалить вуз')
      setStudentUniversities((current) => current.filter((item) => item.id !== university.id))
      loadDashboard()
    } catch (err) {
      setStudentError(err instanceof Error ? err.message : 'Не удалось удалить вуз')
    } finally {
      setBusyId(null)
    }
  }

  const addUniversity = async () => {
    if (!selectedStudent) return
    setBusyId(-1)
    setStudentError(null)

    try {
      const response = await fetch(`/api/admin/students/${selectedStudent.id}/universities`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUniversity),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error ?? 'Не удалось добавить вуз')
      setStudentUniversities((current) => [...current, data.university])
      setUniversityDrafts((current) => ({
        ...current,
        [data.university.id]: {
          name: data.university.name,
          status: data.university.status,
          deadline: data.university.rawDeadline ?? '',
          portalUrl: data.university.portalUrl ?? '',
          consultantNote: data.university.consultantNote ?? '',
        },
      }))
      setNewUniversity(emptyUniversityForm)
      loadDashboard()
    } catch (err) {
      setStudentError(err instanceof Error ? err.message : 'Не удалось добавить вуз')
    } finally {
      setBusyId(null)
    }
  }

  const addDocument = async () => {
    if (!selectedStudent) return
    setBusyId(-2)
    setStudentError(null)

    try {
      const response = await fetch(`/api/admin/students/${selectedStudent.id}/documents`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDocument),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error ?? 'Не удалось добавить документ')
      setStudentDocuments((current) => [...current, data.document])
      setDocumentDrafts((current) => ({
        ...current,
        [data.document.id]: {
          name: data.document.name,
          status: data.document.status,
          deadline: data.document.rawDeadline ?? '',
          reviewComment: data.document.reviewComment ?? '',
        },
      }))
      setNewDocument(emptyDocumentForm)
      loadDashboard()
    } catch (err) {
      setStudentError(err instanceof Error ? err.message : 'Не удалось добавить документ')
    } finally {
      setBusyId(null)
    }
  }

  const saveDocument = async (document: StudentDocument) => {
    const draft = documentDrafts[document.id]
    if (!draft) return

    setBusyId(document.id)
    setStudentError(null)

    try {
      const response = await fetch(`/api/admin/documents/${document.id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error ?? 'Не удалось сохранить документ')
      setStudentDocuments((current) =>
        current.map((item) => (item.id === data.document.id ? data.document : item))
      )
      loadDashboard()
    } catch (err) {
      setStudentError(err instanceof Error ? err.message : 'Не удалось сохранить документ')
    } finally {
      setBusyId(null)
    }
  }

  const deleteDocument = async (document: StudentDocument) => {
    setBusyId(document.id)
    setStudentError(null)

    try {
      const response = await fetch(`/api/admin/documents/${document.id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error ?? 'Не удалось удалить документ')
      setStudentDocuments((current) => current.filter((item) => item.id !== document.id))
      loadDashboard()
    } catch (err) {
      setStudentError(err instanceof Error ? err.message : 'Не удалось удалить документ')
    } finally {
      setBusyId(null)
    }
  }

  const createStudent = async () => {
    setIsCreatingStudent(true)
    setCreateError(null)

    try {
      const response = await fetch('/api/admin/students/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: newStudent.fullName,
          email: newStudent.email,
          password: newStudent.password,
          age: newStudent.age,
          program: newStudent.program,
          documents: newStudent.selectedDocuments,
          universities: newStudent.universitiesText
            .split('\n')
            .map((name) => name.trim())
            .filter(Boolean),
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error ?? 'Не удалось создать студента')

      setNewStudent(emptyStudentForm)
      setIsCreateOpen(false)
      loadDashboard()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Не удалось создать студента')
    } finally {
      setIsCreatingStudent(false)
    }
  }

  const addDocumentToNewStudent = (documentName: string) => {
    const name = documentName.trim()
    if (!name) return

    setNewStudent((current) => ({
      ...current,
      selectedDocuments: current.selectedDocuments.includes(name)
        ? current.selectedDocuments
        : [...current.selectedDocuments, name],
      documentChoice: '',
      customDocument: '',
    }))
  }

  const removeDocumentFromNewStudent = (documentName: string) => {
    setNewStudent((current) => ({
      ...current,
      selectedDocuments: current.selectedDocuments.filter((name) => name !== documentName),
    }))
  }

  return (
    <div className="min-h-screen bg-study-bg p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-study-dark">Админ-панель</h1>
            <p className="text-sm text-study-gray mt-1">Студенты, статусы и новые загрузки</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadDashboard}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg card-shadow text-sm font-semibold text-study-dark"
            >
              <RefreshCw className="w-4 h-4" />
              Обновить
            </button>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg card-shadow text-sm font-semibold text-study-dark"
            >
              <LogOut className="w-4 h-4" />
              Выйти
            </button>
          </div>
        </div>

        {isLoading && <div className="bg-white rounded-xl card-shadow p-4 sm:p-6"><LoadingState heightClass="h-56" /></div>}
        {!isLoading && error && <ErrorState title="Ошибка админ-панели" description={error} onAction={loadDashboard} />}

        {!isLoading && !error && (
          <div className="grid lg:grid-cols-[1fr_460px] gap-5">
            <div className="space-y-5">
              <div className="bg-white rounded-xl card-shadow p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-study-dark">Добавить студента</h2>
                    <p className="text-sm text-study-gray">Аккаунт, профиль, пакет документов и список вузов</p>
                  </div>
                  <button
                    onClick={() => setIsCreateOpen((current) => !current)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-study-brown text-white text-sm font-semibold"
                  >
                    <UserPlus className="w-4 h-4" />
                    Новый студент
                  </button>
                </div>

                {isCreateOpen && (
                  <div className="mt-4 grid md:grid-cols-2 gap-3">
                    <input
                      value={newStudent.fullName}
                      onChange={(event) => setNewStudent((current) => ({ ...current, fullName: event.target.value }))}
                      placeholder="Имя студента"
                      className="rounded-lg border border-study-lightgray px-3 py-2 text-sm"
                    />
                    <input
                      value={newStudent.email}
                      onChange={(event) => setNewStudent((current) => ({ ...current, email: event.target.value }))}
                      placeholder="Email"
                      className="rounded-lg border border-study-lightgray px-3 py-2 text-sm"
                    />
                    <input
                      type="password"
                      value={newStudent.password}
                      onChange={(event) => setNewStudent((current) => ({ ...current, password: event.target.value }))}
                      placeholder="Пароль"
                      className="rounded-lg border border-study-lightgray px-3 py-2 text-sm"
                    />
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      <input
                        type="number"
                        min="1"
                        value={newStudent.age}
                        onChange={(event) => setNewStudent((current) => ({ ...current, age: event.target.value }))}
                        placeholder="Возраст"
                        className="rounded-lg border border-study-lightgray px-3 py-2 text-sm"
                      />
                      <select
                        value={newStudent.program}
                        onChange={(event) => setNewStudent((current) => ({ ...current, program: event.target.value as StudentProgram }))}
                        className="rounded-lg border border-study-lightgray px-3 py-2 text-sm"
                      >
                        {Object.entries(programLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      value={newStudent.universitiesText}
                      onChange={(event) => setNewStudent((current) => ({ ...current, universitiesText: event.target.value }))}
                      placeholder="Желаемые вузы, каждый с новой строки"
                      className="md:col-span-2 min-h-[96px] rounded-lg border border-study-lightgray px-3 py-2 text-sm resize-none"
                    />
                    <div className="md:col-span-2 rounded-xl border border-study-lightgray p-3">
                      <div className="grid sm:grid-cols-[1fr_auto] gap-2">
                        <select
                          value={newStudent.documentChoice}
                          onChange={(event) => {
                            const value = event.target.value
                            setNewStudent((current) => ({ ...current, documentChoice: value }))
                            if (value && value !== 'other') addDocumentToNewStudent(value)
                          }}
                          className="rounded-lg border border-study-lightgray px-3 py-2 text-sm"
                        >
                          <option value="">Выбрать документ из пакета</option>
                          {defaultDocumentOptions.map((documentName) => (
                            <option key={documentName} value={documentName}>{documentName}</option>
                          ))}
                          <option value="other">Другое</option>
                        </select>
                        <button
                          onClick={() => setNewStudent((current) => ({ ...current, selectedDocuments: defaultDocumentOptions }))}
                          type="button"
                          className="rounded-lg bg-study-bg text-study-dark text-sm font-semibold px-3 py-2"
                        >
                          Весь пакет
                        </button>
                      </div>

                      {newStudent.documentChoice === 'other' && (
                        <div className="grid sm:grid-cols-[1fr_auto] gap-2 mt-2">
                          <input
                            value={newStudent.customDocument}
                            onChange={(event) => setNewStudent((current) => ({ ...current, customDocument: event.target.value }))}
                            placeholder="Название документа"
                            className="rounded-lg border border-study-lightgray px-3 py-2 text-sm"
                          />
                          <button
                            onClick={() => addDocumentToNewStudent(newStudent.customDocument)}
                            disabled={!newStudent.customDocument.trim()}
                            type="button"
                            className="rounded-lg bg-study-green text-white text-sm font-semibold px-3 py-2 disabled:opacity-50"
                          >
                            Добавить
                          </button>
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {newStudent.selectedDocuments.map((documentName) => (
                          <button
                            key={documentName}
                            type="button"
                            onClick={() => removeDocumentFromNewStudent(documentName)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-study-bg px-2.5 py-1.5 text-xs font-semibold text-study-dark"
                            title="Убрать документ"
                          >
                            {documentName}
                            <X className="w-3 h-3 text-study-gray" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <p className="text-xs text-study-gray">Будет добавлено документов: {newStudent.selectedDocuments.length}</p>
                      <button
                        onClick={createStudent}
                        disabled={isCreatingStudent || !newStudent.fullName || !newStudent.email || !newStudent.password || newStudent.selectedDocuments.length === 0}
                        className="rounded-lg bg-study-green text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
                      >
                        Создать аккаунт
                      </button>
                    </div>
                    {createError && (
                      <div className="md:col-span-2 rounded-lg bg-study-red/10 px-3 py-2 text-sm font-semibold text-study-red">
                        {createError}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl card-shadow p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-study-dark">Студенты</h2>
                <span className="text-sm text-study-gray">{students.length}</span>
              </div>

              {students.length === 0 ? (
                <EmptyState title="Студентов пока нет" description="Когда появятся клиенты, они будут здесь." />
              ) : (
                <div className="space-y-3">
                  {students.map((student) => {
                    const progress = student.documentsTotal > 0
                      ? Math.round((student.documentsCompleted / student.documentsTotal) * 100)
                      : 0

                    return (
                      <button
                        key={student.id}
                        onClick={() => loadStudentUniversities(student)}
                        className={`w-full text-left border rounded-xl p-4 transition-colors ${
                          selectedStudent?.id === student.id
                            ? 'border-study-brown bg-study-brown/5'
                            : 'border-study-lightgray hover:bg-study-bg'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-study-green/10 flex items-center justify-center shrink-0">
                              <GraduationCap className="w-5 h-5 text-study-green" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-study-dark truncate">{student.fullName}</p>
                              <p className="text-sm text-study-gray truncate">{student.email}</p>
                              {(student.program || student.age) && (
                                <p className="text-xs text-study-gray mt-1">
                                  {student.program ? programLabels[student.program] : 'Программа не указана'}
                                  {student.age ? ` · ${student.age}` : ''}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:w-[520px]">
                            <div className="bg-study-bg rounded-lg p-2">
                              <p className="text-[11px] text-study-gray">Документы</p>
                              <p className="text-sm font-bold text-study-dark">{student.documentsCompleted}/{student.documentsTotal}</p>
                            </div>
                            <div className="bg-study-bg rounded-lg p-2">
                              <p className="text-[11px] text-study-gray">Прогресс</p>
                              <p className="text-sm font-bold text-study-dark">{progress}%</p>
                            </div>
                            <div className="bg-study-bg rounded-lg p-2">
                              <p className="text-[11px] text-study-gray">Вузы</p>
                              <p className="text-sm font-bold text-study-dark">{student.universitiesTotal}</p>
                            </div>
                            <div className={`rounded-lg p-2 ${student.documentsPendingReview > 0 ? 'bg-study-orange/10' : 'bg-study-bg'}`}>
                              <p className="text-[11px] text-study-gray">Проверка</p>
                              <p className={`text-sm font-bold ${student.documentsPendingReview > 0 ? 'text-study-orange' : 'text-study-dark'}`}>
                                {student.documentsPendingReview}
                              </p>
                            </div>
                          </div>
                          {student.urgentDeadlines > 0 && (
                            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-study-orange">
                              <AlertCircle className="w-3.5 h-3.5" />
                              {student.urgentDeadlines}
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
              </div>
            </div>

            <div className="bg-white rounded-xl card-shadow p-4 sm:p-6 h-fit">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-study-dark">Новые загрузки</h2>
                <span className="text-sm text-study-gray">{uploads.length}</span>
              </div>

              {uploads.length === 0 ? (
                <EmptyState title="Новых загрузок нет" description="Когда студент загрузит файл, он появится здесь." />
              ) : (
                <div className="space-y-3">
                  {uploads.map((upload) => (
                    <div key={upload.id} className="border border-study-lightgray rounded-xl p-4">
                      <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-study-brown/10 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-study-brown" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-study-dark">{upload.name}</p>
                        <p className="text-sm text-study-gray mt-0.5">
                          {upload.student.fullName} · {upload.student.email}
                        </p>
                        <p className="text-xs text-study-gray mt-1">
                          {upload.fileName ?? 'Файл'}{upload.uploadedAt ? ` · ${upload.uploadedAt}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="w-full space-y-2">
                      <textarea
                        value={comments[upload.id] ?? ''}
                        onChange={(event) =>
                          setComments((current) => ({ ...current, [upload.id]: event.target.value }))
                        }
                        placeholder="Комментарий студенту"
                        className="w-full min-h-[82px] resize-none rounded-lg border border-study-lightgray bg-study-bg px-3 py-2 text-sm text-study-dark focus:outline-none focus:border-study-brown"
                      />
                      <label className="block rounded-lg border border-dashed border-study-lightgray bg-study-bg px-3 py-2 cursor-pointer hover:border-study-brown transition-colors">
                        <input
                          type="file"
                          accept="application/pdf,image/jpeg,image/png"
                          className="sr-only"
                          onChange={(event) =>
                            setReviewFiles((current) => ({
                              ...current,
                              [upload.id]: event.target.files?.[0] ?? null,
                            }))
                          }
                        />
                        <span className="text-xs font-semibold text-study-dark">
                          {reviewFiles[upload.id]?.name ?? 'Прикрепить пример файла'}
                        </span>
                        <span className="block text-[11px] text-study-gray mt-0.5">PDF, JPG, PNG до 10 МБ</span>
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => openFile(upload)}
                          disabled={busyId === upload.id}
                          className="inline-flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border border-study-lightgray text-xs font-semibold text-study-dark hover:bg-study-bg disabled:opacity-50"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Файл
                        </button>
                        <button
                          onClick={() => reviewUpload(upload, 'reject')}
                          disabled={busyId === upload.id}
                          className="inline-flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-study-red/10 text-xs font-semibold text-study-red hover:bg-study-red/15 disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          Вернуть
                        </button>
                        <button
                          onClick={() => reviewUpload(upload, 'approve')}
                          disabled={busyId === upload.id}
                          className="inline-flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-study-green text-xs font-semibold text-white hover:bg-study-green/90 disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Одобрить
                        </button>
                      </div>
                    </div>
                  </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!isLoading && !error && selectedStudent && (
          <div className="mt-5 bg-white rounded-xl card-shadow p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-study-dark">{selectedStudent.fullName}</h2>
                <p className="text-sm text-study-gray">{selectedStudent.email}</p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-study-bg text-sm font-semibold text-study-dark"
              >
                Закрыть
              </button>
            </div>

            {isStudentLoading && <LoadingState heightClass="h-32" />}
            {!isStudentLoading && studentError && (
              <ErrorState title="Вузы не загрузились" description={studentError} onAction={() => loadStudentUniversities(selectedStudent)} />
            )}

            {!isStudentLoading && !studentError && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold text-study-dark">Вузы</h3>
                    <span className="text-xs text-study-gray">Нажмите на вуз, чтобы открыть детали</span>
                  </div>

                  <div className="grid md:grid-cols-5 gap-2 p-3 rounded-xl bg-study-bg mb-3">
                    <input
                      value={newUniversity.name}
                      onChange={(event) => setNewUniversity((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Название вуза"
                      className="rounded-lg border border-study-lightgray px-3 py-2 text-sm"
                    />
                    <select
                      value={newUniversity.status}
                      onChange={(event) => setNewUniversity((current) => ({ ...current, status: event.target.value as ApplicationStatus }))}
                      className="rounded-lg border border-study-lightgray px-3 py-2 text-sm"
                    >
                      {universityStatuses.map((status) => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={newUniversity.deadline}
                      onChange={(event) => setNewUniversity((current) => ({ ...current, deadline: event.target.value }))}
                      className="rounded-lg border border-study-lightgray px-3 py-2 text-sm"
                    />
                    <input
                      value={newUniversity.portalUrl}
                      onChange={(event) => setNewUniversity((current) => ({ ...current, portalUrl: event.target.value }))}
                      placeholder="Портал"
                      className="rounded-lg border border-study-lightgray px-3 py-2 text-sm"
                    />
                    <button
                      onClick={addUniversity}
                      disabled={!newUniversity.name || busyId === -1}
                      className="rounded-lg bg-study-green text-white text-sm font-semibold px-3 py-2 disabled:opacity-50"
                    >
                      Добавить
                    </button>
                  </div>

                  {studentUniversities.length === 0 ? (
                    <EmptyState title="Вузов пока нет" description="Добавьте первый вуз для этого студента." />
                  ) : (
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {studentUniversities.map((university) => {
                        const draft = universityDrafts[university.id]
                        if (!draft) return null
                        const active = activeUniversityId === university.id
                        const uploadedCount = studentDocuments.filter((document) => document.status === 'uploaded' || document.status === 'completed').length

                        return (
                          <button
                            key={university.id}
                            onClick={() => setActiveUniversityId(university.id)}
                            className={`text-left rounded-xl border p-4 transition-colors ${
                              active ? 'border-study-brown bg-study-brown/5' : 'border-study-lightgray hover:bg-study-bg'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-bold text-study-dark truncate">{university.name}</p>
                                <p className="text-xs text-study-gray mt-1">{universityStatuses.find((status) => status.value === university.status)?.label}</p>
                              </div>
                              <span className="text-xs font-bold text-study-brown">{uploadedCount}/{studentDocuments.length}</span>
                            </div>
                            {university.deadline && <p className="text-xs text-study-gray mt-3">Дедлайн: {university.deadline}</p>}
                            {university.consultantNote && <p className="text-xs text-study-gray mt-2 line-clamp-2">{university.consultantNote}</p>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {activeUniversityId && (
                  <div className="grid xl:grid-cols-[420px_1fr] gap-4">
                    {studentUniversities.map((university) => {
                      if (university.id !== activeUniversityId) return null
                      const draft = universityDrafts[university.id]
                      if (!draft) return null

                      return (
                        <div key={university.id} className="rounded-xl border border-study-lightgray p-4">
                          <h3 className="text-base font-bold text-study-dark mb-3">Детали вуза</h3>
                          <div className="space-y-2">
                            <input
                              value={draft.name}
                              onChange={(event) => updateUniversityDraft(university.id, 'name', event.target.value)}
                              className="w-full rounded-lg border border-study-lightgray px-3 py-2 text-sm"
                            />
                            <select
                              value={draft.status}
                              onChange={(event) => updateUniversityDraft(university.id, 'status', event.target.value)}
                              className="w-full rounded-lg border border-study-lightgray px-3 py-2 text-sm"
                            >
                              {universityStatuses.map((status) => (
                                <option key={status.value} value={status.value}>{status.label}</option>
                              ))}
                            </select>
                            <input
                              type="date"
                              value={draft.deadline}
                              onChange={(event) => updateUniversityDraft(university.id, 'deadline', event.target.value)}
                              className="w-full rounded-lg border border-study-lightgray px-3 py-2 text-sm"
                            />
                            <input
                              value={draft.portalUrl}
                              onChange={(event) => updateUniversityDraft(university.id, 'portalUrl', event.target.value)}
                              placeholder="Портал"
                              className="w-full rounded-lg border border-study-lightgray px-3 py-2 text-sm"
                            />
                            <textarea
                              value={draft.consultantNote}
                              onChange={(event) => updateUniversityDraft(university.id, 'consultantNote', event.target.value)}
                              placeholder="Комментарий по вузу"
                              className="w-full min-h-[92px] rounded-lg border border-study-lightgray px-3 py-2 text-sm resize-none"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => saveUniversity(university)}
                                disabled={busyId === university.id}
                                className="rounded-lg bg-study-brown text-white text-sm font-semibold px-3 py-2 disabled:opacity-50"
                              >
                                Сохранить
                              </button>
                              <button
                                onClick={() => deleteUniversity(university)}
                                disabled={busyId === university.id}
                                className="rounded-lg bg-study-red/10 text-study-red text-sm font-semibold px-3 py-2 disabled:opacity-50"
                              >
                                Удалить
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    <div className="rounded-xl border border-study-lightgray p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-bold text-study-dark">Документы студента</h3>
                        <span className="text-xs text-study-gray">
                          {studentDocuments.filter((document) => document.status === 'completed').length}/{studentDocuments.length}
                        </span>
                      </div>

                      <div className="grid md:grid-cols-[1fr_150px_160px_auto] gap-2 p-3 rounded-xl bg-study-bg mb-3">
                        <input
                          value={newDocument.name}
                          onChange={(event) => setNewDocument((current) => ({ ...current, name: event.target.value }))}
                          placeholder="Новый документ"
                          className="rounded-lg border border-study-lightgray px-3 py-2 text-sm"
                        />
                        <select
                          value={newDocument.status}
                          onChange={(event) => setNewDocument((current) => ({ ...current, status: event.target.value as DocumentStatus }))}
                          className="rounded-lg border border-study-lightgray px-3 py-2 text-sm"
                        >
                          {documentStatuses.map((status) => (
                            <option key={status.value} value={status.value}>{status.label}</option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={newDocument.deadline}
                          onChange={(event) => setNewDocument((current) => ({ ...current, deadline: event.target.value }))}
                          className="rounded-lg border border-study-lightgray px-3 py-2 text-sm"
                        />
                        <button
                          onClick={addDocument}
                          disabled={!newDocument.name || busyId === -2}
                          className="rounded-lg bg-study-green text-white text-sm font-semibold px-3 py-2 disabled:opacity-50"
                        >
                          Добавить
                        </button>
                        <textarea
                          value={newDocument.reviewComment}
                          onChange={(event) => setNewDocument((current) => ({ ...current, reviewComment: event.target.value }))}
                          placeholder="Комментарий по документу"
                          className="md:col-span-4 rounded-lg border border-study-lightgray px-3 py-2 text-sm resize-none"
                        />
                      </div>

                      {studentDocuments.length === 0 ? (
                        <EmptyState title="Документы пока не заданы" description="Добавьте список документов для загрузки студентом." />
                      ) : (
                        <div className="space-y-3">
                          {studentDocuments.map((document) => {
                            const draft = documentDrafts[document.id]
                            if (!draft) return null

                            return (
                              <div key={document.id} className="rounded-xl border border-study-lightgray p-3">
                                <div className="grid md:grid-cols-[1fr_150px_160px_170px] gap-2">
                                  <input
                                    value={draft.name}
                                    onChange={(event) => updateDocumentDraft(document.id, 'name', event.target.value)}
                                    className="rounded-lg border border-study-lightgray px-3 py-2 text-sm"
                                  />
                                  <select
                                    value={draft.status}
                                    onChange={(event) => updateDocumentDraft(document.id, 'status', event.target.value)}
                                    className="rounded-lg border border-study-lightgray px-3 py-2 text-sm"
                                  >
                                    {documentStatuses.map((status) => (
                                      <option key={status.value} value={status.value}>{status.label}</option>
                                    ))}
                                  </select>
                                  <input
                                    type="date"
                                    value={draft.deadline}
                                    onChange={(event) => updateDocumentDraft(document.id, 'deadline', event.target.value)}
                                    className="rounded-lg border border-study-lightgray px-3 py-2 text-sm"
                                  />
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      onClick={() => saveDocument(document)}
                                      disabled={busyId === document.id}
                                      className="rounded-lg bg-study-brown text-white text-sm font-semibold px-3 py-2 disabled:opacity-50"
                                    >
                                      Сохранить
                                    </button>
                                    <button
                                      onClick={() => deleteDocument(document)}
                                      disabled={busyId === document.id}
                                      className="rounded-lg bg-study-red/10 text-study-red text-sm font-semibold px-3 py-2 disabled:opacity-50"
                                    >
                                      Удалить
                                    </button>
                                  </div>
                                  <textarea
                                    value={draft.reviewComment}
                                    onChange={(event) => updateDocumentDraft(document.id, 'reviewComment', event.target.value)}
                                    placeholder="Комментарий студенту"
                                    className="md:col-span-4 rounded-lg border border-study-lightgray px-3 py-2 text-sm resize-none"
                                  />
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-study-gray">
                                  <span>Файл: {document.fileName ?? 'не загружен'}</span>
                                  {document.uploadedAt && <span>Загружен: {document.uploadedAt}</span>}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
