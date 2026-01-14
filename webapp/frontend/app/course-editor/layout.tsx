"use client"

/**
 * Course Editor Layout
 * 
 * Note: AppLayout (with sidebar) is now handled by ConditionalLayout in root layout.
 * This layout file is kept for potential future course-editor-specific providers.
 * 
 * The course editor maintains its internal 3-panel layout (Structure, Canvas, Properties)
 * which is independent of the app sidebar.
 */
export default function CourseEditorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
