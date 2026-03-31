'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'

export default function Home() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Если пользователь не авторизован, редирект на страницу логина
        router.push('/login')
      } else {
        // Если авторизован, редирект на дашборд (например, список ботов или курсов)
        router.push('/bots')
      }
    }
  }, [user, loading, router])

  // Показываем загрузку во время проверки авторизации
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  // Показываем приветствие во время редиректа
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Добро пожаловать
        </h1>
        <p className="text-gray-600 mb-6">
          Для доступа к курсу необходим специальный URL с указанием идентификатора курса.
          Обратитесь к организатору курса для получения ссылки.
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Пример: <code className="bg-gray-100 px-2 py-1 rounded">/course/testmessages</code>
        </p>
        {!user && (
          <Link
            href="/login"
            className="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Войти
          </Link>
        )}
      </div>
    </div>
  )
}
