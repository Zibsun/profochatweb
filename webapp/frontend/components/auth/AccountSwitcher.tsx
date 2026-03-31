'use client'

import { useState, useEffect } from 'react'
import { authApi } from '@/lib/api/auth'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

interface Account {
  account_id: number
  name: string
  role: string
}

export function AccountSwitcher() {
  const router = useRouter()
  const { accountId, switchAccount } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Загружаем список аккаунтов из токена
    const token = localStorage.getItem('auth_token')
    if (token) {
      try {
        const parts = token.split('.')
        if (parts.length !== 3) {
          return
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
        // available_accounts должен быть в токене или загружаться отдельно
        // Пока используем данные из токена, если они есть
      } catch {
        // Ошибка декодирования
      }
    }
  }, [])

  const handleSwitchAccount = async (newAccountId: number) => {
    if (newAccountId === accountId) return

    setLoading(true)
    try {
      await switchAccount(newAccountId)
      router.refresh() // Обновить страницу для применения нового account_id
    } catch (error) {
      console.error('Ошибка переключения аккаунта:', error)
    } finally {
      setLoading(false)
    }
  }

  // Если только один аккаунт, не показывать переключатель
  if (accounts.length <= 1) {
    return null
  }

  return (
    <div className="account-switcher">
      <select
        value={accountId || ''}
        onChange={(e) => handleSwitchAccount(Number(e.target.value))}
        disabled={loading}
        className="px-3 py-2 border border-gray-300 rounded-md"
      >
        {accounts.map((account) => (
          <option key={account.account_id} value={account.account_id}>
            {account.name} ({account.role})
          </option>
        ))}
      </select>
    </div>
  )
}
