import { NextResponse } from 'next/server'

/**
 * Course Editor API Routes
 * 
 * TODO: Implement backend persistence for course editor
 * 
 * Planned endpoints:
 * - GET /api/course-editor/courses - List all courses
 * - GET /api/course-editor/courses/[id] - Get course by ID
 * - POST /api/course-editor/courses - Create new course
 * - PUT /api/course-editor/courses/[id] - Update course
 * - DELETE /api/course-editor/courses/[id] - Delete course
 * - POST /api/course-editor/courses/[id]/blocks - Add block to course
 * - PUT /api/course-editor/blocks/[id] - Update block
 * - DELETE /api/course-editor/blocks/[id] - Delete block
 * 
 * For now, returns a placeholder response
 */

export async function GET() {
  return NextResponse.json({
    message: 'Course Editor API - Backend implementation pending',
    endpoints: [
      'GET /api/course-editor/courses',
      'GET /api/course-editor/courses/[id]',
      'POST /api/course-editor/courses',
      'PUT /api/course-editor/courses/[id]',
      'DELETE /api/course-editor/courses/[id]',
    ],
  })
}
