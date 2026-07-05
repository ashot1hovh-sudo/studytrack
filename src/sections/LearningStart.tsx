import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '@/context/AppContext'
import { MediaModuleCard } from '@/components/ui/media-button'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  GraduationCap,
  Home,
  KeyRound,
  Languages,
  Lock,
  MapPin,
  MessageCircle,
  PlayCircle,
  Route,
  Star,
  Trophy,
  Wallet,
  X,
  XCircle,
} from 'lucide-react'
import { ErrorState, LoadingState } from '@/components/SectionState'
import DirectionCitiesMatrix from '@/components/modules/program-choice/DirectionCitiesMatrix'
import ProgramCategorySignals from '@/components/modules/program-choice/ProgramCategorySignals'
import ProgramComparisonTable from '@/components/modules/program-choice/ProgramComparisonTable'
import UniversitySignsComparison from '@/components/modules/program-choice/UniversitySignsComparison'
import AdmissionBenchmarks from '@/components/modules/admission-chances/AdmissionBenchmarks'
import StudentProfileTable from '@/components/modules/admission-chances/StudentProfileTable'
import ProfileLevelCards from '@/components/modules/admission-chances/ProfileLevelCards'
import BachelorOrGapYear from '@/components/modules/admission-chances/BachelorOrGapYear'
import DocumentCards from '@/components/modules/documents/DocumentCards'
import ImportantRulesCards from '@/components/modules/documents/ImportantRulesCards'
import PreparationTimeline from '@/components/modules/documents/PreparationTimeline'
import GradingSystemCards from '@/components/modules/school-documents/GradingSystemCards'
import ScanChecklist from '@/components/modules/school-documents/ScanChecklist'
import SituationSelector from '@/components/modules/school-documents/SituationSelector'
import OrderFlowDiagram from '@/components/modules/criminal-record/OrderFlowDiagram'
import FormatChoiceCards from '@/components/modules/criminal-record/FormatChoiceCards'
import TimingWarningCard from '@/components/modules/criminal-record/TimingWarningCard'
import MedExamFlow from '@/components/modules/medical/MedExamFlow'
import DoctorsTable from '@/components/modules/medical/DoctorsTable'
import MedFormChecklist from '@/components/modules/medical/MedFormChecklist'
import GoodBadExamples from '@/components/modules/motivation-letter/GoodBadExamples'
import LetterStructureBlocks from '@/components/modules/motivation-letter/LetterStructureBlocks'
import FiveQuestionsCard from '@/components/modules/motivation-letter/FiveQuestionsCard'
import GoodBadRecommendation from '@/components/modules/recommendation-letter/GoodBadRecommendation'
import RecommendationStructure from '@/components/modules/recommendation-letter/RecommendationStructure'
import RecommendationChecklist from '@/components/modules/recommendation-letter/RecommendationChecklist'
import VideoScriptFlow from '@/components/modules/video-card/VideoScriptFlow'
import VideoTechCard from '@/components/modules/video-card/VideoTechCard'
import VideoAvoidList from '@/components/modules/video-card/VideoAvoidList'
import StrongVerbsCard from '@/components/modules/resume/StrongVerbsCard'
import ResultExamples from '@/components/modules/resume/ResultExamples'
import CVStructureList from '@/components/modules/resume/CVStructureList'
import DocLinkFlow from '@/components/modules/finance/DocLinkFlow'
import AmountGuideCard from '@/components/modules/finance/AmountGuideCard'
import FinanceChecklist from '@/components/modules/finance/FinanceChecklist'
import InterviewTypesCards from '@/components/modules/interview/InterviewTypesCards'
import InterviewPrepFlow from '@/components/modules/interview/InterviewPrepFlow'
import TechCheckCard from '@/components/modules/interview/TechCheckCard'

const lockedModules = [
  { id: 'language-year', title: 'Языковой год: Туториал', description: 'Полный гайд по языковому году в Китае' },
  { id: 'prevuz', title: 'Предвуз: Туториал', description: 'Подготовка к поступлению в китайский вуз' },
  { id: 'bachelor', title: 'Бакалавриат: Туториал', description: 'Пошаговый туториал по поступлению на бакалавриат' },
]

const sharedLessons = [
  { id: 1, lessonId: 'b1', title: 'Оценка шансов', description: 'Как оценить свои шансы на поступление' },
  { id: 2, lessonId: 'b2', title: 'Основной перечень документов', description: 'Список документов для поступления' },
  { id: 3, lessonId: 'b3', title: 'Школьные документы', description: 'Как подготовить школьные документы' },
  { id: 4, lessonId: 'b4', title: 'Справка о несудимости', description: 'Как подготовить справку о несудимости' },
  { id: 5, lessonId: 'b5', title: 'Медицинское обследование', description: 'Как пройти медицинское обследование' },
  { id: 6, lessonId: 'b6', title: 'Мотивационное письмо', description: 'Как написать мотивационное письмо' },
  { id: 7, lessonId: 'b7', title: 'Рекомендательные письма', description: 'Как получить рекомендательные письма' },
  { id: 8, lessonId: 'b8', title: 'Видео-визитка', description: 'Как записать видео-визитку' },
  { id: 9, lessonId: 'b9', title: 'Резюме', description: 'Как написать резюме' },
  { id: 10, lessonId: 'b10', title: 'Финансовые документы', description: 'Как сделать финансовые документы' },
  { id: 11, lessonId: 'b11', title: 'Подготовка к интервью', description: 'Как подготовиться к интервью' },
  { id: 12, lessonId: 'b12', title: 'Анкета на портале вуза', description: 'Как заполнить анкету на сайте университета' },
]

// RuTube private video embed (format: https://rutube.ru/play/embed/VIDEO_ID?p=ACCESS_TOKEN)
const APPLICATION_VIDEO_URL = 'https://rutube.ru/play/embed/3b2a5c3e4e4cb1b45f90bae519cf9165?p=NIHx7IIPd-eSr53AWvMfAQ'

const languageYearLessons = sharedLessons.filter((l) => l.lessonId !== 'b7' && l.lessonId !== 'b11')

const moduleBoxesByModuleId: Record<string, typeof sharedLessons> = {
  'language-year': languageYearLessons,
  'prevuz': sharedLessons,
  'bachelor': sharedLessons,
}

