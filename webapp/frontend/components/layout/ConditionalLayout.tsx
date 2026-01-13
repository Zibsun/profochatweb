"use client"

import { usePathname } from 'next/navigation'
import { Header } from './Header'
import { Footer } from './Footer'

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isCourseEditor = pathname?.startsWith('/course-editor')
  const isBotsPage = pathname?.startsWith('/bots')
  const shouldShowLayout = !isCourseEditor && !isBotsPage

  return (
    <>
      {shouldShowLayout && <Header />}
      <main className="flex-1">{children}</main>
      {shouldShowLayout && <Footer />}
    </>
  )
}
