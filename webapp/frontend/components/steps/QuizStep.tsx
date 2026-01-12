'use client'

import { LessonStep, QuizStepContent } from '@/lib/types/types'
import { useState } from 'react'
import { quizApi } from '@/lib/api/quiz'
import { stepsApi } from '@/lib/api/steps'

interface QuizStepProps {
  step: LessonStep
}

export function QuizStep({ step }: QuizStepProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [isCorrect, setIsCorrect] = useState(false)
  const [loading, setLoading] = useState(false)
  const content = step.content as QuizStepContent

  const handleSubmit = async () => {
    if (!selectedOption) return

    setLoading(true)
    try {
      const response = await quizApi.submitAttempt(step.step_id, {
        selected_option_id: selectedOption,
      })
      setIsCorrect(response.is_correct)
      setFeedback(response.feedback)
      setSubmitted(true)
    } catch (error) {
      console.error('Ошибка отправки ответа:', error)
    } finally {
      setLoading(false)
    }
  }

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
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">{content.question}</h2>
      <div className="space-y-3 mb-6">
        {content.options.map((option) => (
          <label
            key={option.id}
            className={`block p-4 border-2 rounded-lg cursor-pointer ${
              selectedOption === option.id
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input
              type="radio"
              name="quiz-option"
              value={option.id}
              checked={selectedOption === option.id}
              onChange={(e) => setSelectedOption(e.target.value)}
              disabled={submitted}
              className="mr-3"
            />
            {option.text}
          </label>
        ))}
      </div>
      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={!selectedOption || loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Отправка...' : 'Отправить ответ'}
        </button>
      ) : (
        <div>
          <div
            className={`p-4 rounded-lg mb-4 ${
              isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {feedback}
          </div>
          <button
            onClick={handleNext}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Загрузка...' : 'Далее'}
          </button>
        </div>
      )}
    </div>
  )
}

