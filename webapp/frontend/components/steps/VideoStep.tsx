'use client'

import { LessonStep, VideoStepContent } from '@/lib/types/types'
import { useState } from 'react'
import ReactPlayer from 'react-player'
import { stepsApi } from '@/lib/api/steps'

interface VideoStepProps {
  step: LessonStep
}

export function VideoStep({ step }: VideoStepProps) {
  const [loading, setLoading] = useState(false)
  const content = step.content as VideoStepContent

  const handleNext = async () => {
    setLoading(true)
    try {
      await stepsApi.completeStep(step.step_id)
    } catch (error) {
      console.error('Ошибка завершения шага:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">{content.title}</h2>
      {content.description && (
        <p className="text-gray-600 mb-6">{content.description}</p>
      )}
      <div className="mb-6">
        <ReactPlayer
          url={content.video_url}
          controls
          width="100%"
          height="500px"
        />
      </div>
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

