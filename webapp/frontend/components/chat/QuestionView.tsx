'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

interface QuestionAnswer {
  text: string
  feedback?: string
}

interface QuestionElement {
  element_id: string
  type: "question"
  text: string
  answers: QuestionAnswer[]
}

interface QuestionViewProps {
  question: QuestionElement
  onAnswerSelected: (answerIndex: number) => Promise<void>
  selectedAnswer?: number
  showFeedback?: boolean
  feedback?: string
}

export default function QuestionView({
  question,
  onAnswerSelected,
  selectedAnswer,
  showFeedback,
  feedback
}: QuestionViewProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Сбрасываем состояние при изменении question элемента или когда showFeedback становится false/undefined
  useEffect(() => {
    // Если showFeedback отсутствует или false, сбрасываем локальное состояние
    if (!showFeedback) {
      setIsSubmitting(false)
    }
  }, [question.element_id, showFeedback])
  
  // Дополнительно сбрасываем состояние при изменении element_id, даже если showFeedback еще true
  useEffect(() => {
    setIsSubmitting(false)
  }, [question.element_id])
  
  console.log("QuestionView rendered with question:", question)
  console.log("QuestionView answers:", question.answers)
  console.log("QuestionView selectedAnswer:", selectedAnswer)
  console.log("QuestionView showFeedback:", showFeedback)

  const handleAnswerClick = async (index: number) => {
    if (isSubmitting || showFeedback) {
      return
    }

    setIsSubmitting(true)
    try {
      await onAnswerSelected(index)
    } catch (error) {
      console.error('Error submitting question answer:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

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
            {question.text}
          </ReactMarkdown>
        </div>
      </div>

      {/* Варианты ответов */}
      <div className="space-y-2">
        {question.answers.map((answer, index) => {
          const isSelected = selectedAnswer === index
          const isDisabled = isSubmitting || showFeedback

          return (
            <button
              key={index}
              onClick={() => handleAnswerClick(index)}
              disabled={isDisabled}
              className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'bg-blue-50 border-blue-500 text-blue-900'
                  : 'bg-white border-gray-300 text-gray-800 hover:border-blue-300 hover:bg-blue-50'
              } ${
                isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <span className="font-medium">{answer.text}</span>
            </button>
          )
        })}
      </div>

      {/* Feedback */}
      {showFeedback && feedback && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-gray-800 text-sm">
            {feedback}
          </p>
        </div>
      )}
    </div>
  )
}
