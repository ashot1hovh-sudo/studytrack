import { LayoutDashboard, ClipboardList, School, CalendarDays, Compass, MessageCircle, User, ChevronRight, Menu, X, LogOut, GraduationCap, Target } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import Logo from '@/components/Logo'
import ThemeSwitch from '@/components/ThemeSwitch'
import { useState } from 'react'

const baseMenuItems = [
  { id: 'learning-start', label: 'Начало обучения', icon: GraduationCap },
  { id: 'dashboard', label: 'Главная', icon: LayoutDashboard },
  { id: 'checklist', label: 'Чек-лист', icon: ClipboardList },
  { id: 'universities', label: 'Вузы', icon: School },
  { id: 'deadlines', label: 'Дедлайны', icon: CalendarDays },
  { id: 'chances', label: 'Кейсы поступлений', icon: Target },
]

export default function Sidebar() {
  const { activeTab, setActiveTab, user, logout } = useApp()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const menuItems = [...baseMenuItems]

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[240px] min-h-screen bg-study-card flex-col card-shadow sticky top-0 z-50">
        {/* Logo */}
        <div className="p-6">
          <Logo className="h-[50px] w-auto" />
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
                    data-tour={`nav-${item.id}`}
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

        {/* User */}
        <div className="p-4 border-t border-study-lightgray">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-study-brown/20 flex items-center justify-center">
              <User className="w-4 h-4 text-study-brown" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-study-dark truncate">{user?.fullName ?? 'Студент'}</p>
              <p className="text-xs text-study-gray">Студент</p>
            </div>
            <ThemeSwitch />
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
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-study-card card-shadow z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <Logo className="h-8 w-auto" />
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitch />
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
        <div className="lg:hidden fixed inset-0 bg-study-card z-50 pt-14">
          {/* The overlay is z-50 and the header z-40, so it covers the header's
              own close button — without this the menu can only be dismissed by
              picking a nav item. */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="absolute top-3 right-4 w-10 h-10 flex items-center justify-center rounded-lg hover:bg-study-bg transition-colors"
            title="Закрыть меню"
            aria-label="Закрыть меню"
          >
            <X className="w-6 h-6 text-study-dark" />
          </button>
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

          {/* Full width with the actions on the right: logout had no mobile
              entry point at all, and the theme toggle only lived in the header. */}
          <div className="absolute bottom-8 left-4 right-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-study-brown/20 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-study-brown" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-study-dark truncate">{user?.fullName ?? 'Студент'}</p>
              <p className="text-xs text-study-gray">Студент</p>
            </div>
            <ThemeSwitch />
            <button
              onClick={logout}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-study-bg transition-colors shrink-0"
              title="Выйти"
              aria-label="Выйти"
            >
              <LogOut className="w-5 h-5 text-study-gray" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-study-card card-shadow z-40 border-t border-study-lightgray px-2 pb-safe">
        <div className="flex items-center justify-around">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                data-tour={`mnav-${item.id}`}
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
