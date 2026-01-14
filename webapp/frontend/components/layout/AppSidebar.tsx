'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bot,
  BookOpen,
  Users,
  Mail,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  future?: boolean;
}

const navItems: NavItem[] = [
  {
    label: 'Bots',
    href: '/bots',
    icon: Bot,
  },
  {
    label: 'Courses',
    href: '/courses',
    icon: BookOpen,
  },
  {
    label: 'Groups',
    href: '#',
    icon: Users,
    disabled: true,
    future: true,
  },
  {
    label: 'Invites',
    href: '#',
    icon: Mail,
    disabled: true,
    future: true,
  },
];

interface AppSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ isCollapsed, onToggle }: AppSidebarProps) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isActive = (href: string) => {
    if (href === '#') return false;
    if (href === '/bots') {
      return pathname?.startsWith('/bots') || false;
    }
    if (href === '/courses') {
      return pathname?.startsWith('/courses') || pathname?.startsWith('/course-editor') || false;
    }
    return pathname?.startsWith(href) || false;
  };

  const sidebarWidth = isCollapsed ? 'w-[72px]' : 'w-[260px]';
  const sidebarClasses = cn(
    'fixed left-0 top-0 h-full bg-card border-r border-border transition-all duration-300 z-40 flex flex-col',
    sidebarWidth,
    isMobile && !isCollapsed && 'shadow-xl',
    isMobile && isCollapsed && '-translate-x-full'
  );

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && !isCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside className={sidebarClasses}>
        {/* Header with toggle button */}
        <div className="h-16 border-b border-border flex items-center px-4 shrink-0">
          {!isCollapsed && (
            <Link href="/bots" className="flex-1">
              <span className="text-lg font-semibold text-foreground">ProfoChatBot</span>
            </Link>
          )}
          {(!isMobile || !isCollapsed) && (
            <button
              onClick={onToggle}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <Menu className="w-5 h-5 text-muted-foreground" />
              ) : (
                <X className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
          )}
        </div>

        {/* Navigation items */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const isDisabled = item.disabled || item.future;

              const itemContent = (
                <div
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                    active && !isDisabled
                      ? 'bg-primary/10 text-primary'
                      : isDisabled
                      ? 'text-muted-foreground opacity-50 cursor-not-allowed'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!isCollapsed && (
                    <span className="text-sm font-medium truncate">
                      {item.label}
                      {item.future && (
                        <span className="ml-2 text-xs text-muted-foreground">(soon)</span>
                      )}
                    </span>
                  )}
                </div>
              );

              if (isDisabled) {
                return (
                  <li key={item.label} title={isCollapsed ? item.label : undefined}>
                    {itemContent}
                  </li>
                );
              }

              return (
                <li key={item.label} title={isCollapsed ? item.label : undefined}>
                  <Link href={item.href} onClick={isMobile ? onToggle : undefined}>
                    {itemContent}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
