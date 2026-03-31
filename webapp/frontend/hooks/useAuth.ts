'use client'

import { useState, useEffect } from 'react'
import { authApi } from '@/lib/api/auth'

interface User {
  user_id: number
  telegram_user_id: number
  telegram_username?: string
  first_name?: string
  is_super_admin: boolean
}

interface AuthState {
  user: User | null
  accountId: number | null
  role: string | null
  loading: boolean
}

export function useAuth(): AuthState & {
  logout: () => void
  switchAccount: (accountId: number) => Promise<void>
} {
  const [state, setState] = useState<AuthState>({
    user: null,
    accountId: null,
    role: null,
    loading: true,
  })

  useEffect(() => {
    // Загрузка данных из токена
    const token = localStorage.getItem('auth_token')
    if (token) {
      try {
        // Декодируем JWT токен
        const parts = token.split('.')
        if (parts.length !== 3) {
          throw new Error('Invalid token format')
        }
        const base64Url = parts[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        )
        const payload = JSON.parse(jsonPayload)
        setState({
          user: {
            user_id: parseInt(payload.sub, 10),
            telegram_user_id: payload.telegram_user_id,
            is_super_admin: payload.is_super_admin || false,
          },
          accountId: payload.account_id,
          role: payload.role,
          loading: false,
        })
      } catch {
        setState({ ...state, loading: false })
      }
    } else {
      setState({ ...state, loading: false })
    }
  }, [])

  const logout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('account_id')
    setState({
      user: null,
      accountId: null,
      role: null,
      loading: false,
    })
    window.location.href = '/login'
  }

  const switchAccount = async (accountId: number) => {
    try {
      const response = await authApi.switchAccount(accountId)
      localStorage.setItem('auth_token', response.access_token)
      localStorage.setItem('account_id', String(response.account_id))
      setState({
        ...state,
        accountId: response.account_id,
        role: response.role,
      })
    } catch (error) {
      console.error('Ошибка переключения аккаунта:', error)
      throw error
    }
  }

  return {
    ...state,
    logout,
    switchAccount,
  }
}
