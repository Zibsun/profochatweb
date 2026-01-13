// Проверяем, что код выполняется только на сервере
if (typeof window !== 'undefined') {
  throw new Error('course-utils can only be used in server-side code (API routes)');
}

import { queryOne } from '@/lib/db';

/**
 * Конвертирует course_code в course_id
 */
export async function getCourseIdByCode(
  courseCode: string,
  accountId: number
): Promise<number | null> {
  const result = await queryOne<{ course_id: number }>(
    `SELECT course_id FROM course 
     WHERE course_code = $1 AND account_id = $2`,
    [courseCode, accountId]
  );
  return result?.course_id || null;
}

/**
 * Конвертирует course_id в course_code
 */
export async function getCourseCodeById(
  courseId: number,
  accountId: number
): Promise<string | null> {
  const result = await queryOne<{ course_code: string }>(
    `SELECT course_code FROM course 
     WHERE course_id = $1 AND account_id = $2`,
    [courseId, accountId]
  );
  return result?.course_code || null;
}
