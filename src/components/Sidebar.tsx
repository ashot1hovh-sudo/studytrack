import { LayoutDashboard, ClipboardList, School, CalendarDays, Compass, MessageCircle, User, ChevronRight, Menu, X, LogOut, GraduationCap, Lock, Target } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { Switch } from '@/components/ui/switch'
import { useState } from 'react'

const baseMenuItems = [
  { id: 'learning-start', label: 'Начало обучения', icon: GraduationCap },
  { id: 'dashboard', label: 'Главная', icon: LayoutDashboard },
  { id: 'checklist', label: 'Чек-лист', icon: ClipboardList },
  { id: 'universities', label: 'Вузы', icon: School },
  { id: 'deadlines', label: 'Дедлайны', icon: CalendarDays },
  { id: 'chances', label: 'Мои шансы', icon: Target },
]

export default function Sidebar() {
  const { activeTab, setActiveTab, isParentMode, setIsParentMode, user, logout } = useApp()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const menuItems = [
    ...baseMenuItems,
    ...(user?.serviceType === 'diy' && user.subscriptionStatus === 'active'
      ? [{ id: 'paid-modules', label: 'Платные модули', icon: Lock }]
      : []),
  ]

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[240px] min-h-screen bg-white flex-col card-shadow sticky top-0 z-50">
        {/* Logo */}
        <div className="p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/kai-kitay-logo.png" alt="Кай Китай" className="h-[50px] w-auto" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-study-brown/10 text-study-brown'
                        : 'text-study-dark hover:bg-study-lightgray/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Parent Mode Toggle */}
        <div className="px-4 py-3 mx-3 mb-3 bg-study-bg rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-study-dark">Режим родителя</span>
            <Switch
              checked={isParentMode}
              onCheckedChange={setIsParentMode}
            />
          </div>
          {isParentMode && (
            <p className="text-[10px] text-study-gray mt-1">Упрощённый просмотр без загрузки файлов</p>
          )}
        </div>

        {/* Consultant Contact */}
        <div className="px-4 py-3 mx-3 mb-3 bg-study-green/10 rounded-lg">
          <a href="https://t.me/ash_china" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-medium text-study-green w-full">
            <MessageCircle className="w-4 h-4" />
            <span>Написать консультанту</span>
          </a>
        </div>

        {/* User */}
        <div className="p-4 border-t border-study-lightgray">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-study-brown/20 flex items-center justify-center">
              <User className="w-4 h-4 text-study-brown" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-study-dark truncate">{user?.fullName ?? 'Студент'}</p>
              <p className="text-xs text-study-gray">{isParentMode ? 'Родитель' : 'Студент'}</p>
            </div>
            <button
              onClick={logout}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-study-bg transition-colors"
            >
              <LogOut className="w-4 h-4 text-study-gray" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white card-shadow z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/kai-kitay-logo.png" alt="Кай Китай" className="h-8 w-auto" />
        </div>
        <div className="flex items-center gap-2">
          {isParentMode && (
            <span className="text-[10px] px-2 py-1 bg-study-orange/10 text-study-orange rounded-full font-medium">
              Родитель
            </span>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-study-bg transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-study-dark" /> : <Menu className="w-5 h-5 text-study-dark" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-white z-50 pt-14">
          <div className="px-4 py-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false) }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium transition-all ${
                    isActive
                      ? 'bg-study-brown/10 text-study-brown'
                      : 'text-study-dark hover:bg-study-bg'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {isActive && <ChevronRight className="w-5 h-5 ml-auto" />}
                </button>
              )
            })}
          </div>

          {/* Parent Mode in Mobile Menu */}
          <div className="mx-4 mt-4 p-4 bg-study-bg rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-study-dark">Режим родителя</span>
                <p className="text-xs text-study-gray mt-0.5">Упрощённый просмотр</p>
              </div>
              <Switch
                checked={isParentMode}
                onCheckedChange={(v) => { setIsParentMode(v); setMobileMenuOpen(false) }}
              />
            </div>
          </div>

          <div className="mx-4 mt-3 p-4 bg-study-green/10 rounded-xl">
            <a href="https://t.me/ash_china" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm font-medium text-study-green">
              <MessageCircle className="w-5 h-5" />
              <span>Написать консультанту</span>
            </a>
          </div>

          <div className="absolute bottom-8 left-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-study-brown/20 flex items-center justify-center">
              <User className="w-5 h-5 text-study-brown" />
            </div>
            <div>
              <p className="text-sm font-medium text-study-dark">{user?.fullName ?? 'Студент'}</p>
              <p className="text-xs text-study-gray">{isParentMode ? 'Родитель' : 'Студент'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white card-shadow z-40 border-t border-study-lightgray px-2 pb-safe">
        <div className="flex items-center justify-around">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-0.5 py-2 px-3 min-w-[64px] transition-all ${
                  isActive ? 'text-study-brown' : 'text-study-gray'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.5} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
