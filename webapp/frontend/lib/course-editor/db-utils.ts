// Проверяем, что код выполняется только на сервере
if (typeof window !== 'undefined') {
  throw new Error('db-utils can only be used in server-side code (API routes)');
}

import { query, queryOne } from '@/lib/db';
import yaml from 'js-yaml';
import type { CourseFromDB as CourseFromDBType } from '@/lib/types/course-types';

export interface CourseMetadata {
  course_code: string;  // Используем course_code вместо course_id
  course_id?: number;   // INT course_id опционально
  title?: string | null;
  description?: string | null;
  element?: string;
  restricted?: boolean | string;
  decline_text?: string;
  ban_enabled?: boolean | string;
  ban_text?: string;
  is_active?: boolean;
}

export interface CourseElement {
  element_id: string;
  json: string;
  element_type: string;
}

// Используем тип из course-types.ts
export type CourseFromDB = CourseFromDBType;

/**
 * Получает курс из базы данных по course_code
 */
export async function getCourseFromDB(
  courseCode: string,  // Переименовано courseId → courseCode для ясности
  accountId: number
): Promise<CourseFromDB | null> {
  const course = await queryOne<CourseFromDB>(
    `SELECT 
      course_id,
      course_code,
      title,
      description,
      metadata,
      yaml,
      is_active,
      account_id
    FROM course
    WHERE course_code = $1 AND account_id = $2`,
    [courseCode, accountId]
  );

  return course;
}

/**
 * Получает элементы курса из базы данных по course_id (INT)
 */
export async function getCourseElementsFromDB(
  courseId: number,  // Теперь INT вместо string
  accountId: number
): Promise<CourseElement[]> {
  const elements = await query<CourseElement>(
    `SELECT 
      element_id,
      json,
      element_type
    FROM course_element
    WHERE course_id = $1 AND account_id = $2
    ORDER BY course_element_id`,
    [courseId, accountId]
  );

  return elements;
}

/**
 * Преобразует элементы из БД в YAML структуру
 */
export function elementsToYaml(elements: CourseElement[]): Record<string, any> {
  const yamlContent: Record<string, any> = {};

  for (const elem of elements) {
    try {
      const jsonData = JSON.parse(elem.json);
      yamlContent[elem.element_id] = jsonData.element_data || jsonData;
    } catch (error) {
      console.error(`Error parsing JSON for element ${elem.element_id}:`, error);
      // Пропускаем элемент с ошибкой парсинга
    }
  }

  return yamlContent;
}

/**
 * Сохраняет курс в базу данных по course_code
 */
export async function saveCourseToDB(
  courseCode: string,  // Переименовано courseId → courseCode
  accountId: number,
  yamlContent: Record<string, any>,
  metadata: Partial<CourseMetadata>,
  title?: string | null,
  description?: string | null
): Promise<void> {
  // Проверяем существование курса по course_code
  const existingCourse = await queryOne<{ course_id: number; course_code: string }>(
    `SELECT course_id, course_code FROM course
     WHERE course_code = $1 AND account_id = $2`,
    [courseCode, accountId]
  );

  // Подготавливаем метаданные
  const metadataJson = {
    element: metadata.element,
    restricted: metadata.restricted,
    decline_text: metadata.decline_text,
    ban_enabled: metadata.ban_enabled,
    ban_text: metadata.ban_text,
  };

  // Генерируем YAML представление для совместимости
  const yamlString = yaml.dump(yamlContent, {
    indent: 2,
    lineWidth: -1,
    quotingType: '"',
    forceQuotes: false,
  });

  if (existingCourse) {
    // Обновляем существующий курс по course_code
    await query(
      `UPDATE course
       SET title = $3,
           description = $4,
           metadata = $5,
           yaml = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE course_code = $1 AND account_id = $2`,
      [
        courseCode,
        accountId,
        title || null,
        description || null,
        JSON.stringify(metadataJson),
        yamlString,
      ]
    );
    
    // Удаляем старые элементы используя INT course_id
    await query(
      `DELETE FROM course_element
       WHERE course_id = $1 AND account_id = $2`,
      [existingCourse.course_id, accountId]
    );
    
    // Сохраняем новые элементы используя INT course_id
    for (const [elementId, elementData] of Object.entries(yamlContent)) {
      const elementType = (elementData as any)?.type || 'message';
      const jsonData = JSON.stringify({ element_data: elementData });

      await query(
        `INSERT INTO course_element (
          course_id, course_code, account_id, element_id, json, element_type
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [existingCourse.course_id, courseCode, accountId, elementId, jsonData, elementType]
      );
    }
  } else {
    // Создаем новый курс
    // course_id будет автоматически сгенерирован (serial4)
    const result = await query<{ course_id: number }>(
      `INSERT INTO course (
        course_code, account_id, title, description,
        metadata, yaml, date_created, is_active, bot_name
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, TRUE, $7)
      RETURNING course_id`,
      [
        courseCode,
        accountId,
        title || null,
        description || null,
        JSON.stringify(metadataJson),
        yamlString,
        process.env.BOT_NAME || 'default',
      ]
    );
    
    const newCourseId = result[0]?.course_id;
    if (!newCourseId) {
      throw new Error('Failed to create course');
    }
    
    // Сохраняем элементы используя новый INT course_id
    for (const [elementId, elementData] of Object.entries(yamlContent)) {
      const elementType = (elementData as any)?.type || 'message';
      const jsonData = JSON.stringify({ element_data: elementData });

      await query(
        `INSERT INTO course_element (
          course_id, course_code, account_id, element_id, json, element_type
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [newCourseId, courseCode, accountId, elementId, jsonData, elementType]
      );
    }
  }
}

/**
 * Получает список всех курсов из БД для аккаунта
 */
export async function getCoursesFromDB(
  accountId: number
): Promise<Array<{
  course_id: number;
  course_code: string;
  title: string | null;
  description: string | null;
  metadata: any;
  is_active: boolean;
}>> {
  const courses = await query<{
    course_id: number;
    course_code: string;
    title: string | null;
    description: string | null;
    metadata: any;
    is_active: boolean;
  }>(
    `SELECT course_id, course_code, title, description, metadata, is_active
     FROM course
     WHERE account_id = $1
     ORDER BY date_created DESC`,
    [accountId]
  );

  return courses;
}

/**
 * Проверяет, существует ли курс в БД по course_code
 */
export async function courseExistsInDB(
  courseCode: string,  // Переименовано courseId → courseCode
  accountId: number
): Promise<boolean> {
  const course = await queryOne<{ course_id: number }>(
    `SELECT course_id FROM course
     WHERE course_code = $1 AND account_id = $2`,
    [courseCode, accountId]
  );

  return course !== null;
}
