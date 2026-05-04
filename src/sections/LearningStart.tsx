import { useMemo, useState } from 'react'
import { ArrowLeft, BookOpen, KeyRound, Lock, MessageCircle, PlayCircle, X } from 'lucide-react'
import { ErrorState, LoadingState } from '@/components/SectionState'

const lockedModules = [
  { id: 'language-year', title: 'Языковой год: Туториал' },
  { id: 'bachelor', title: 'Бакалавриат: Туториал' },
]

export default function LearningStart() {
  const [lockedModule, setLockedModule] = useState<string | null>(null)
  const [pinCode, setPinCode] = useState('')
  const [isIntroOpen, setIsIntroOpen] = useState(false)
  const [lesson, setLesson] = useState<{ title: string; content: string; userEmail?: string } | null>(null)
  const [isLessonLoading, setIsLessonLoading] = useState(false)
  const [lessonError, setLessonError] = useState<string | null>(null)

  const openTelegram = () => {
    window.open('https://t.me/', '_blank', 'noopener,noreferrer')
  }

  const openIntroLesson = () => {
    setIsIntroOpen(true)
    setIsLessonLoading(true)
    setLessonError(null)

    fetch('/api/learning/intro')
      .then((response) => {
        if (!response.ok) throw new Error('Не удалось открыть урок')
        return response.json()
      })
      .then((data) => setLesson(data))
      .catch((err) => setLessonError(err instanceof Error ? err.message : 'Не удалось открыть урок'))
      .finally(() => setIsLessonLoading(false))
  }

  const lessonBlocks = useMemo(() => parseMarkdown(lesson?.content ?? ''), [lesson?.content])

  if (isIntroOpen) {
    return (
      <div className="bg-white rounded-xl card-shadow p-4 sm:p-6">
        <button
          onClick={() => setIsIntroOpen(false)}
          className="inline-flex items-center gap-2 rounded-lg bg-study-bg px-3 py-2 text-sm font-semibold text-study-dark mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад
        </button>

        {isLessonLoading && <LoadingState heightClass="h-72" />}

        {!isLessonLoading && lessonError && (
          <ErrorState title="Урок не открылся" description={lessonError} onAction={openIntroLesson} />
        )}

        {!isLessonLoading && !lessonError && lesson && (
          <ProtectedLesson
            title={lesson.title}
            blocks={lessonBlocks}
            userEmail={lesson.userEmail ?? 'student'}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-2 gap-4">
        <button
          onClick={openIntroLesson}
          className="text-left bg-white rounded-xl card-shadow p-5 sm:p-6 min-h-[180px] hover:card-shadow-hover transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-study-green/10 flex items-center justify-center mb-5">
            <PlayCircle className="w-6 h-6 text-study-green" />
          </div>
          <h2 className="text-xl font-bold text-study-dark">Начало</h2>
          <p className="text-sm text-study-gray mt-2">Первый блок для старта работы с платформой.</p>
        </button>

        <button className="text-left bg-white rounded-xl card-shadow p-5 sm:p-6 min-h-[180px] hover:card-shadow-hover transition-all">
          <div className="w-12 h-12 rounded-xl bg-study-brown/10 flex items-center justify-center mb-5">
            <BookOpen className="w-6 h-6 text-study-brown" />
          </div>
          <h2 className="text-xl font-bold text-study-dark">Как пользоваться платформой?</h2>
          <p className="text-sm text-study-gray mt-2">Короткое объяснение навигации, документов и дедлайнов.</p>
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {lockedModules.map((module) => (
          <button
            key={module.id}
            onClick={() => {
              setLockedModule(module.title)
              setPinCode('')
            }}
            className="relative text-left bg-white rounded-xl card-shadow p-5 min-h-[120px] hover:card-shadow-hover transition-all overflow-hidden"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-study-dark">{module.title}</h3>
                <p className="text-sm text-study-gray mt-2">Платный модуль</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-study-dark/10 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-study-dark" />
              </div>
            </div>
          </button>
        ))}
      </div>

      {lockedModule && (
        <div className="fixed inset-0 z-[70] bg-study-dark/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl card-shadow-hover p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-study-dark">{lockedModule}</h3>
                <p className="text-sm text-study-gray mt-1">Модуль закрыт</p>
              </div>
              <button
                onClick={() => setLockedModule(null)}
                className="w-9 h-9 rounded-lg bg-study-bg flex items-center justify-center"
              >
                <X className="w-5 h-5 text-study-dark" />
              </button>
            </div>

            <div className="mt-5 rounded-xl bg-study-bg p-4">
              <p className="text-sm font-semibold text-study-dark">
                Введите PIN-код, чтобы получить доступ к файлам.
              </p>
              <p className="text-sm text-study-gray mt-2">
                Чтобы получить индивидуальный PIN-код, свяжитесь с Яной.
              </p>
            </div>

            <input
              type="password"
              value={pinCode}
              onChange={(event) => setPinCode(event.target.value)}
              placeholder="PIN-код"
              className="mt-4 w-full rounded-xl border border-study-lightgray bg-white px-4 py-3 text-sm text-study-dark focus:outline-none focus:border-study-brown"
            />

            <button
              className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-study-brown px-4 py-3 text-sm font-bold text-white hover:bg-study-brown/90 transition-colors disabled:opacity-50"
              disabled={!pinCode.trim()}
            >
              <KeyRound className="w-5 h-5" />
              Открыть доступ
            </button>

            <button
              onClick={openTelegram}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#229ED9] px-4 py-3 text-sm font-bold text-white hover:bg-[#1d8fc5] transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              Написать Яне в Telegram
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

type MarkdownBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; rows: string[][] }
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

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: 'paragraph', text: cleanMarkdownText(paragraph.join(' ')) })
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

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      flushParagraph()
      flushList()
      flushTable()
      continue
    }

    if (line === '---') {
      flushParagraph()
      flushList()
      flushTable()
      blocks.push({ type: 'rule' })
      continue
    }

    if (line.startsWith('|') && line.endsWith('|')) {
      flushParagraph()
      flushList()
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
      blocks.push({
        type: 'heading',
        level: heading[1].length,
        text: cleanMarkdownText(heading[2]),
      })
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
  return blocks
}

function ProtectedLesson({
  title,
  blocks,
  userEmail,
}: {
  title: string
  blocks: MarkdownBlock[]
  userEmail: string
}) {
  const prevent = (event: React.SyntheticEvent) => event.preventDefault()

  return (
    <article
      className="relative overflow-hidden rounded-xl border border-study-lightgray bg-white p-4 sm:p-8 select-none"
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

      <div className="relative z-10 max-w-3xl mx-auto">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-study-brown mb-2">Защищенный урок</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-study-dark mb-6">{title}</h1>

        <div className="space-y-4 text-study-dark">
          {blocks.map((block, index) => {
            if (block.type === 'heading') {
              const size = block.level === 1 ? 'text-2xl mt-8' : block.level === 2 ? 'text-xl mt-7' : 'text-lg mt-5'
              return <h2 key={index} className={`${size} font-bold text-study-dark`}>{block.text}</h2>
            }

            if (block.type === 'paragraph') {
              return <p key={index} className="text-sm sm:text-base leading-7 text-study-dark">{block.text}</p>
            }

            if (block.type === 'list') {
              return (
                <ul key={index} className="space-y-2 pl-5 list-disc text-sm sm:text-base leading-7">
                  {block.items.map((item, itemIndex) => (
                    <li key={itemIndex}>{item}</li>
                  ))}
                </ul>
              )
            }

            if (block.type === 'table') {
              return (
                <div key={index} className="overflow-x-auto rounded-xl border border-study-lightgray">
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
                </div>
              )
            }

            return <hr key={index} className="border-study-lightgray my-8" />
          })}
        </div>
      </div>
    </article>
  )
}
