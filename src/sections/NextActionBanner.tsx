import { useEffect, useState } from 'react'
import { Info } from 'lucide-react'
import type { NextAction } from '@/types/studytrack'

export default function NextActionBanner() {
  const [action, setAction] = useState<NextAction | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)

    fetch('/api/next-action')
      .then((response) => (response.ok ? response.json() : { action: null }))
      .then((data) => setAction(data.action))
      .catch(() => setAction(null))
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading || !action) return null

  return (
    <div className="bg-study-card rounded-xl card-shadow border-l-4 border-study-green p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4 flex-1">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-study-green/10 flex items-center justify-center shrink-0">
            <Info className="w-4 h-4 sm:w-5 sm:h-5 text-study-green" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-semibold text-study-dark">Следующий шаг</p>
            <p className="text-xs sm:text-sm text-study-dark mt-0.5">
              {action.title}
              {action.deadline && (
                <>
                  {' '}до <span className="font-semibold text-study-green">{action.deadline}</span>
                </>
              )}
            </p>
          </div>
        </div>
        <button className="w-full sm:w-auto px-4 py-2.5 bg-study-green text-white text-sm font-medium rounded-lg hover:bg-study-green/90 transition-colors shrink-0">
          {action.actionButtonText}
        </button>
      </div>
    </div>
  )
}
