'use client'

import { LessonStep, ChatStepContent, ChatMessage } from '@/lib/types/types'
import { useState, useEffect, useRef } from 'react'
import { chatApi } from '@/lib/api/chat'
import { stepsApi } from '@/lib/api/steps'

interface ChatStepProps {
  step: LessonStep
}

export function ChatStep({ step }: ChatStepProps) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [typing, setTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const content = step.content as ChatStepContent

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const existingSession = await chatApi.getSession(step.step_id)
        if (existingSession) {
          setSessionId(existingSession.session_id)
          const existingMessages = await chatApi.getMessages(existingSession.session_id)
          setMessages(existingMessages)
        } else {
          const newSession = await chatApi.createSession(step.step_id)
          setSessionId(newSession.session_id)
          // Добавляем начальное сообщение
          setMessages([
            {
              message_id: 'initial',
              session_id: newSession.session_id,
              role: 'assistant',
              content: content.initial_message,
              created_at: new Date().toISOString(),
              status: 'sent',
            },
          ])
        }
      } catch (error) {
        console.error('Ошибка инициализации сессии:', error)
      }
    }

    initializeSession()
  }, [step.step_id, content.initial_message])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!inputValue.trim() || !sessionId || loading) return

    const userMessage: ChatMessage = {
      message_id: `temp-${Date.now()}`,
      session_id: sessionId,
      role: 'user',
      content: inputValue,
      created_at: new Date().toISOString(),
      status: 'pending',
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setLoading(true)
    setTyping(true)

    try {
      const assistantMessage = await chatApi.sendMessage(sessionId, inputValue)
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.message_id === userMessage.message_id
            ? { ...msg, status: 'error' }
            : msg
        )
      )
    } finally {
      setLoading(false)
      setTyping(false)
    }
  }

  const handleComplete = async () => {
    if (!sessionId) return

    setLoading(true)
    try {
      await chatApi.completeSession(sessionId)
      await stepsApi.completeStep(step.step_id)
    } catch (error) {
      console.error('Ошибка завершения сессии:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto h-[600px] flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.message_id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[70%] p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-gray-200 p-3 rounded-lg">
              <span className="animate-pulse">Печатает...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Введите сообщение..."
            disabled={loading || !sessionId}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
          />
          <button
            onClick={handleSend}
            disabled={loading || !inputValue.trim() || !sessionId}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Отправить
          </button>
          <button
            onClick={handleComplete}
            disabled={loading || !sessionId}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
          >
            Завершить
          </button>
        </div>
      </div>
    </div>
  )
}

