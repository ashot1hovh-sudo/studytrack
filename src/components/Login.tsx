import { useState, useCallback } from 'react'
import { useApp } from '@/context/AppContext'
import { Compass, Eye, EyeOff, Lock, User } from 'lucide-react'

export default function Login() {
  const { login, loginError } = useApp()
  const [loginMode, setLoginMode] = useState<'student' | 'admin'>('student')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [shake, setShake] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setIsLoading(true)

      const success = await login(email, password)
      if (!success) {
        setShake(true)
        setTimeout(() => setShake(false), 500)
      }
      setIsLoading(false)
    },
    [email, password, login]
  )

  return (
    <div className="min-h-screen bg-study-bg flex items-center justify-center p-4">
      <div
        className={`w-full max-w-sm transition-transform duration-300 ${shake ? 'animate-shake' : ''}`}
      >
        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-study-brown flex items-center justify-center mb-4 shadow-lg shadow-study-brown/20">
            <Compass className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-study-dark">StudyTrack</h1>
          <p className="text-sm text-study-gray mt-1">Трекер поступления</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl card-shadow p-6 sm:p-8">
          <h2 className="text-lg font-bold text-study-dark mb-1">
            {loginMode === 'admin' ? 'Вход администратора' : 'Вход студента'}
          </h2>
          <p className="text-sm text-study-gray mb-4">Введите email и пароль</p>

          <div className="grid grid-cols-2 gap-2 p-1 bg-study-bg rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setLoginMode('student')}
              className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                loginMode === 'student' ? 'bg-white text-study-brown card-shadow' : 'text-study-gray'
              }`}
            >
              Студент
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('admin')}
              className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                loginMode === 'admin' ? 'bg-white text-study-brown card-shadow' : 'text-study-gray'
              }`}
            >
              Админ
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-study-dark mb-1.5">
                Email
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-study-gray">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alexey@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-study-bg border border-study-lightgray rounded-xl text-sm text-study-dark placeholder:text-study-gray/60 focus:outline-none focus:border-study-brown focus:ring-2 focus:ring-study-brown/10 transition-all"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-study-dark mb-1.5">
                Пароль
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-study-gray">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-study-bg border border-study-lightgray rounded-xl text-sm text-study-dark placeholder:text-study-gray/60 focus:outline-none focus:border-study-brown focus:ring-2 focus:ring-study-brown/10 transition-all"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-study-gray hover:text-study-dark transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="p-3 bg-study-red/10 border border-study-red/20 rounded-xl">
                <p className="text-xs text-study-red font-medium">{loginError}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full py-3.5 bg-study-brown text-white font-semibold text-sm rounded-xl hover:bg-study-brown/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed shadow-lg shadow-study-brown/20"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Вход...
                </span>
              ) : (
                'Войти'
              )}
            </button>
          </form>

          <div className="mt-6 p-3 bg-study-bg rounded-xl">
            <p className="text-[11px] text-study-gray text-center leading-relaxed">
              {loginMode === 'admin'
                ? 'Админ-доступ доступен только аккаунту с ролью consultant.'
                : 'Студент видит свой прогресс и загружает документы.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-study-gray mt-6">
          StudyTrack — ваш прогресс поступления всегда под рукой
        </p>
      </div>

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  )
}
