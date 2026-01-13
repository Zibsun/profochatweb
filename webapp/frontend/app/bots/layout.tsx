"use client"

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

/**
 * Bot Management Layout
 * 
 * This layout provides:
 * - Tooltip Provider for UI tooltips
 * - Toaster for notifications
 * 
 * Similar to course-editor layout, bypasses root layout's Header/Footer
 * to provide a full-screen management experience.
 */
export default function BotsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <Toaster />
      <div className="bots-management-wrapper h-screen flex flex-col">
        {children}
      </div>
    </TooltipProvider>
  );
}
