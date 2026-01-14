'use client';

import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-collapse on mobile
      if (mobile) {
        setIsCollapsed(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load collapsed state from localStorage
  useEffect(() => {
    if (!isMobile) {
      const saved = localStorage.getItem('sidebar-collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    }
  }, [isMobile]);

  // Save collapsed state to localStorage
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem('sidebar-collapsed', String(isCollapsed));
    }
  }, [isCollapsed, isMobile]);

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
  };

  const sidebarWidth = isCollapsed ? 72 : 260;

  return (
    <TooltipProvider>
      <Toaster />
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar */}
        <AppSidebar isCollapsed={isCollapsed} onToggle={handleToggle} />

        {/* Main content */}
        <main
          className="flex-1 overflow-auto transition-all duration-300"
          style={isMobile ? {} : { marginLeft: `${sidebarWidth}px` }}
        >
          {/* Mobile burger button - only show when sidebar is collapsed */}
          {isMobile && isCollapsed && (
            <button
              onClick={handleToggle}
              className="fixed top-4 left-4 z-30 p-2 bg-card border border-border rounded-lg shadow-md hover:bg-muted transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
          )}
          {children}
        </main>
      </div>
    </TooltipProvider>
  );
}
