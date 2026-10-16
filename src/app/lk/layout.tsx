'use client'

/**
 * The ЛК on its own, in the v2 design, while the rest of the app is still v1.
 * It ships first because Iana and the сопровождение families need it now.
 * No v2 sidebar here: the other v2 sections are not ready. The page links
 * back to the platform, and a one-time notice explains the new look.
 */
import { useEffect, useState } from 'react'
import { MotionConfig } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import '../v2/v2.css'
import V2SessionGate, { useV2Session } from '../v2/_ui/session'
import { display } from '../v2/_ui/font'

const NOTICE_KEY = 'lk-v2-notice-seen'

export default function LkLayout({ children }: { children: React.ReactNode }) {
  return (
    <V2SessionGate>
      <MotionConfig reducedMotion="user">
        <div className={`v2 ${display.variable}`}>
          <Frame>{children}</Frame>
        </div>
      </MotionConfig>
    </V2SessionGate>
  )
}

function Frame({ children }: { children: React.ReactNode }) {
  const { logout } = useV2Session()
  const [notice, setNotice] = useState(false)

  useEffect(() => {
    try { if (!localStorage.getItem(NOTICE_KEY)) setNotice(true) } catch {}
  }, [])
  const close = () => {
    setNotice(false)
    try { localStorage.setItem(NOTICE_KEY, '1') } catch {}
  }

  return (
    <div className="v2-solo">
      <div className="v2-solo-bar">
        <a className="v2-solo-back" href="/"><ArrowLeft aria-hidden /> Вернуться в платформу</a>
        <button className="v2-solo-out" onClick={logout}>Выйти</button>
      </div>
      {children}
      {notice && (
        <div className="v2-notice-wrap" onClick={close}>
          <div className="v2-notice" role="dialog" aria-modal="true" aria-labelledby="v2-notice-h" onClick={(e) => e.stopPropagation()}>
            <span className="v2-kicker">Новый дизайн</span>
            <h2 id="v2-notice-h">Эта страница уже в новом дизайне</h2>
            <p>Мы делаем вторую версию платформы. Личный кабинет открываем первым, остальные разделы пока остаются в прежнем виде. Скоро так будет выглядеть вся платформа.</p>
            <button onClick={close} autoFocus>Понятно</button>
          </div>
        </div>
      )}
    </div>
  )
}
