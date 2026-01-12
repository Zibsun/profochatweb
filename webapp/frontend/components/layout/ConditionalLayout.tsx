"use client"

import { usePathname } from 'next/navigation'
import { Header } from './Header'
import { Footer } from './Footer'

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isCourseEditor = pathname?.startsWith('/course-editor')

  return (
    <>
      {!isCourseEditor && <Header />}
      <main className="flex-1">{children}</main>
      {!isCourseEditor && <Footer />}
    </>
  )
}
