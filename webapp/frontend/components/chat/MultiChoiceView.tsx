'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

interface MultiChoiceAnswer {
  text: string
  correct?: string  // "yes" для правильного, "no" для неправильного
  feedback?: string
}

interface MultiChoiceElement {
  element_id: string
  type: "multi_choice"
  text: string
  answers: MultiChoiceAnswer[]
  feedback_correct: string
  feedback_partial: string
  feedback_incorrect: string
}

interface MultiChoiceViewProps {
  multiChoice: MultiChoiceElement
  onAnswersSubmitted: (selectedIndices: number[]) => Promise<void>
  selectedAnswers?: number[]
  showFeedback?: boolean
  feedback?: string
  individualFeedbacks?: Array<{ answer_index: number; answer_text: string; feedback?: string }>
  isCorrect?: boolean
  score?: number
}

export default function MultiChoiceView({
  multiChoice,
  onAnswersSubmitted,
  selectedAnswers,
  showFeedback,
  feedback,
  individualFeedbacks,
  isCorrect,
  score
}: MultiChoiceViewProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localSelectedAnswers, setLocalSelectedAnswers] = useState<Set<number>>(
    new Set(selectedAnswers || [])
  )
  
  // Сбрасываем состояние при изменении multiChoice элемента или когда showFeedback становится false/undefined
  useEffect(() => {
    // Если showFeedback отсутствует или false, сбрасываем локальное состояние
    if (!showFeedback) {
      setLocalSelectedAnswers(new Set())
      setIsSubmitting(false)
    }
  }, [multiChoice.element_id, showFeedback])
  
  // Дополнительно сбрасываем состояние при изменении element_id, даже если showFeedback еще true
  useEffect(() => {
    setLocalSelectedAnswers(new Set())
    setIsSubmitting(false)
  }, [multiChoice.element_id])
  
  // Синхронизируем localSelectedAnswers с selectedAnswers пропсом, если он изменился и showFeedback false
  useEffect(() => {
    if (!showFeedback && selectedAnswers !== undefined) {
      setLocalSelectedAnswers(new Set(selectedAnswers))
    }
  }, [selectedAnswers, showFeedback])
  
  console.log("MultiChoiceView rendered with multiChoice:", multiChoice)
  console.log("MultiChoiceView answers:", multiChoice.answers)
  console.log("MultiChoiceView selectedAnswers:", selectedAnswers)
  console.log("MultiChoiceView showFeedback:", showFeedback)

  const handleCheckboxChange = (index: number) => {
    if (isSubmitting || showFeedback) {
      return
    }

    setLocalSelectedAnswers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const handleSubmit = async () => {
    if (isSubmitting || showFeedback || localSelectedAnswers.size === 0) {
      return
    }

    setIsSubmitting(true)
    try {
      await onAnswersSubmitted(Array.from(localSelectedAnswers).sort())
    } finally {
      setIsSubmitting(false)
    }
  }

  // Определяем правильные и неправильные ответы для визуальной индикации
  const correctIndices = new Set(
    multiChoice.answers
      .map((answer, index) => answer.correct === "yes" ? index : -1)
      .filter(index => index !== -1)
  )
  const incorrectIndices = new Set(
    multiChoice.answers
      .map((answer, index) => answer.correct === "no" ? index : -1)
      .filter(index => index !== -1)
  )

  return (
    <div className="mb-4 p-4 bg-white rounded-lg shadow-sm">
      {/* Вопрос */}
      <div className="mb-4">
        <div className="text-gray-800 text-lg leading-relaxed">
          <ReactMarkdown
            components={{
              p: ({node, ...props}) => <p className="mb-2" {...props} />,
              a: ({node, ...props}) => (
                <a
                  {...props}
                  className="text-blue-200 underline hover:text-blue-100"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              ),
            }}
          >
            {multiChoice.text}
          </ReactMarkdown>
        </div>
      </div>

      {/* Варианты ответов с чекбоксами */}
      {!showFeedback ? (
        <>
          <div className="space-y-2 mb-4">
            {multiChoice.answers.map((answer, index) => {
              const isChecked = localSelectedAnswers.has(index)
              
              return (
                <label
                  key={index}
                  className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-blue-50 border-blue-500 text-blue-900'
                      : 'bg-white border-gray-300 text-gray-800 hover:border-blue-300 hover:bg-blue-50'
                  } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleCheckboxChange(index)}
                    disabled={isSubmitting}
                    className="mt-1 mr-3 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="flex-1 font-medium">{answer.text}</span>
                </label>
              )
            })}
          </div>

          {/* Кнопка отправки */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || localSelectedAnswers.size === 0}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {isSubmitting ? 'Отправка...' : 'Отправить'}
          </button>
        </>
      ) : (
        <>
          {/* Детальный feedback по каждому выбранному варианту */}
          {individualFeedbacks && individualFeedbacks.length > 0 && (
            <div className="space-y-2 mb-4">
              {multiChoice.answers.map((answer, index) => {
                const isSelected = selectedAnswers?.includes(index) || false
                const isCorrectAnswer = correctIndices.has(index)
                const isIncorrectAnswer = incorrectIndices.has(index)
                const individualFeedback = individualFeedbacks.find(fb => fb.answer_index === index)

                if (!isSelected) {
                  // Показываем невыбранные правильные ответы серым цветом
                  if (isCorrectAnswer) {
                    return (
                      <div
                        key={index}
                        className="flex items-start p-3 rounded-lg border-2 bg-gray-100 border-gray-300 text-gray-600 opacity-60"
                      >
                        <input
                          type="checkbox"
                          checked={false}
                          disabled
                          className="mt-1 mr-3 w-5 h-5 text-gray-400 border-gray-300 rounded"
                        />
                        <span className="flex-1 font-medium">{answer.text}</span>
                        <span className="ml-2 text-green-600">✓ (правильный)</span>
                      </div>
                    )
                  }
                  return null
                }

                let borderColor = 'border-gray-300'
                let bgColor = 'bg-gray-50'
                let textColor = 'text-gray-800'

                if (isCorrectAnswer) {
                  borderColor = 'border-green-500'
                  bgColor = 'bg-green-50'
                  textColor = 'text-green-800'
                } else if (isIncorrectAnswer) {
                  borderColor = 'border-red-500'
                  bgColor = 'bg-red-50'
                  textColor = 'text-red-800'
                }

                return (
                  <div
                    key={index}
                    className={`flex items-start p-3 rounded-lg border-2 ${bgColor} ${borderColor} ${textColor}`}
                  >
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                      className={`mt-1 mr-3 w-5 h-5 ${
                        isCorrectAnswer ? 'text-green-600' : 'text-red-600'
                      } border-gray-300 rounded`}
                    />
                    <div className="flex-1">
                      <span className="font-medium">{answer.text}</span>
                      {individualFeedback?.feedback && (
                        <p className="mt-1 text-sm opacity-90">
                          {individualFeedback.feedback}
                        </p>
                      )}
                    </div>
                    <span className="ml-2">
                      {isCorrectAnswer ? '✓' : '✗'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Итоговое сообщение */}
          {feedback && (
            <div className={`mt-4 p-4 rounded-lg border-2 ${
              isCorrect
                ? 'bg-green-50 border-green-200 text-green-800'
                : score === 0.5
                ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <p className="font-medium mb-1">{feedback}</p>
              {score !== undefined && (
                <p className="text-sm opacity-75">
                  Оценка: {score}/1.0
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
