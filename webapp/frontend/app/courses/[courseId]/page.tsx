'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function CourseRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string

  useEffect(() => {
    // Редирект на MVP маршрут /course/{courseId}
    router.replace(`/course/${courseId}`)
  }, [courseId, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Перенаправление...</p>
      </div>
    </div>
  )
}
