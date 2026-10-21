import { useEffect, useState } from 'react'
import { AlertCircle, Check, ChevronLeft, ChevronRight, GraduationCap, KeyRound, LogOut, RefreshCw, Search, Trash2, UserPlus, X } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { EmptyState, ErrorState, LoadingState } from '@/components/SectionState'
import UniversityBankTool from '@/sections/admin/UniversityBankTool'
import LkEditor from '@/sections/admin/LkEditor'
import StudentCard from '@/sections/admin/StudentCard'
import type { LkCard } from '@/lib/lk/types'
import UserAccessTools from '@/sections/admin/UserAccessTools'
import AccountPassword from '@/sections/admin/AccountPassword'
import Dashboard from '@/sections/admin/dashboard/Dashboard'
import type { AdminStudentSummary } from '@/types/studytrack'

type StudentProgram = 'language_year' | 'bachelor' | 'master'

const programLabels: Record<StudentProgram, string> = {
  language_year: 'Language year',
  bachelor: "Bachelor's",
  master: "Master's",
}

// Email + password are required; name, age and program are optional and can
// be filled in later in the ЛК editor.
const emptyStudentForm = {
  fullName: '',
  email: '',
  password: '',
  age: '',
  program: 'bachelor' as StudentProgram,
}

type AdminTab = 'dashboard' | 'premium' | 'diy' | 'shortlists'

