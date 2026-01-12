'use client'

import Link from 'next/link'

export function Header() {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/courses" className="text-xl font-bold text-blue-600">
            ProfoChatBot Web
          </Link>
          <nav className="flex gap-4">
            <Link href="/courses" className="text-gray-700 hover:text-blue-600">
              Курсы
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}

