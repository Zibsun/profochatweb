import { NextRequest, NextResponse } from 'next/server';
import {
  addCourseToCoursesYaml,
  validateCourseId,
  validateCoursePath,
  normalizeCoursePath,
  getCourseMetadata,
} from '@/lib/course-editor/yaml-utils';
import path from 'path';
import fs from 'fs';

/**
 * POST /api/course-editor/courses/metadata
 * Создает новую запись курса в courses.yml
 * Опционально создает пустой YAML файл курса, если его нет
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Валидация входных данных
    if (!body.course_id) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'course_id is required',
        },
        { status: 400 }
      );
    }

    if (!body.path) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'path is required',
        },
        { status: 400 }
      );
    }

    const courseId = body.course_id;
    const coursePath = body.path;

    // Валидация course_id
    const idValidation = validateCourseId(courseId);
    if (!idValidation.valid) {
      return NextResponse.json(
        {
          error: 'Invalid course_id',
          message: idValidation.error,
        },
        { status: 400 }
      );
    }

    // Валидация path
    const pathValidation = validateCoursePath(coursePath);
    if (!pathValidation.valid) {
      return NextResponse.json(
        {
          error: 'Invalid path',
          message: pathValidation.error,
        },
        { status: 400 }
      );
    }

    // Проверяем, не существует ли уже курс с таким ID
    const existingMetadata = getCourseMetadata(courseId);
    if (existingMetadata) {
      return NextResponse.json(
        {
          error: 'Course already exists',
          message: `Course with ID "${courseId}" already exists`,
        },
        { status: 409 }
      );
    }

    // Нормализуем путь
    const normalizedPath = normalizeCoursePath(coursePath);

    // Если курс не из БД и файл не существует, создаем пустой YAML файл
    if (normalizedPath !== 'db') {
      const PROJECT_ROOT = path.join(process.cwd(), '..', '..', '..');
      const courseFilePath = normalizedPath.startsWith('scripts/')
        ? path.join(PROJECT_ROOT, normalizedPath)
        : path.join(PROJECT_ROOT, 'scripts', normalizedPath);

      // Создаем директорию, если её нет
      const dir = path.dirname(courseFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Создаем пустой YAML файл, если его нет
      if (!fs.existsSync(courseFilePath)) {
        const emptyCourse = {
          // Можно добавить начальный элемент по умолчанию
        };
        const yaml = await import('js-yaml');
        fs.writeFileSync(courseFilePath, yaml.dump(emptyCourse, { indent: 2 }), 'utf-8');
      }
    }

    // Добавляем запись в courses.yml
    addCourseToCoursesYaml(courseId, normalizedPath, {
      element: body.element,
      restricted: body.restricted,
      decline_text: body.decline_text,
      ban_enabled: body.ban_enabled,
      ban_text: body.ban_text,
    });

    // Получаем созданные метаданные
    const createdMetadata = getCourseMetadata(courseId);
    if (!createdMetadata) {
      throw new Error('Failed to retrieve created metadata');
    }

    return NextResponse.json(
      {
        ...createdMetadata,
        created_at: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating course metadata:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
