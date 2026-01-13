// Проверяем, что код выполняется только на сервере
if (typeof window !== 'undefined') {
  throw new Error('db-utils can only be used in server-side code (API routes)');
}

import { query, queryOne } from '@/lib/db';
import yaml from 'js-yaml';

export interface CourseMetadata {
  course_id: string;
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

export interface CourseFromDB {
  course_id: string;
  title: string | null;
  description: string | null;
  metadata: any;
  yaml: string | null;
  is_active: boolean;
}

/**
 * Получает курс из базы данных
 */
export async function getCourseFromDB(
  courseId: string,
  accountId: number
): Promise<CourseFromDB | null> {
  const course = await queryOne<CourseFromDB>(
    `SELECT 
      course_id,
      title,
      description,
      metadata,
      yaml,
      is_active
    FROM course
    WHERE course_id = $1 AND account_id = $2`,
    [courseId, accountId]
  );

  return course;
}

/**
 * Получает элементы курса из базы данных
 */
export async function getCourseElementsFromDB(
  courseId: string,
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
 * Сохраняет курс в базу данных
 */
export async function saveCourseToDB(
  courseId: string,
  accountId: number,
  yamlContent: Record<string, any>,
  metadata: Partial<CourseMetadata>,
  title?: string | null,
  description?: string | null
): Promise<void> {
  // Проверяем существование курса
  // Сначала пробуем новую схему с account_id
  let existingCourse: { course_id: string } | null = null;
  try {
    existingCourse = await queryOne<{ course_id: string }>(
      `SELECT course_id FROM course
       WHERE course_id = $1 AND account_id = $2`,
      [courseId, accountId]
    );
  } catch (error) {
    // Если account_id не существует, пробуем старую схему с bot_name
    const defaultBotName = process.env.BOT_NAME || 'default';
    try {
      existingCourse = await queryOne<{ course_id: string }>(
        `SELECT course_id FROM course
         WHERE course_id = $1 AND bot_name = $2`,
        [courseId, defaultBotName]
      );
    } catch (error2) {
      // Курс не найден, это нормально для нового курса
      existingCourse = null;
    }
  }

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
    // Обновляем существующий курс
    // Пробуем обновить с новыми полями, если они существуют
    try {
      await query(
        `UPDATE course
         SET title = $3,
             description = $4,
             metadata = $5,
             yaml = $6,
             updated_at = CURRENT_TIMESTAMP
         WHERE course_id = $1 AND account_id = $2`,
        [
          courseId,
          accountId,
          title || null,
          description || null,
          JSON.stringify(metadataJson),
          yamlString,
        ]
      );
    } catch (error: any) {
      // Если поле updated_at не существует, пробуем без него
      if (error?.message?.includes('updated_at')) {
        try {
          await query(
            `UPDATE course
             SET title = $3,
                 description = $4,
                 metadata = $5,
                 yaml = $6
             WHERE course_id = $1 AND account_id = $2`,
            [
              courseId,
              accountId,
              title || null,
              description || null,
              JSON.stringify(metadataJson),
              yamlString,
            ]
          );
        } catch (error2: any) {
          // Если и title/description/metadata не существуют, обновляем только yaml
          if (error2?.message?.includes('column')) {
            try {
              await query(
                `UPDATE course
                 SET yaml = $3
                 WHERE course_id = $1 AND account_id = $2`,
                [courseId, accountId, yamlString]
              );
            } catch (error3: any) {
              // Если account_id не существует, используем старую схему с bot_name
              if (error3?.message?.includes('account_id') || error3?.message?.includes('bot_name')) {
                const defaultBotName = process.env.BOT_NAME || 'default';
                await query(
                  `UPDATE course
                   SET yaml = $3
                   WHERE course_id = $1 AND bot_name = $2`,
                  [courseId, defaultBotName, yamlString]
                );
              } else {
                throw error3;
              }
            }
          } else {
            throw error2;
          }
        }
      } else if (error?.message?.includes('account_id') || error?.message?.includes('bot_name')) {
        // Если используется старая схема с bot_name
        const defaultBotName = process.env.BOT_NAME || 'default';
        await query(
          `UPDATE course
           SET yaml = $3
           WHERE course_id = $1 AND bot_name = $2`,
          [courseId, defaultBotName, yamlString]
        );
      } else {
        throw error;
      }
    }
  } else {
    // Создаем новый курс
    // Используем date_created вместо created_at (совместимость со старой схемой)
    // Поля title, description, metadata, is_active могут не существовать в старой схеме
    try {
      await query(
        `INSERT INTO course (
          course_id, account_id, title, description,
          metadata, yaml, date_created, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, TRUE)`,
        [
          courseId,
          accountId,
          title || null,
          description || null,
          JSON.stringify(metadataJson),
          yamlString,
        ]
      );
    } catch (error: any) {
      // Если поля title, description, metadata, is_active не существуют, пробуем минимальную схему с account_id
      if (error?.message?.includes('column')) {
        try {
          await query(
            `INSERT INTO course (
              course_id, account_id, yaml, date_created
            ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
            [
              courseId,
              accountId,
              yamlString,
            ]
          );
        } catch (error2: any) {
          // Если account_id не существует, значит используется старая схема с bot_name
          if (error2?.message?.includes('account_id') || error2?.message?.includes('bot_name')) {
            // Используем значение по умолчанию для bot_name
            const defaultBotName = process.env.BOT_NAME || 'default';
            await query(
              `INSERT INTO course (
                course_id, bot_name, yaml, date_created
              ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
              [
                courseId,
                defaultBotName,
                yamlString,
              ]
            );
          } else {
            throw error2;
          }
        }
      } else {
        throw error;
      }
    }
  }

  // Удаляем старые элементы
  // Пробуем новую схему с account_id
  try {
    await query(
      `DELETE FROM course_element
       WHERE course_id = $1 AND account_id = $2`,
      [courseId, accountId]
    );
  } catch (error: any) {
    // Если account_id не существует, используем старую схему с bot_name
    if (error?.message?.includes('account_id') || error?.message?.includes('bot_name')) {
      const defaultBotName = process.env.BOT_NAME || 'default';
      await query(
        `DELETE FROM course_element
         WHERE course_id = $1 AND bot_name = $2`,
        [courseId, defaultBotName]
      );
    } else {
      throw error;
    }
  }

  // Сохраняем новые элементы
  const defaultBotName = process.env.BOT_NAME || 'default';
  for (const [elementId, elementData] of Object.entries(yamlContent)) {
    const elementType = (elementData as any)?.type || 'message';
    const jsonData = JSON.stringify({ element_data: elementData });

    try {
      await query(
        `INSERT INTO course_element (
          course_id, account_id, element_id, json, element_type
        ) VALUES ($1, $2, $3, $4, $5)`,
        [courseId, accountId, elementId, jsonData, elementType]
      );
    } catch (error: any) {
      // Если account_id не существует, используем старую схему с bot_name
      if (error?.message?.includes('account_id') || error?.message?.includes('bot_name')) {
        await query(
          `INSERT INTO course_element (
            course_id, bot_name, element_id, json, element_type
          ) VALUES ($1, $2, $3, $4, $5)`,
          [courseId, defaultBotName, elementId, jsonData, elementType]
        );
      } else {
        throw error;
      }
    }
  }
}

/**
 * Получает список всех курсов из БД для аккаунта
 */
export async function getCoursesFromDB(
  accountId: number
): Promise<Array<{
  course_id: string;
  title: string | null;
  description: string | null;
  metadata: any;
  is_active: boolean;
}>> {
  const courses = await query<{
    course_id: string;
    title: string | null;
    description: string | null;
    metadata: any;
    is_active: boolean;
  }>(
    `SELECT course_id, title, description, metadata, is_active
     FROM course
     WHERE account_id = $1
     ORDER BY date_created DESC`,
    [accountId]
  );

  return courses;
}

/**
 * Проверяет, существует ли курс в БД
 */
export async function courseExistsInDB(
  courseId: string,
  accountId: number
): Promise<boolean> {
  const course = await queryOne<{ course_id: string }>(
    `SELECT course_id FROM course
     WHERE course_id = $1 AND account_id = $2`,
    [courseId, accountId]
  );

  return course !== null;
}
