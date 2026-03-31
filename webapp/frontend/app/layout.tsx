import type { Metadata } from 'next'
import { ConditionalLayout } from '@/components/layout/ConditionalLayout'
import './globals.css'

export const metadata: Metadata = {
  title: 'Кактус.Нота — тренажёры для сотрудников',
  description: 'Гибридные асинхронные курсы: ИИ-адаптация к каждому сотруднику, но без отвлечений от темы, типичных для ИИ-ботов.',
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
