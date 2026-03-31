'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User as UserIcon, Mail, User as UserNameIcon, Calendar, LogOut, Shield } from 'lucide-react'
import { authApi } from '@/lib/api/auth'
import { useAuth } from '@/hooks/useAuth'
import { User } from '@/lib/types/types'

export default function ProfilePage() {
  const router = useRouter()
  const { logout: logoutAuth } = useAuth()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await authApi.getMe()
        setUser(userData)
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Ошибка загрузки профиля')
        if (err.response?.status === 401) {
          router.push('/login')
        }
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [router])

  const handleLogout = () => {
    logoutAuth()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background editor-root">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Загрузка профиля...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background editor-root">
        <div className="max-w-md w-full p-8 bg-card border border-border rounded-lg shadow-sm">
          <div className="text-center">
            <div className="text-destructive mb-4">{error}</div>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Вернуться на главную
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateString
    }
  }

  return (
    <div className="min-h-screen bg-background editor-root">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                {user.photo_url ? (
                  <img
                    src={user.photo_url}
                    alt={user.username || user.email}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-8 h-8 text-primary-foreground" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {user.first_name && user.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : user.username || user.email}
                </h1>
                {user.telegram_username && (
                  <p className="text-sm text-muted-foreground">@{user.telegram_username}</p>
                )}
                {user.is_super_admin && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                    <Shield className="w-3 h-3" />
                    Супер администратор
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Выйти
            </button>
          </div>
        </div>

        {/* Profile Information */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Информация о профиле</h2>
          <div className="space-y-4">
            {/* Email */}
            {user.email && (
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Email</div>
                  <div className="text-sm text-foreground">{user.email}</div>
                </div>
              </div>
            )}

            {/* Username */}
            {user.username && (
              <div className="flex items-start gap-3">
                <UserNameIcon className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Имя пользователя</div>
                  <div className="text-sm text-foreground">{user.username}</div>
                </div>
              </div>
            )}

            {/* Telegram User ID */}
            {user.telegram_user_id && (
              <div className="flex items-start gap-3">
                <UserIcon className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Telegram User ID</div>
                  <div className="text-sm text-foreground">{user.telegram_user_id}</div>
                </div>
              </div>
            )}

            {/* First Name */}
            {user.first_name && (
              <div className="flex items-start gap-3">
                <UserNameIcon className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Имя</div>
                  <div className="text-sm text-foreground">{user.first_name}</div>
                </div>
              </div>
            )}

            {/* Last Name */}
            {user.last_name && (
              <div className="flex items-start gap-3">
                <UserNameIcon className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Фамилия</div>
                  <div className="text-sm text-foreground">{user.last_name}</div>
                </div>
              </div>
            )}

            {/* Created At */}
            {user.created_at && (
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Дата регистрации</div>
                  <div className="text-sm text-foreground">{formatDate(user.created_at)}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Authentication Methods */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Способы авторизации</h2>
          <div className="space-y-3">
            {user.email && (
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium text-foreground">Email / Пароль</div>
                    <div className="text-xs text-muted-foreground">Авторизация через email и пароль</div>
                  </div>
                </div>
                <div className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                  Активна
                </div>
              </div>
            )}

            {user.telegram_user_id && (
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <UserIcon className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium text-foreground">Telegram</div>
                    <div className="text-xs text-muted-foreground">
                      {user.telegram_username ? `@${user.telegram_username}` : `ID: ${user.telegram_user_id}`}
                    </div>
                  </div>
                </div>
                <div className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                  Активна
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
