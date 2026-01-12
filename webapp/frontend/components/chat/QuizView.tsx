'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

interface QuizAnswer {
  text: string
  correct?: string  // "yes" для правильного ответа
  feedback?: string
}

interface QuizElement {
  element_id: string
  type: "quiz"
  text: string
  answers: QuizAnswer[]
  media?: string[]
}

interface QuizViewProps {
  quiz: QuizElement
  onAnswerSelected: (answerIndex: number) => Promise<void>
  selectedAnswer?: number
  showFeedback?: boolean
  feedback?: string
  isCorrect?: boolean
}

export default function QuizView({
  quiz,
  onAnswerSelected,
  selectedAnswer,
  showFeedback,
  feedback,
  isCorrect
}: QuizViewProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Сбрасываем состояние при изменении quiz элемента или когда showFeedback становится false/undefined
  useEffect(() => {
    // Если showFeedback отсутствует или false, сбрасываем локальное состояние
    if (!showFeedback) {
      setIsSubmitting(false)
    }
  }, [quiz.element_id, showFeedback])
  
  // Дополнительно сбрасываем состояние при изменении element_id, даже если showFeedback еще true
  useEffect(() => {
    setIsSubmitting(false)
  }, [quiz.element_id])
  
  // Логируем состояние для отладки
  console.log("QuizView rendered with quiz:", quiz.element_id)
  console.log("QuizView selectedAnswer:", selectedAnswer)
  console.log("QuizView showFeedback:", showFeedback)
  console.log("QuizView isSubmitting:", isSubmitting)

  // Определение типа медиа по URL
  const getMediaType = (url: string): 'image' | 'video' => {
    const lowerUrl = url.toLowerCase()
    if (lowerUrl.includes('.mp4') || lowerUrl.includes('.webm') || lowerUrl.includes('.ogg')) {
      return 'video'
    }
    return 'image'
  }

  // Рендеринг медиа файлов
  const renderMedia = (mediaUrls: string[]) => {
    if (!mediaUrls || mediaUrls.length === 0) return null

    // Преобразуем относительные URL прокси в абсолютные
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const processedUrls = mediaUrls.map(url => {
      if (url.startsWith('/api/mvp/media/proxy')) {
        return `${apiUrl}${url}`
      }
      return url
    })

    const images = processedUrls.filter(url => getMediaType(url) === 'image')
    const videos = processedUrls.filter(url => getMediaType(url) === 'video')

    return (
      <div className="mt-2 space-y-2">
        {images.length > 0 && (
          <div className={`grid gap-2 ${images.length > 1 ? 'grid-cols-2' : ''}`}>
            {images.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`Quiz image ${idx + 1}`}
                className="rounded-lg max-w-full h-auto"
                crossOrigin="anonymous"
                onError={(e) => {
                  console.error(`Failed to load image: ${url}`)
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
            ))}
          </div>
        )}
        {videos.map((url, vidIndex) => (
          <video
            key={vidIndex}
            src={url}
            controls
            className="rounded-lg max-w-full"
            crossOrigin="anonymous"
            onError={(e) => {
              console.error(`Failed to load video: ${url}`)
              const target = e.target as HTMLVideoElement
              target.style.display = 'none'
            }}
          />
        ))}
      </div>
    )
  }

  const handleAnswerClick = async (index: number) => {
    // Разрешаем выбор ответа, если showFeedback false или undefined (т.е. элемент еще не был пройден)
    if (isSubmitting || (selectedAnswer !== undefined && showFeedback)) return
    
    setIsSubmitting(true)
    try {
      await onAnswerSelected(index)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Определяем правильный ответ для визуальной индикации
  const correctAnswerIndex = quiz.answers.findIndex(answer => answer.correct === "yes")

  return (
    <div className="mb-4 p-4 bg-white rounded-lg shadow-sm">
      {/* Медиа файлы */}
      {quiz.media && quiz.media.length > 0 && renderMedia(quiz.media)}
      
      {/* Вопрос */}
      <div className="mt-3 mb-4">
        <ReactMarkdown className="text-gray-800 text-lg leading-relaxed">
          {quiz.text}
        </ReactMarkdown>
      </div>

      {/* Варианты ответов */}
      <div className="space-y-2">
        {quiz.answers.map((answer, index) => {
          const isSelected = selectedAnswer === index
          const isCorrectAnswer = index === correctAnswerIndex
          const showResult = showFeedback && isSelected

          let buttonClass = "w-full text-left px-4 py-3 rounded-lg border-2 transition-all "
          
          if (showResult) {
            if (isCorrect) {
              buttonClass += "bg-green-50 border-green-500 text-green-800"
            } else {
              buttonClass += "bg-red-50 border-red-500 text-red-800"
            }
          } else if (isSelected) {
            buttonClass += "bg-blue-50 border-blue-500 text-blue-800"
          } else if (showFeedback && isCorrectAnswer) {
            // Показываем правильный ответ зеленым, если был выбран неправильный
            buttonClass += "bg-green-50 border-green-300 text-green-700"
          } else {
            buttonClass += "bg-gray-50 border-gray-300 text-gray-800 hover:bg-gray-100 hover:border-gray-400"
          }

          return (
            <button
              key={index}
              onClick={() => handleAnswerClick(index)}
              disabled={isSubmitting || (selectedAnswer !== undefined && showFeedback)}
              className={buttonClass}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{answer.text}</span>
                {showResult && (
                  <span className="ml-2">
                    {isCorrect ? "✓" : "✗"}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Feedback */}
      {showFeedback && feedback && (
        <div className={`mt-4 p-3 rounded-lg ${
          isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          <p className="font-medium">{feedback}</p>
        </div>
      )}
    </div>
  )
}
