'use client'

import { useEffect, useRef } from 'react'

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

interface TelegramLoginProps {
  botName: string
  onAuth: (user: TelegramUser) => void
  onError?: (error: string) => void
}

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramUser) => void
  }
}

export function TelegramLogin({ botName, onAuth, onError }: TelegramLoginProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Очистка предыдущего виджета
    if (containerRef.current) {
      containerRef.current.innerHTML = ''
    }

    // Получаем текущий домен для диагностики
    const currentDomain = typeof window !== 'undefined' ? window.location.hostname : ''
    console.log('Telegram Login Widget - Current domain:', currentDomain)
    console.log('Telegram Login Widget - Bot name:', botName)

    // Загрузка Telegram Login Widget script
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', botName)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-userpic', 'true')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    
    // Добавляем обработчик ошибок загрузки скрипта
    script.onerror = () => {
      onError?.('Не удалось загрузить Telegram Login Widget')
    }
    
    // Обработчик успешной загрузки скрипта
    script.onload = () => {
      console.log('Telegram Login Widget script loaded successfully')
      // Проверяем, появился ли виджет через небольшую задержку
      setTimeout(() => {
        if (containerRef.current && containerRef.current.children.length === 0) {
          console.warn('Telegram Login Widget не отобразился. Возможно, домен не настроен в BotFather.')
          onError?.('Bot domain invalid: Домен не настроен в BotFather. Добавьте домен ' + currentDomain + ' в настройки бота @' + botName)
        }
      }, 2000)
    }
    
    // Глобальная функция для callback
    window.onTelegramAuth = (user: TelegramUser) => {
      try {
        console.log('Telegram auth callback received:', user)
        onAuth(user)
      } catch (error) {
        console.error('Error in Telegram auth callback:', error)
        onError?.(error instanceof Error ? error.message : 'Unknown error')
      }
    }

    if (containerRef.current) {
      containerRef.current.appendChild(script)
    }

    return () => {
      // Cleanup
      if (window.onTelegramAuth) {
        delete window.onTelegramAuth
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [botName, onAuth, onError])

  return <div ref={containerRef} />
}
