"use client"

import { usePathname } from 'next/navigation'
import { AppLayout } from './AppLayout'

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Auth pages don't need sidebar
  const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/register') || pathname?.startsWith('/auth')

  // Root page might not need sidebar either
  const isRootPage = pathname === '/'

  // Course pages are accessible without auth (secret link access)
  const isCoursePage = pathname?.startsWith('/course')

  if (isAuthPage || isRootPage || isCoursePage) {
    return <>{children}</>
  }

  // All other pages use AppLayout with sidebar
  return <AppLayout>{children}</AppLayout>
}
