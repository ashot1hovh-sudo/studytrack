'use client'

import { useEffect } from 'react'
import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useApp } from '@/context/AppContext'

// Local cache only — the source of truth is students.onboarding_completed_at,
// delivered as user.onboardingCompleted. This exists so a page reload doesn't
// flash the tour in the moment before the session request comes back, and it is
// scoped per account: a shared browser must not swallow the next user's tour.
// v3: the v2 flag was written on *any* dismissal, before the server write, so
// browsers are carrying "seen" flags for accounts whose onboarding_completed_at
// is still null — the tour is blocked locally for people who never saw it.
// Bumping the key drops those stale flags; the account record stays the truth.
const seenKey = (userId: string) => `st_onboarded_v3:${userId}`

// How long to wait for the nav to paint before giving up on anchored steps.
// The previous fixed 400ms silently produced a two-step tour (greeting + finale)
// on any device slow enough to miss the deadline — and said nothing about it.
const TARGET_WAIT_MS = 3000
const TARGET_POLL_MS = 100

// Module-scoped so it survives React StrictMode's mount→cleanup→mount cycle in
// dev (a component-level ref would let the double-invoke cancel the tour).
// Resets naturally on a full page reload.
let hasLaunched = false

/**
 * Pull every doodle into the browser cache up front.
 *
 * The images live inside each step's popover HTML, so without this they only
 * start downloading when that step is rendered — the user taps «Далее» and the
 * character is simply absent until the download finishes. On a phone that means
 * most people never see the art at all, and the tour runs once, so they never
 * get a second chance.
 *
 * Deliberately not awaited: a slow connection must delay the pictures, never
 * the tour itself.
 */
function preloadDoodles(ids: string[]) {
  for (const id of ids) {
    const img = new Image()
    img.src = `/images/doodles/${id}.png`
  }
}

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
  { id: 'chances', title: 'Кейсы поступлений', description: 'Реальные результаты поступлений — оцените свои шансы честно.' },
]

export default function OnboardingTour() {
  const { isAuthenticated, user } = useApp()

  useEffect(() => {
    if (!isAuthenticated || !user) return

    const forced = new URLSearchParams(window.location.search).get('tour') === '1'
    if (hasLaunched && !forced) return
    // Account-level truth first, local cache second.
    if (!forced && (user.onboardingCompleted || localStorage.getItem(seenKey(user.id)))) return

    // Start fetching the art immediately — it has the whole target-polling
    // window plus the greeting step to arrive before it is first needed.
    preloadDoodles(['iana', 'ashot', 'finale', ...navSteps.map((s) => s.id)])

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

      // Set once the final step is displayed. onDestroyed cannot ask driver.js
      // which step it was on — by the time it fires the state is already torn
      // down — so completion has to be recorded while the tour is still alive.
      let reachedLastStep = false

      const tour = driver({
        onHighlightStarted: () => {
          // isLastStep() is `activeIndex === steps.length - 1`, so this latches
          // true the moment the finale is shown, whatever happens afterwards.
          if (tour.isLastStep()) reachedLastStep = true
        },
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
          // Only count the tour as seen if the user actually reached the end.
          //
          // driver.js calls onDestroyed for *every* dismissal — the X, Escape,
          // a click on the overlay — so marking completion here unconditionally
          // burned the tour for anyone who closed it early or whose images had
          // not loaded yet. It runs once per account, so that was permanent:
          // they could never see the intro again. Abandoning it now simply
          // leaves it to run again next time.
          const finished = reachedLastStep

          if (finished) {
            // Cache locally first so a reload can't replay it while the write is
            // still in flight, then record it against the account.
            localStorage.setItem(seenKey(user.id), '1')
            // Fire-and-forget: failing to record completion must not break the
            // app. Worst case the tour replays once on the next visit.
            fetch('/api/auth/onboarded', { method: 'POST' }).catch(() => {})
          }
          // Note: `hasLaunched` deliberately stays true when abandoned. The
          // effect re-runs whenever the `user` object identity changes (a
          // session refresh is enough), so clearing it here would re-open the
          // tour on top of someone who had just closed it. Nothing was written,
          // so it simply runs again on the next page load.

          // Signal the floating consultant that the intro is over so it can
          // start its reveal timer (see ConsultantFab). Fires either way —
          // the intro is off screen regardless of how it ended.
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
