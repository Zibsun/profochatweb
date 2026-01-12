import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`p-6 border border-gray-300 rounded-lg ${className}`}>
      {children}
    </div>
  )
}

