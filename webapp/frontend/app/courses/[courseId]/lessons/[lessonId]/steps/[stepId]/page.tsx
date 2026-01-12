'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { stepsApi } from '@/lib/api/steps'
import { LessonStep } from '@/lib/types/types'
import { MessageStep } from '@/components/steps/MessageStep'
import { VideoStep } from '@/components/steps/VideoStep'
import { PdfStep } from '@/components/steps/PdfStep'
import { QuizStep } from '@/components/steps/QuizStep'
import { ChatStep } from '@/components/steps/ChatStep'

export default function StepPage() {
  const params = useParams()
  const stepId = params.stepId as string
  const [step, setStep] = useState<LessonStep | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchStep = async () => {
      try {
        const data = await stepsApi.getStep(stepId)
        setStep(data)
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Ошибка загрузки шага')
      } finally {
        setLoading(false)
      }
    }

    fetchStep()
  }, [stepId])

  if (loading) {
    return <div className="p-8">Загрузка шага...</div>
  }

  if (error) {
    return <div className="p-8 text-red-600">Ошибка: {error}</div>
  }

  if (!step) {
    return <div className="p-8">Шаг не найден</div>
  }

  const renderStep = () => {
    switch (step.step_type) {
      case 'message':
        return <MessageStep step={step} />
      case 'video':
        return <VideoStep step={step} />
      case 'pdf':
        return <PdfStep step={step} />
      case 'quiz_single_choice':
        return <QuizStep step={step} />
      case 'chat':
        return <ChatStep step={step} />
      default:
        return <div>Неизвестный тип шага</div>
    }
  }

  return <div className="p-8">{renderStep()}</div>
}

