import { NextRequest, NextResponse } from 'next/server';
import { Course } from '@/lib/types/types';

/**
 * GET /api/courses
 * Возвращает список всех курсов
 */
export async function GET() {
  try {
    // TODO: Replace with actual database query
    // For now, return mock data
    const mockCourses: Course[] = [
      {
        course_id: 'greek_a1',
        title: 'Greek A1',
        description: 'Greek language course A1 level',
        creator_id: '1',
        is_restricted: false,
        created_at: '2024-01-01T00:00:00Z',
      },
    ];

    return NextResponse.json({
      courses: mockCourses,
    });
  } catch (error) {
    console.error('Error loading courses:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
