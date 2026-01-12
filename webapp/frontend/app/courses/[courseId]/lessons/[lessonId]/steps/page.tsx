'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { lessonsApi } from '@/lib/api/lessons'
import { LessonStep } from '@/lib/types/types'
import Link from 'next/link'

export default function StepsPage() {
  const params = useParams()
  const lessonId = params.lessonId as string
  const courseId = params.courseId as string
  const [steps, setSteps] = useState<LessonStep[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchSteps = async () => {
      try {
        const data = await lessonsApi.getSteps(lessonId)
        setSteps(data)
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Ошибка загрузки шагов')
      } finally {
        setLoading(false)
      }
    }

    fetchSteps()
  }, [lessonId])

  if (loading) {
    return <div className="p-8">Загрузка шагов...</div>
  }

  if (error) {
    return <div className="p-8 text-red-600">Ошибка: {error}</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Шаги урока</h1>
      <div className="space-y-4">
        {steps.map((step) => (
          <Link
            key={step.step_id}
            href={`/courses/${courseId}/lessons/${lessonId}/steps/${step.step_id}`}
            className="block p-6 border border-gray-300 rounded-lg hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  Шаг {step.order_index + 1}: {step.step_type}
                </h2>
              </div>
              <span className="text-sm text-blue-600">Открыть →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

