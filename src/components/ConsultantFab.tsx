'use client'

import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/context/AppContext'

// She appears this long after the intro tour finishes (2 minutes).
// (Was 5000 during testing.)
const REVEAL_DELAY_MS = 120000
// How long she stays out before retracting on her own.
const VISIBLE_MS = 20000
// Horizontal drag (px) to the right that counts as a "swipe away".
const SWIPE_DISMISS_PX = 50

// Floating "call the consultant" doodle. Always present at the right border,
// half-transparent. One time, REVEAL_DELAY_MS into the session, she peeks out
// fully (`is-shown`) for VISIBLE_MS, then settles back to the half-transparent
// rest — or snaps back immediately on a right-swipe. A tap opens Iana's Telegram.
export default function ConsultantFab() {
  const { user } = useApp()
  const [shown, setShown] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startX = useRef<number | null>(null)
  const swiped = useRef(false)

  // Start the reveal timer only AFTER the first-time intro tour finishes.
  // If the intro won't play (returning user, and not a forced ?tour=1 preview),
  // start the timer right away.
  useEffect(() => {
    let revealTimer: ReturnType<typeof setTimeout> | null = null
    const startTimer = () => {
      revealTimer = setTimeout(() => setShown(true), REVEAL_DELAY_MS)
    }

    // Must agree with OnboardingTour about whether the intro is going to play,
    // or she either interrupts it or never appears. Same account-level source of
    // truth, not the browser-level flag the tour used to key off.
    const forced = new URLSearchParams(window.location.search).get('tour') === '1'
    const introWillPlay = forced || (Boolean(user) && !user?.onboardingCompleted)

    if (!introWillPlay) {
      startTimer()
      return () => {
        if (revealTimer) clearTimeout(revealTimer)
      }
    }

    // Wait for the tour to signal it's done, then start the timer.
    const onIntroDone = () => startTimer()
    window.addEventListener('st:intro-done', onIntroDone)
    return () => {
      window.removeEventListener('st:intro-done', onIntroDone)
      if (revealTimer) clearTimeout(revealTimer)
    }
  }, [user])

  // Auto-retract after she's been shown for VISIBLE_MS.
  useEffect(() => {
    if (!shown) return
    hideTimer.current = setTimeout(() => setShown(false), VISIBLE_MS)
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [shown])

  const hideNow = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setShown(false)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    swiped.current = false
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current != null && e.touches[0].clientX - startX.current > SWIPE_DISMISS_PX) {
      swiped.current = true
    }
  }
  const onTouchEnd = () => {
    if (swiped.current) hideNow() // swiped right → dismiss
    startX.current = null
  }
  const onClick = (e: React.MouseEvent) => {
    if (swiped.current) {
      e.preventDefault() // it was a swipe, not a tap — don't open Telegram
      swiped.current = false
    }
  }

  return (
    <a
      href="https://t.me/ianamedvedeva"
      target="_blank"
      rel="noopener noreferrer"
      className={`st-consultant${shown ? ' is-shown' : ''}`}
      aria-label="Связаться с Яной в Telegram"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={onClick}
    >
      <span className="st-consultant-label">Есть вопросы?<br />Свяжись со мной!</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/doodles/consultant.png" alt="" />
    </a>
  )
}
