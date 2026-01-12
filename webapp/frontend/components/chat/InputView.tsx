'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import DOMPurify from 'isomorphic-dompurify'

interface InputElement {
  element_id: string
  type: "input"
  text: string
  correct_answer?: string
  feedback_correct?: string
  feedback_incorrect?: string
  input_type?: string  // "text" или "sequence"
}

interface InputViewProps {
  input: InputElement
  onAnswerSubmitted: (answer: string) => void
  submittedAnswer?: string
  showFeedback?: boolean
  feedback?: string
  isCorrect?: boolean
}

export default function InputView({ 
  input, 
  onAnswerSubmitted, 
  submittedAnswer,
  showFeedback,
  feedback,
  isCorrect 
}: InputViewProps) {
  const [userAnswer, setUserAnswer] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Сбрасываем состояние при изменении input элемента или когда showFeedback становится false/undefined
  useEffect(() => {
    // Если showFeedback отсутствует или false, сбрасываем локальное состояние
    if (!showFeedback) {
      setUserAnswer('')
      setIsSubmitting(false)
    }
  }, [input.element_id, showFeedback])
  
  // Дополнительно сбрасываем состояние при изменении element_id, даже если showFeedback еще true
  useEffect(() => {
    setUserAnswer('')
    setIsSubmitting(false)
  }, [input.element_id])

  console.log("InputView rendered with input:", input)
  console.log("InputView state:", { submittedAnswer, showFeedback, feedback, isCorrect })
  console.log("InputView userAnswer state:", userAnswer)

  const handleSubmit = async () => {
    if (!userAnswer.trim()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onAnswerSubmitted(userAnswer.trim())
    } catch (error) {
      console.error('Error submitting input answer:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const renderText = () => {
    if (!input.text) return null

    // Input элементы не имеют parse_mode в интерфейсе, используем MARKDOWN по умолчанию
    const parseMode = 'MARKDOWN'

    if (parseMode === 'HTML') {
      // Санитизация HTML с поддержкой tg-spoiler
      let sanitizedHTML = DOMPurify.sanitize(input.text, {
        ALLOWED_TAGS: ['b', 'i', 'u', 'code', 'pre', 'p', 'br', 'a', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'tg-spoiler'],
        ALLOWED_ATTR: ['href', 'target', 'rel']
      })
      
      // Преобразуем tg-spoiler в details/summary для браузера
      sanitizedHTML = sanitizedHTML.replace(
        /<tg-spoiler>/gi,
        '<details class="mt-2"><summary class="cursor-pointer text-blue-600 hover:text-blue-800">Показать перевод</summary><div class="mt-2">'
      )
      sanitizedHTML = sanitizedHTML.replace(
        /<\/tg-spoiler>/gi,
        '</div></details>'
      )
      
      return (
        <div
          className="text-gray-800 text-lg leading-relaxed whitespace-pre-wrap mb-3"
          dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
        />
      )
    } else {
      // Markdown рендеринг (по умолчанию)
      return (
        <div className="text-gray-800 text-lg leading-relaxed mb-3">
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
            {input.text}
          </ReactMarkdown>
        </div>
      )
    }
  }

  const getPlaceholder = () => {
    if (input.input_type === 'sequence') {
      return 'Например: 1 2 3 или 1,2,3'
    }
    return 'Введите ваш ответ...'
  }

  return (
    <div className="mb-4 p-4 bg-white rounded-lg shadow-sm">
      {/* Текст вопроса/инструкции */}
      {renderText()}

      {/* Поле ввода и кнопка отправки */}
      {!showFeedback ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => {
                console.log("Input onChange:", e.target.value)
                setUserAnswer(e.target.value)
              }}
              onKeyPress={handleKeyPress}
              placeholder={getPlaceholder()}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              disabled={isSubmitting}
            />
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !userAnswer.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {isSubmitting ? 'Отправка...' : 'Отправить'}
            </button>
          </div>
          {input.input_type === 'sequence' && (
            <p className="text-sm text-gray-500">
              💡 Можно использовать любые разделители: пробелы, запятые и т.д.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Показать введенный ответ */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Ваш ответ:</p>
            <p className="text-gray-800 font-medium">{submittedAnswer}</p>
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`p-3 rounded-lg ${
              isCorrect 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`text-sm font-medium ${
                isCorrect ? 'text-green-800' : 'text-red-800'
              }`}>
                {isCorrect ? '✅' : '❌'} {feedback}
              </p>
              {!isCorrect && input.correct_answer && (
                <p className="text-sm text-gray-600 mt-2">
                  Правильный ответ: <span className="font-medium">{input.correct_answer}</span>
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
