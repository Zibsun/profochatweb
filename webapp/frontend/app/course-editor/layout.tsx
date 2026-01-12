"use client"

import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/toaster"

/**
 * Course Editor Layout
 * 
 * This layout provides:
 * - Tooltip Provider for UI tooltips
 * - Toaster for notifications
 * 
 * Note: React Query Provider is temporarily disabled.
 * To enable it, install dependencies and uncomment QueryClientProvider.
 * 
 * Note: This layout bypasses the root layout's Header/Footer
 * to provide a full-screen editor experience.
 */
export default function CourseEditorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TooltipProvider>
      <Toaster />
      <div className="course-editor-wrapper">
        {children}
      </div>
    </TooltipProvider>
  )
  
  // TODO: Uncomment after installing @tanstack/react-query
  // import { QueryClientProvider } from "@tanstack/react-query"
  // import { queryClient } from "@/lib/course-editor/queryClient"
  //
  // return (
  //   <QueryClientProvider client={queryClient}>
  //     <TooltipProvider>
  //       <Toaster />
  //       <div className="course-editor-wrapper">
  //         {children}
  //       </div>
  //     </TooltipProvider>
  //   </QueryClientProvider>
  // )
}
