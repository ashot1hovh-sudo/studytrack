import type { Metadata } from 'next'
import './globals.css'

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
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
