'use client'

import { useEffect } from 'react'
import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useApp } from '@/context/AppContext'

// Local cache only — the source of truth is students.onboarding_completed_at,
// delivered as user.onboardingCompleted. This exists so a page reload doesn't
// flash the tour in the moment before the session request comes back, and it is
// scoped per account: a shared browser must not swallow the next user's tour.
const seenKey = (userId: string) => `st_onboarded_v2:${userId}`

// How long to wait for the nav to paint before giving up on anchored steps.
// The previous fixed 400ms silently produced a two-step tour (greeting + finale)
// on any device slow enough to miss the deadline — and said nothing about it.
const TARGET_WAIT_MS = 3000
const TARGET_POLL_MS = 100

// Module-scoped so it survives React StrictMode's mount→cleanup→mount cycle in
// dev (a component-level ref would let the double-invoke cancel the tour).
// Resets naturally on a full page reload.
let hasLaunched = false

// Greeting step shows both founders. Add more doodle poses here later.
const greeting = `
  <img class="st-doodle st-iana" src="/images/doodles/iana.png" alt="Яна" />
  <img class="st-doodle st-ashot" src="/images/doodles/ashot.png" alt="Ашот" />
  <p>Мы — Ашот и Яна, создатели «Кай Китай». За минуту покажем, как всё устроено, чтобы вы поступили в вуз Китая сами.</p>
`

// Per-nav-item copy. `id` matches the Sidebar menu item id (data-tour hooks).
const navSteps: { id: string; title: string; description: string }[] = [
  { id: 'learning-start', title: 'Начало обучения', description: 'Пошаговые уроки: с нуля до подачи заявки. Начинайте отсюда.' },
  { id: 'dashboard', title: 'Главная', description: 'Ваш прогресс и следующий шаг — всегда видно, что делать дальше.' },
  { id: 'checklist', title: 'Чек-лист', description: 'Все документы и задачи в одном списке. Ничего не забудете.' },
  { id: 'universities', title: 'Вузы', description: 'Подберите вузы и программы и ведите список своих заявок.' },
  { id: 'deadlines', title: 'Дедлайны', description: 'Держите сроки подачи под контролем — без пропущенных дат.' },
  { id: 'chances', title: 'Мои шансы', description: 'Реальные кейсы поступления — оцените свои шансы честно.' },
]

export default function OnboardingTour() {
  const { isAuthenticated, user } = useApp()

  useEffect(() => {
    if (!isAuthenticated || !user) return

    const forced = new URLSearchParams(window.location.search).get('tour') === '1'
    if (hasLaunched && !forced) return
    // Account-level truth first, local cache second.
    if (!forced && (user.onboardingCompleted || localStorage.getItem(seenKey(user.id)))) return

    // Wait for the nav to actually exist rather than betting on a fixed delay.
    // The launch guard lives inside the callback, so StrictMode's cleanup can
    // cancel this and the re-mounted effect simply schedules a new one.
    let cancelled = false
    let pollTimer: ReturnType<typeof setTimeout> | null = null
    const deadline = Date.now() + TARGET_WAIT_MS

    const launch = () => {
      if (cancelled) return
      if (hasLaunched && !forced) return
      hasLaunched = true

      const isDesktop = window.matchMedia('(min-width: 1024px)').matches
      const prefix = isDesktop ? 'nav-' : 'mnav-'
      const side = isDesktop ? 'right' : 'top'
      const align = isDesktop ? 'start' : 'center'

      const steps: DriveStep[] = [
        { popover: { title: 'Привет! 👋', description: greeting, showButtons: ['next', 'close'] } },
        // Only include nav steps whose target actually exists in the DOM.
        ...navSteps
          .filter((s) => document.querySelector(`[data-tour="${prefix}${s.id}"]`))
          .map((s): DriveStep => ({
            element: `[data-tour="${prefix}${s.id}"]`,
            popover: {
              title: s.title,
              description: `<img class="st-step-doodle" src="/images/doodles/${s.id}.png" alt="" />${s.description}`,
              side,
              align,
            },
          })),
        {
          popover: {
            title: 'Готово! 🎉',
            description:
              '<img class="st-finale" src="/images/doodles/finale.png" alt="Ашот и Яна" />Бесплатные материалы уже открыты. Чтобы открыть полный доступ — оформите подписку в пару кликов. Если что — мы на связи. Удачи!',
          },
        },
      ]

      const tour = driver({
        showProgress: true,
        allowClose: true,
        stagePadding: 6,
        stageRadius: 10,
        popoverClass: 'st-tour',
        progressText: '{{current}} / {{total}}',
        nextBtnText: 'Далее',
        prevBtnText: 'Назад',
        doneBtnText: 'Готово',
        steps,
        onDestroyed: () => {
          // Cache locally first so a reload can't replay it while the write is
          // still in flight, then record it against the account.
          localStorage.setItem(seenKey(user.id), '1')
          // Fire-and-forget: failing to record completion must not break the app.
          // Worst case the tour replays once on the next visit.
          fetch('/api/auth/onboarded', { method: 'POST' }).catch(() => {})
          // Signal the floating consultant that the intro is over so it can
          // start its reveal timer (see ConsultantFab).
          window.dispatchEvent(new Event('st:intro-done'))
        },
      })

      tour.drive()
    }

    // Poll until the nav targets exist, then launch. If they never show up
    // (unexpected layout, very slow device) launch anyway on the deadline —
    // a greeting-and-finale tour beats no tour at all.
    const waitForTargets = () => {
      if (cancelled) return

      const isDesktop = window.matchMedia('(min-width: 1024px)').matches
      const prefix = isDesktop ? 'nav-' : 'mnav-'
      const ready = navSteps.some((s) => document.querySelector(`[data-tour="${prefix}${s.id}"]`))

      if (ready || Date.now() > deadline) {
        launch()
        return
      }
      pollTimer = setTimeout(waitForTargets, TARGET_POLL_MS)
    }

    pollTimer = setTimeout(waitForTargets, TARGET_POLL_MS)

    return () => {
      cancelled = true
      if (pollTimer) clearTimeout(pollTimer)
    }
  }, [isAuthenticated, user])

  return null
}
