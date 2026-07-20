import { useApp } from '@/context/AppContext'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import ThemeSwitch from '@/components/ThemeSwitch'
import NextActionBanner from '@/sections/NextActionBanner'
import Roadmap from '@/sections/Roadmap'
import Universities from '@/sections/Universities'
import Checklist from '@/sections/Checklist'
import Deadlines from '@/sections/Deadlines'
import LearningStart from '@/sections/LearningStart'
import ChancesEvaluator from '@/sections/ChancesEvaluator'

export default function Dashboard() {
  const { activeTab, user } = useApp()
  const isDashboard = activeTab === 'dashboard'

  const pageMeta = {
'learning-start': {
      title: 'Начало обучения',
      subtitle: 'Стартовые материалы и доступ к tutorial-модулям',
    },
    dashboard: {
      title: `Добро пожаловать, ${user?.fullName?.split(' ')[0] ?? 'студент'}`,
      subtitle: 'Ваш текущий прогресс поступления',
    },
    checklist: {
      title: 'Чек-лист документов',
      subtitle: 'Документы, дедлайны и загрузка файлов',
    },
    universities: {
      title: 'Вузы',
      subtitle: 'Статусы заявок, порталы и история изменений',
    },
    deadlines: {
      title: 'Дедлайны',
      subtitle: 'Ближайшие даты и контекст по поступлению',
    },
    chances: {
      title: '🎯 Кейсы поступлений',
      subtitle: 'Реальные результаты поступлений — фильтруйте и сравнивайте со своими',
    },
  }[activeTab] ?? {
    title: 'StudyTrack',
    subtitle: 'Ваш текущий прогресс поступления',
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 pt-16 lg:pt-6 pb-24 lg:pb-6">
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
        {/* Desktop only: on mobile the toggle already sits in the top bar and
            the menu, and a third copy would just crowd the header. */}
        <ThemeSwitch className="hidden lg:inline-flex shrink-0" />
      </div>

      {user?.serviceType === 'diy' && (
        <div className={`mb-5 p-3 sm:p-4 rounded-xl border flex items-start gap-3 ${
          user.subscriptionStatus === 'trial'
            ? 'bg-study-orange/10 border-study-orange/20'
            : user.subscriptionStatus === 'active'
              ? 'bg-study-green/10 border-study-green/20'
              : 'bg-study-gray/10 border-study-gray/20'
        }`}>
          {user.subscriptionStatus === 'active'
            ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-study-green" />
            : <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${
                user.subscriptionStatus === 'trial' ? 'text-study-orange' : 'text-study-gray'
              }`} />
          }
          <div className="text-xs sm:text-sm text-study-dark">
            <p className="font-semibold">
              {user.subscriptionStatus === 'trial'
                ? 'Пробный период'
                : user.subscriptionStatus === 'active'
                  ? 'Подписка активна'
                  : 'Подписка неактивна'}
            </p>
            <p className="mt-0.5">
              {user.subscriptionStatus === 'trial'
                ? 'У вас есть доступ к бесплатным материалам. Для полного доступа свяжитесь с консультантом.'
                : user.subscriptionStatus === 'active'
                  ? 'У вас полный доступ ко всем материалам.'
                  : 'Ваш доступ ограничен. Свяжитесь с консультантом для продления.'}
            </p>
          </div>
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
              <Universities compact />
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

      {activeTab === 'deadlines' && (
        <div className="max-w-4xl">
          <Deadlines variant="calendar" />
        </div>
      )}

{activeTab === 'chances' && (
        <div className="max-w-4xl">
          <ChancesEvaluator />
        </div>
      )}
    </div>
  )
}
