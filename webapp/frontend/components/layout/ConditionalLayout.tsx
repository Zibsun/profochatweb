"use client"

import { usePathname } from 'next/navigation'
import { AppLayout } from './AppLayout'

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Auth pages don't need sidebar
  const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/register')
  
  // Root page might not need sidebar either
  const isRootPage = pathname === '/'

  if (isAuthPage || isRootPage) {
    return <>{children}</>
  }

  // All other pages use AppLayout with sidebar
  return <AppLayout>{children}</AppLayout>
}