export default function LearningStart() {
  const { user } = useApp()
  const isPremium = user?.serviceType === 'premium'
  const isSubscribed = isPremium || user?.subscriptionStatus === 'active'

  const [activeModule, setActiveModule] = useState<typeof lockedModules[0] | null>(null)
  const [lockedBox, setLockedBox] = useState<{ id: number; lessonId: string; title: string; description: string } | null>(null)
  const [pinCode, setPinCode] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [isVerifyingPin, setIsVerifyingPin] = useState(false)
  const [videoOpen, setVideoOpen] = useState(false)
  const [activeLessonKey, setActiveLessonKey] = useState<string | null>(null)
  const [lesson, setLesson] = useState<{ title: string; content: string; userEmail?: string } | null>(null)
  const [isLessonLoading, setIsLessonLoading] = useState(false)
  const [lessonError, setLessonError] = useState<string | null>(null)

  // Back button: close lesson or module when user navigates back
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.tab === 'learning-start') {
        setActiveLessonKey(e.state.lesson ?? null)
        setLesson(e.state.lesson ? lesson : null)
        setLessonError(null)
        setActiveModule(e.state.module ?? null)
        setLockedBox(null)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  // lesson is intentionally excluded — we only need the setter reference
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openLesson = (key: string, apiPath: string) => {
    window.history.pushState({ tab: 'learning-start', lesson: key }, '', '#learning-start')
    setActiveLessonKey(key)
    setIsLessonLoading(true)
    setLessonError(null)

    fetch(apiPath)
      .then((response) => {
        if (!response.ok) throw new Error('Не удалось открыть урок')
        return response.json()
      })
      .then((data) => setLesson(data))
      .catch((err) => setLessonError(err instanceof Error ? err.message : 'Не удалось открыть урок'))
      .finally(() => setIsLessonLoading(false))
  }

  const openTelegram = () => {
    window.open('https://t.me/ash_china', '_blank', 'noopener,noreferrer')
  }

  const verifyPin = async () => {
    if (!pinCode.trim()) return
    setIsVerifyingPin(true)
    setPinError(null)

    try {
      const response = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinCode: pinCode.trim() }),
      })
      const data = await response.json().catch(() => null)

      if (response.ok) {
        setLockedBox(null)
        setPinCode('')
        window.location.reload()
      } else {
        setPinError(data?.error ?? 'Неверный PIN-код')
      }
    } catch {
      setPinError('Не удалось проверить PIN-код')
    } finally {
      setIsVerifyingPin(false)
    }
  }


  const lessonBlocks = useMemo(() => parseMarkdown(lesson?.content ?? ''), [lesson?.content])

  if (activeLessonKey) {
    return (
      <div className="bg-white rounded-xl card-shadow p-4 sm:p-6">
        <button
          onClick={() => { setActiveLessonKey(null); setLesson(null); setLessonError(null) }}
          className="inline-flex items-center gap-2 rounded-lg bg-study-bg px-3 py-2 text-sm font-semibold text-study-dark mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад
        </button>

        {isLessonLoading && <LoadingState heightClass="h-72" />}

        {!isLessonLoading && lessonError && (
          <ErrorState title="Урок не открылся" description={lessonError} onAction={() => openLesson(activeLessonKey, `/api/learning/${activeLessonKey}`)} />
        )}

        {!isLessonLoading && !lessonError && lesson && (
          <>
            {activeLessonKey === 'apply-guide' && APPLICATION_VIDEO_URL && (
              <div
                className="relative w-full mb-6 rounded-xl overflow-hidden bg-study-dark"
                style={{ paddingTop: '56.25%' }}
              >
                <iframe
                  src={APPLICATION_VIDEO_URL}
                  title="Как подать в университет в Китае"
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
            <ProtectedLesson
              title={lesson.title}
              blocks={lessonBlocks}
              userEmail={lesson.userEmail ?? 'student'}
              lessonKey={activeLessonKey ?? ''}
            />
          </>
        )}
      </div>
    )
  }

  // Module detail view
  if (activeModule) {
    return (
      <div className="space-y-5">
        <button
          onClick={() => { setActiveModule(null); setLockedBox(null) }}
          className="inline-flex items-center gap-2 rounded-lg bg-white card-shadow px-3 py-2 text-sm font-semibold text-study-dark"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад
        </button>

        <div className="bg-white rounded-xl card-shadow p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-study-brown/10 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6 text-study-brown" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-study-dark">{activeModule.title}</h2>
              <p className="text-sm text-study-gray mt-1">{activeModule.description}</p>
              {!isSubscribed && (
                <p className="text-xs text-study-orange font-semibold mt-2">
                  Для открытия каждого урока нужен PIN-код
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(moduleBoxesByModuleId[activeModule.id] ?? []).map((box, idx) => (
            <MediaModuleCard
              key={box.id}
              number={idx + 1}
              title={box.title}
              description={box.description}
              locked={!isSubscribed}
              onClick={() => {
                if (isSubscribed) {
                  openLesson(box.lessonId, `/api/learning/module/${box.lessonId}`)
                } else {
                  setLockedBox(box)
                  setPinCode('')
                  setPinError(null)
                }
              }}
            />
          ))}
        </div>

        {/* PIN modal */}
        {lockedBox && (
          <div className="fixed inset-0 z-[70] bg-study-dark/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl card-shadow-hover p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-study-brown">{activeModule.title}</p>
                  <h3 className="text-lg font-bold text-study-dark mt-1">{lockedBox.title}</h3>
                  <p className="text-sm text-study-gray mt-0.5">{lockedBox.description}</p>
                </div>
                <button
                  onClick={() => setLockedBox(null)}
                  className="w-9 h-9 rounded-lg bg-study-bg flex items-center justify-center shrink-0"
                >
                  <X className="w-5 h-5 text-study-dark" />
                </button>
              </div>

              <div className="rounded-xl bg-study-orange/10 border border-study-orange/20 p-4 mb-4">
                <p className="text-sm font-semibold text-study-dark">Это платный модуль</p>
                <p className="text-sm text-study-gray mt-1 leading-relaxed">
                  Чтобы открыть урок, свяжитесь с Яной, оплатите подписку и получите индивидуальный PIN-код. После этого введите его ниже.
                </p>
              </div>

              <input
                type="password"
                value={pinCode}
                onChange={(event) => { setPinCode(event.target.value); setPinError(null) }}
                onKeyDown={(e) => e.key === 'Enter' && verifyPin()}
                placeholder="Введите PIN-код"
                autoFocus
                className="w-full rounded-xl border border-study-lightgray bg-white px-4 py-3 text-sm text-study-dark focus:outline-none focus:border-study-brown"
              />

              {pinError && (
                <p className="mt-2 text-xs text-study-red font-medium">{pinError}</p>
              )}

              <button
                onClick={verifyPin}
                disabled={!pinCode.trim() || isVerifyingPin}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-study-brown px-4 py-3 text-sm font-bold text-white hover:bg-study-brown/90 transition-colors disabled:opacity-50"
              >
                <KeyRound className="w-5 h-5" />
                {isVerifyingPin ? 'Проверка...' : 'Открыть урок'}
              </button>

              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-px bg-study-lightgray" />
                <span className="text-xs text-study-gray">или</span>
                <div className="flex-1 h-px bg-study-lightgray" />
              </div>

              <button
                onClick={openTelegram}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#229ED9] px-4 py-3 text-sm font-bold text-white hover:bg-[#1d8fc5] transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                Связаться с Яной чтобы получить пин-код
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-[1fr_1.5fr_1.5fr] gap-4">
        <button
          onClick={() => openLesson('intro', '/api/learning/intro')}
          className="text-left bg-white rounded-xl card-shadow p-5 sm:p-6 min-h-[180px] hover:card-shadow-hover transition-all"
        >
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="w-12 h-12 rounded-xl bg-study-green/10 flex items-center justify-center shrink-0">
              <PlayCircle className="w-6 h-6 text-study-green" />
            </div>
            <span className="text-xs font-bold text-study-green bg-study-green/10 rounded-full px-2.5 py-1">Бесплатно</span>
          </div>
          <h2 className="text-xl font-bold text-study-dark">Начало</h2>
          <p className="text-sm text-study-gray mt-2">Первый блок для старта работы с платформой.</p>
        </button>

        <button className="text-left bg-white rounded-xl card-shadow p-5 sm:p-6 min-h-[180px] hover:card-shadow-hover transition-all">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="w-12 h-12 rounded-xl bg-study-brown/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6 text-study-brown" />
            </div>
            <span className="text-xs font-bold text-study-green bg-study-green/10 rounded-full px-2.5 py-1">Бесплатно</span>
          </div>
          <h2 className="text-xl font-bold text-study-dark">Как пользоваться платформой?</h2>
          <p className="text-sm text-study-gray mt-2">Короткое объяснение навигации, документов и дедлайнов.</p>
        </button>

        <button
          onClick={() => openLesson('how-to-choose', '/api/learning/how-to-choose')}
          className="relative text-left bg-white rounded-xl card-shadow p-5 sm:p-6 min-h-[180px] hover:card-shadow-hover transition-all overflow-hidden"
        >
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="w-12 h-12 rounded-xl bg-study-brown/10 flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6 text-study-brown" />
            </div>
            <div className="w-8 h-8 rounded-full bg-study-dark/10 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-study-dark" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-study-dark">Как определиться с программой?</h2>
          <p className="text-sm text-study-gray mt-2">таблица для подбора ВУЗов</p>
        </button>
      </div>

      {/* Tutorial modules — right after the top row */}
      <div className="grid sm:grid-cols-3 gap-4">
        {lockedModules.map((module) => (
          <button
            key={module.id}
            onClick={() => { window.history.pushState({ tab: 'learning-start', module: module.id }, '', '#learning-start'); setActiveModule(module) }}
            className="relative text-left bg-amber-50 border border-amber-200 rounded-xl card-shadow p-5 min-h-[120px] hover:card-shadow-hover transition-all overflow-hidden"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-study-dark">{module.title}</h3>
                <p className="text-sm text-study-gray mt-2">Платный модуль · {moduleBoxesByModuleId[module.id]?.length ?? 0} уроков</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-study-dark/10 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-study-dark" />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Free info cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        <button
          onClick={() => openLesson('cities', '/api/learning/cities')}
          className="text-left bg-white rounded-xl card-shadow p-5 sm:p-6 hover:card-shadow-hover transition-all"
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-study-green/10 flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6 text-study-green" />
            </div>
            <span className="text-xs font-bold text-study-green bg-study-green/10 rounded-full px-2.5 py-1">Бесплатно</span>
          </div>
          <p className="font-bold text-study-dark">Лучшие города для учёбы в Китае</p>
        </button>

        <button
          onClick={() => isSubscribed ? openLesson('apply-guide', '/api/learning/module/apply-guide') : setVideoOpen(true)}
          className="relative text-left bg-white rounded-xl card-shadow p-5 sm:p-6 hover:card-shadow-hover transition-all"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-study-brown/10 flex items-center justify-center shrink-0">
              <PlayCircle className="w-6 h-6 text-study-brown" />
            </div>
            {!isSubscribed && (
              <div className="w-8 h-8 rounded-full bg-study-dark/10 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-study-dark" />
              </div>
            )}
          </div>
          <p className="font-bold text-study-dark">Пошаговая инструкция: Как подать в университет в Китае</p>
          <p className="text-sm text-study-gray mt-1">Заполняем анкету для поступления в китайский вуз вместе (видео)</p>
        </button>
      </div>

      {/* Locked info cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        <button className="relative text-left bg-white rounded-xl card-shadow p-5 sm:p-6 hover:card-shadow-hover transition-all">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-study-brown/10 flex items-center justify-center shrink-0">
              <Star className="w-6 h-6 text-study-brown" />
            </div>
            <div className="w-8 h-8 rounded-full bg-study-dark/10 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-study-dark" />
            </div>
          </div>
          <p className="font-bold text-study-dark">Введение в стипендии</p>
        </button>

        <button className="relative text-left bg-white rounded-xl card-shadow p-5 sm:p-6 hover:card-shadow-hover transition-all">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-study-brown/10 flex items-center justify-center shrink-0">
              <Wallet className="w-6 h-6 text-study-brown" />
            </div>
            <div className="w-8 h-8 rounded-full bg-study-dark/10 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-study-dark" />
            </div>
          </div>
          <p className="font-bold text-study-dark">Как оплатить регистрационные взносы и обучение</p>
        </button>
      </div>

      {/* Wide free card */}
      <button className="w-full text-left bg-white rounded-xl card-shadow p-5 sm:p-6 hover:card-shadow-hover transition-all">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-study-green/10 flex items-center justify-center shrink-0">
            <Briefcase className="w-6 h-6 text-study-green" />
          </div>
          <span className="text-xs font-bold text-study-green bg-study-green/10 rounded-full px-2.5 py-1">Бесплатно</span>
        </div>
        <p className="font-bold text-study-dark">Докупить пакет услуг</p>
        <p className="text-sm text-study-gray mt-1">консультации, подбор ВУЗов, сопровождение</p>
      </button>

      {/* Application walkthrough video modal */}
      {videoOpen && createPortal(
        <div
          className="fixed inset-0 z-[70] bg-study-dark/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setVideoOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl card-shadow-hover overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 p-4 sm:p-5 border-b border-study-lightgray">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-study-brown">Видео-инструкция</p>
                <h3 className="text-base sm:text-lg font-bold text-study-dark mt-1">Как подать в университет в Китае</h3>
              </div>
              <button
                onClick={() => setVideoOpen(false)}
                className="w-9 h-9 rounded-lg bg-study-bg flex items-center justify-center shrink-0"
              >
                <X className="w-5 h-5 text-study-dark" />
              </button>
            </div>

            {!isSubscribed ? (
              <div className="p-5 sm:p-6">
                <div className="rounded-xl bg-study-orange/10 border border-study-orange/20 p-4">
                  <p className="text-sm font-semibold text-study-dark">Это платный модуль</p>
                  <p className="text-sm text-study-gray mt-1 leading-relaxed">
                    Чтобы открыть видео-инструкцию, свяжитесь с Яной и оформите подписку.
                  </p>
                </div>
                <button
                  onClick={openTelegram}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-study-green px-4 py-3 text-sm font-bold text-white hover:bg-study-green/90 transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  Написать Яне
                </button>
              </div>
            ) : APPLICATION_VIDEO_URL ? (
              <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                <iframe
                  src={APPLICATION_VIDEO_URL}
                  title="Как подать в университет в Китае"
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="p-10 text-center">
                <PlayCircle className="w-10 h-10 text-study-gray/50 mx-auto mb-3" />
                <p className="text-sm font-semibold text-study-dark">Видео скоро появится</p>
                <p className="text-xs text-study-gray mt-1">Мы записываем инструкцию — загляните позже.</p>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

type MarkdownBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; rows: string[][] }
  | { type: 'image'; src: string; alt: string }
  | { type: 'slideshow'; images: { src: string; alt: string }[] }
  | { type: 'pdf'; src: string }
  | { type: 'rule' }

function cleanMarkdownText(value: string) {
  return value
    .replace(/\\\./g, '.')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .trim()
}

function parseMarkdown(markdown: string): MarkdownBlock[] {
  const lines = markdown.split('\n')
  const blocks: MarkdownBlock[] = []
  let paragraph: string[] = []
  let list: string[] = []
  let table: string[][] = []
  let images: { src: string; alt: string }[] = []

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: 'paragraph', text: paragraph.join(' ').replace(/\\\./g, '.').trim() })
      paragraph = []
    }
  }
  const flushList = () => {
    if (list.length > 0) {
      blocks.push({ type: 'list', items: list.map(cleanMarkdownText) })
      list = []
    }
  }
  const flushTable = () => {
    if (table.length > 0) {
      blocks.push({ type: 'table', rows: table })
      table = []
    }
  }
  const flushImages = () => {
    if (images.length === 1) {
      blocks.push({ type: 'image', src: images[0].src, alt: images[0].alt })
      images = []
    } else if (images.length > 1) {
      blocks.push({ type: 'slideshow', images })
      images = []
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      flushParagraph()
      flushList()
      flushTable()
      flushImages()
      continue
    }

    if (line === '---') {
      flushParagraph()
      flushList()
      flushTable()
      flushImages()
      blocks.push({ type: 'rule' })
      continue
    }

    if (line.startsWith('|') && line.endsWith('|')) {
      flushParagraph()
      flushList()
      flushImages()
      const cells = line
        .slice(1, -1)
        .split('|')
        .map((cell) => cleanMarkdownText(cell))
      if (!cells.every((cell) => /^-+$/.test(cell))) table.push(cells)
      continue
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/)
    if (heading) {
      flushParagraph()
      flushList()
      flushTable()
      flushImages()
      blocks.push({
        type: 'heading',
        level: heading[1].length,
        text: cleanMarkdownText(heading[2]),
      })
      continue
    }

    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (image) {
      flushParagraph()
      flushList()
      flushTable()
      if (image[2].endsWith('.pdf')) {
        flushImages()
        blocks.push({ type: 'pdf', src: image[2] })
      } else {
        images.push({ alt: image[1], src: image[2] })
      }
      continue
    }

    if (line.startsWith('* ') || line.startsWith('- ')) {
      flushParagraph()
      flushTable()
      list.push(line.slice(2))
      continue
    }

    const numbered = line.match(/^\d+\.\s+(.*)$/)
    if (numbered) {
      flushParagraph()
      flushTable()
      list.push(numbered[1])
      continue
    }

    paragraph.push(line)
  }

  flushParagraph()
  flushList()
  flushTable()
  flushImages()
  return blocks
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const regex = /(\*\*.*?\*\*|\[.*?\]\(.*?\))/g
  let last = 0
  let match
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    const bold = match[0].match(/^\*\*(.*)\*\*$/)
    if (bold) { parts.push(<strong key={match.index}>{bold[1]}</strong>); last = match.index + match[0].length; continue }
    const link = match[0].match(/^\[(.*?)\]\((.*?)\)$/)
    if (link) {
      const isExternal = link[2].startsWith('http')
      parts.push(
        <a key={match.index} href={link[2]}
          className="text-study-brown underline font-semibold"
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}>
          {link[1]}
        </a>
      )
    }
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function LightboxImage({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full block rounded-xl border border-study-lightgray overflow-hidden cursor-zoom-in"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="w-full h-auto" />
        <p className="text-center text-xs text-study-gray py-1.5 bg-study-bg">Нажмите, чтобы увеличить</p>
      </button>

      {open && createPortal(
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.95)', overflow: 'auto', touchAction: 'pan-x pan-y pinch-zoom' }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false) }}
            style={{ position: 'fixed', top: 16, right: 16, zIndex: 100000, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', padding: 8, cursor: 'pointer', color: 'white', display: 'flex' }}
          >
            <X size={24} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            onClick={e => e.stopPropagation()}
            style={{ display: 'block', width: '100%', height: 'auto', maxWidth: 'none' }}
          />
        </div>,
        document.body
      )}
    </>
  )
}

function CitySlideshow({ images }: { images: { src: string; alt: string }[] }) {
  const [current, setCurrent] = useState(0)
  const prev = () => setCurrent((i) => (i - 1 + images.length) % images.length)
  const next = () => setCurrent((i) => (i + 1) % images.length)

  return (
    <div className="relative rounded-xl overflow-hidden bg-study-bg" style={{ height: 280 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={current}
        src={images[current].src}
        alt={images[current].alt}
        className="w-full h-full object-cover"
        draggable={false}
      />

      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all ${i === current ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
              />
            ))}
          </div>

          <span className="absolute top-2 right-2 rounded-full bg-black/40 px-2 py-0.5 text-xs font-bold text-white">
            {current + 1} / {images.length}
          </span>
        </>
      )}
    </div>
  )
}

function ProtectedLesson({
  title,
  blocks,
  userEmail,
  lessonKey = '',
}: {
  title: string
  blocks: MarkdownBlock[]
  userEmail: string
  lessonKey?: string
}) {
  const prevent = (event: React.SyntheticEvent) => event.preventDefault()
  const [isTocOpen, setIsTocOpen] = useState(true)

  // AI Summary (b1 pilot)
  const AI_SUMMARY: Record<string, string> = {
    'b1': `Этот урок помогает объективно оценить ваши шансы на поступление в Китай — до того, как вы потратите время и деньги на документы.

Ключевые факторы оценки:
• Средний балл аттестата (GPA). Ниже 3.5 — вузы топ-уровня закрыты, но есть хорошие варианты в провинции.
• Языковой уровень. HSK 4+ или IELTS 6.0+ открывают большинство программ. Без сертификата — только языковой год.
• Специальность. Технические и медицинские направления требуют более сильного профиля, чем бизнес или гуманитарные.
• Тип программы. Языковой год — самый доступный вход; бакалавриат — требует более полного пакета.

Вывод: большинство студентов поступают при правильном выборе уровня вуза. Переоценка своих шансов — главная причина провала. Начните с реалистичного списка, и расширяйте его по мере роста профиля.`,
  }
  const summaryText = AI_SUMMARY[lessonKey] ?? null
  const [summaryPhase, setSummaryPhase] = useState<'idle' | 'loading' | 'typing'>('idle')
  const [displayedSummary, setDisplayedSummary] = useState('')

  const startSummary = () => {
    if (summaryPhase !== 'idle' || !summaryText) return
    setSummaryPhase('loading')
    setDisplayedSummary('')
    setTimeout(() => {
      setSummaryPhase('typing')
      let i = 0
      const interval = setInterval(() => {
        i++
        setDisplayedSummary(summaryText.slice(0, i))
        if (i >= summaryText.length) clearInterval(interval)
      }, 18)
    }, 2500)
  }
  const headings = blocks
    .map((block, index) => (
      block.type === 'heading' && /^(\d+\.|Блок\s+\d+)/i.test(block.text)
        ? { ...block, id: `lesson-heading-${index}` }
        : null
    ))
    .filter((block): block is { type: 'heading'; level: number; text: string; id: string } => Boolean(block))

  const scrollToHeading = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  let currentBlockNumber: number | null = null
  const insertedInfographics = new Set<number>()
  const blockStats = new Map<number, { lists: number; tables: number; paragraphs: number }>()

  // how-to-choose lesson tracking
  let currentSectionNumber: number | null = null
  let currentStepNumber: number | null = null
  const insertedHowToChoose = new Set<string>()
  const howToChooseStats = new Map<string, { lists: number; tables: number; paragraphs: number }>()

  const getHowToChooseStats = (key: string) => {
    if (!howToChooseStats.has(key)) howToChooseStats.set(key, { lists: 0, tables: 0, paragraphs: 0 })
    return howToChooseStats.get(key)!
  }

  const shouldInsertHowToChooseComponent = (block: MarkdownBlock): string | null => {
    const sectionKey = currentStepNumber != null
      ? `${currentSectionNumber}-${currentStepNumber}`
      : `${currentSectionNumber}`
    const stats = getHowToChooseStats(sectionKey)
    if (block.type === 'list') stats.lists += 1
    if (block.type === 'table') stats.tables += 1
    if (block.type === 'paragraph') stats.paragraphs += 1

    if (currentSectionNumber === 2 && block.type === 'table' && stats.tables === 1 && !insertedHowToChoose.has('DirectionCitiesMatrix')) {
      insertedHowToChoose.add('DirectionCitiesMatrix'); return 'DirectionCitiesMatrix'
    }
    if (currentSectionNumber === 3 && currentStepNumber == null && block.type === 'list' && stats.lists === 2 && !insertedHowToChoose.has('ProgramCategorySignals')) {
      insertedHowToChoose.add('ProgramCategorySignals'); return 'ProgramCategorySignals'
    }
    if (currentSectionNumber === 8 && block.type === 'list' && stats.lists === 2 && !insertedHowToChoose.has('UniversitySignsComparison')) {
      insertedHowToChoose.add('UniversitySignsComparison'); return 'UniversitySignsComparison'
    }
    if (currentSectionNumber === 10 && currentStepNumber === 4 && block.type === 'table' && stats.tables === 1 && !insertedHowToChoose.has('ProgramComparisonTable')) {
      insertedHowToChoose.add('ProgramComparisonTable'); return 'ProgramComparisonTable'
    }
    return null
  }

  // b1 lesson tracking
  let b1SectionNumber: number | null = null
  let b1SubsectionCode: string | null = null
  const insertedB1 = new Set<string>()
  const b1Stats = new Map<string, { lists: number; tables: number; paragraphs: number }>()

  const getB1Stats = (key: string) => {
    if (!b1Stats.has(key)) b1Stats.set(key, { lists: 0, tables: 0, paragraphs: 0 })
    return b1Stats.get(key)!
  }

  const shouldInsertB1Component = (block: MarkdownBlock): string | null => {
    const sectionKey = b1SubsectionCode ?? `sec-${b1SectionNumber}`
    const stats = getB1Stats(sectionKey)
    if (block.type === 'list') stats.lists += 1
    if (block.type === 'table') stats.tables += 1
    if (block.type === 'paragraph') stats.paragraphs += 1

    if (b1SectionNumber === 1 && b1SubsectionCode === '1.3' && block.type === 'list' && stats.lists === 1 && !insertedB1.has('AdmissionBenchmarks')) {
      insertedB1.add('AdmissionBenchmarks'); return 'AdmissionBenchmarks'
    }
    if (b1SectionNumber === 2 && b1SubsectionCode === '2.1' && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB1.has('StudentProfileTable')) {
      insertedB1.add('StudentProfileTable'); return 'StudentProfileTable'
    }
    if (b1SectionNumber === 2 && b1SubsectionCode === '2.2' && block.type === 'paragraph' && stats.paragraphs === 3 && !insertedB1.has('ProfileLevelCards')) {
      insertedB1.add('ProfileLevelCards'); return 'ProfileLevelCards'
    }
    if (b1SectionNumber === 3 && b1SubsectionCode === null && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB1.has('BachelorOrGapYear')) {
      insertedB1.add('BachelorOrGapYear'); return 'BachelorOrGapYear'
    }
    return null
  }

  // b2 lesson tracking
  let b2SectionNumber: number | null = null
  let b2SectionName: string | null = null  // 'rules' for the named top-level section
  let b2SubsectionIndex: number = 0        // ## heading counter within current # section
  const insertedB2 = new Set<string>()
  const b2Stats = new Map<string, { lists: number; tables: number; paragraphs: number }>()

  // b3 lesson tracking
  let b3SectionNumber: number | null = null
  let b3SubsectionIndex: number = 0
  const insertedB3 = new Set<string>()
  const b3Stats = new Map<string, { lists: number; tables: number; paragraphs: number }>()

  // b4 lesson tracking
  let b4SectionNumber: number | null = null
  let b4SubsectionIndex: number = 0
  const insertedB4 = new Set<string>()
  const b4Stats = new Map<string, { lists: number; tables: number; paragraphs: number }>()

  // b5 lesson tracking
  let b5SectionNumber: number | null = null
  let b5SubsectionIndex: number = 0
  const insertedB5 = new Set<string>()
  const b5Stats = new Map<string, { lists: number; tables: number; paragraphs: number }>()

  // b6 lesson tracking
  let b6SectionNumber: number | null = null
  let b6SubsectionIndex: number = 0
  const insertedB6 = new Set<string>()
  const b6Stats = new Map<string, { lists: number; tables: number; paragraphs: number }>()

  // b7 lesson tracking
  let b7SectionNumber: number | null = null
  let b7SubsectionIndex: number = 0
  const insertedB7 = new Set<string>()
  const b7Stats = new Map<string, { lists: number; tables: number; paragraphs: number }>()

  // b8 lesson tracking
  let b8SectionNumber: number | null = null
  let b8SubsectionIndex: number = 0
  const insertedB8 = new Set<string>()
  const b8Stats = new Map<string, { lists: number; tables: number; paragraphs: number }>()

  // b9 lesson tracking
  let b9SectionNumber: number | null = null
  let b9SubsectionIndex: number = 0
  const insertedB9 = new Set<string>()
  const b9Stats = new Map<string, { lists: number; tables: number; paragraphs: number }>()

  // b10 lesson tracking
  let b10SectionNumber: number | null = null
  let b10SubsectionIndex: number = 0
  const insertedB10 = new Set<string>()
  const b10Stats = new Map<string, { lists: number; tables: number; paragraphs: number }>()

  // b11 lesson tracking
  let b11SectionNumber: number | null = null
  let b11SubsectionIndex: number = 0
  const insertedB11 = new Set<string>()
  const b11Stats = new Map<string, { lists: number; tables: number; paragraphs: number }>()

  const getB2Stats = (key: string) => {
    if (!b2Stats.has(key)) b2Stats.set(key, { lists: 0, tables: 0, paragraphs: 0 })
    return b2Stats.get(key)!
  }

  const shouldInsertB2Component = (block: MarkdownBlock): string | null => {
    const sectionKey = b2SectionName
      ? b2SectionName
      : `sec${b2SectionNumber}-sub${b2SubsectionIndex}`
    const stats = getB2Stats(sectionKey)
    if (block.type === 'list') stats.lists += 1
    if (block.type === 'table') stats.tables += 1
    if (block.type === 'paragraph') stats.paragraphs += 1

    if (b2SectionName === 'rules' && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB2.has('ImportantRulesCards')) {
      insertedB2.add('ImportantRulesCards'); return 'ImportantRulesCards'
    }
    if (b2SectionNumber === 1 && b2SubsectionIndex === 0 && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB2.has('DocumentCards')) {
      insertedB2.add('DocumentCards'); return 'DocumentCards'
    }
    if (b2SectionNumber === 13 && b2SubsectionIndex === 3 && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB2.has('PreparationTimeline')) {
      insertedB2.add('PreparationTimeline'); return 'PreparationTimeline'
    }
    return null
  }

  const getB3Stats = (key: string) => {
    if (!b3Stats.has(key)) b3Stats.set(key, { lists: 0, tables: 0, paragraphs: 0 })
    return b3Stats.get(key)!
  }

  const shouldInsertB3Component = (block: MarkdownBlock): string | null => {
    const sectionKey = `sec${b3SectionNumber}-sub${b3SubsectionIndex}`
    const stats = getB3Stats(sectionKey)
    if (block.type === 'list') stats.lists += 1
    if (block.type === 'table') stats.tables += 1
    if (block.type === 'paragraph') stats.paragraphs += 1

    if (b3SectionNumber === null && b3SubsectionIndex === 1 && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB3.has('SituationSelector')) {
      insertedB3.add('SituationSelector'); return 'SituationSelector'
    }
    if (b3SectionNumber === 5 && b3SubsectionIndex === 0 && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB3.has('GradingSystemCards')) {
      insertedB3.add('GradingSystemCards'); return 'GradingSystemCards'
    }
    if (b3SectionNumber === 9 && b3SubsectionIndex === 1 && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB3.has('ScanChecklist')) {
      insertedB3.add('ScanChecklist'); return 'ScanChecklist'
    }
    return null
  }

  const getB4Stats = (key: string) => {
    if (!b4Stats.has(key)) b4Stats.set(key, { lists: 0, tables: 0, paragraphs: 0 })
    return b4Stats.get(key)!
  }

  const getB5Stats = (key: string) => {
    if (!b5Stats.has(key)) b5Stats.set(key, { lists: 0, tables: 0, paragraphs: 0 })
    return b5Stats.get(key)!
  }

  const getB6Stats = (key: string) => {
    if (!b6Stats.has(key)) b6Stats.set(key, { lists: 0, tables: 0, paragraphs: 0 })
    return b6Stats.get(key)!
  }

  const getB7Stats = (key: string) => {
    if (!b7Stats.has(key)) b7Stats.set(key, { lists: 0, tables: 0, paragraphs: 0 })
    return b7Stats.get(key)!
  }

  const getB8Stats = (key: string) => {
    if (!b8Stats.has(key)) b8Stats.set(key, { lists: 0, tables: 0, paragraphs: 0 })
    return b8Stats.get(key)!
  }

  const getB9Stats = (key: string) => {
    if (!b9Stats.has(key)) b9Stats.set(key, { lists: 0, tables: 0, paragraphs: 0 })
    return b9Stats.get(key)!
  }

  const getB10Stats = (key: string) => {
    if (!b10Stats.has(key)) b10Stats.set(key, { lists: 0, tables: 0, paragraphs: 0 })
    return b10Stats.get(key)!
  }

  const getB11Stats = (key: string) => {
    if (!b11Stats.has(key)) b11Stats.set(key, { lists: 0, tables: 0, paragraphs: 0 })
    return b11Stats.get(key)!
  }

  const shouldInsertB11Component = (block: MarkdownBlock): string | null => {
    const sectionKey = `sec${b11SectionNumber}-sub${b11SubsectionIndex}`
    const stats = getB11Stats(sectionKey)
    if (block.type === 'list') stats.lists += 1
    if (block.type === 'table') stats.tables += 1
    if (block.type === 'paragraph') stats.paragraphs += 1

    if (b11SectionNumber === 1 && b11SubsectionIndex === 0 && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB11.has('InterviewTypesCards')) {
      insertedB11.add('InterviewTypesCards'); return 'InterviewTypesCards'
    }
    if (b11SectionNumber === 5 && b11SubsectionIndex === 1 && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB11.has('InterviewPrepFlow')) {
      insertedB11.add('InterviewPrepFlow'); return 'InterviewPrepFlow'
    }
    if (b11SectionNumber === 6 && b11SubsectionIndex === 0 && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB11.has('TechCheckCard')) {
      insertedB11.add('TechCheckCard'); return 'TechCheckCard'
    }
    return null
  }

  const shouldInsertB10Component = (block: MarkdownBlock): string | null => {
    const sectionKey = `sec${b10SectionNumber}-sub${b10SubsectionIndex}`
    const stats = getB10Stats(sectionKey)
    if (block.type === 'list') stats.lists += 1
    if (block.type === 'table') stats.tables += 1
    if (block.type === 'paragraph') stats.paragraphs += 1

    if (b10SectionNumber === 1 && b10SubsectionIndex === 0 && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB10.has('DocLinkFlow')) {
      insertedB10.add('DocLinkFlow'); return 'DocLinkFlow'
    }
    if (b10SectionNumber === 4 && b10SubsectionIndex === 0 && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB10.has('AmountGuideCard')) {
      insertedB10.add('AmountGuideCard'); return 'AmountGuideCard'
    }
    if (b10SectionNumber === 9 && b10SubsectionIndex === 0 && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB10.has('FinanceChecklist')) {
      insertedB10.add('FinanceChecklist'); return 'FinanceChecklist'
    }
    return null
  }

  const shouldInsertB9Component = (block: MarkdownBlock): string | null => {
    const sectionKey = `sec${b9SectionNumber}-sub${b9SubsectionIndex}`
    const stats = getB9Stats(sectionKey)
    if (block.type === 'list') stats.lists += 1
    if (block.type === 'table') stats.tables += 1
    if (block.type === 'paragraph') stats.paragraphs += 1

    if (b9SectionNumber === 4 && b9SubsectionIndex === 0 && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB9.has('StrongVerbsCard')) {
      insertedB9.add('StrongVerbsCard'); return 'StrongVerbsCard'
    }
    if (b9SectionNumber === 5 && b9SubsectionIndex === 0 && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB9.has('ResultExamples')) {
      insertedB9.add('ResultExamples'); return 'ResultExamples'
    }
    if (b9SectionNumber === 7 && b9SubsectionIndex === 0 && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB9.has('CVStructureList')) {
      insertedB9.add('CVStructureList'); return 'CVStructureList'
    }
    return null
  }

  const shouldInsertB8Component = (block: MarkdownBlock): string | null => {
    const sectionKey = `sec${b8SectionNumber}-sub${b8SubsectionIndex}`
    const stats = getB8Stats(sectionKey)
    if (block.type === 'list') stats.lists += 1
    if (block.type === 'table') stats.tables += 1
    if (block.type === 'paragraph') stats.paragraphs += 1

    if (b8SectionNumber === 2 && b8SubsectionIndex === 0 && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB8.has('VideoScriptFlow')) {
      insertedB8.add('VideoScriptFlow'); return 'VideoScriptFlow'
    }
    if (b8SectionNumber === 5 && b8SubsectionIndex === 1 && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB8.has('VideoTechCard')) {
      insertedB8.add('VideoTechCard'); return 'VideoTechCard'
    }
    if (b8SectionNumber === 7 && b8SubsectionIndex === 0 && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB8.has('VideoAvoidList')) {
      insertedB8.add('VideoAvoidList'); return 'VideoAvoidList'
    }
    return null
  }

  const shouldInsertB7Component = (block: MarkdownBlock): string | null => {
    const sectionKey = `sec${b7SectionNumber}-sub${b7SubsectionIndex}`
    const stats = getB7Stats(sectionKey)
    if (block.type === 'list') stats.lists += 1
    if (block.type === 'table') stats.tables += 1
    if (block.type === 'paragraph') stats.paragraphs += 1

    if (b7SectionNumber === 1 && b7SubsectionIndex === 0 && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB7.has('GoodBadRecommendation')) {
      insertedB7.add('GoodBadRecommendation'); return 'GoodBadRecommendation'
    }
    if (b7SectionNumber === 3 && b7SubsectionIndex === 0 && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB7.has('RecommendationStructure')) {
      insertedB7.add('RecommendationStructure'); return 'RecommendationStructure'
    }
    if (b7SectionNumber === 7 && b7SubsectionIndex === 0 && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB7.has('RecommendationChecklist')) {
      insertedB7.add('RecommendationChecklist'); return 'RecommendationChecklist'
    }
    return null
  }

  const shouldInsertB6Component = (block: MarkdownBlock): string | null => {
    const sectionKey = `sec${b6SectionNumber}-sub${b6SubsectionIndex}`
    const stats = getB6Stats(sectionKey)
    if (block.type === 'list') stats.lists += 1
    if (block.type === 'table') stats.tables += 1
    if (block.type === 'paragraph') stats.paragraphs += 1

    if (b6SectionNumber === 4 && b6SubsectionIndex === 0 && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB6.has('GoodBadExamples')) {
      insertedB6.add('GoodBadExamples'); return 'GoodBadExamples'
    }
    if (b6SectionNumber === 7 && b6SubsectionIndex === 0 && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB6.has('LetterStructureBlocks')) {
      insertedB6.add('LetterStructureBlocks'); return 'LetterStructureBlocks'
    }
    if (b6SectionNumber === 8 && b6SubsectionIndex === 0 && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB6.has('FiveQuestionsCard')) {
      insertedB6.add('FiveQuestionsCard'); return 'FiveQuestionsCard'
    }
    return null
  }

  const shouldInsertB5Component = (block: MarkdownBlock): string | null => {
    const sectionKey = `sec${b5SectionNumber}-sub${b5SubsectionIndex}`
    const stats = getB5Stats(sectionKey)
    if (block.type === 'list') stats.lists += 1
    if (block.type === 'table') stats.tables += 1
    if (block.type === 'paragraph') stats.paragraphs += 1

    if (b5SectionNumber === 1 && b5SubsectionIndex === 0 && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB5.has('MedExamFlow')) {
      insertedB5.add('MedExamFlow'); return 'MedExamFlow'
    }
    if (b5SectionNumber === 3 && b5SubsectionIndex === 0 && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB5.has('DoctorsTable')) {
      insertedB5.add('DoctorsTable'); return 'DoctorsTable'
    }
    if (b5SectionNumber === 9 && b5SubsectionIndex === 0 && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB5.has('MedFormChecklist')) {
      insertedB5.add('MedFormChecklist'); return 'MedFormChecklist'
    }
    return null
  }

  const shouldInsertB4Component = (block: MarkdownBlock): string | null => {
    const sectionKey = `sec${b4SectionNumber}-sub${b4SubsectionIndex}`
    const stats = getB4Stats(sectionKey)
    if (block.type === 'list') stats.lists += 1
    if (block.type === 'table') stats.tables += 1
    if (block.type === 'paragraph') stats.paragraphs += 1

    if (b4SectionNumber === 1 && b4SubsectionIndex === 0 && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB4.has('OrderFlowDiagram')) {
      insertedB4.add('OrderFlowDiagram'); return 'OrderFlowDiagram'
    }
    if (b4SectionNumber === 2 && b4SubsectionIndex === 0 && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB4.has('FormatChoiceCards')) {
      insertedB4.add('FormatChoiceCards'); return 'FormatChoiceCards'
    }
    if (b4SectionNumber === 5 && b4SubsectionIndex === 0 && block.type === 'paragraph' && stats.paragraphs === 1 && !insertedB4.has('TimingWarningCard')) {
      insertedB4.add('TimingWarningCard'); return 'TimingWarningCard'
    }
    return null
  }

  const getBlockStats = (blockNumber: number) => {
    const existing = blockStats.get(blockNumber)
    if (existing) return existing
    const next = { lists: 0, tables: 0, paragraphs: 0 }
    blockStats.set(blockNumber, next)
    return next
  }

  const shouldInsertInfographic = (block: MarkdownBlock, blockNumber: number) => {
    const stats = getBlockStats(blockNumber)
    if (block.type === 'list') stats.lists += 1
    if (block.type === 'table') stats.tables += 1
    if (block.type === 'paragraph') stats.paragraphs += 1

    if (insertedInfographics.has(blockNumber)) return false

    const shouldInsert =
      (blockNumber === 1 && block.type === 'table' && stats.tables === 1) ||
      (blockNumber === 2 && block.type === 'table' && stats.tables === 1) ||
      (blockNumber === 3 && block.type === 'table' && stats.tables === 1) ||
      (blockNumber === 4 && block.type === 'list' && stats.lists === 1) ||
      (blockNumber === 5 && block.type === 'list' && stats.lists === 1) ||
      (blockNumber === 6 && block.type === 'paragraph' && stats.paragraphs === 1) ||
      (blockNumber === 7 && block.type === 'table' && stats.tables === 1) ||
      (blockNumber === 8 && block.type === 'table' && stats.tables === 1) ||
      (blockNumber === 9 && block.type === 'list' && stats.lists === 4) ||
      (blockNumber === 10 && block.type === 'table' && stats.tables === 1) ||
      (blockNumber === 11 && block.type === 'table' && stats.tables === 1) ||
      (blockNumber === 14 && block.type === 'table' && stats.tables === 1) ||
      (blockNumber === 15 && block.type === 'table' && stats.tables === 2) ||
      (blockNumber === 16 && block.type === 'list' && stats.lists === 1)

    if (shouldInsert) insertedInfographics.add(blockNumber)
    return shouldInsert
  }

  return (
    <div className={headings.length > 0 ? 'lg:grid lg:grid-cols-[240px_1fr] lg:gap-6 lg:items-start' : ''}>
      {headings.length > 0 && (
        <aside style={{ position: 'sticky', top: 20, alignSelf: 'flex-start' }}>
          <div className="rounded-xl border border-study-lightgray bg-study-bg/70 p-3">
            <button
              onClick={() => setIsTocOpen((current) => !current)}
              className="w-full flex items-center justify-between gap-3 text-left"
            >
              <span className="text-xs font-bold text-study-dark">Содержание</span>
              <span className="text-xs font-semibold text-study-brown">{isTocOpen ? 'Скрыть' : 'Показать'}</span>
            </button>

            {isTocOpen && (
              <div className="mt-2 flex lg:block gap-2 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
                {headings.map((heading) => (
                  <button
                    key={heading.id}
                    onClick={() => scrollToHeading(heading.id)}
                    className="shrink-0 lg:w-full lg:text-left rounded-lg px-3 py-2 text-xs font-semibold text-study-gray hover:bg-white hover:text-study-brown transition-colors"
                  >
                    {heading.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      )}

      <article
        className="relative overflow-clip rounded-xl border border-study-lightgray bg-white p-4 sm:p-6 select-none min-w-0"
        onCopy={prevent}
        onCut={prevent}
        onContextMenu={prevent}
        onDragStart={prevent}
        style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
      >
        <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.055]">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 rotate-[-18deg] scale-125">
            {Array.from({ length: 36 }).map((_, index) => (
              <span key={index} className="text-xs font-bold text-study-dark whitespace-nowrap">
                {userEmail} · StudyTrack
              </span>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-study-brown">Защищенный урок</p>
            {summaryText && summaryPhase === 'idle' && (
              <button
                onClick={startSummary}
                className="pointer-events-auto shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-study-brown/10 hover:bg-study-brown/20 text-study-brown text-xs font-semibold transition-colors"
              >
                <span>✦</span>
                <span>Краткое резюме</span>
              </button>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-study-dark mb-4">{title}</h1>

          {summaryPhase === 'loading' && (
            <div className="mb-6 rounded-xl bg-study-brown/5 border border-study-brown/15 px-5 py-4 flex items-center gap-3">
              <div className="w-4 h-4 rounded-full border-2 border-study-brown border-t-transparent animate-spin shrink-0" />
              <p className="text-sm text-study-gray">Готовлю краткое резюме...</p>
            </div>
          )}

          {summaryPhase === 'typing' && (
            <div className="mb-6 rounded-xl bg-study-brown/5 border border-study-brown/15 px-5 py-4">
              <p className="text-xs font-bold text-study-brown mb-2 uppercase tracking-wide">✦ Краткое резюме</p>
              <p className="text-sm text-study-dark leading-relaxed whitespace-pre-line">{displayedSummary}<span className="inline-block w-0.5 h-4 bg-study-brown ml-0.5 animate-pulse align-middle" /></p>
            </div>
          )}

          <div className="space-y-4 text-study-dark">
            {blocks.map((block, index) => {
              if (block.type === 'heading') {
                const size = block.level === 1 ? 'text-2xl mt-8' : block.level === 2 ? 'text-xl mt-7' : 'text-lg mt-5'
                const blockNumber = block.text.match(/^Блок\s+(\d+)/i)?.[1]
                if (blockNumber) currentBlockNumber = Number(blockNumber)
                if (lessonKey === 'how-to-choose') {
                  const sm = block.text.match(/^(\d+)\./)
                  if (sm) { currentSectionNumber = Number(sm[1]); currentStepNumber = null }
                  const stm = block.text.match(/^Шаг\s+(\d+)/i)
                  if (stm) currentStepNumber = Number(stm[1])
                }
                if (lessonKey === 'b1') {
                  const subm = block.text.match(/^(\d+)\.(\d+)\./)
                  if (subm) {
                    b1SectionNumber = Number(subm[1])
                    b1SubsectionCode = `${subm[1]}.${subm[2]}`
                  } else {
                    const topm = block.text.match(/^(\d+)\./)
                    if (topm) { b1SectionNumber = Number(topm[1]); b1SubsectionCode = null }
                  }
                }
                if (lessonKey === 'b2') {
                  if (block.level === 1) {
                    const numbered = block.text.match(/^(\d+)\./)
                    if (numbered) {
                      b2SectionNumber = Number(numbered[1])
                      b2SectionName = null
                    } else {
                      b2SectionNumber = null
                      b2SectionName = block.text.toLowerCase().includes('правило') ? 'rules' : null
                    }
                    b2SubsectionIndex = 0
                  } else if (block.level === 2) {
                    b2SubsectionIndex += 1
                  }
                }
                if (lessonKey === 'b3') {
                  if (block.level === 1) {
                    const numbered = block.text.match(/^(\d+)\./)
                    b3SectionNumber = numbered ? Number(numbered[1]) : null
                    b3SubsectionIndex = 0
                  } else if (block.level === 2) {
                    b3SubsectionIndex += 1
                  }
                }
                if (lessonKey === 'b4') {
                  if (block.level === 1) {
                    const numbered = block.text.match(/^(\d+)\./)
                    b4SectionNumber = numbered ? Number(numbered[1]) : null
                    b4SubsectionIndex = 0
                  } else if (block.level === 2) {
                    b4SubsectionIndex += 1
                  }
                }
                if (lessonKey === 'b5') {
                  if (block.level === 1) {
                    const numbered = block.text.match(/^(\d+)\./)
                    b5SectionNumber = numbered ? Number(numbered[1]) : null
                    b5SubsectionIndex = 0
                  } else if (block.level === 2) {
                    b5SubsectionIndex += 1
                  }
                }
                if (lessonKey === 'b6') {
                  if (block.level === 1) {
                    const numbered = block.text.match(/^(\d+)\./)
                    b6SectionNumber = numbered ? Number(numbered[1]) : null
                    b6SubsectionIndex = 0
                  } else if (block.level === 2) {
                    b6SubsectionIndex += 1
                  }
                }
                if (lessonKey === 'b7') {
                  if (block.level === 1) {
                    const numbered = block.text.match(/^(\d+)\./)
                    b7SectionNumber = numbered ? Number(numbered[1]) : null
                    b7SubsectionIndex = 0
                  } else if (block.level === 2) {
                    b7SubsectionIndex += 1
                  }
                }
                if (lessonKey === 'b8') {
                  if (block.level === 1) {
                    const numbered = block.text.match(/^(\d+)\./)
                    b8SectionNumber = numbered ? Number(numbered[1]) : null
                    b8SubsectionIndex = 0
                  } else if (block.level === 2) {
                    b8SubsectionIndex += 1
                  }
                }
                if (lessonKey === 'b9') {
                  if (block.level === 1) {
                    const numbered = block.text.match(/^(\d+)\./)
                    b9SectionNumber = numbered ? Number(numbered[1]) : null
                    b9SubsectionIndex = 0
                  } else if (block.level === 2) {
                    b9SubsectionIndex += 1
                  }
                }
                if (lessonKey === 'b10') {
                  if (block.level === 1) {
                    const numbered = block.text.match(/^(\d+)\./)
                    b10SectionNumber = numbered ? Number(numbered[1]) : null
                    b10SubsectionIndex = 0
                  } else if (block.level === 2) {
                    b10SubsectionIndex += 1
                  }
                }
                if (lessonKey === 'b11') {
                  if (block.level === 1) {
                    const numbered = block.text.match(/^(\d+)\./)
                    b11SectionNumber = numbered ? Number(numbered[1]) : null
                    b11SubsectionIndex = 0
                  } else if (block.level === 2) {
                    b11SubsectionIndex += 1
                  }
                }
                return (
                  <h2 key={index} id={`lesson-heading-${index}`} className={`${size} scroll-mt-6 font-bold text-study-dark`}>
                    {block.text}
                  </h2>
                )
              }

              if (block.type === 'pdf') {
                return (
                  <div key={index} className="my-4 rounded-xl overflow-hidden border border-gray-200">
                    <iframe
                      src={block.src}
                      className="w-full"
                      style={{ height: '520px' }}
                      title="PDF документ"
                    />
                    <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 text-center">
                      <a
                        href={block.src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-study-brown font-medium hover:underline"
                      >
                        Открыть PDF в новой вкладке
                      </a>
                    </div>
                  </div>
                )
              }

              if (block.type === 'image') {
                return <LightboxImage key={index} src={block.src} alt={block.alt} />
              }

              if (block.type === 'slideshow') {
                return <CitySlideshow key={index} images={block.images} />
              }

              const renderWithInfographic = (content: React.ReactNode) => {
                const blockNumber = currentBlockNumber
                const showInfographic = blockNumber ? shouldInsertInfographic(block, blockNumber) : false
                const howToChooseComp = lessonKey === 'how-to-choose' ? shouldInsertHowToChooseComponent(block) : null
                const b1Comp = lessonKey === 'b1' ? shouldInsertB1Component(block) : null
                const b2Comp = lessonKey === 'b2' ? shouldInsertB2Component(block) : null
                const b3Comp = lessonKey === 'b3' ? shouldInsertB3Component(block) : null
                const b4Comp = lessonKey === 'b4' ? shouldInsertB4Component(block) : null
                const b5Comp = lessonKey === 'b5' ? shouldInsertB5Component(block) : null
                const b6Comp = lessonKey === 'b6' ? shouldInsertB6Component(block) : null
                const b7Comp = lessonKey === 'b7' ? shouldInsertB7Component(block) : null
                const b8Comp = lessonKey === 'b8' ? shouldInsertB8Component(block) : null
                const b9Comp = lessonKey === 'b9' ? shouldInsertB9Component(block) : null
                const b10Comp = lessonKey === 'b10' ? shouldInsertB10Component(block) : null
                const b11Comp = lessonKey === 'b11' ? shouldInsertB11Component(block) : null
                return (
                  <div key={index} className="space-y-4">
                    {content}
                    {showInfographic && blockNumber && <LessonInfographic blockNumber={blockNumber} />}
                    {howToChooseComp === 'DirectionCitiesMatrix' && <DirectionCitiesMatrix />}
                    {howToChooseComp === 'ProgramCategorySignals' && <ProgramCategorySignals />}
                    {howToChooseComp === 'UniversitySignsComparison' && <UniversitySignsComparison />}
                    {howToChooseComp === 'ProgramComparisonTable' && <ProgramComparisonTable />}
                    {b1Comp === 'AdmissionBenchmarks' && <AdmissionBenchmarks />}
                    {b1Comp === 'StudentProfileTable' && <StudentProfileTable />}
                    {b1Comp === 'ProfileLevelCards' && <ProfileLevelCards />}
                    {b1Comp === 'BachelorOrGapYear' && <BachelorOrGapYear />}
                    {b2Comp === 'ImportantRulesCards' && <ImportantRulesCards />}
                    {b2Comp === 'DocumentCards' && <DocumentCards />}
                    {b2Comp === 'PreparationTimeline' && <PreparationTimeline />}
                    {b3Comp === 'SituationSelector' && <SituationSelector />}
                    {b3Comp === 'GradingSystemCards' && <GradingSystemCards />}
                    {b3Comp === 'ScanChecklist' && <ScanChecklist />}
                    {b4Comp === 'OrderFlowDiagram' && <OrderFlowDiagram />}
                    {b4Comp === 'FormatChoiceCards' && <FormatChoiceCards />}
                    {b4Comp === 'TimingWarningCard' && <TimingWarningCard />}
                    {b5Comp === 'MedExamFlow' && <MedExamFlow />}
                    {b5Comp === 'DoctorsTable' && <DoctorsTable />}
                    {b5Comp === 'MedFormChecklist' && <MedFormChecklist />}
                    {b6Comp === 'GoodBadExamples' && <GoodBadExamples />}
                    {b6Comp === 'LetterStructureBlocks' && <LetterStructureBlocks />}
                    {b6Comp === 'FiveQuestionsCard' && <FiveQuestionsCard />}
                    {b7Comp === 'GoodBadRecommendation' && <GoodBadRecommendation />}
                    {b7Comp === 'RecommendationStructure' && <RecommendationStructure />}
                    {b7Comp === 'RecommendationChecklist' && <RecommendationChecklist />}
                    {b8Comp === 'VideoScriptFlow' && <VideoScriptFlow />}
                    {b8Comp === 'VideoTechCard' && <VideoTechCard />}
                    {b8Comp === 'VideoAvoidList' && <VideoAvoidList />}
                    {b9Comp === 'StrongVerbsCard' && <StrongVerbsCard />}
                    {b9Comp === 'ResultExamples' && <ResultExamples />}
                    {b9Comp === 'CVStructureList' && <CVStructureList />}
                    {b10Comp === 'DocLinkFlow' && <DocLinkFlow />}
                    {b10Comp === 'AmountGuideCard' && <AmountGuideCard />}
                    {b10Comp === 'FinanceChecklist' && <FinanceChecklist />}
                    {b11Comp === 'InterviewTypesCards' && <InterviewTypesCards />}
                    {b11Comp === 'InterviewPrepFlow' && <InterviewPrepFlow />}
                    {b11Comp === 'TechCheckCard' && <TechCheckCard />}
                  </div>
                )
              }

              if (block.type === 'paragraph') {
                return renderWithInfographic(<p className="text-sm sm:text-base leading-7 text-study-dark">{renderInline(block.text)}</p>)
              }

              if (block.type === 'list') {
                return renderWithInfographic(
                  <ul className="space-y-2 pl-5 list-disc text-sm sm:text-base leading-7">
                    {block.items.map((item, itemIndex) => (
                      <li key={itemIndex}>{item}</li>
                    ))}
                  </ul>,
                )
              }

              if (block.type === 'table') {
                return renderWithInfographic(
                  <div className="overflow-x-auto rounded-xl border border-study-lightgray">
                    <table className="w-full text-sm">
                      <tbody>
                        {block.rows.map((row, rowIndex) => (
                          <tr key={rowIndex} className={rowIndex === 0 ? 'bg-study-bg font-bold' : 'bg-white'}>
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="border-t border-study-lightgray px-3 py-2 align-top">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>,
                )
              }

              return <hr key={index} className="border-study-lightgray my-8" />
            })}
          </div>
        </div>
      </article>
    </div>
  )
}

function LessonInfographic({ blockNumber }: { blockNumber: number }) {
  if (blockNumber === 1) return <DurationMap />
  if (blockNumber === 2) return <SystemsContrast />
  if (blockNumber === 3) return <StudyYearHeatmap />
  if (blockNumber === 4) return <AdmissionsFlow />
  if (blockNumber === 5) return <WorkDecisionTree />
  if (blockNumber === 6) return <ArmyCard />
  if (blockNumber === 7) return <RouteLanes />
  if (blockNumber === 8) return <LanguageQuadrants />
  if (blockNumber === 9) return <ExamDecisionFlow />
  if (blockNumber === 10) return <ExamMatrix />
  if (blockNumber === 11) {
    return (
      <div className="space-y-4 mt-4">
        <CostChart />
        <DormPlan />
      </div>
    )
  }
  if (blockNumber === 14) return <ScholarshipPyramid />
  if (blockNumber === 15) return <PrepTimeline />
  if (blockNumber === 16) return <NextStepsProgress />
  return null
}

function InfographicShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-4 rounded-2xl border border-study-lightgray bg-study-bg/60 p-4 sm:p-5">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-study-brown">Интерактивная схема</p>
        <h3 className="text-lg font-bold text-study-dark mt-1">{title}</h3>
        <p className="text-sm text-study-gray mt-1">{subtitle}</p>
      </div>
      {children}
    </section>
  )
}

const cardButton =
  'rounded-xl border border-study-lightgray bg-white p-3 text-left transition-all hover:border-study-brown hover:shadow-sm'

function DurationMap() {
  const [selected, setSelected] = useState('4 года')
  const routes = [
    { label: '4 года', title: 'Обычный бакалавриат', detail: 'Базовый маршрут для большинства программ.' },
    { label: '5 лет', title: 'Архитектура и инженерия', detail: 'Дополнительный год из-за проектной и технической нагрузки.' },
    { label: '6 лет', title: 'Медицина', detail: 'Самый длинный маршрут: клиническая подготовка занимает больше времени.' },
  ]

  return (
    <InfographicShell title="Сколько длится учеба" subtitle="Нажмите на ветку, чтобы увидеть, где программа отличается от базовых 4 лет.">
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[620px] px-3 py-8">
          <div className="relative h-20">
            <div className="absolute left-0 right-0 top-8 h-1 rounded-full bg-study-green" />
            {[1, 2, 3, 4, 5, 6].map((year) => (
              <div key={year} className="absolute top-0" style={{ left: `${(year - 1) * 20}%` }}>
                <div className="w-10 h-10 rounded-full bg-white border-4 border-study-green flex items-center justify-center text-sm font-bold text-study-green">
                  {year}
                </div>
                <p className="mt-2 text-xs font-semibold text-study-gray">{year} курс</p>
              </div>
            ))}
            <div className="absolute left-[80%] top-10 h-10 w-[20%] border-l-4 border-b-4 border-study-orange rounded-bl-2xl" />
            <div className="absolute left-[80%] top-[72px] text-xs font-bold text-study-orange">5 лет</div>
            <div className="absolute left-[100%] top-10 h-20 w-16 border-l-4 border-b-4 border-red-400 rounded-bl-2xl -translate-x-1/2" />
            <div className="absolute left-[96%] top-[112px] text-xs font-bold text-red-500">6 лет</div>
          </div>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        {routes.map((route) => (
          <button
            key={route.label}
            onClick={() => setSelected(route.label)}
            className={`${cardButton} ${selected === route.label ? 'border-study-brown ring-2 ring-study-brown/15' : ''}`}
          >
            <p className="text-sm font-bold text-study-dark">{route.title}</p>
            <p className="text-xs text-study-brown font-bold mt-1">{route.label}</p>
            {selected === route.label && <p className="text-xs text-study-gray mt-2">{route.detail}</p>}
          </button>
        ))}
      </div>
    </InfographicShell>
  )
}

function SystemsContrast() {
  const [selected, setSelected] = useState('HSK')
  const left = ['ЕГЭ', 'заочное', 'специалитет', 'общие предметы']
  const right = ['HSK', 'очное обучение', 'бакалавриат', 'фокус на специальности']

  return (
    <InfographicShell title="Россия и Китай: разные системы" subtitle="Нажмите на пункт справа, чтобы закрепить главное отличие.">
      <div className="grid md:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
        <div className="rounded-xl bg-white border border-study-lightgray p-4">
          <h4 className="font-bold text-study-dark mb-3">Россия</h4>
          <div className="grid gap-2">
            {left.map((item) => <span key={item} className="rounded-lg bg-study-bg px-3 py-2 text-sm text-study-gray">{item}</span>)}
          </div>
        </div>
        <div className="hidden md:flex items-center justify-center text-3xl font-bold text-study-brown">≠</div>
        <div className="rounded-xl bg-white border border-study-lightgray p-4">
          <h4 className="font-bold text-study-dark mb-3">Китай</h4>
          <div className="grid gap-2">
            {right.map((item) => (
              <button
                key={item}
                onClick={() => setSelected(item)}
                className={`rounded-lg px-3 py-2 text-left text-sm font-semibold ${selected === item ? 'bg-study-green text-white' : 'bg-study-bg text-study-gray'}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 rounded-xl bg-white p-3 text-sm text-study-gray">
        Главная мысль: в Китае поступление больше завязано на язык, очный формат и требования конкретного вуза.
      </p>
    </InfographicShell>
  )
}

function StudyYearHeatmap() {
  const [active, setActive] = useState('Янв')
  const months = [
    ['Авг', 'green', 'Начало семестра, адаптация'],
    ['Сен', 'green', 'Обычная учебная нагрузка'],
    ['Окт', 'green', 'Лекции, семинары, задания'],
    ['Ноя', 'yellow', 'Подготовка к контрольным и проектам'],
    ['Дек', 'red', 'Пик сессии и экзаменов'],
    ['Янв', 'red', 'Экзамены, иногда несколько в одну неделю'],
    ['Фев', 'green', 'Каникулы или старт весеннего семестра'],
    ['Мар', 'green', 'Обычная учеба'],
    ['Апр', 'green', 'Проекты и текущие оценки'],
    ['Май', 'yellow', 'Подготовка к летней сессии'],
    ['Июн', 'red', 'Экзамены и дедлайны'],
    ['Июл', 'blue', 'Практика или стажировка после 3 курса'],
  ]
  const colors: Record<string, string> = {
    green: 'bg-study-green/15 text-study-green border-study-green/25',
    yellow: 'bg-study-orange/15 text-study-orange border-study-orange/25',
    red: 'bg-red-100 text-red-500 border-red-200',
    blue: 'bg-blue-100 text-blue-600 border-blue-200',
  }

  return (
    <InfographicShell title="Нагрузка в течение учебного года" subtitle="Карта показывает, где обычно становится интенсивно.">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {months.map(([month, color]) => (
          <button
            key={month}
            onClick={() => setActive(month)}
            className={`rounded-xl border p-3 text-left ${colors[color]} ${active === month ? 'ring-2 ring-study-brown/20' : ''}`}
          >
            <span className="text-sm font-bold">{month}</span>
            {month === 'Янв' && <AlertTriangle className="w-4 h-4 mt-2" />}
          </button>
        ))}
      </div>
      <p className="mt-3 rounded-xl bg-white p-3 text-sm text-study-gray">
        {months.find(([month]) => month === active)?.[2]}
      </p>
    </InfographicShell>
  )
}

function AdmissionsFlow() {
  const [active, setActive] = useState(5)
  const steps = ['Цель', 'Страны/города', 'Бюджет', 'Вузы', 'Экзамены', 'Документы', 'Подача', 'Интервью', 'Ответ', 'Виза']

  return (
    <InfographicShell title="Поступление как 10 шагов" subtitle="Нажмите на шаг, чтобы увидеть, где вы сейчас в процессе.">
      <div className="grid md:grid-cols-2 gap-3">
        {steps.map((step, index) => {
          const number = index + 1
          const isExam = number === 5
          const isOutcome = number >= 9
          const color = isExam ? 'bg-study-orange' : isOutcome ? 'bg-study-dark' : 'bg-teal-600'
          return (
            <button
              key={step}
              onClick={() => setActive(number)}
              className={`flex items-center gap-3 rounded-xl border bg-white p-3 text-left ${active === number ? 'border-study-brown ring-2 ring-study-brown/15' : 'border-study-lightgray'}`}
            >
              <span className={`w-9 h-9 rounded-full ${color} text-white flex items-center justify-center text-sm font-bold`}>{number}</span>
              <span className="font-semibold text-study-dark">{step}</span>
            </button>
          )
        })}
      </div>
      <div className="mt-3 rounded-xl bg-white p-3 text-sm text-study-gray">
        Выбран шаг {active}: весь маршрут обычно занимает <span className="font-bold text-study-dark">3-12 месяцев</span>.
      </div>
    </InfographicShell>
  )
}

function WorkDecisionTree() {
  const [path, setPath] = useState<'campus' | 'outside' | 'none'>('outside')

  return (
    <InfographicShell title="Можно ли работать студенту" subtitle="Проверьте маршрут: кампус проще, работа вне кампуса требует разрешений.">
      <div className="grid sm:grid-cols-3 gap-3">
        <button onClick={() => setPath('none')} className={`${cardButton} ${path === 'none' ? 'border-study-brown' : ''}`}>
          <Briefcase className="w-5 h-5 text-study-gray mb-2" />
          <p className="font-bold text-study-dark">Не работаю</p>
          <p className="text-xs text-study-gray mt-1">Самый простой вариант по визовым рискам.</p>
        </button>
        <button onClick={() => setPath('campus')} className={`${cardButton} ${path === 'campus' ? 'border-study-green' : ''}`}>
          <CheckCircle className="w-5 h-5 text-study-green mb-2" />
          <p className="font-bold text-study-dark">Внутри кампуса</p>
          <p className="text-xs text-study-gray mt-1">Обычно легче согласовать через университет.</p>
        </button>
        <button onClick={() => setPath('outside')} className={`${cardButton} ${path === 'outside' ? 'border-red-300' : ''}`}>
          <AlertTriangle className="w-5 h-5 text-red-500 mb-2" />
          <p className="font-bold text-study-dark">Вне кампуса</p>
          <p className="text-xs text-study-gray mt-1">Нужны разрешения университета и миграционной службы.</p>
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
        <span className="rounded-full bg-white px-3 py-2">Студенческая виза</span>
        <span className="rounded-full bg-white px-3 py-2">Разрешение университета</span>
        <span className="rounded-full bg-white px-3 py-2">Миграционная служба</span>
        <span className={`rounded-full px-3 py-2 ${path === 'outside' ? 'bg-red-100 text-red-500' : 'bg-study-green/15 text-study-green'}`}>
          {path === 'outside' ? 'Проверить заранее' : 'Риск ниже'}
        </span>
      </div>
    </InfographicShell>
  )
}

function ArmyCard() {
  return (
    <InfographicShell title="Армия: что важно запомнить" subtitle="Схема не заменяет консультацию, но показывает главное действие.">
      <div className="grid md:grid-cols-3 gap-3">
        <div className="rounded-xl bg-white border border-red-200 p-4">
          <XCircle className="w-7 h-7 text-red-500 mb-3" />
          <p className="font-bold text-study-dark">Китайский вуз</p>
          <p className="text-sm text-study-gray mt-1">Сам по себе не дает автоматическую отсрочку.</p>
        </div>
        <div className="rounded-xl bg-white border border-study-green/30 p-4">
          <CheckCircle className="w-7 h-7 text-study-green mb-3" />
          <p className="font-bold text-study-dark">Выезд больше 6 месяцев</p>
          <p className="text-sm text-study-gray mt-1">Нужно заранее разобраться с воинским учетом.</p>
        </div>
        <div className="rounded-xl bg-study-orange/10 border border-study-orange/30 p-4">
          <AlertTriangle className="w-7 h-7 text-study-orange mb-3" />
          <p className="font-bold text-study-dark">Действие</p>
          <p className="text-sm text-study-gray mt-1">Проверь свою ситуацию до покупки билетов.</p>
        </div>
      </div>
    </InfographicShell>
  )
}

function RouteLanes() {
  const [routeId, setRouteId] = useState('direct')
  const routes = [
    { id: 'direct', title: 'Бакалавриат напрямую', icon: Route, detail: 'Быстрее, но нужен готовый язык: HSK или IELTS.' },
    { id: 'language', title: 'Языковой год', icon: Languages, detail: 'Один год на язык, затем выход к HSK 4 и поступлению.' },
    { id: 'foundation', title: 'Foundation', icon: Building2, detail: 'Мост между школой и вузом: язык плюс академическая подготовка.' },
  ]

  return (
    <InfographicShell title="Три маршрута поступления" subtitle="Выберите дорожку, чтобы сравнить логику маршрута.">
      <div className="grid md:grid-cols-3 gap-3">
        {routes.map((route) => {
          const Icon = route.icon
          return (
            <button
              key={route.id}
              onClick={() => setRouteId(route.id)}
              className={`${cardButton} min-h-[170px] ${routeId === route.id ? 'border-study-brown ring-2 ring-study-brown/15' : ''}`}
            >
              <Icon className="w-6 h-6 text-study-brown mb-3" />
              <p className="font-bold text-study-dark">{route.title}</p>
              <div className="my-3 h-2 rounded-full bg-study-lightgray overflow-hidden">
                <div className={`h-full ${route.id === 'language' ? 'w-1/2 bg-study-orange' : 'w-full bg-study-green'}`} />
              </div>
              <p className="text-xs text-study-gray">{route.detail}</p>
            </button>
          )
        })}
      </div>
    </InfographicShell>
  )
}

function LanguageQuadrants() {
  const [active, setActive] = useState('Английский')
  const items = [
    ['Китайский', 'HSK', 'Полное погружение', 'yellow'],
    ['Английский', 'IELTS/TOEFL', 'Удобнее на старте, HSK может понадобиться к выпуску', 'green'],
    ['Bilingual', 'HSK + English', 'Гибридная нагрузка', 'yellow'],
    ['Китайский как специальность', 'База языка', 'Язык становится профессией', 'red'],
  ]

  return (
    <InfographicShell title="Язык обучения: 4 сценария" subtitle="Нажмите на формат, чтобы увидеть требование и риск.">
      <div className="grid sm:grid-cols-2 gap-3">
        {items.map(([title, key, detail, risk]) => (
          <button
            key={title}
            onClick={() => setActive(title)}
            className={`${cardButton} ${active === title ? 'border-study-brown' : ''}`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-study-dark">{title}</p>
              <span className={`w-3 h-3 rounded-full ${risk === 'green' ? 'bg-study-green' : risk === 'yellow' ? 'bg-study-orange' : 'bg-red-500'}`} />
            </div>
            <p className="text-xs text-study-brown font-bold mt-2">Ключ: {key}</p>
            <p className="text-sm text-study-gray mt-1">{detail}</p>
          </button>
        ))}
      </div>
    </InfographicShell>
  )
}

function ExamDecisionFlow() {
  const [track, setTrack] = useState('chinese')
  const tracks = [
    { id: 'chinese', title: 'Китайский трек', detail: 'Главный экзамен: HSK. Уровень зависит от программы.' },
    { id: 'english', title: 'Английский трек', detail: 'IELTS, TOEFL или Duolingo, если вуз принимает этот формат.' },
    { id: 'academic', title: 'Академические экзамены', detail: 'Математика, физика или химия зависят от специальности.' },
    { id: 'csca', title: 'CSCA', detail: 'Отдельная ветка, которую нужно проверять у конкретного вуза.' },
  ]

  return (
    <InfographicShell title="Какие экзамены могут понадобиться" subtitle="Соберите свой маршрут: язык, программа, требования вуза.">
      <div className="grid md:grid-cols-4 gap-3">
        {tracks.map((item) => (
          <button
            key={item.id}
            onClick={() => setTrack(item.id)}
            className={`${cardButton} ${track === item.id ? 'border-study-brown ring-2 ring-study-brown/15' : ''}`}
          >
            <FileText className="w-5 h-5 text-study-brown mb-2" />
            <p className="font-bold text-study-dark">{item.title}</p>
          </button>
        ))}
      </div>
      <p className="mt-3 rounded-xl bg-white p-3 text-sm text-study-gray">
        {tracks.find((item) => item.id === track)?.detail} Финальная проверка всегда идет по странице конкретной программы.
      </p>
    </InfographicShell>
  )
}

function ExamMatrix() {
  const programs = [
    ['Экономика', 'HSK', 'IELTS', 'Math'],
    ['IT', 'HSK', 'IELTS', 'Math'],
    ['Инженерия', 'HSK', 'IELTS', 'Physics'],
    ['Медицина', 'HSK', 'IELTS', 'Chemistry'],
    ['Гуманитарные', 'HSK', 'IELTS', ''],
    ['Дизайн', 'HSK', 'IELTS', 'Portfolio'],
  ]
  const badgeStyle: Record<string, string> = {
    HSK: 'bg-study-orange/15 text-study-orange',
    IELTS: 'bg-study-orange/15 text-study-orange',
    Math: 'bg-blue-100 text-blue-600',
    Physics: 'bg-blue-100 text-blue-600',
    Chemistry: 'bg-blue-100 text-blue-600',
    Portfolio: 'bg-purple-100 text-purple-600',
  }

  return (
    <InfographicShell title="Матрица экзаменов по направлениям" subtitle="Бейджи помогают быстро увидеть типичные требования.">
      <div className="overflow-x-auto rounded-xl border border-study-lightgray">
        <table className="w-full min-w-[620px] text-sm bg-white">
          <thead>
            <tr className="bg-study-bg text-left">
              <th className="p-3">Программа</th>
              <th className="p-3">Китайский трек</th>
              <th className="p-3">Английский трек</th>
              <th className="p-3">Дополнительно</th>
            </tr>
          </thead>
          <tbody>
            {programs.map((row) => (
              <tr key={row[0]} className="border-t border-study-lightgray">
                {row.map((cell, index) => (
                  <td key={index} className="p-3">
                    {index === 0 || !cell ? cell : <span className={`rounded-full px-2 py-1 text-xs font-bold ${badgeStyle[cell]}`}>{cell}</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </InfographicShell>
  )
}

function CostChart() {
  const [active, setActive] = useState('Китайская программа')
  const bars = [
    { title: 'Китайская программа', total: '63 300¥', segments: [30, 18, 5, 4, 43] },
    { title: 'Английская программа', total: '70 300¥', segments: [38, 16, 5, 4, 37] },
  ]
  const colors = ['bg-study-brown', 'bg-study-green', 'bg-study-orange', 'bg-blue-500', 'bg-study-gray']

  return (
    <InfographicShell title="Годовой бюджет: где прячутся расходы" subtitle="Нажмите на программу, чтобы сфокусироваться на сумме.">
      <div className="grid md:grid-cols-2 gap-3">
        {bars.map((bar) => (
          <button key={bar.title} onClick={() => setActive(bar.title)} className={`${cardButton} ${active === bar.title ? 'border-study-brown' : ''}`}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-study-dark">{bar.title}</p>
              <p className="font-bold text-study-brown">{bar.total}</p>
            </div>
            <div className="mt-4 flex h-8 overflow-hidden rounded-full">
              {bar.segments.map((segment, index) => <span key={index} className={colors[index]} style={{ width: `${segment}%` }} />)}
            </div>
          </button>
        ))}
      </div>
      <p className="mt-3 rounded-xl bg-white p-3 text-sm text-study-gray">
        Жизнь и ежедневные расходы часто становятся самой незаметной частью бюджета. Держите ориентир около 3 000¥ в месяц.
      </p>
    </InfographicShell>
  )
}

function DormPlan() {
  const [room, setRoom] = useState('2-местная')
  const rooms = [
    ['1-местная', 'дороже', 'для тех, кому нужна приватность'],
    ['2-местная', 'баланс', 'самый универсальный вариант'],
    ['4-местная', 'дешевле', 'для экономии и социальной среды'],
  ]

  return (
    <InfographicShell title="Общежитие: выбор комнаты" subtitle="Нажмите на комнату, чтобы увидеть компромисс.">
      <div className="grid sm:grid-cols-3 gap-3">
        {rooms.map(([title, price, detail]) => (
          <button key={title} onClick={() => setRoom(title)} className={`${cardButton} ${room === title ? 'border-study-brown' : ''}`}>
            <Home className="w-5 h-5 text-study-brown mb-2" />
            <p className="font-bold text-study-dark">{title}</p>
            <p className="text-xs font-bold text-study-green mt-1">{price}</p>
            <p className="text-xs text-study-gray mt-2">{detail}</p>
          </button>
        ))}
      </div>
      <p className="mt-3 rounded-xl bg-white p-3 text-sm text-study-gray">
        Комендантский час часто бывает около 00:00-06:00, но правила зависят от кампуса.
      </p>
    </InfographicShell>
  )
}

function ScholarshipPyramid() {
  return (
    <InfographicShell title="Гранты как пирамида конкуренции" subtitle="Чем выше уровень гранта, тем выше конкуренция и сильнее пакет.">
      <div className="mx-auto max-w-xl space-y-2 text-center">
        <div className="mx-auto w-2/3 rounded-xl bg-study-dark p-3 text-white">
          <Trophy className="w-5 h-5 mx-auto mb-1" />
          <p className="font-bold">Правительственный грант</p>
          <p className="text-xs opacity-80">высокая конкуренция, часто полное покрытие</p>
        </div>
        <div className="mx-auto w-5/6 rounded-xl bg-study-brown p-3 text-white">
          <p className="font-bold">Провинциальный грант</p>
          <p className="text-xs opacity-80">средняя конкуренция, зависит от региона</p>
        </div>
        <div className="rounded-xl bg-study-green p-3 text-white">
          <p className="font-bold">Университетский грант</p>
          <p className="text-xs opacity-80">проще получить, часто покрывает только обучение</p>
        </div>
      </div>
    </InfographicShell>
  )
}

function PrepTimeline() {
  const month = new Date().getMonth()
  const marker = `${Math.round(((month + 1) / 12) * 100)}%`
  const tracks = [
    ['Грант', 'Сентябрь', 'экзамены', 'подача', 'ответ'],
    ['Платное', 'Февраль', 'подбор вузов', 'подача', 'виза'],
  ]

  return (
    <InfographicShell title="Когда начинать подготовку" subtitle="Две дорожки на одной шкале: грант обычно стартует раньше.">
      <div className="relative rounded-xl bg-white border border-study-lightgray p-4 overflow-x-auto">
        <div className="absolute top-4 bottom-4 w-0.5 bg-red-400" style={{ left: marker }} />
        <span className="absolute top-1 -translate-x-1/2 rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold text-red-500" style={{ left: marker }}>СЕЙЧАС</span>
        <div className="min-w-[620px] space-y-5 pt-7">
          {tracks.map(([title, start, mid, apply, finish], index) => (
            <div key={title} className="grid grid-cols-[90px_1fr] gap-3 items-center">
              <p className={`font-bold ${index === 0 ? 'text-study-orange' : 'text-teal-600'}`}>{title}</p>
              <div className="relative h-12 rounded-full bg-study-bg">
                <div className={`absolute left-[8%] right-[12%] top-4 h-4 rounded-full ${index === 0 ? 'bg-study-orange/35' : 'bg-teal-600/25'}`} />
                {[start, mid, apply, finish].map((label, pointIndex) => (
                  <span key={label} className="absolute top-1 -translate-x-1/2 rounded-lg bg-white px-2 py-1 text-xs font-semibold text-study-dark border border-study-lightgray" style={{ left: `${15 + pointIndex * 25}%` }}>
                    {pointIndex === 1 && <Star className="inline w-3 h-3 mr-1 text-study-orange" />}
                    {label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </InfographicShell>
  )
}

function NextStepsProgress() {
  const [done, setDone] = useState(1)
  const total = 13
  const percent = Math.round((done / total) * 100)

  return (
    <InfographicShell title="Следующий шаг как прогресс" subtitle="Отмечайте шаги мысленно: процесс становится менее тяжелым, когда он разбит на этапы.">
      <div className="rounded-xl bg-white border border-study-lightgray p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-bold text-study-dark">{percent}%</p>
          <p className="text-sm text-study-gray">Пройдено {done} из {total}</p>
        </div>
        <div className="mt-3 h-4 rounded-full bg-study-lightgray overflow-hidden">
          <div className="h-full bg-study-green transition-all" style={{ width: `${percent}%` }} />
        </div>
        <div className="mt-4 grid grid-cols-4 sm:grid-cols-7 gap-2">
          {Array.from({ length: total }).map((_, index) => (
            <button
              key={index}
              onClick={() => setDone(index + 1)}
              className={`h-9 rounded-lg text-xs font-bold ${index < done ? 'bg-study-green text-white' : 'bg-study-bg text-study-gray'}`}
            >
              {index === 0 ? 'Старт' : index}
            </button>
          ))}
        </div>
        <p className="mt-4 rounded-xl bg-study-bg p-3 text-sm text-study-gray">
          Поступление в Китай — это длинный маршрут, но каждый закрытый шаг реально двигает вас вперед.
        </p>
      </div>
    </InfographicShell>
  )
}
