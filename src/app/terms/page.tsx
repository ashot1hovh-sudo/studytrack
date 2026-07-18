import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Пользовательское соглашение — Кай Китай',
}

/**
 * PLACEHOLDER. The registration form links here and the checkbox is mandatory,
 * so this route must exist — but the text below is not a legal document.
 * Replace the body with the real соглашение before launch.
 */
export default function TermsPage() {
  return (
    <main className="min-h-screen bg-study-bg py-12 px-4">
      <div className="mx-auto max-w-2xl bg-white rounded-2xl card-shadow p-6 sm:p-10">
        <h1 className="text-2xl font-bold text-study-dark mb-2">
          Пользовательское соглашение
        </h1>
        <p className="text-sm text-study-gray mb-8">
          Платформа «Кай Китай» — самостоятельное поступление в университеты Китая
        </p>

        <div className="p-4 bg-study-bg rounded-xl border border-study-lightgray">
          <p className="text-sm text-study-dark leading-relaxed">
            Полный текст пользовательского соглашения и политики обработки персональных
            данных готовится к публикации и будет размещён здесь в ближайшее время.
          </p>
          <p className="text-sm text-study-gray leading-relaxed mt-3">
            По любым вопросам о том, как мы обрабатываем ваши данные, напишите нам:{' '}
            <a
              href="https://t.me/ash_china"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-study-brown hover:underline"
            >
              @ash_china
            </a>
          </p>
        </div>

        <a
          href="/"
          className="inline-block mt-8 text-sm font-semibold text-study-brown hover:underline"
        >
          ← Вернуться на главную
        </a>
      </div>
    </main>
  )
}
