import type { Metadata } from 'next'
import { ConditionalLayout } from '@/components/layout/ConditionalLayout'
import './globals.css'

export const metadata: Metadata = {
  title: 'ProfoChatBot Web',
  description: 'Веб-версия обучающей платформы',
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

