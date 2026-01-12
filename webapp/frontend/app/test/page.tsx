'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function TestPage() {
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(false)

  const handleProgress = () => {
    setLoading(true)
    setTimeout(() => {
      setProgress((prev) => Math.min(100, prev + 10))
      setLoading(false)
    }, 500)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-center text-gray-800">
          Тестовая страница ProfoChatBot Web
        </h1>

        <Card>
          <h2 className="text-2xl font-semibold mb-4">Компоненты UI</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Кнопки</h3>
              <div className="flex gap-4">
                <Button variant="primary">Основная кнопка</Button>
                <Button variant="secondary">Вторичная кнопка</Button>
                <Button variant="danger">Опасная кнопка</Button>
                <Button disabled>Отключенная</Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Прогресс-бар</h3>
              <ProgressBar progress={progress} />
              <p className="text-sm text-gray-600 mt-2">Прогресс: {progress}%</p>
              <Button onClick={handleProgress} disabled={loading || progress >= 100} className="mt-2">
                {loading ? 'Загрузка...' : 'Увеличить прогресс'}
              </Button>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Индикатор загрузки</h3>
              <LoadingSpinner />
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Карточка с контентом</h3>
              <Card>
                <p className="text-gray-700">
                  Это пример карточки внутри карточки. Здесь может быть любой контент.
                </p>
              </Card>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-2xl font-semibold mb-4">Тест API</h2>
          <div className="space-y-4">
            <Button
              onClick={async () => {
                try {
                  const response = await fetch('http://localhost:8000/')
                  const data = await response.json()
                  alert(`API ответ: ${JSON.stringify(data)}`)
                } catch (error) {
                  alert(`Ошибка подключения к API: ${error}`)
                }
              }}
            >
              Проверить Backend API
            </Button>
            <p className="text-sm text-gray-600">
              Убедитесь, что backend запущен на http://localhost:8000
            </p>
          </div>
        </Card>

        <Card>
          <h2 className="text-2xl font-semibold mb-4">Информация</h2>
          <div className="space-y-2 text-gray-700">
            <p><strong>Frontend URL:</strong> http://localhost:3000</p>
            <p><strong>Backend URL:</strong> http://localhost:8000</p>
            <p><strong>API Docs:</strong> http://localhost:8000/docs</p>
            <p><strong>Текущая страница:</strong> /test</p>
          </div>
        </Card>

        <div className="text-center">
          <a href="/courses" className="text-blue-600 hover:underline">
            Перейти к курсам →
          </a>
        </div>
      </div>
    </div>
  )
}

