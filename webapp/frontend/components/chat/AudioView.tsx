'use client'

import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import DOMPurify from 'isomorphic-dompurify'

interface AudioElement {
  element_id: string
  type: "audio"
  text?: string
  media: string[]  // Обязательный массив URL аудиофайлов
  parse_mode?: string
  link_preview?: boolean
}

interface AudioViewProps {
  audio: AudioElement
}

export default function AudioView({ audio }: AudioViewProps) {
  const [loadedAudios, setLoadedAudios] = useState<Set<number>>(new Set())
  const [errorAudios, setErrorAudios] = useState<Set<number>>(new Set())

  console.log("AudioView rendered with audio:", audio)
  console.log("AudioView media:", audio.media)

  // Обработка ссылок в тексте (аналогично ChatView)
  const processLinks = (text: string, linkPreview: boolean | undefined, parseMode: string | undefined): string => {
    if (parseMode === 'HTML') {
      return text // HTML ссылки уже в формате <a>
    }
    const urlRegex = /(https?:\/\/[^\s]+)/g
    return text.replace(urlRegex, (url) => `[${url}](${url})`)
  }

  // Преобразуем относительные URL прокси в абсолютные
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const processedMediaUrls = audio.media.map(url => {
    if (url.startsWith('/api/mvp/media/proxy')) {
      return `${apiUrl}${url}`
    }
    return url
  })

  const handleAudioLoad = (index: number) => {
    setLoadedAudios(prev => new Set(prev).add(index))
    setErrorAudios(prev => {
      const newSet = new Set(prev)
      newSet.delete(index)
      return newSet
    })
  }

  const handleAudioError = (index: number, event?: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    const audioElement = event?.target as HTMLAudioElement
    const error = audioElement?.error
    console.error(`Failed to load audio ${index}:`, processedMediaUrls[index])
    console.error(`Audio error details:`, {
      code: error?.code,
      message: error?.message,
      networkState: audioElement?.networkState,
      readyState: audioElement?.readyState,
    })
    setErrorAudios(prev => new Set(prev).add(index))
    setLoadedAudios(prev => {
      const newSet = new Set(prev)
      newSet.delete(index)
      return newSet
    })
  }

  const renderText = () => {
    if (!audio.text) return null

    const processedText = processLinks(audio.text, audio.link_preview, audio.parse_mode)

    if (audio.parse_mode === 'HTML') {
      // Санитизация HTML с поддержкой tg-spoiler
      let sanitizedHTML = DOMPurify.sanitize(processedText, {
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
            {processedText}
          </ReactMarkdown>
        </div>
      )
    }
  }

  return (
    <div className="mb-4 p-4 bg-white rounded-lg shadow-sm">
      {/* Текст (если есть) */}
      {renderText()}

      {/* Аудио файлы */}
      <div className="space-y-3">
        {processedMediaUrls.map((url, index) => (
          <div key={index} className="flex flex-col">
            {errorAudios.has(index) ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">
                  ❌ Не удалось загрузить аудио файл
                </p>
                <p className="text-red-500 text-xs mt-1 break-all">
                  URL: {processedMediaUrls[index]}
                </p>
                <button
                  onClick={() => {
                    setErrorAudios(prev => {
                      const newSet = new Set(prev)
                      newSet.delete(index)
                      return newSet
                    })
                    // Перезагружаем аудио элемент
                    const audioElement = document.querySelector(`audio[data-index="${index}"]`) as HTMLAudioElement
                    if (audioElement) {
                      audioElement.load()
                    }
                  }}
                  className="mt-2 text-sm text-red-600 underline hover:text-red-800"
                >
                  Попробовать снова
                </button>
              </div>
            ) : (
              <audio
                data-index={index}
                src={url}
                controls
                className="w-full rounded-lg"
                crossOrigin="anonymous"
                preload="metadata"
                onLoadedData={() => {
                  console.log(`Audio ${index} loaded successfully:`, url)
                  handleAudioLoad(index)
                }}
                onError={(e) => {
                  console.error(`Audio ${index} error event:`, e)
                  handleAudioError(index, e)
                }}
                onLoadStart={() => {
                  console.log(`Audio ${index} load started:`, url)
                }}
                onCanPlay={() => {
                  console.log(`Audio ${index} can play:`, url)
                }}
              >
                Ваш браузер не поддерживает воспроизведение аудио.
              </audio>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
