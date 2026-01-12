'use client'

import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import DOMPurify from 'isomorphic-dompurify'

interface MessageElement {
  element_id: string
  text: string
  button?: string
  parse_mode?: string
}

interface MessageStepProps {
  element: MessageElement | null
  onNext: () => void
  loading?: boolean
}

export default function MessageStep({ element, onNext, loading = false }: MessageStepProps) {
  useEffect(() => {
    console.log("MessageStepMVP received element:", element)
  }, [element])
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Очищаем таймер при размонтировании
    return () => {
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer)
      }
    }
  }, [autoAdvanceTimer])

  useEffect(() => {
    // Если элемент загружен и кнопка не указана, автоматический переход через 2.5 секунды
    if (element && !element.button) {
      const timer = setTimeout(() => {
        onNext()
      }, 2500) // 2.5 секунды
      setAutoAdvanceTimer(timer)
      return () => {
        if (timer) clearTimeout(timer)
      }
    }
  }, [element, onNext])

  const handleButtonClick = () => {
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer)
      setAutoAdvanceTimer(null)
    }
    onNext()
  }

  const renderContent = () => {
    if (!element) {
      return (
        <div className="text-center text-gray-500">
          Загрузка...
        </div>
      )
    }

    if (element.parse_mode === 'HTML') {
      // Санитизация HTML с поддержкой tg-spoiler
      let sanitizedHTML = DOMPurify.sanitize(element.text, {
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
          className="text-gray-800 text-lg leading-relaxed whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
        />
      )
    } else {
      // Markdown рендеринг (по умолчанию)
      return (
        <div className="text-gray-800 text-lg leading-relaxed">
          <ReactMarkdown
            components={{
              p: ({node, ...props}) => <p className="mb-4" {...props} />,
              h1: ({node, ...props}) => <h1 className="text-3xl font-bold mb-4" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-2xl font-bold mb-3" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-xl font-bold mb-2" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4" {...props} />,
              li: ({node, ...props}) => <li className="mb-1" {...props} />,
              code: ({node, ...props}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm" {...props} />,
              pre: ({node, ...props}) => <pre className="bg-gray-100 p-4 rounded mb-4 overflow-x-auto" {...props} />,
            }}
          >{element.text}</ReactMarkdown>
        </div>
      )
    }
  }

  // Если элемент не загружен, показываем состояние загрузки
  if (!element) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 max-w-3xl mx-auto">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка элемента...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        {renderContent()}
      </div>

      {element.button && (
        <div className="flex justify-center mt-8">
          <button
            onClick={handleButtonClick}
            disabled={loading}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium transition-colors"
          >
            {loading ? 'Загрузка...' : element.button}
          </button>
        </div>
      )}

      {!element.button && (
        <div className="text-center mt-4 text-gray-500 text-sm">
          Автоматический переход через несколько секунд...
        </div>
      )}
    </div>
  )
}
