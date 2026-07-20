import { AlertCircle, RefreshCw } from 'lucide-react'

interface SectionStateProps {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function LoadingState({ heightClass = 'h-32' }: { heightClass?: string }) {
  return <div className={`${heightClass} rounded-xl bg-study-bg animate-pulse`} />
}

export function EmptyState({ title, description }: SectionStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-study-lightgray bg-study-bg/60 px-4 py-5 text-center">
      <p className="text-sm font-semibold text-study-dark">{title}</p>
      {description && <p className="text-xs text-study-gray mt-1">{description}</p>}
    </div>
  )
}

export function ErrorState({
  title,
  description = 'Проверьте подключение и попробуйте снова.',
  actionLabel = 'Повторить',
  onAction,
}: SectionStateProps) {
  return (
    <div className="rounded-xl border border-study-red/20 bg-study-red/5 px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-3 flex-1">
        <div className="w-9 h-9 rounded-full bg-study-red/10 flex items-center justify-center shrink-0">
          <AlertCircle className="w-4 h-4 text-study-red" />
        </div>
        <div>
          <p className="text-sm font-semibold text-study-dark">{title}</p>
          <p className="text-xs text-study-gray mt-1">{description}</p>
        </div>
      </div>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-study-card border border-study-lightgray text-xs font-semibold text-study-dark hover:bg-study-bg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {actionLabel}
        </button>
      )}
    </div>
  )
}
