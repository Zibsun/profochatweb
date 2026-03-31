'use client'

import { useAuth } from '@/hooks/useAuth'
import { ReactNode } from 'react'

interface RequireRoleProps {
  roles: string[]
  children: ReactNode
  fallback?: ReactNode
}

export function RequireRole({ roles, children, fallback = null }: RequireRoleProps) {
  const { role, user } = useAuth()

  if (user?.is_super_admin || (role && roles.includes(role))) {
    return <>{children}</>
  }

  return <>{fallback}</>
}
