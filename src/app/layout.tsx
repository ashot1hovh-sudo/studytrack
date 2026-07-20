import type { Metadata } from 'next'
import './globals.css'
import { THEME_INIT_SCRIPT, ThemeProvider } from '@/context/ThemeContext'

export const metadata: Metadata = {
  title: 'Кай Китай',
  description: 'Трекер поступления в Китай',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // suppressHydrationWarning: the script below sets the `dark` class on <html>
    // before React hydrates, which React would otherwise report as a mismatch.
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* Runs before the first paint, so a night-mode user never sees the
            light theme flash. Must stay inline and ahead of the app bundle. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
