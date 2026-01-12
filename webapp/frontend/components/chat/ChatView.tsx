'use client'

import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import DOMPurify from 'isomorphic-dompurify'
import dynamic from 'next/dynamic'

const QuizView = dynamic(() => import('./QuizView'), {
  ssr: false,
})

const AudioView = dynamic(() => import('./AudioView'), {
  ssr: false,
})

const InputView = dynamic(() => import('./InputView'), {
  ssr: false,
})

const QuestionView = dynamic(() => import('./QuestionView'), {
  ssr: false,
})

const MultiChoiceView = dynamic(() => import('./MultiChoiceView'), {
  ssr: false,
})

const RevisionView = dynamic(() => import('./RevisionView'), {
  ssr: false,
})

const DialogView = dynamic(() => import('./DialogView'), {
  ssr: false,
})

interface MessageElement {
  element_id: string
  text: string
  button?: string
  options?: Array<{ text: string; goto?: string; wait?: string }>  // Для inline кнопок
  parse_mode?: string
  media?: string[]  // Массив URL медиафайлов (изображения, видео)
  link_preview?: boolean  // Показывать ли превью ссылок
}

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

interface AudioElement {
  element_id: string
  type: "audio"
  text?: string
  media: string[]  // Обязательный массив URL аудиофайлов
  parse_mode?: string
  link_preview?: boolean
}

interface InputElement {
  element_id: string
  type: "input"
  text: string
  correct_answer?: string
  feedback_correct?: string
  feedback_incorrect?: string
  input_type?: string  // "text" или "sequence"
}

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

interface UnimplementedElement {
  element_id: string
  type: "unimplemented"
  original_type?: string
  element_name?: string
  text: string
  button?: string
}

interface TestElement {
  element_id: string
  type: "test"
  text: string
  prefix: string
  score: Record<number, string>  // { процент_ошибок: сообщение }
  button?: string
}

interface EndElement {
  element_id: string
  type: "end"
  text?: string
}

interface RevisionElement {
  element_id: string
  type: "revision"
  text: string
  prefix: string
  no_mistakes: string
  button?: string
}

interface DialogElement {
  element_id: string
  type: "dialog"
  text: string
  prompt: string
  model?: string
  temperature?: number
  reasoning?: string
  parse_mode?: string
  link_preview?: boolean
  auto_start?: boolean
  voice_response?: boolean
  transcription_language?: string
  tts_voice?: string
  tts_model?: string
  tts_speed?: number
  conversation?: Array<{role: string, content: string}>
}

interface RevisionResult {
  has_mistakes: boolean
  message: string
  mistakes_count: number
  revision_chain: Array<Record<string, { element_data: any }>>  // Формат: [{element_id: {element_data: {...}}}, ...]
}

interface TestResult {
  total_score: number
  total_max_score: number
  error_percentage: number
  result_text: string
  feedback_message: string
}

type CourseElement = MessageElement | QuizElement | AudioElement | InputElement | QuestionElement | MultiChoiceElement | UnimplementedElement | TestElement | EndElement | RevisionElement | DialogElement

interface ChatViewProps {
  messages: CourseElement[]
  courseId?: string  // ID курса для dialog элементов
  onInlineButtonClick?: (option: { text: string; goto?: string; wait?: string }) => void
  onQuizAnswer?: (elementId: string, answerIndex: number) => Promise<void>
  quizStates?: Record<string, { selectedAnswer?: number; feedback?: string; isCorrect?: boolean; showFeedback?: boolean }>
  onInputAnswer?: (elementId: string, answer: string) => Promise<void>
  inputStates?: Record<string, { submittedAnswer?: string; feedback?: string; isCorrect?: boolean; showFeedback?: boolean }>
  onQuestionAnswer?: (elementId: string, answerIndex: number) => Promise<void>
  questionStates?: Record<string, { selectedAnswer?: number; feedback?: string; showFeedback?: boolean }>
  onMultiChoiceAnswer?: (elementId: string, selectedIndices: number[]) => Promise<void>
  multiChoiceStates?: Record<string, { selectedAnswers?: number[]; feedback?: string; individualFeedbacks?: Array<{ answer_index: number; answer_text: string; feedback?: string }>; isCorrect?: boolean; score?: number; showFeedback?: boolean }>
  testResults?: Record<string, TestResult>
  testLoading?: Record<string, boolean>
  revisionResults?: Record<string, RevisionResult>
  revisionLoading?: Record<string, boolean>
  revisionCounter?: Record<string, number>
  onStartRevision?: (elementId: string) => void
  onNext?: () => void  // Callback для перехода к следующему элементу
}

