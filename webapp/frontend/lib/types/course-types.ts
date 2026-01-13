/**
 * Course identifier - используется в URL и для отображения
 */
export type CourseCode = string;

/**
 * Course ID - внутренний идентификатор (INT из БД)
 */
export type CourseId = number;

/**
 * Полная информация о курсе
 */
export interface Course {
  course_id: CourseId;
  course_code: CourseCode;
  title?: string | null;
  description?: string | null;
  account_id: number;
  is_active?: boolean;
  bot_name?: string;
  creator_id?: number | null;
  date_created?: string;
  updated_at?: string;
  yaml?: string | null;
  metadata?: any;
}

/**
 * Минимальная информация о курсе для списков
 */
export interface CourseListItem {
  course_code: CourseCode;
  course_id?: CourseId; // опционально для обратной совместимости
  title?: string | null;
  description?: string | null;
  is_active?: boolean;
}

/**
 * Курс из базы данных (для API responses)
 */
export interface CourseFromDB {
  course_id: CourseId;
  course_code: CourseCode;
  title: string | null;
  description: string | null;
  metadata: any;
  yaml: string | null;
  is_active: boolean;
  account_id: number;
}
