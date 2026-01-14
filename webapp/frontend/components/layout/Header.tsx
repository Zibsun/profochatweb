'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Header() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname?.startsWith(path)
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/courses" className="text-xl font-bold text-blue-600">
            ProfoChatBot Web
          </Link>
          <nav className="flex gap-4">
            <Link
              href="/courses"
              className={`${
                isActive('/courses')
                  ? 'text-blue-600 font-medium'
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Курсы
            </Link>
            <Link
              href="/course-editor"
              className={`${
                isActive('/course-editor')
                  ? 'text-blue-600 font-medium'
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Course Editor
            </Link>
            <Link
              href="/groups"
              className={`${
                isActive('/groups')
                  ? 'text-blue-600 font-medium'
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Groups
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}

