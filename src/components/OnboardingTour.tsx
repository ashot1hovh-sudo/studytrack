'use client'

import { useEffect } from 'react'
import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useApp } from '@/context/AppContext'

const STORAGE_KEY = 'st_onboarded_v1'

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
  const { isAuthenticated } = useApp()

  useEffect(() => {
    if (!isAuthenticated) return

    const forced = new URLSearchParams(window.location.search).get('tour') === '1'
    if (hasLaunched && !forced) return
    if (!forced && localStorage.getItem(STORAGE_KEY)) return

    // Give the shell a beat to paint so nav targets exist and are laid out.
    // The launch guard lives inside the timer, so StrictMode's cleanup can
    // cancel this timer and the re-mounted effect simply schedules a new one.
    const timer = setTimeout(() => {
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
          localStorage.setItem(STORAGE_KEY, '1')
          // Signal the floating consultant that the intro is over so it can
          // start its reveal timer (see ConsultantFab).
          window.dispatchEvent(new Event('st:intro-done'))
        },
      })

      tour.drive()
    }, 400)

    return () => clearTimeout(timer)
  }, [isAuthenticated])

  return null
}