export default function ChatView({ messages, courseId, onInlineButtonClick, onQuizAnswer, quizStates = {}, onInputAnswer, inputStates = {}, onQuestionAnswer, questionStates = {}, onMultiChoiceAnswer, multiChoiceStates = {}, testResults = {}, testLoading = {}, revisionResults = {}, revisionLoading = {}, revisionCounter = {}, onStartRevision, onNext }: ChatViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Автоматический скролл вниз при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
        {/* Группа изображений */}
        {images.length > 0 && (
          <div className={`grid gap-2 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
            {images.map((url, imgIndex) => (
              <div key={imgIndex} className="relative rounded-lg overflow-hidden shadow-sm bg-gray-100">
                <img
                  src={url}
                  alt={`Image ${imgIndex + 1}`}
                  className="w-full h-auto object-cover"
                  loading="lazy"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    console.error(`Failed to load image: ${url}`)
                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="16" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EИзображение не загружено%3C/text%3E%3C/svg%3E'
                  }}
                  onLoad={() => {
                    console.log(`Successfully loaded image: ${url}`)
                  }}
                />
              </div>
            ))}
          </div>
        )}
        
        {/* Видео файлы */}
        {videos.map((url, vidIndex) => (
          <div key={vidIndex} className="relative rounded-lg overflow-hidden shadow-sm bg-gray-100">
            <video
              src={url}
              controls
              className="w-full max-h-96"
              preload="metadata"
              crossOrigin="anonymous"
              onError={(e) => {
                console.error(`Failed to load video: ${url}`)
                const target = e.target as HTMLVideoElement
                target.style.display = 'none'
                const errorDiv = document.createElement('div')
                errorDiv.className = 'p-4 text-center text-gray-500'
                errorDiv.textContent = 'Видео не загружено'
                target.parentElement?.appendChild(errorDiv)
              }}
              onLoadedData={() => {
                console.log(`Successfully loaded video: ${url}`)
              }}
            >
              Ваш браузер не поддерживает видео.
            </video>
          </div>
        ))}
      </div>
    )
  }

  // Обработка ссылок в зависимости от link_preview
  // link_preview: false означает отключение превью, но ссылки остаются кликабельными
  // Для Markdown нужно преобразовать обычные URL в markdown ссылки
  const processLinks = (text: string, linkPreview: boolean | undefined, parseMode: string | undefined): string => {
    if (parseMode === 'HTML') {
      // Для HTML ничего не делаем, ссылки уже в формате <a>
      return text
    }
    
    // Для Markdown: преобразуем обычные URL в markdown ссылки
    // Регулярное выражение для поиска URL (http/https)
    const urlRegex = /(https?:\/\/[^\s]+)/g
    return text.replace(urlRegex, (url) => {
      // Если URL уже в формате markdown ссылки [text](url), не трогаем
      // Иначе преобразуем в [url](url)
      return `[${url}](${url})`
    })
  }

  // Определяем, является ли элемент частью активной revision chain
  // Элементы из revision chain добавляются после элемента revision в массиве messages
  const isElementInActiveRevisionChain = (elementId: string, index: number): boolean => {
    console.log(`isElementInActiveRevisionChain called: elementId=${elementId}, index=${index}, messages.length=${messages.length}`)
    console.log(`revisionResults keys:`, Object.keys(revisionResults))
    
    // Ищем последний элемент revision в массиве messages до текущего индекса
    let lastRevisionIndex = -1
    let lastRevisionElementId: string | null = null
    
    for (let i = index - 1; i >= 0; i--) {
      const msg = messages[i]
      if ('type' in msg && msg.type === 'revision') {
        lastRevisionIndex = i
        lastRevisionElementId = (msg as RevisionElement).element_id
        console.log(`Found revision element at index ${i}: element_id=${lastRevisionElementId}`)
        break // Нашли последний revision элемент перед текущим
      }
    }
    
    // Если нашли revision элемент, проверяем, является ли текущий элемент частью его цепочки
    if (lastRevisionIndex >= 0 && lastRevisionElementId) {
      const revisionResult = revisionResults[lastRevisionElementId]
      console.log(`revisionResult for ${lastRevisionElementId}:`, revisionResult)
      if (revisionResult && revisionResult.has_mistakes && revisionResult.revision_chain) {
        // Извлекаем element_id из структуры {element_id: {element_data: {...}}}
        const chainElementIds = revisionResult.revision_chain.map(item => Object.keys(item)[0])
        console.log(`revision_chain element_ids:`, chainElementIds)
        const isInChain = chainElementIds.includes(elementId)
        console.log(`isElementInActiveRevisionChain: elementId=${elementId}, index=${index}, lastRevisionIndex=${lastRevisionIndex}, lastRevisionElementId=${lastRevisionElementId}, isInChain=${isInChain}`)
        return isInChain
      } else {
        console.log(`revisionResult check failed: revisionResult=${!!revisionResult}, has_mistakes=${revisionResult?.has_mistakes}, revision_chain=${!!revisionResult?.revision_chain}`)
      }
    } else {
      console.log(`No revision element found before index ${index}`)
    }
    
    return false
  }

  const renderElement = (element: CourseElement, index: number) => {
    // Обработка audio элементов
    if ('type' in element && element.type === 'audio') {
      const audio = element as AudioElement
      return (
        <div key={`${audio.element_id}-${index}`} className="mb-3 flex flex-col justify-start px-2">
          <AudioView audio={audio} />
        </div>
      )
    }
    
    // Обработка quiz элементов
    if ('type' in element && element.type === 'quiz') {
      const quiz = element as QuizElement
      
      // Проверяем, является ли этот конкретный экземпляр элемента частью активной revision chain
      const isInRevisionChain = isElementInActiveRevisionChain(quiz.element_id, index)
      
      // Используем revisionCounter для принудительного пересоздания компонента из цепочки Revision
      const revisionKey = revisionCounter[quiz.element_id] || 0
      
      // Если элемент из цепочки Revision:
      // - Если revisionCounter увеличился (новый экземпляр в revision chain), используем пустое состояние
      // - Если состояние уже есть (пользователь ответил), используем его для показа feedback
      // - Иначе используем состояние из quizStates (для элементов не в revision chain)
      let quizState: { selectedAnswer?: number; feedback?: string; isCorrect?: boolean; showFeedback?: boolean } = {}
      if (isInRevisionChain) {
        // Для элементов в revision chain: если состояние есть, используем его (пользователь уже ответил)
        // Если нет - используем пустой объект (элемент еще не был пройден в этом revision chain)
        const existingState = quizStates[quiz.element_id]
        if (existingState && existingState.showFeedback) {
          // Пользователь уже ответил на этот элемент в revision chain, показываем feedback
          quizState = existingState
        } else {
          // Элемент еще не был пройден в этом revision chain, используем пустое состояние
          quizState = {}
        }
      } else {
        // Для элементов не в revision chain, используем обычное состояние
        quizState = quizStates[quiz.element_id] || {}
      }
      
      // Используем индекс для создания уникального ключа, чтобы избежать дублирования
      const elementKey = `${quiz.element_id}-${revisionKey}-${index}`
      
      // Логируем для отладки
      console.log(`QuizView rendering: element_id=${quiz.element_id}, index=${index}, revisionKey=${revisionKey}, isInRevisionChain=${isInRevisionChain}`)
      console.log(`QuizView quizState:`, quizState)
      console.log(`QuizView quizStates[${quiz.element_id}]:`, quizStates[quiz.element_id])
      
      return (
        <div key={elementKey} className="mb-3 flex flex-col justify-start px-2">
          <QuizView
            quiz={quiz}
            onAnswerSelected={async (answerIndex) => {
              await onQuizAnswer?.(quiz.element_id, answerIndex)
            }}
            selectedAnswer={quizState.selectedAnswer}
            showFeedback={quizState.showFeedback}
            feedback={quizState.feedback}
            isCorrect={quizState.isCorrect}
          />
        </div>
      )
    }
    
    // Обработка input элементов
    if ('type' in element && element.type === 'input') {
      const input = element as InputElement
      
      // Проверяем, является ли этот конкретный экземпляр элемента частью активной revision chain
      const isInRevisionChain = isElementInActiveRevisionChain(input.element_id, index)
      
      // Используем revisionCounter для принудительного пересоздания компонента из цепочки Revision
      const revisionKey = revisionCounter[input.element_id] || 0
      
      // Если элемент из цепочки Revision:
      // - Если состояние уже есть (пользователь ответил), используем его для показа feedback
      // - Иначе используем пустой объект (элемент еще не был пройден в этом revision chain)
      let inputState: { submittedAnswer?: string; feedback?: string; isCorrect?: boolean; showFeedback?: boolean } = {}
      if (isInRevisionChain) {
        const existingState = inputStates[input.element_id]
        if (existingState && existingState.showFeedback) {
          inputState = existingState
        } else {
          inputState = {}
        }
      } else {
        inputState = inputStates[input.element_id] || {}
      }
      
      // Используем индекс для создания уникального ключа
      const elementKey = `${input.element_id}-${revisionKey}-${index}`
      return (
        <div key={elementKey} className="mb-3 flex flex-col justify-start px-2">
          <InputView
            input={input}
            onAnswerSubmitted={async (answer) => {
              await onInputAnswer?.(input.element_id, answer)
            }}
            submittedAnswer={inputState.submittedAnswer}
            showFeedback={inputState.showFeedback}
            feedback={inputState.feedback}
            isCorrect={inputState.isCorrect}
          />
        </div>
      )
    }
    
    // Обработка question элементов
    if ('type' in element && element.type === 'question') {
      const question = element as QuestionElement
      
      // Проверяем, является ли этот конкретный экземпляр элемента частью активной revision chain
      const isInRevisionChain = isElementInActiveRevisionChain(question.element_id, index)
      
      // Используем revisionCounter для принудительного пересоздания компонента из цепочки Revision
      const revisionKey = revisionCounter[question.element_id] || 0
      
      // Если элемент из цепочки Revision:
      // - Если состояние уже есть (пользователь ответил), используем его для показа feedback
      // - Иначе используем пустой объект (элемент еще не был пройден в этом revision chain)
      let questionState: { selectedAnswer?: number; feedback?: string; showFeedback?: boolean } = {}
      if (isInRevisionChain) {
        const existingState = questionStates[question.element_id]
        if (existingState && existingState.showFeedback) {
          questionState = existingState
        } else {
          questionState = {}
        }
      } else {
        questionState = questionStates[question.element_id] || {}
      }
      
      // Используем индекс для создания уникального ключа
      const elementKey = `${question.element_id}-${revisionKey}-${index}`
      return (
        <div key={elementKey} className="mb-3 flex flex-col justify-start px-2">
          <QuestionView
            question={question}
            onAnswerSelected={async (answerIndex) => {
              await onQuestionAnswer?.(question.element_id, answerIndex)
            }}
            selectedAnswer={questionState.selectedAnswer}
            showFeedback={questionState.showFeedback}
            feedback={questionState.feedback}
          />
        </div>
      )
    }
    
    // Обработка multi_choice элементов
    if ('type' in element && element.type === 'multi_choice') {
      const multiChoice = element as MultiChoiceElement
      
      // Проверяем, является ли этот конкретный экземпляр элемента частью активной revision chain
      const isInRevisionChain = isElementInActiveRevisionChain(multiChoice.element_id, index)
      
      // Используем revisionCounter для принудительного пересоздания компонента из цепочки Revision
      const revisionKey = revisionCounter[multiChoice.element_id] || 0
      
      // Если элемент из цепочки Revision:
      // - Если состояние уже есть (пользователь ответил), используем его для показа feedback
      // - Иначе используем пустой объект (элемент еще не был пройден в этом revision chain)
      let multiChoiceState: { selectedAnswers?: number[]; feedback?: string; individualFeedbacks?: Array<{ answer_index: number; answer_text: string; feedback?: string }>; isCorrect?: boolean; score?: number; showFeedback?: boolean } = {}
      if (isInRevisionChain) {
        const existingState = multiChoiceStates[multiChoice.element_id]
        if (existingState && existingState.showFeedback) {
          multiChoiceState = existingState
        } else {
          multiChoiceState = {}
        }
      } else {
        multiChoiceState = multiChoiceStates[multiChoice.element_id] || {}
      }
      
      // Используем индекс для создания уникального ключа
      const elementKey = `${multiChoice.element_id}-${revisionKey}-${index}`
      return (
        <div key={elementKey} className="mb-3 flex flex-col justify-start px-2">
          <MultiChoiceView
            multiChoice={multiChoice}
            onAnswersSubmitted={async (selectedIndices) => {
              await onMultiChoiceAnswer?.(multiChoice.element_id, selectedIndices)
            }}
            selectedAnswers={multiChoiceState.selectedAnswers}
            showFeedback={multiChoiceState.showFeedback}
            feedback={multiChoiceState.feedback}
            individualFeedbacks={multiChoiceState.individualFeedbacks}
            isCorrect={multiChoiceState.isCorrect}
            score={multiChoiceState.score}
          />
        </div>
      )
    }
    
    // Обработка test элементов
    if ('type' in element && element.type === 'test') {
      const test = element as TestElement
      console.log(`Rendering test element:`, test)
      const testResult = testResults[test.element_id]
      const isLoading = testLoading[test.element_id]
      
      return (
        <div key={test.element_id || index} className="mb-3 flex flex-col justify-start px-2">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-4 shadow-sm">
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">📊</span>
                <h3 className="text-lg font-semibold text-blue-800">
                  Итоговый тест
                </h3>
              </div>
            </div>
            
            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600 text-sm">Вычисление результата...</p>
              </div>
            ) : testResult ? (
              <>
                <div className="text-gray-800 text-base leading-relaxed mb-3">
                  <ReactMarkdown
                    components={{
                      p: ({node, ...props}) => <p className="mb-2" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-bold text-blue-900" {...props} />,
                      em: ({node, ...props}) => <em className="italic" {...props} />,
                    }}
                  >
                    {testResult.result_text}
                  </ReactMarkdown>
                </div>
                
                <div className={`mt-4 p-3 rounded-lg border-2 ${
                  testResult.error_percentage === 0
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : testResult.error_percentage <= 33
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <p className="font-medium">{testResult.feedback_message}</p>
                </div>
              </>
            ) : (
              <div className="text-gray-600 text-sm">
                Загрузка результата...
              </div>
            )}
          </div>
        </div>
      )
    }
    
    // Обработка revision элементов
    if ('type' in element && element.type === 'revision') {
      const revision = element as RevisionElement
      console.log(`Rendering revision element:`, revision)
      const revisionResult = revisionResults[revision.element_id]
      const isLoading = revisionLoading[revision.element_id]
      
      return (
        <div key={revision.element_id || index} className="mb-3 flex flex-col justify-start px-2">
          <RevisionView
            revision={revision}
            revisionResult={revisionResult}
            isLoading={isLoading}
            onStartRevision={() => {
              if (onStartRevision) {
                onStartRevision(revision.element_id)
              }
            }}
          />
        </div>
      )
    }
    
    // Обработка end элементов
    if ('type' in element && element.type === 'end') {
      const end = element as { element_id: string; type: 'end'; text?: string }
      console.log(`Rendering end element:`, end)
      return (
        <div key={end.element_id || index} className="mb-3 flex flex-col justify-start px-2">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-4 shadow-sm">
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🎉</span>
                <h3 className="text-lg font-semibold text-green-800">
                  Курс завершен
                </h3>
              </div>
            </div>
            {end.text && (
              <div className="text-gray-800 text-base leading-relaxed">
                <ReactMarkdown
                  components={{
                    p: ({node, ...props}) => <p className="mb-2" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-bold text-green-900" {...props} />,
                    em: ({node, ...props}) => <em className="italic" {...props} />,
                  }}
                >
                  {end.text}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      )
    }
    
    // Обработка dialog элементов
    if ('type' in element && element.type === 'dialog') {
      const dialog = element as DialogElement
      if (!courseId) {
        console.error('Dialog element requires courseId prop')
        return (
          <div key={dialog.element_id || index} className="mb-3 flex flex-col justify-start px-2">
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
              <p className="text-red-800">Ошибка: courseId не указан для dialog элемента</p>
            </div>
          </div>
        )
      }
      return (
        <div key={dialog.element_id || index} className="mb-3 w-full">
          <DialogView
            element={dialog}
            courseId={courseId}
            onNext={onNext}
          />
        </div>
      )
    }
    
    // Обработка нереализованных элементов
    if ('type' in element && element.type === 'unimplemented') {
      const unimplemented = element as UnimplementedElement
      console.log(`Rendering unimplemented element:`, unimplemented)
      return (
        <div key={unimplemented.element_id || index} className="mb-3 flex flex-col justify-start px-2">
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 shadow-sm">
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">⚠️</span>
                <h3 className="text-lg font-semibold text-yellow-800">
                  Нереализованный элемент
                </h3>
              </div>
              {unimplemented.element_name && (
                <p className="text-sm text-yellow-700 mb-1">
                  Тип: <span className="font-mono font-semibold">{unimplemented.element_name}</span>
                  {unimplemented.original_type && (
                    <span className="text-gray-600"> ({unimplemented.original_type})</span>
                  )}
                </p>
              )}
            </div>
            <div className="text-gray-800 text-base leading-relaxed mb-3">
              <ReactMarkdown
                components={{
                  p: ({node, ...props}) => <p className="mb-2" {...props} />,
                  a: ({node, ...props}) => (
                    <a
                      {...props}
                      className="text-blue-600 underline hover:text-blue-800"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  ),
                }}
              >
                {unimplemented.text}
              </ReactMarkdown>
            </div>
            {unimplemented.button && (
              <div className="mt-3 pt-3 border-t border-yellow-200">
                <p className="text-sm text-yellow-700 italic">
                  Примечание: Этот элемент будет пропущен, и курс продолжит выполнение со следующего элемента.
                </p>
              </div>
            )}
          </div>
        </div>
      )
    }

    // Обработка message элементов
    const message = element as MessageElement
    return renderMessage(message, index)
  }

  const renderMessage = (message: MessageElement, index: number) => {
    console.log(`Rendering message ${index}:`, message)
    console.log(`Message options:`, message.options)
    console.log(`Message media:`, message.media)
    console.log(`Message link_preview:`, message.link_preview)
    
    const processedText = processLinks(message.text, message.link_preview, message.parse_mode)
    
    if (message.parse_mode === 'HTML') {
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
          key={message.element_id || index}
          className="mb-3 flex flex-col justify-start px-2"
        >
          <div className="max-w-[85%] bg-blue-500 text-white rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm break-words">
            <div
              className="text-white text-[15px] leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
            />
          </div>
          {/* Медиа файлы */}
          {message.media && message.media.length > 0 && renderMedia(message.media)}
          {/* Inline кнопки */}
          {message.options && message.options.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2 max-w-[85%]">
              {message.options.map((option, optIndex) => (
                <button
                  key={optIndex}
                  onClick={() => {
                    console.log("Inline button clicked:", option)
                    onInlineButtonClick?.(option)
                  }}
                  className="px-4 py-2 bg-white border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 active:bg-blue-100 text-sm font-medium transition-colors shadow-sm"
                >
                  {option.text}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )
    } else {
      // Markdown рендеринг (по умолчанию)
      return (
        <div
          key={message.element_id || index}
          className="mb-3 flex flex-col justify-start px-2"
        >
          <div className="max-w-[85%] bg-blue-500 text-white rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm break-words">
            <div className="text-white text-[15px] leading-relaxed">
              <ReactMarkdown
                components={{
                  p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                  h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-2" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-2" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-base font-bold mb-2" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2" {...props} />,
                  li: ({node, ...props}) => <li className="mb-1" {...props} />,
                  code: ({node, ...props}) => <code className="bg-blue-600 px-1 py-0.5 rounded text-sm" {...props} />,
                  pre: ({node, ...props}) => <pre className="bg-blue-600 p-2 rounded mb-2 overflow-x-auto text-sm" {...props} />,
                  a: ({node, ...props}) => (
                    <a 
                      {...props} 
                      className="text-blue-200 underline hover:text-blue-100"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  ),
                }}
              >{processedText}</ReactMarkdown>
            </div>
          </div>
          {/* Медиа файлы */}
          {message.media && message.media.length > 0 && renderMedia(message.media)}
          {/* Inline кнопки */}
          {message.options && message.options.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2 max-w-[85%]">
              {message.options.map((option, optIndex) => (
                <button
                  key={optIndex}
                  onClick={() => {
                    console.log("Inline button clicked:", option)
                    onInlineButtonClick?.(option)
                  }}
                  className="px-4 py-2 bg-white border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 active:bg-blue-100 text-sm font-medium transition-colors shadow-sm"
                >
                  {option.text}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto py-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto mb-4"></div>
              <p>Загрузка сообщений...</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((element, index) => renderElement(element, index))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    </div>
  )
}
