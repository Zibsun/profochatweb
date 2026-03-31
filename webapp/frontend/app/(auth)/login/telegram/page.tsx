'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MessageCircle, AlertCircle } from 'lucide-react'
import { TelegramLogin } from '@/components/auth/TelegramLogin'
import { authApi } from '@/lib/api/auth'

export default function TelegramLoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleTelegramAuth = async (user: any) => {
    setError('')
    setLoading(true)

    try {
      const response = await authApi.telegramLogin(user)
      localStorage.setItem('auth_token', response.access_token)
      localStorage.setItem('account_id', String(response.account_id))
      router.push('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка авторизации')
    } finally {
      setLoading(false)
    }
  }

  // Имя бота по умолчанию - enraidrobot
  const botName = process.env.NEXT_PUBLIC_TELEGRAM_AUTH_BOT_NAME || 'enraidrobot'
  
  // Получаем текущий домен для отображения в инструкциях
  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'unsplenetic-mustached-jordy.ngrok-free.dev'

  return (
    <div className="min-h-screen flex items-center justify-center bg-background editor-root">
      <div className="max-w-md w-full space-y-6 p-8 bg-card border border-border rounded-lg shadow-sm">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-foreground">
            Вход через Telegram
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Используйте Telegram для входа в систему
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col items-center gap-4">
          <div className="flex justify-center">
            <TelegramLogin
              botName={botName}
              onAuth={handleTelegramAuth}
              onError={(err) => {
                if (err.includes('domain') || err.includes('invalid')) {
                  setError('Ошибка: Домен не настроен в BotFather. Обратитесь к администратору.')
                } else {
                  setError(err)
                }
              }}
            />
          </div>
          
          <div className="w-full p-4 bg-secondary/50 border border-border rounded-lg text-sm">
            <div className="flex items-start gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="font-semibold text-foreground">Важно: Настройка домена в BotFather</p>
            </div>
            <p className="mb-3 text-muted-foreground">Для работы авторизации необходимо добавить домен в настройки бота:</p>
            <ol className="list-decimal list-inside space-y-1.5 mb-3 text-muted-foreground">
              <li>Откройте <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="underline font-semibold text-primary hover:text-primary/80">@BotFather</a> в Telegram</li>
              <li>Отправьте команду: <code className="bg-background px-1.5 py-0.5 rounded text-xs font-mono">/mybots</code></li>
              <li>Выберите бота <code className="bg-background px-1.5 py-0.5 rounded text-xs font-mono">@{botName}</code></li>
              <li>Выберите <strong>"Bot Settings"</strong> → <strong>"Domain"</strong></li>
              <li>Нажмите <strong>"Edit"</strong> или <strong>"Add"</strong></li>
              <li>Введите домен (БЕЗ https:// и БЕЗ слеша в конце):</li>
            </ol>
            <div className="bg-background border border-border p-3 rounded-lg mb-2">
              <p className="font-mono text-center text-base font-bold break-all select-all text-foreground">
                {currentDomain}
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(currentDomain)
                  alert('Домен скопирован в буфер обмена!')
                }}
                className="mt-2 w-full px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-medium text-foreground transition-colors"
              >
                📋 Скопировать домен
              </button>
            </div>
            <p className="text-xs text-muted-foreground font-semibold">
              ⚠️ Скопируйте домен выше и вставьте в BotFather (БЕЗ https:// и БЕЗ слеша в конце)
            </p>
            {error && error.includes('domain') && (
              <p className="mt-2 text-destructive text-xs font-semibold">
                ❌ Домен не найден в настройках бота. Добавьте его в BotFather согласно инструкции выше.
              </p>
            )}
          </div>
        </div>

        {loading && (
          <div className="text-center text-muted-foreground text-sm">
            Обработка авторизации...
          </div>
        )}

        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Вернуться к выбору способа входа
          </Link>
        </div>
      </div>
    </div>
  )
}
