'use client'

import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { dialogApi } from '@/lib/api/dialog'

interface DialogElement {
  element_id: string
  type: "dialog"
  text: string
  prompt: string
  model?: string
  temperature?: number
  reasoning?: string
  parse_mode?: string
  auto_start?: boolean
  conversation?: Array<{role: string, content: string}>
}

interface DialogViewProps {
  element: DialogElement
  courseId: string
  onNext?: () => void
}

export default function DialogView({ element, courseId, onNext }: DialogViewProps) {
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [typing, setTyping] = useState(false)
  const [dialogCompleted, setDialogCompleted] = useState(false) // Флаг завершения диалога
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const autoStartTriggered = useRef(false)
  // Инициализация только при первой загрузке элемента
  const initializedRef = useRef<string | null>(null)
  
  useEffect(() => {
    // Инициализируем только если это новый элемент
    if (initializedRef.current === element.element_id) {
      console.log('DialogView: Element already initialized, skipping', { elementId: element.element_id })
      return
    }
    
    console.log('DialogView: useEffect triggered - INITIALIZATION', { 
      elementId: element.element_id,
      elementText: element.text,
      elementKeys: Object.keys(element),
      fullElement: element
    })
    
    // Инициализация: добавляем начальное сообщение
    // Если text пустой, не добавляем начальное сообщение или используем placeholder
    const initialMessages: Array<{role: string, content: string}> = []
    
    if (element.text && element.text.trim()) {
      initialMessages.push({ role: "assistant", content: element.text })
    }
    
    // Добавляем существующую историю если есть
    if (element.conversation && element.conversation.length > 0) {
      // Пропускаем system message, добавляем остальные
      const history = element.conversation.filter(msg => msg.role !== "system")
      initialMessages.push(...history)
    }
    
    // Если нет ни начального сообщения, ни истории, добавляем placeholder
    if (initialMessages.length === 0) {
      initialMessages.push({ role: "assistant", content: "Начните диалог..." })
    }
    
    console.log('DialogView: Initializing messages', { 
      elementId: element.element_id, 
      initialMessagesCount: initialMessages.length,
      conversationLength: element.conversation?.length || 0,
      initialMessages: initialMessages,
      elementText: element.text
    })
    
             setMessages(initialMessages)
             initializedRef.current = element.element_id
             autoStartTriggered.current = false // Сбрасываем флаг при смене элемента
             setDialogCompleted(false) // Сбрасываем флаг завершения при смене элемента
    
    // Auto-start: автоматически отправляем первое сообщение
    if (element.auto_start && !autoStartTriggered.current) {
      autoStartTriggered.current = true
      // Небольшая задержка для отображения начального сообщения
      setTimeout(() => {
        handleAutoStart()
      }, 500)
    }
  }, [element.element_id]) // Зависимость только от element_id, чтобы не перезапускать при каждом обновлении
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  const handleAutoStart = async () => {
    setLoading(true)
    setTyping(true)
    
    try {
      console.log('DialogView: Auto-start triggered', { elementId: element.element_id })
      const response = await dialogApi.sendMessage(courseId, element.element_id, "")
      console.log('DialogView: Auto-start response', { reply: response.reply, stop: response.stop })
      
      // Если ответ пустой, не добавляем его в сообщения
      if (response.reply && response.reply.trim() !== "") {
        setMessages(prev => {
          const updated = [...prev, { role: "assistant", content: response.reply }]
          console.log('DialogView: Updated messages after auto-start', { count: updated.length, messages: updated })
          return updated
        })
      } else {
        console.log('DialogView: Auto-start reply is empty, not adding to messages', { stop: response.stop })
      }
      
      if (response.stop) {
        // Диалог завершен - отключаем поле ввода
        setDialogCompleted(true)
        setInputValue('') // Очищаем поле ввода
        
        if (onNext) {
          // Если ответ пустой, переходим сразу, иначе даем время на отображение
          const delay = (response.reply && response.reply.trim() !== "") ? 1000 : 0
          setTimeout(() => onNext(), delay)
        }
      }
    } catch (error) {
      console.error('Ошибка auto-start:', error)
    } finally {
      setLoading(false)
      setTyping(false)
    }
  }
  
  const handleSend = async () => {
    // Блокируем отправку если диалог завершен или идет загрузка
    if (!inputValue.trim() || loading || dialogCompleted) {
      console.log('DialogView: handleSend blocked', { inputValue: inputValue.trim(), loading, dialogCompleted })
      return
    }
    
    const userMessage = { role: "user", content: inputValue.trim() }
    const messageToSend = inputValue.trim()
    console.log('DialogView: Sending message', { message: messageToSend, elementId: element.element_id, currentMessagesCount: messages.length })
    
    // Сохраняем текущее состояние сообщений перед отправкой
    const currentMessages = [...messages]
    
    // Добавляем сообщение пользователя сразу
    setMessages(prev => {
      const updated = [...prev, userMessage]
      console.log('DialogView: Updated messages after user input', { 
        beforeCount: prev.length, 
        afterCount: updated.length,
        lastMessage: updated[updated.length - 1]
      })
      return updated
    })
    
    const savedInputValue = inputValue.trim()
    setInputValue('')
    setLoading(true)
    setTyping(true)
    
    try {
      const response = await dialogApi.sendMessage(courseId, element.element_id, messageToSend)
      console.log('DialogView: Received response', { 
        reply: response.reply, 
        stop: response.stop,
        replyLength: response.reply?.length,
        currentMessagesCount: messages.length
      })
      
      // Используем функциональное обновление для гарантии правильного состояния
      setMessages(prev => {
        // Проверяем, что сообщение пользователя уже добавлено
        const userMessageExists = prev.some(m => 
          m.role === 'user' && m.content === savedInputValue
        )
        
        if (!userMessageExists) {
          console.warn('DialogView: User message missing, adding it', { savedInputValue })
          prev = [...prev, userMessage]
        }
        
        // Если ответ пустой (например, после удаления маркера #конецдиалога), не добавляем его
        if (response.reply && response.reply.trim() !== "") {
          const updated = [...prev, { role: "assistant", content: response.reply }]
          console.log('DialogView: Updated messages after assistant reply', { 
            beforeCount: prev.length,
            afterCount: updated.length,
            lastMessages: updated.slice(-2)
          })
          return updated
        } else {
          // Ответ пустой, не добавляем его в сообщения
          console.log('DialogView: Reply is empty, not adding to messages', { 
            stop: response.stop,
            replyLength: response.reply?.length
          })
          return prev
        }
      })
      
      if (response.stop) {
        // Диалог завершен - отключаем поле ввода
        setDialogCompleted(true)
        setInputValue('') // Очищаем поле ввода
        
        if (onNext) {
          // Переходим к следующему элементу
          // Если ответ пустой, переходим сразу, иначе даем время на отображение финального сообщения
          const delay = (response.reply && response.reply.trim() !== "") ? 1500 : 0
          setTimeout(() => {
            onNext()
          }, delay)
        }
      }
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error)
      // Восстанавливаем состояние при ошибке
      setMessages(prev => {
        // Удаляем только последнее сообщение пользователя, если оно есть
        const lastIndex = prev.length - 1
        if (lastIndex >= 0 && prev[lastIndex].role === 'user' && prev[lastIndex].content === savedInputValue) {
          const updated = prev.slice(0, -1)
          console.log('DialogView: Removed user message due to error', { 
            beforeCount: prev.length,
            afterCount: updated.length 
          })
          return updated
        }
        console.log('DialogView: User message not found to remove', { prev })
        return prev
      })
      // Восстанавливаем значение input
      setInputValue(savedInputValue)
    } finally {
      setLoading(false)
      setTyping(false)
    }
  }
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }
  
  console.log('DialogView: Rendering', { 
    messagesCount: messages.length, 
    messages: messages.map(m => ({ role: m.role, contentLength: m.content?.length, contentPreview: m.content?.substring(0, 50) })),
    elementId: element.element_id,
    elementText: element.text,
    messagesArray: messages
  })
  
  return (
    <div className="flex flex-col w-full bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex-1 p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            Нет сообщений. Начните диалог.
          </div>
        ) : (
          <>
            {console.log('DialogView: About to map messages', { messagesCount: messages.length, messages })}
            {messages
              .filter(message => message.content && message.content.trim() !== '') // Фильтруем пустые сообщения
              .map((message, index) => {
              const safeContent = message.content || ''
              const messageKey = `msg-${index}-${message.role}-${Date.now()}-${index}`
              console.log('DialogView: Rendering message', { 
                index, 
                role: message.role, 
                contentLength: safeContent.length,
                content: safeContent.substring(0, 50), 
                key: messageKey,
                fullMessage: message
              })
              return (
                <div
                  key={messageKey}
                  className={`flex w-full mb-2 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                  style={{ display: 'flex' }}
                >
                  <div
                    className={`max-w-[70%] p-3 rounded-lg break-words overflow-wrap-anywhere ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-gray-200 text-gray-800 rounded-bl-sm'
                    }`}
                    style={{ 
                      minWidth: '100px', 
                      display: 'block',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                      wordBreak: 'break-word'
                    }}
                  >
                    {message.role === 'assistant' ? (
                      <div className="text-sm leading-relaxed text-gray-800 break-words" style={{ wordWrap: 'break-word', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                        <ReactMarkdown
                          components={{
                            p: ({node, ...props}) => <p className="mb-2 last:mb-0 text-gray-800 break-words" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }} {...props} />,
                            h1: ({node, ...props}) => <h1 className="text-lg font-bold mb-2 text-gray-900 break-words" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }} {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-base font-bold mb-2 text-gray-900 break-words" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }} {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-sm font-bold mb-2 text-gray-900 break-words" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }} {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 text-gray-800 break-words" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }} {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 text-gray-800 break-words" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }} {...props} />,
                            li: ({node, ...props}) => <li className="mb-1 text-gray-800 break-words" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }} {...props} />,
                            code: ({node, ...props}) => <code className="bg-gray-300 px-1 py-0.5 rounded text-xs text-gray-900" {...props} />,
                            pre: ({node, ...props}) => <pre className="bg-gray-300 p-2 rounded mb-2 overflow-x-auto text-xs text-gray-900" {...props} />,
                            a: ({node, ...props}) => (
                              <a 
                                {...props} 
                                className="text-blue-600 underline hover:text-blue-800"
                                target="_blank"
                                rel="noopener noreferrer"
                              />
                            ),
                            strong: ({node, ...props}) => <strong className="text-gray-900 font-semibold" {...props} />,
                            em: ({node, ...props}) => <em className="text-gray-800 italic" {...props} />,
                          }}
                        >
                          {safeContent}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap text-white break-words" style={{ wordWrap: 'break-word', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{safeContent}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </>
        )}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-gray-200 p-3 rounded-lg rounded-bl-sm">
              <span className="animate-pulse text-gray-600">Печатает...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {!dialogCompleted && (
        <div className="border-t border-gray-300 p-4 bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => {
                console.log('DialogView: Input changed', { value: e.target.value })
                setInputValue(e.target.value)
              }}
              onKeyPress={(e) => {
                console.log('DialogView: Key pressed', { key: e.key, inputValue })
                handleKeyPress(e)
              }}
              placeholder="Введите сообщение..."
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 bg-white placeholder-gray-400"
              style={{ color: '#111827' }}
            />
            <button
              onClick={() => {
                console.log('DialogView: Send button clicked', { inputValue, loading, dialogCompleted })
                handleSend()
              }}
              disabled={loading || !inputValue.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Отправить
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
