'use client'

import { motion } from 'framer-motion'

type MediaModuleCardProps = {
  number: number
  title: string
  description: string
  articleText?: string
  locked?: boolean
  onClick?: () => void
}

export function MediaModuleCard({
  number,
  title,
  description,
  articleText,
  locked = false,
  onClick,
}: MediaModuleCardProps) {
  // Duplicate text so the scroll loops seamlessly
  const scrollContent = articleText ? `${articleText}\n\n${articleText}` : ''

  return (
    <motion.button
      onClick={onClick}
      whileHover="hover"
      initial="rest"
      animate="rest"
      className="relative overflow-hidden rounded-2xl text-left w-full group border border-study-lightgray bg-study-card"
      style={{ minHeight: 160 }}
    >
      {/* Scrolling article background */}
      {scrollContent && (
        <>
          <motion.div
            className="absolute inset-0 z-0 p-5 overflow-hidden"
            variants={{ rest: { opacity: 0 }, hover: { opacity: 1 } }}
            transition={{ duration: 0.35 }}
          >
            <div className="article-scroll text-[11px] leading-5 text-study-dark/70 whitespace-pre-wrap select-none pointer-events-none">
              {scrollContent}
            </div>
          </motion.div>

          {/* Gradient mask: fades text at top and bottom edges */}
          <motion.div
            className="absolute inset-0 z-10 pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, white 0%, transparent 28%, transparent 72%, white 100%)',
            }}
            variants={{ rest: { opacity: 0 }, hover: { opacity: 1 } }}
            transition={{ duration: 0.35 }}
          />

          {/* Subtle dark tint so card text stays readable */}
          <motion.div
            className="absolute inset-0 z-10 pointer-events-none bg-study-card/60"
            variants={{ rest: { opacity: 0 }, hover: { opacity: 1 } }}
            transition={{ duration: 0.35 }}
          />
        </>
      )}

      {/* Card content — always on top */}
      <div className="relative z-20 p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <motion.div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-study-brown/10"
            variants={{ rest: { backgroundColor: 'rgba(120,80,60,0.1)' }, hover: { backgroundColor: 'rgba(120,80,60,0.18)' } }}
            transition={{ duration: 0.3 }}
          >
            <span className="text-study-brown font-bold">{number}</span>
          </motion.div>

          {locked ? (
            <div className="w-8 h-8 rounded-full bg-study-dark/8 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-study-dark/40">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-study-green/10 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-study-green">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
        </div>

        <p className="font-bold text-study-dark">{title}</p>
        <p className="text-sm text-study-gray mt-1">{description}</p>

        {locked && (
          <motion.p
            className="text-xs font-semibold mt-3 text-study-brown"
            variants={{ rest: { opacity: 0.7 }, hover: { opacity: 1 } }}
            transition={{ duration: 0.3 }}
          >
            Нажмите, чтобы ввести PIN →
          </motion.p>
        )}
      </div>

      <style jsx>{`
        .article-scroll {
          animation: none;
        }
        .group:hover .article-scroll {
          animation: scrollUp 18s linear infinite;
        }
        @keyframes scrollUp {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
      `}</style>
    </motion.button>
  )
}