export default function AdminDashboard() {
  const { user, logout } = useApp()
  // Iana starts her day on the dashboard.
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard')
  const [students, setStudents] = useState<AdminStudentSummary[]>([])
  const [selectedStudent, setSelectedStudent] = useState<AdminStudentSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newStudent, setNewStudent] = useState(emptyStudentForm)
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreatingStudent, setIsCreatingStudent] = useState(false)
  const [diyPinInputs, setDiyPinInputs] = useState<Record<string, string>>({})
  const [diyPinSaved, setDiyPinSaved] = useState<Record<string, boolean>>({})
  const [diyPinErrors, setDiyPinErrors] = useState<Record<string, string>>({})
  const [payOpen, setPayOpen] = useState<Record<string, boolean>>({})
  // DIY rows: «Логин и пароль» panel open per student.
  const [loginOpen, setLoginOpen] = useState<Record<string, boolean>>({})
  // ЛК facts for the premium cards (photo, track, major, progress).
  const [lkCards, setLkCards] = useState<Record<string, LkCard>>({})

  // The API returns students newest first. Search by name or email, then page.
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const q = query.trim().toLowerCase()
  const tabStudents = students.filter((s) => s.serviceType === adminTab)
  const filteredStudents = q ? tabStudents.filter((s) => s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)) : tabStudents
  const perPage = adminTab === 'premium' ? 6 : 20
  const pageCount = Math.max(1, Math.ceil(filteredStudents.length / perPage))
  const currentPage = Math.min(page, pageCount - 1)
  const pageStudents = filteredStudents.slice(currentPage * perPage, (currentPage + 1) * perPage)
  useEffect(() => { setPage(0) }, [q, adminTab])

  const loadLkCards = () => {
    // Separate from the main load: a ЛК hiccup must not hide the student list.
    fetch('/api/admin/lk', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.cards) setLkCards(d.cards) })
      .catch(() => {})
  }

  const loadDashboard = () => {
    setIsLoading(true)
    setError(null)
    loadLkCards()

    fetch('/api/admin/students')
      .then((response) => {
        if (!response.ok) {
          return response.json().catch(() => null).then((data) => {
            throw new Error(data?.error ?? 'Не удалось загрузить студентов')
          })
        }
        return response.json()
      })
      .then((studentsData) => {
        const nextStudents = studentsData.students ?? []
        setStudents(nextStudents)
        setSelectedStudent((current) =>
          current ? nextStudents.find((student: AdminStudentSummary) => student.id === current.id) ?? current : current
        )
      })
      .catch((err) => {
        setStudents([])
        setError(err instanceof Error ? err.message : 'Не удалось загрузить админ-панель')
      })
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const openStudent = (student: AdminStudentSummary) => {
    setSelectedStudent(student)
    // The panel renders under the list: bring it into view.
    window.setTimeout(() => document.getElementById('student-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
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
          // Created from the premium tab = a paid student. Without this the
          // route defaults to 'diy' and the student lands in the other tab.
          serviceType: adminTab === 'premium' ? 'premium' : 'diy',
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error ?? 'Не удалось создать студента')
      // The account exists; only the admin copy of the password failed.
      if (data?.passwordWarning) alert(data.passwordWarning)

      setNewStudent(emptyStudentForm)
      setIsCreateOpen(false)
      loadDashboard()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Не удалось создать студента')
    } finally {
      setIsCreatingStudent(false)
    }
  }

  const updateDiySubscription = async (studentId: string, pinCode: string) => {
    setDiyPinErrors((current) => ({ ...current, [studentId]: '' }))
    try {
      const response = await fetch('/api/admin/students/update-subscription', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          subscriptionStatus: 'trial',
          pinCode: pinCode.trim(),
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error ?? 'Не удалось сохранить PIN')

      setStudents((current) =>
        current.map((s) =>
          s.id === studentId ? { ...s, subscriptionStatus: 'trial' as const, pinCode: pinCode.trim() || null } : s
        )
      )
      setDiyPinInputs((current) => ({ ...current, [studentId]: '' }))
      setDiyPinSaved((current) => ({ ...current, [studentId]: true }))
      setTimeout(() => setDiyPinSaved((current) => ({ ...current, [studentId]: false })), 2000)
    } catch (err) {
      setDiyPinErrors((current) => ({
        ...current,
        [studentId]: err instanceof Error ? err.message : 'Не удалось сохранить PIN',
      }))
    }
  }

  const deleteStudent = async (studentId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя? Это действие нельзя отменить.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/students/delete?id=${studentId}`, {
        method: 'DELETE',
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error ?? 'Не удалось удалить пользователя')

      setStudents((current) => current.filter((s) => s.id !== studentId))
      if (selectedStudent?.id === studentId) {
        setSelectedStudent(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить пользователя')
    }
  }

  if (adminTab === 'dashboard') {
    return (
      <Dashboard
        students={students.filter((s) => s.serviceType === 'premium')}
        userName={user?.fullName ?? null}
        onNav={(tab) => { if (tab !== 'sync') setAdminTab(tab); setSelectedStudent(null); window.scrollTo(0, 0) }}
        onOpenStudent={(id) => {
          const student = students.find((s) => s.id === id)
          if (!student) return
          setAdminTab('premium')
          openStudent(student)
        }}
        onRefresh={loadDashboard}
        onLogout={logout}
      />
    )
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
              className="inline-flex items-center gap-2 px-4 py-2 bg-study-card rounded-lg card-shadow text-sm font-semibold text-study-dark"
            >
              <RefreshCw className="w-4 h-4" />
              Обновить
            </button>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 px-4 py-2 bg-study-card rounded-lg card-shadow text-sm font-semibold text-study-dark"
            >
              <LogOut className="w-4 h-4" />
              Выйти
            </button>
          </div>
        </div>

        {isLoading && <div className="bg-study-card rounded-xl card-shadow p-4 sm:p-6"><LoadingState heightClass="h-56" /></div>}
        {!isLoading && error && <ErrorState title="Ошибка админ-панели" description={error} onAction={loadDashboard} />}

        {/* Tabs */}
        {!isLoading && !error && (
          <div className="mb-5 p-1 bg-study-card rounded-xl card-shadow inline-flex max-w-full overflow-x-auto">
            <button
              onClick={() => { setAdminTab('dashboard'); setSelectedStudent(null); window.scrollTo(0, 0) }}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors text-study-gray hover:text-study-dark"
            >
              Дашборд
            </button>
            <button
              onClick={() => { setAdminTab('premium'); setSelectedStudent(null) }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                adminTab === 'premium'
                  ? 'bg-study-brown text-white'
                  : 'text-study-gray hover:text-study-dark'
              }`}
            >
              Премиум клиенты
            </button>
            <button
              onClick={() => { setAdminTab('diy'); setSelectedStudent(null) }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                adminTab === 'diy'
                  ? 'bg-study-brown text-white'
                  : 'text-study-gray hover:text-study-dark'
              }`}
            >
              DIY клиенты
            </button>
            <button
              onClick={() => { setAdminTab('shortlists'); setSelectedStudent(null) }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                adminTab === 'shortlists'
                  ? 'bg-study-brown text-white'
                  : 'text-study-gray hover:text-study-dark'
              }`}
            >
              Подбор вузов
            </button>
          </div>
        )}

        {!isLoading && !error && adminTab === 'shortlists' && <UniversityBankTool />}

        {!isLoading && !error && adminTab !== 'shortlists' && (
          <div>
            <div className="space-y-5">
              {adminTab === 'diy' && <UserAccessTools onChanged={loadDashboard} />}
              {adminTab === 'premium' && (
              <div className="bg-study-card rounded-xl card-shadow p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-study-dark">Добавить студента</h2>
                    <p className="text-sm text-study-gray">Аккаунт и профиль студента</p>
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
                      type="email"
                      value={newStudent.email}
                      onChange={(event) => setNewStudent((current) => ({ ...current, email: event.target.value }))}
                      placeholder="Email"
                      className="rounded-lg border border-study-lightgray px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      autoComplete="new-password"
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
                    <div className="md:col-span-2 flex justify-end">
                      <button
                        onClick={createStudent}
                        disabled={isCreatingStudent || !newStudent.email || !newStudent.password}
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
              )}

              <div className="bg-study-card rounded-xl card-shadow p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-bold text-study-dark">
                  {adminTab === 'premium' ? 'Премиум клиенты' : 'DIY клиенты'}
                  <span className="ml-2 text-sm font-normal text-study-gray">{q ? `${filteredStudents.length} из ${tabStudents.length}` : tabStudents.length}</span>
                </h2>
                <label className="flex items-center gap-2 rounded-lg border border-study-lightgray bg-study-bg px-3 py-2 sm:w-72">
                  <Search className="w-4 h-4 text-study-gray shrink-0" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Поиск по имени или email"
                    className="w-full bg-transparent text-sm text-study-dark placeholder:text-study-gray focus:outline-none"
                  />
                  {query && (
                    <button onClick={() => setQuery('')} className="text-study-gray hover:text-study-dark" title="Очистить">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </label>
              </div>

              {tabStudents.length === 0 ? (
                <EmptyState title="Студентов пока нет" description="Когда появятся клиенты, они будут здесь." />
              ) : filteredStudents.length === 0 ? (
                <EmptyState title="Никого не нашли" description={`По запросу «${query.trim()}» студентов нет.`} />
              ) : adminTab === 'premium' ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pageStudents.map((student) => (
                    <StudentCard
                      key={student.id}
                      student={student}
                      card={lkCards[student.id]}
                      selected={selectedStudent?.id === student.id}
                      onOpen={() => openStudent(student)}
                      onDelete={() => deleteStudent(student.id)}
                      onPhoto={(photo) => setLkCards((c) => ({ ...c, [student.id]: { ...(c[student.id] ?? { track: null, major: null, unis: 0, progress: { done: 0, total: 0 } }), photo } }))}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {pageStudents.map((student) => {
                    const progress = student.documentsTotal > 0
                      ? Math.round((student.documentsCompleted / student.documentsTotal) * 100)
                      : 0

                    const isDiy = student.serviceType === 'diy'
                    return (
                      <div
                        key={student.id}
                        // Premium rows open the student panel (кабинет, план, вузы, документы).
                        // DIY rows hold PIN inputs and stay non-clickable.
                        onClick={isDiy ? undefined : () => openStudent(student)}
                        role={isDiy ? undefined : 'button'}
                        className={`w-full text-left border rounded-xl p-4 transition-colors ${isDiy ? '' : 'cursor-pointer '}${
                          selectedStudent?.id === student.id
                            ? 'border-study-brown bg-study-brown/5'
                            : 'border-study-lightgray hover:bg-study-bg'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDiy ? 'bg-study-orange/10' : 'bg-study-green/10'}`}>
                              <GraduationCap className={`w-5 h-5 ${isDiy ? 'text-study-orange' : 'text-study-green'}`} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-study-dark truncate">{student.fullName}</p>
                                {isDiy && (
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                    student.subscriptionStatus === 'trial'
                                      ? 'bg-study-orange/10 text-study-orange'
                                      : student.subscriptionStatus === 'active'
                                        ? 'bg-study-green/10 text-study-green'
                                        : 'bg-study-gray/10 text-study-gray'
                                  }`}>
                                    {student.subscriptionStatus === 'trial' ? 'Пробный период' : student.subscriptionStatus === 'active' ? 'Активна' : 'Неактивна'}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-study-gray truncate">{student.email}</p>
                              {(student.program || student.age) && (
                                <p className="text-xs text-study-gray mt-1">
                                  {student.program ? programLabels[student.program] : 'Программа не указана'}
                                  {student.age ? ` · ${student.age}` : ''}
                                </p>
                              )}
                            </div>
                          </div>
                          {isDiy ? (
                            // Workflow: new accounts are trial. When the student pays,
                            // «Оплатил» asks for a PIN; the student enters it in their
                            // account and paid access opens for 2 years (verify-pin).
                            <div className="flex flex-col gap-2 items-start md:items-end">
                              {student.subscriptionStatus === 'active' ? (
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-study-green/10 text-study-green text-xs font-semibold px-3 py-2">
                                  <Check className="w-3.5 h-3.5" /> Оплачен, доступ открыт
                                </span>
                              ) : payOpen[student.id] ? (
                                <div className="flex flex-row flex-wrap gap-2 items-center">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={diyPinInputs[student.id] ?? ''}
                                    onChange={(e) => setDiyPinInputs((current) => ({ ...current, [student.id]: e.target.value }))}
                                    placeholder="PIN-код"
                                    className="rounded-lg border border-study-lightgray px-3 py-2 text-sm w-32 tracking-widest font-semibold"
                                    autoFocus
                                  />
                                  <button
                                    onClick={async () => {
                                      await updateDiySubscription(student.id, diyPinInputs[student.id] ?? '')
                                      setPayOpen((m) => ({ ...m, [student.id]: false }))
                                    }}
                                    disabled={!diyPinInputs[student.id]?.trim()}
                                    className="rounded-lg bg-study-green text-white text-xs font-semibold px-3 py-2 disabled:opacity-50"
                                  >
                                    Сохранить PIN
                                  </button>
                                  <button
                                    onClick={() => setPayOpen((m) => ({ ...m, [student.id]: false }))}
                                    className="rounded-lg text-xs font-semibold px-2 py-2 text-study-gray"
                                  >
                                    Отмена
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-row flex-wrap gap-2 items-center">
                                  {student.pinCode && (
                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-study-bg rounded-lg border border-study-lightgray">
                                      <span className="text-xs text-study-gray">PIN для ученика:</span>
                                      <span className="text-sm font-bold text-study-dark tracking-widest">{student.pinCode}</span>
                                    </span>
                                  )}
                                  <button
                                    onClick={() => {
                                      // Suggest a random 4-digit PIN; it can be edited before saving.
                                      setDiyPinInputs((current) => ({ ...current, [student.id]: String(Math.floor(1000 + Math.random() * 9000)) }))
                                      setPayOpen((m) => ({ ...m, [student.id]: true }))
                                    }}
                                    className="rounded-lg bg-study-green text-white text-xs font-semibold px-3 py-2"
                                  >
                                    {student.pinCode ? 'Новый PIN' : 'Оплатил'}
                                  </button>
                                </div>
                              )}
                              {student.pinCode && student.subscriptionStatus !== 'active' && !payOpen[student.id] && (
                                <p className="text-[11px] text-study-gray">Отправьте PIN ученику: он вводит его в своём аккаунте, и доступ откроется на 2 года.</p>
                              )}
                              {diyPinSaved[student.id] && (
                                <span className="text-xs font-semibold text-study-green flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> PIN сохранён
                                </span>
                              )}
                              {diyPinErrors[student.id] && (
                                <span className="text-xs font-semibold text-study-red">{diyPinErrors[student.id]}</span>
                              )}
                            </div>
                          ) : (
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
                          )}
                          <div className="flex items-center gap-1 shrink-0">
                            {isDiy && (
                              <button
                                onClick={() => setLoginOpen((m) => ({ ...m, [student.id]: !m[student.id] }))}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${loginOpen[student.id] ? 'bg-study-brown/10 text-study-brown' : 'text-study-gray hover:bg-study-bg hover:text-study-dark'}`}
                                title="Логин и пароль"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteStudent(student.id) }}
                              className="w-8 h-8 rounded-lg hover:bg-study-red/10 flex items-center justify-center text-study-gray hover:text-study-red transition-colors"
                              title="Удалить пользователя"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {isDiy && loginOpen[student.id] && (
                          <div className="mt-3">
                            <AccountPassword studentId={student.id} email={student.email} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {pageCount > 1 && (
                <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs text-study-gray">
                    {currentPage * perPage + 1}–{currentPage * perPage + pageStudents.length} из {filteredStudents.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(currentPage - 1)}
                      disabled={currentPage === 0}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-study-dark hover:bg-study-bg disabled:opacity-30"
                      title="Назад"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: pageCount }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(i)}
                        className={`min-w-9 h-9 px-2 rounded-lg text-sm font-semibold transition-colors ${i === currentPage ? 'bg-study-brown text-white' : 'text-study-gray hover:bg-study-bg hover:text-study-dark'}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage(currentPage + 1)}
                      disabled={currentPage === pageCount - 1}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-study-dark hover:bg-study-bg disabled:opacity-30"
                      title="Вперёд"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && selectedStudent && adminTab === 'premium' && (
          <div id="student-panel" className="mt-5 bg-study-card rounded-xl card-shadow p-4 sm:p-6">
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

            {/* The ЛК lives in its own store: shown even if the
                universities/documents request fails. */}
            <div className="space-y-4 mb-4">
              <AccountPassword key={`pw-${selectedStudent.id}`} studentId={selectedStudent.id} email={selectedStudent.email} />
              <LkEditor key={selectedStudent.id} studentId={selectedStudent.id} studentName={selectedStudent.fullName} onChanged={loadLkCards} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
