'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import { telegramToCommonMark } from './telegramMarkdown'

interface RevisionViewProps {
  revision: {
    element_id: string
    type: 'revision'
    text: string
    prefix: string
    no_mistakes: string
    button?: string
  }
  revisionResult?: {
    has_mistakes: boolean
    message: string
    mistakes_count: number
    revision_chain: Array<Record<string, { element_data: any }>>  // Формат: [{element_id: {element_data: {...}}}, ...]
  }
  isLoading?: boolean
  onStartRevision?: () => void
}

export default function RevisionView({
  revision,
  revisionResult,
  isLoading = false,
  onStartRevision
}: RevisionViewProps) {
  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg p-4 shadow-sm">
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Проверка ошибок...</p>
        </div>
      </div>
    )
  }

  if (!revisionResult) {
    return (
      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg p-4 shadow-sm">
        <div className="text-gray-600 text-sm">
          Загрузка результата...
        </div>
      </div>
    )
  }

  const hasMistakes = revisionResult.has_mistakes
  const message = revisionResult.message
  const mistakesCount = revisionResult.mistakes_count

  return (
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg p-4 shadow-sm">
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🔄</span>
          <h3 className="text-lg font-semibold text-yellow-800">
            Повторение ошибок
          </h3>
        </div>
      </div>
      
      <div className={`text-gray-800 text-base leading-relaxed mb-3 ${
        hasMistakes ? 'text-yellow-900' : 'text-green-800'
      }`}>
        <ReactMarkdown
          components={{
            p: ({node, ...props}) => <p className="mb-2" {...props} />,
            strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
            em: ({node, ...props}) => <em className="italic" {...props} />,
          }}
        >
          {telegramToCommonMark(message)}
        </ReactMarkdown>
      </div>
      
      {hasMistakes && mistakesCount > 0 && (
        <div className="mt-4 p-3 rounded-lg border-2 bg-yellow-100 border-yellow-200 text-yellow-800">
          <p className="font-medium">
            Найдено ошибок: {mistakesCount}
          </p>
          <p className="text-sm mt-1">
            Будет показано {revisionResult.revision_chain.length} элементов для повторения
          </p>
        </div>
      )}
      
      {hasMistakes && revision.button && (
        <div className="mt-4 pt-3 border-t border-yellow-200">
          <button
            onClick={onStartRevision}
            className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
          >
            {revision.button}
          </button>
        </div>
      )}
    </div>
  )
}
