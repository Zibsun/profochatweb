'use client'

import { LessonStep, MessageStepContent } from '@/lib/types/types'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { stepsApi } from '@/lib/api/steps'

interface MessageStepProps {
  step: LessonStep
}

export function MessageStep({ step }: MessageStepProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const content = step.content as MessageStepContent

  const handleNext = async () => {
    setLoading(true)
    try {
      await stepsApi.completeStep(step.step_id)
      // Переход к следующему шагу будет реализован позже
    } catch (error) {
      console.error('Ошибка завершения шага:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="prose max-w-none mb-6">
        {content.parse_mode === 'html' ? (
          <div dangerouslySetInnerHTML={{ __html: content.text }} />
        ) : (
          <div className="whitespace-pre-wrap">{content.text}</div>
        )}
      </div>
      {content.media && content.media.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {content.media.map((url, index) => (
            <img
              key={index}
              src={url}
              alt={`Media ${index + 1}`}
              className="rounded-lg"
            />
          ))}
        </div>
      )}
      <button
        onClick={handleNext}
        disabled={loading}
        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Загрузка...' : 'Далее'}
      </button>
    </div>
  )
}

