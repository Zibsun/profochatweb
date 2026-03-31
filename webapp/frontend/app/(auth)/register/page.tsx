'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserPlus, ArrowLeft } from 'lucide-react'
import { authApi } from '@/lib/api/auth'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await authApi.register({ email, username, password })
      localStorage.setItem('auth_token', response.access_token)
      router.push('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background editor-root">
      <div className="max-w-md w-full space-y-6 p-8 bg-card border border-border rounded-lg shadow-sm">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-foreground">
            Регистрация
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Создайте новый аккаунт для входа в систему
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 transition-colors"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-foreground mb-1.5">
                Имя пользователя
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 transition-colors"
                placeholder="username"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                Пароль
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 transition-colors"
                placeholder="Введите пароль"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Уже есть аккаунт?{' '}
              <Link href="/login" className="font-medium text-primary hover:text-primary/80 transition-colors">
                Войти
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

