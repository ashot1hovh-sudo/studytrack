import { useApp } from '@/context/AppContext'
import { MessageCircle, AlertTriangle } from 'lucide-react'
import NextActionBanner from '@/sections/NextActionBanner'
import Roadmap from '@/sections/Roadmap'
import Universities from '@/sections/Universities'
import Checklist from '@/sections/Checklist'
import Deadlines from '@/sections/Deadlines'
import LearningStart from '@/sections/LearningStart'

export default function Dashboard() {
  const { activeTab, isParentMode, user } = useApp()
  const isDashboard = activeTab === 'dashboard'

  const pageMeta = {
    'learning-start': {
      title: 'Начало обучения',
      subtitle: 'Стартовые материалы и доступ к tutorial-модулям',
    },
    dashboard: {
      title: `Добро пожаловать, ${user?.fullName?.split(' ')[0] ?? 'студент'}`,
      subtitle: isParentMode
        ? 'Вы просматриваете статус в режиме родителя'
        : 'Ваш текущий прогресс поступления',
    },
    checklist: {
      title: 'Чек-лист документов',
      subtitle: isParentMode
        ? 'Общий статус подготовки документов'
        : 'Документы, дедлайны и загрузка файлов',
    },
    universities: {
      title: 'Вузы',
      subtitle: 'Статусы заявок, порталы и история изменений',
    },
    deadlines: {
      title: 'Дедлайны',
      subtitle: 'Ближайшие даты и контекст по поступлению',
    },
  }[activeTab] ?? {
    title: 'StudyTrack',
    subtitle: 'Ваш текущий прогресс поступления',
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto pt-16 lg:pt-6 pb-24 lg:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-study-dark">
            {pageMeta.title}
          </h1>
          <p className="text-xs sm:text-sm text-study-gray mt-1">
            {pageMeta.subtitle}
          </p>
        </div>
        <button className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-study-dark bg-white rounded-lg card-shadow hover:card-shadow-hover transition-all">
          <MessageCircle className="w-4 h-4" />
          <span>Написать консультанту</span>
        </button>
      </div>

      {isParentMode && (
        <div className="mb-5 p-3 sm:p-4 bg-study-orange/10 rounded-xl border border-study-orange/20 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-study-orange shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-study-dark">
            Режим родителя: показаны только общий прогресс, статус вузов и дедлайны. Загрузка документов и внутренние заметки скрыты.
          </p>
        </div>
      )}

      {activeTab === 'learning-start' && (
        <div className="max-w-6xl">
          <LearningStart />
        </div>
      )}

      {isDashboard && (
        <>
          <div className="mb-5">
            <NextActionBanner />
          </div>

          <div className="mb-5">
            <Roadmap />
          </div>

          <div className="flex flex-col xl:grid xl:grid-cols-3 gap-4 sm:gap-6 mb-5">
            <div className="xl:col-span-2">
              <Universities />
            </div>
            <div className="xl:col-span-1">
              <Checklist />
            </div>
          </div>

          <div className="mb-5">
            <Deadlines />
          </div>
        </>
      )}

      {activeTab === 'checklist' && (
        <div className="max-w-3xl">
          <Checklist />
        </div>
      )}

      {activeTab === 'universities' && (
        <div className="max-w-5xl">
          <Universities />
        </div>
      )}

      {activeTab === 'deadlines' && <Deadlines />}
    </div>
  )
}
