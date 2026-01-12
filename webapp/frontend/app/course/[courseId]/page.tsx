'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'

const ChatView = dynamic(() => import('@/components/chat/ChatView'), {
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

interface TestResult {
  total_score: number
  total_max_score: number
  error_percentage: number
  result_text: string
  feedback_message: string
}

interface RevisionResult {
  has_mistakes: boolean
  message: string
  mistakes_count: number
  revision_chain: Array<Record<string, { element_data: any }>>  // Формат: [{element_id: {element_data: {...}}}, ...]
}

type CourseElement = MessageElement | QuizElement | AudioElement | InputElement | QuestionElement | MultiChoiceElement | UnimplementedElement | TestElement | EndElement | RevisionElement

export default function CoursePage() {
  const params = useParams()
  const courseId = params.courseId as string
  const [messages, setMessages] = useState<CourseElement[]>([])
  const [currentElement, setCurrentElement] = useState<CourseElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [courseExists, setCourseExists] = useState<boolean | null>(null)
  const [isCompleted, setIsCompleted] = useState(false)
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<NodeJS.Timeout | null>(null)
  const [quizStates, setQuizStates] = useState<Record<string, { selectedAnswer?: number; feedback?: string; isCorrect?: boolean; showFeedback?: boolean }>>({})
  const [inputStates, setInputStates] = useState<Record<string, { submittedAnswer?: string; feedback?: string; isCorrect?: boolean; showFeedback?: boolean }>>({})
  const [questionStates, setQuestionStates] = useState<Record<string, { selectedAnswer?: number; feedback?: string; showFeedback?: boolean }>>({})
  const [multiChoiceStates, setMultiChoiceStates] = useState<Record<string, { selectedAnswers?: number[]; feedback?: string; individualFeedbacks?: Array<{ answer_index: number; answer_text: string; feedback?: string }>; isCorrect?: boolean; score?: number; showFeedback?: boolean }>>({})
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})
  const [testLoading, setTestLoading] = useState<Record<string, boolean>>({})
  const [revisionResults, setRevisionResults] = useState<Record<string, RevisionResult>>({})
  const [revisionLoading, setRevisionLoading] = useState<Record<string, boolean>>({})
  const [revisionCounter, setRevisionCounter] = useState<Record<string, number>>({}) // Счетчик для принудительного пересоздания компонентов

  useEffect(() => {
    loadCourse()
  }, [courseId])

  // Сбрасываем состояние для элементов из цепочки Revision при их показе
  useEffect(() => {
    if (!currentElement || !('element_id' in currentElement)) {
      return
    }

      // Проверяем, является ли текущий элемент частью активной цепочки Revision
      const elementId = currentElement.element_id
      const isInRevisionChain = Object.values(revisionResults).some(result => 
        result && result.has_mistakes && result.revision_chain && result.revision_chain.some(item => {
          // Извлекаем element_id из структуры {element_id: {element_data: {...}}}
          const itemElementId = Object.keys(item)[0]
          return itemElementId === elementId
        })
      )

    if (isInRevisionChain) {
      console.log(`Resetting state in useEffect for revision chain element: ${elementId}, type: ${currentElement.type}`)
      
      // Увеличиваем счетчик revision для принудительного пересоздания компонента
      setRevisionCounter(prev => {
        const updated = { ...prev }
        updated[elementId] = (updated[elementId] || 0) + 1
        console.log(`Increased revision counter in useEffect for ${elementId} to ${updated[elementId]}`)
        return updated
      })
      
      // Сбрасываем состояние для этого элемента ПЕРЕД показом
      if (currentElement.type === 'quiz') {
        setQuizStates(prev => {
          const updated = { ...prev }
          if (updated[elementId]) {
            console.log(`Reset quiz state in useEffect for ${elementId}, prev state:`, updated[elementId])
            delete updated[elementId]
          }
          return updated
        })
      } else if (currentElement.type === 'input') {
        setInputStates(prev => {
          const updated = { ...prev }
          if (updated[elementId]) {
            console.log(`Reset input state in useEffect for ${elementId}, prev state:`, updated[elementId])
            delete updated[elementId]
          }
          return updated
        })
      } else if (currentElement.type === 'multi_choice') {
        setMultiChoiceStates(prev => {
          const updated = { ...prev }
          if (updated[elementId]) {
            console.log(`Reset multi_choice state in useEffect for ${elementId}, prev state:`, updated[elementId])
            delete updated[elementId]
          }
          return updated
        })
      } else if (currentElement.type === 'question') {
        setQuestionStates(prev => {
          const updated = { ...prev }
          if (updated[elementId]) {
            console.log(`Reset question state in useEffect for ${elementId}, prev state:`, updated[elementId])
            delete updated[elementId]
          }
          return updated
        })
      }
    }
  }, [currentElement?.element_id, revisionResults])

  const loadCourse = async () => {
    try {
      setLoading(true)
      setError(null)

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      console.log("Loading course:", courseId, "API URL:", apiUrl);

      console.log("Checking course existence...");
      // Проверяем существование курса
      const checkResponse = await fetch(`${apiUrl}/api/mvp/courses/${courseId}`, {
        credentials: 'include',
      })
      console.log("Check response status:", checkResponse.status)
      if (!checkResponse.ok) {
        if (checkResponse.status === 404) {
          setCourseExists(false)
          setLoading(false)
          return
        }
        const errorText = await checkResponse.text()
        throw new Error(`Ошибка при проверке курса: ${checkResponse.status} - ${errorText}`)
      }
      const checkData = await checkResponse.json()
      console.log('Course exists:', checkData)
      setCourseExists(true)

      // Начинаем курс (создаем сессию, если её нет)
      console.log("Starting course...");
      const startResponse = await fetch(`${apiUrl}/api/mvp/courses/${courseId}/start`, {
        method: "POST",
        credentials: "include",
      });
      console.log("Start response status:", startResponse.status);
      if (!startResponse.ok) {
        const errorText = await startResponse.text();
        console.error("Start course error:", errorText);
        throw new Error(`Ошибка при запуске курса: ${startResponse.status} - ${errorText}`);
      }
      const startData = await startResponse.json();
      console.log("Course started:", startData);

      // Получаем текущий элемент
      console.log("Getting current element...")
      const currentResponse = await fetch(
        `${apiUrl}/api/mvp/courses/${courseId}/current`,
        {
          credentials: 'include',
        }
      )

      console.log("Current response status:", currentResponse.status)
      if (!currentResponse.ok) {
        const errorText = await currentResponse.text()
        console.error("Get current error:", errorText)
        throw new Error(`Ошибка при загрузке элемента: ${currentResponse.status} - ${errorText}`)
      }

      const currentElement = await currentResponse.json()
      console.log("Current element:", currentElement)
      console.log("Current element keys:", Object.keys(currentElement))
      console.log("Current element has 'type':", 'type' in currentElement)
      if ('type' in currentElement) {
        console.log("Current element type:", currentElement.type)
        if (currentElement.type === 'audio') {
          console.log("Current element is audio:", currentElement.element_id)
          console.log("Audio media:", currentElement.media)
        } else if (currentElement.type === 'quiz') {
          console.log("Current element is quiz:", currentElement.element_id)
          console.log("Quiz answers:", currentElement.answers)
        }
      } else {
        console.log("Current element options:", currentElement.options)
      }
      setCurrentElement(currentElement)
      // Добавляем первый элемент в чат
      if (currentElement) {
        setMessages([currentElement])
      }
    } catch (err) {
      console.error('Ошибка загрузки курса:', err)
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка'
      // Проверяем, не проблема ли это с подключением
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        setError('Не удалось подключиться к серверу. Убедитесь, что backend запущен на http://localhost:8000')
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleNext = async () => {
    try {
      // Очищаем таймер автоматического перехода
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer)
        setAutoAdvanceTimer(null)
      }

      setLoading(true)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(
        `${apiUrl}/api/mvp/courses/${courseId}/next`,
        {
          method: 'POST',
          credentials: 'include',
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Ошибка: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log("Next element data:", data)
      console.log("Next element keys:", Object.keys(data))
      console.log("Next element has 'type':", 'type' in data)
      if ('type' in data) {
        console.log("Next element type:", data.type)
        if (data.type === 'audio') {
          console.log("Next element is audio:", data.element_id)
          console.log("Audio media:", data.media)
        }
      }

      if (data.completed) {
        // Курс завершен
        setIsCompleted(true)
        setCurrentElement(null)
        setError(null)
        return
      }

      // Добавляем новый элемент в чат
      setMessages(prev => [...prev, data])
      
      // Если элемент из цепочки Revision, сбрасываем его состояние ПЕРЕД установкой currentElement
      // Проверяем, есть ли активная цепочка Revision (по наличию revisionResults)
      if ('element_id' in data) {
        const elementId = data.element_id
        const isInRevisionChain = Object.values(revisionResults).some(result => 
          result && result.has_mistakes && result.revision_chain && result.revision_chain.some(item => {
            // Извлекаем element_id из структуры {element_id: {element_data: {...}}}
            const itemElementId = Object.keys(item)[0]
            return itemElementId === elementId
          })
        )
        
        if (isInRevisionChain) {
          console.log(`Resetting state in handleNext for revision chain element: ${elementId}, type: ${data.type}`)
          
          // Увеличиваем счетчик revision для принудительного пересоздания компонента
          setRevisionCounter(prev => {
            const updated = { ...prev }
            updated[elementId] = (updated[elementId] || 0) + 1
            console.log(`Increased revision counter for ${elementId} to ${updated[elementId]}`)
            return updated
          })
          
          // Сбрасываем состояние для этого элемента
          if (data.type === 'quiz') {
            setQuizStates(prev => {
              const updated = { ...prev }
              if (updated[elementId]) {
                console.log(`Reset quiz state in handleNext for ${elementId}, prev state:`, updated[elementId])
                delete updated[elementId]
              }
              return updated
            })
          } else if (data.type === 'input') {
            setInputStates(prev => {
              const updated = { ...prev }
              if (updated[elementId]) {
                console.log(`Reset input state in handleNext for ${elementId}, prev state:`, updated[elementId])
                delete updated[elementId]
              }
              return updated
            })
          } else if (data.type === 'multi_choice') {
            setMultiChoiceStates(prev => {
              const updated = { ...prev }
              if (updated[elementId]) {
                console.log(`Reset multi_choice state in handleNext for ${elementId}, prev state:`, updated[elementId])
                delete updated[elementId]
              }
              return updated
            })
          } else if (data.type === 'question') {
            setQuestionStates(prev => {
              const updated = { ...prev }
              if (updated[elementId]) {
                console.log(`Reset question state in handleNext for ${elementId}, prev state:`, updated[elementId])
                delete updated[elementId]
              }
              return updated
            })
          }
        }
      }
      
      setCurrentElement(data)
    } catch (err) {
      console.error('Ошибка перехода к следующему элементу:', err)
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка'
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        setError('Не удалось подключиться к серверу. Убедитесь, что backend запущен на http://localhost:8000')
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  // Обработка ответа на multi_choice
  const handleMultiChoiceAnswer = async (elementId: string, selectedIndices: number[]) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(
        `${apiUrl}/api/mvp/courses/${courseId}/multichoice/answer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            element_id: elementId,
            selected_answer_indices: selectedIndices,
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Ошибка: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      
      // Обновляем состояние multi_choice
      setMultiChoiceStates(prev => ({
        ...prev,
        [elementId]: {
          selectedAnswers: selectedIndices,
          feedback: result.feedback,
          individualFeedbacks: result.individual_feedbacks,
          isCorrect: result.is_correct,
          score: result.score,
          showFeedback: true,
        }
      }))

      // Автоматически переходим к следующему элементу через 3 секунды после показа feedback
      setTimeout(() => {
        handleNext()
      }, 3000)
    } catch (err) {
      console.error('Ошибка отправки ответа на multi_choice:', err)
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка'
      setError(errorMessage)
    }
  }

  // Обработка ответа на question
  const handleQuestionAnswer = async (elementId: string, answerIndex: number) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(
        `${apiUrl}/api/mvp/courses/${courseId}/question/answer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            element_id: elementId,
            selected_answer_index: answerIndex,
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Ошибка: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      
      // Обновляем состояние question
      setQuestionStates(prev => ({
        ...prev,
        [elementId]: {
          selectedAnswer: answerIndex,
          feedback: result.feedback,
          showFeedback: true,
        }
      }))

      // Автоматически переходим к следующему элементу через 2 секунды после показа feedback
      setTimeout(() => {
        handleNext()
      }, 2000)
    } catch (err) {
      console.error('Ошибка отправки ответа на question:', err)
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка'
      setError(errorMessage)
    }
  }

  // Обработка ответа на input
  const handleInputAnswer = async (elementId: string, userAnswer: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(
        `${apiUrl}/api/mvp/courses/${courseId}/input/answer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            element_id: elementId,
            user_answer: userAnswer,
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Ошибка: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      
      // Обновляем состояние input
      setInputStates(prev => ({
        ...prev,
        [elementId]: {
          submittedAnswer: userAnswer,
          feedback: result.feedback,
          isCorrect: result.is_correct,
          showFeedback: true,
        }
      }))

      // Автоматически переходим к следующему элементу через 2 секунды после показа feedback
      setTimeout(() => {
        handleNext()
      }, 2000)
    } catch (err) {
      console.error('Ошибка отправки ответа на input:', err)
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка'
      setError(errorMessage)
    }
  }

  // Обработка ответа на quiz
  const handleQuizAnswer = async (elementId: string, answerIndex: number) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(
        `${apiUrl}/api/mvp/courses/${courseId}/quiz/answer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            element_id: elementId,
            selected_answer_index: answerIndex,
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Ошибка: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      
      // Обновляем состояние quiz для показа feedback
      setQuizStates(prev => ({
        ...prev,
        [elementId]: {
          selectedAnswer: answerIndex,
          feedback: result.feedback,
          isCorrect: result.is_correct,
          showFeedback: true,
        }
      }))

      // Автоматически переходим к следующему элементу через 2 секунды после показа feedback
      setTimeout(() => {
        handleNext()
      }, 2000)
    } catch (err) {
      console.error('Ошибка отправки ответа на quiz:', err)
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка'
      setError(errorMessage)
    }
  }

  // Загрузка результата Test элемента
  useEffect(() => {
    if (currentElement && 'type' in currentElement && currentElement.type === 'test') {
      const testElement = currentElement as TestElement
      const elementId = testElement.element_id
      
      // Если результат уже загружен, не загружаем снова
      if (testResults[elementId] || testLoading[elementId]) {
        return
      }
      
      // Загружаем результат
      setTestLoading(prev => ({ ...prev, [elementId]: true }))
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      fetch(
        `${apiUrl}/api/mvp/courses/${courseId}/test/result/${elementId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      )
        .then(response => {
          if (!response.ok) {
            throw new Error(`Ошибка: ${response.status}`)
          }
          return response.json()
        })
        .then((result: TestResult) => {
          setTestResults(prev => ({ ...prev, [elementId]: result }))
          setTestLoading(prev => ({ ...prev, [elementId]: false }))
        })
        .catch(err => {
          console.error('Ошибка загрузки результата Test:', err)
          setTestLoading(prev => ({ ...prev, [elementId]: false }))
          setError(err instanceof Error ? err.message : 'Произошла ошибка')
        })
    }
  }, [currentElement?.element_id, courseId, testResults, testLoading])

  // Загрузка результата Revision элемента
  useEffect(() => {
    if (currentElement && 'type' in currentElement && currentElement.type === 'revision') {
      const revisionElement = currentElement as RevisionElement
      const elementId = revisionElement.element_id
      
      // Если результат уже загружен, не загружаем снова
      if (revisionResults[elementId] || revisionLoading[elementId]) {
        return
      }
      
      // Загружаем результат
      setRevisionLoading(prev => ({ ...prev, [elementId]: true }))
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      fetch(
        `${apiUrl}/api/mvp/courses/${courseId}/revision/result/${elementId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      )
        .then(response => {
          if (!response.ok) {
            throw new Error(`Ошибка: ${response.status}`)
          }
          return response.json()
        })
        .then((result: RevisionResult) => {
          setRevisionResults(prev => ({ ...prev, [elementId]: result }))
          setRevisionLoading(prev => ({ ...prev, [elementId]: false }))
        })
        .catch(err => {
          console.error('Ошибка загрузки результата Revision:', err)
          setRevisionLoading(prev => ({ ...prev, [elementId]: false }))
          setError(err instanceof Error ? err.message : 'Произошла ошибка')
        })
    }
  }, [currentElement?.element_id, courseId, revisionResults, revisionLoading])

  // Автоматический переход для сообщений без кнопки и без inline кнопок, а также для audio элементов
  useEffect(() => {
    if (currentElement && 'type' in currentElement) {
      if (currentElement.type === 'quiz' || currentElement.type === 'input' || currentElement.type === 'question' || currentElement.type === 'multi_choice' || currentElement.type === 'unimplemented' || currentElement.type === 'test' || currentElement.type === 'end' || currentElement.type === 'revision') {
        // Для quiz, input, question, multi_choice, unimplemented, test, end и revision элементов не используем автоматический переход
        return
      }
      if (currentElement.type === 'audio') {
        // Для audio элементов автоматически переходим к следующему через 3 секунды
        const timer = setTimeout(() => {
          handleNext()
        }, 3000) // 3 секунды для прослушивания
        setAutoAdvanceTimer(timer)
        return () => {
          if (timer) clearTimeout(timer)
        }
      }
    }
    if (currentElement && !('type' in currentElement) && !currentElement.button && !currentElement.options && !loading && !isCompleted) {
      const timer = setTimeout(() => {
        handleNext()
      }, 2500) // 2.5 секунды
      setAutoAdvanceTimer(timer)
      return () => {
        if (timer) clearTimeout(timer)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentElement?.element_id, loading, isCompleted])

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer)
      }
    }
  }, [autoAdvanceTimer])

  if (loading && courseExists === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка курса...</p>
        </div>
      </div>
    )
  }

  if (courseExists === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Курс не найден
          </h1>
          <p className="text-gray-600 mb-6">
            Для доступа к курсу необходим специальный URL.
            Обратитесь к организатору курса для получения ссылки.
          </p>
        </div>
      </div>
    )
  }

  if (error && messages.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Ошибка</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={loadCourse}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Область чата */}
      <div className="flex-1 overflow-hidden min-h-0">
        <ChatView 
          messages={messages}
          courseId={courseId}
          onNext={handleNext}
          onInlineButtonClick={(option) => {
            // Обработка нажатия на inline кнопку
            // Пока просто переходим к следующему элементу (как got_it)
            // В будущем можно добавить поддержку goto и wait
            handleNext()
          }}
          onQuizAnswer={handleQuizAnswer}
          quizStates={quizStates}
          onInputAnswer={handleInputAnswer}
          inputStates={inputStates}
          onQuestionAnswer={handleQuestionAnswer}
          questionStates={questionStates}
          onMultiChoiceAnswer={handleMultiChoiceAnswer}
          multiChoiceStates={multiChoiceStates}
          testResults={testResults}
          testLoading={testLoading}
          revisionResults={revisionResults}
          revisionLoading={revisionLoading}
          revisionCounter={revisionCounter}
          onStartRevision={async (elementId) => {
            try {
              setLoading(true)
              
              // Получаем цепочку повторения из revisionResults
              const revisionResult = revisionResults[elementId]
              console.log(`onStartRevision: elementId=${elementId}, revisionResult:`, revisionResult)
              if (revisionResult && revisionResult.revision_chain) {
                // Извлекаем element_id из структуры {element_id: {element_data: {...}}}
                const elementIds = revisionResult.revision_chain.map(item => Object.keys(item)[0])
                console.log(`onStartRevision: revision_chain elements:`, elementIds)
                // Увеличиваем счетчик revision для принудительного пересоздания компонентов
                setRevisionCounter(prev => {
                  const updated = { ...prev }
                  elementIds.forEach(elementId => {
                    const oldValue = updated[elementId] || 0
                    updated[elementId] = oldValue + 1
                    console.log(`Increased revision counter for ${elementId} from ${oldValue} to ${updated[elementId]}`)
                  })
                  console.log(`Updated revisionCounter:`, updated)
                  return updated
                })
                
                // Сбрасываем состояние для всех элементов из цепочки повторения
                const elementIdsToReset = elementIds
                console.log(`Resetting states for revision chain elements:`, elementIdsToReset)
                
                // Очищаем состояние quiz
                setQuizStates(prev => {
                  const updated = { ...prev }
                  let resetCount = 0
                  elementIdsToReset.forEach(id => {
                    if (updated[id]) {
                      console.log(`Resetting quiz state for ${id}, current state:`, updated[id])
                      delete updated[id]
                      resetCount++
                    }
                  })
                  console.log(`Reset ${resetCount} quiz states`)
                  return updated
                })
                
                // Очищаем состояние input
                setInputStates(prev => {
                  const updated = { ...prev }
                  let resetCount = 0
                  elementIdsToReset.forEach(id => {
                    if (updated[id]) {
                      console.log(`Resetting input state for ${id}, current state:`, updated[id])
                      delete updated[id]
                      resetCount++
                    }
                  })
                  console.log(`Reset ${resetCount} input states`)
                  return updated
                })
                
                // Очищаем состояние multi_choice
                setMultiChoiceStates(prev => {
                  const updated = { ...prev }
                  let resetCount = 0
                  elementIdsToReset.forEach(id => {
                    if (updated[id]) {
                      console.log(`Resetting multi_choice state for ${id}, current state:`, updated[id])
                      delete updated[id]
                      resetCount++
                    }
                  })
                  console.log(`Reset ${resetCount} multi_choice states`)
                  return updated
                })
                
                // Очищаем состояние question
                setQuestionStates(prev => {
                  const updated = { ...prev }
                  let resetCount = 0
                  elementIdsToReset.forEach(id => {
                    if (updated[id]) {
                      console.log(`Resetting question state for ${id}, current state:`, updated[id])
                      delete updated[id]
                      resetCount++
                    }
                  })
                  console.log(`Reset ${resetCount} question states`)
                  return updated
                })
              }
              
              const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
              const response = await fetch(
                `${apiUrl}/api/mvp/courses/${courseId}/revision/start/${elementId}`,
                {
                  method: 'POST',
                  credentials: 'include',
                }
              )

              if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`Ошибка: ${response.status} - ${errorText}`)
              }

              const data = await response.json()
              console.log("Revision start element data:", data)

              // Сбрасываем состояние для первого элемента из цепочки ПЕРЕД добавлением в чат
              if ('element_id' in data) {
                const elementId = data.element_id
                console.log(`Resetting state for first revision element: ${elementId}, type: ${data.type}`)
                
                // Увеличиваем счетчик revision для принудительного пересоздания компонента
                setRevisionCounter(prev => {
                  const updated = { ...prev }
                  updated[elementId] = (updated[elementId] || 0) + 1
                  console.log(`Increased revision counter for ${elementId} to ${updated[elementId]}`)
                  return updated
                })
                
                // Сбрасываем состояние
                if (data.type === 'quiz') {
                  setQuizStates(prev => {
                    const updated = { ...prev }
                    if (updated[elementId]) {
                      console.log(`Reset quiz state for first revision element ${elementId}, prev state:`, updated[elementId])
                      delete updated[elementId]
                    }
                    return updated
                  })
                } else if (data.type === 'input') {
                  setInputStates(prev => {
                    const updated = { ...prev }
                    if (updated[elementId]) {
                      console.log(`Reset input state for first revision element ${elementId}, prev state:`, updated[elementId])
                      delete updated[elementId]
                    }
                    return updated
                  })
                } else if (data.type === 'multi_choice') {
                  setMultiChoiceStates(prev => {
                    const updated = { ...prev }
                    if (updated[elementId]) {
                      console.log(`Reset multi_choice state for first revision element ${elementId}, prev state:`, updated[elementId])
                      delete updated[elementId]
                    }
                    return updated
                  })
                } else if (data.type === 'question') {
                  setQuestionStates(prev => {
                    const updated = { ...prev }
                    if (updated[elementId]) {
                      console.log(`Reset question state for first revision element ${elementId}, prev state:`, updated[elementId])
                      delete updated[elementId]
                    }
                    return updated
                  })
                }
              }
              
              // Добавляем новый элемент в чат
              setMessages(prev => [...prev, data])
              setCurrentElement(data)
            } catch (err) {
              console.error('Ошибка начала повторения:', err)
              const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка'
              setError(errorMessage)
            } finally {
              setLoading(false)
            }
          }}
        />
      </div>

      {/* Фиксированная кнопка внизу (только если нет inline кнопок и не quiz/input/question/multi_choice/end/revision) */}
      {!isCompleted && currentElement && !loading && 
        ((!('type' in currentElement) && currentElement.button && !currentElement.options) ||
         ('type' in currentElement && (currentElement.type === 'unimplemented' || currentElement.type === 'test' || currentElement.type === 'revision') && currentElement.button)) &&
        !('type' in currentElement && (currentElement.type === 'end')) && (
        <div className="bg-white border-t border-gray-200 px-4 py-4 sticky bottom-0">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={handleNext}
              disabled={loading || ('type' in currentElement && currentElement.type === 'end')}
              className="w-full px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium transition-colors shadow-md"
            >
              {loading ? 'Загрузка...' : (
                ('type' in currentElement && (currentElement.type === 'unimplemented' || currentElement.type === 'test' || currentElement.type === 'revision' || currentElement.type === 'end'))
                  ? (currentElement.type === 'end' ? 'Курс завершен' : (currentElement.button || 'Продолжить'))
                  : currentElement.button
              )}
            </button>
          </div>
        </div>
      )}

      {/* Сообщение о завершении курса */}
      {isCompleted && (
        <div className="bg-white border-t border-gray-200 px-4 py-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-green-600 mb-2">
              🎉 Курс завершен!
            </h2>
            <p className="text-gray-600">
              Поздравляем! Вы успешно прошли весь курс.
            </p>
          </div>
        </div>
      )}

      {/* Индикатор автоматического перехода */}
            {!isCompleted && currentElement && !loading && 
              (('type' in currentElement && currentElement.type === 'audio') ||
               (!('type' in currentElement) && !currentElement.button && !currentElement.options)) && (
                <div className="bg-white border-t border-gray-200 px-4 py-2">
                  <div className="max-w-3xl mx-auto text-center">
                    <p className="text-gray-500 text-sm">
                      Автоматический переход через несколько секунд...
                    </p>
                  </div>
                </div>
              )}
    </div>
  )
}
