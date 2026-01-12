'use client'

interface SidebarProps {
  children?: React.ReactNode
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <aside className="w-64 bg-gray-50 border-r p-4">
      {children}
    </aside>
  )
}

