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

  // Static resources folders (prevent 404s of assets from rendering the sidebar layout)
  const isResourcePage = pathname?.startsWith('/assets') || pathname?.startsWith('/public')

  if (isAuthPage || isRootPage || isCoursePage || isResourcePage) {
    return <>{children}</>
  }

  // All other pages use AppLayout with sidebar
  return <AppLayout>{children}</AppLayout>
}
