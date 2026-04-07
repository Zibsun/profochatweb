import type { Metadata } from 'next'
import { ConditionalLayout } from '@/components/layout/ConditionalLayout'
import './globals.css'

export const metadata: Metadata = {
  title: 'Кактус.Нота — тренажёры для сотрудников',
  description: 'Гибридные асинхронные курсы: адаптация к каждому сотруднику с помощью ИИ, но без отвлечений от темы.',
  icons: {
    icon: '/assets/favicon.png',
  },
  openGraph: {
    images: [{ url: '/assets/preview-green.png' }], // Для превью в соцсетях
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className="flex flex-col min-h-screen">
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  )
}
