// Проверяем, что код выполняется только на сервере
if (typeof window !== 'undefined') {
  throw new Error('Database module can only be used in server-side code (API routes)');
}

import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';

// Определяем путь к корню проекта
// process.cwd() в Next.js API routes возвращает корень Next.js приложения (webapp/frontend)
// Нужно подняться на 2 уровня вверх, чтобы попасть в корень проекта (profochatweb)
function getProjectRoot(): string {
  const cwd = process.cwd();
  // Если мы в webapp/frontend, поднимаемся на 2 уровня
  if (cwd.endsWith('webapp/frontend') || cwd.endsWith('webapp\\frontend')) {
    return path.resolve(cwd, '..', '..');
  }
  // Иначе пытаемся найти корень проекта по наличию .env файла или scripts/courses.yml
  let current = cwd;
  for (let i = 0; i < 5; i++) {
    const envPath = path.join(current, '.env');
    const scriptsPath = path.join(current, 'scripts', 'courses.yml');
    if (fs.existsSync(envPath) || fs.existsSync(scriptsPath)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break; // Достигли корня файловой системы
    current = parent;
  }
  // Fallback: предполагаем стандартную структуру
  return path.resolve(cwd, '..', '..');
}

const PROJECT_ROOT = getProjectRoot();

// Загружаем переменные окружения из корневого .env файла
// Next.js автоматически загружает .env.local и .env из webapp/frontend,
// но мы также хотим загрузить из корня проекта
function loadEnvFromRoot(): void {
  const rootEnvPath = path.join(PROJECT_ROOT, '.env');
  
  if (fs.existsSync(rootEnvPath)) {
    const envContent = fs.readFileSync(rootEnvPath, 'utf-8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      // Пропускаем пустые строки и комментарии
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }
      
      // Парсим строку формата KEY=VALUE
      const match = trimmedLine.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        
        // Убираем кавычки если есть
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        // Устанавливаем переменную окружения только если она еще не установлена
        // (чтобы не перезаписывать переменные из системного окружения или .env.local)
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

// Загружаем переменные из корневого .env файла
loadEnvFromRoot();

// Создаем пул подключений к PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Настройки пула
  max: 20, // максимальное количество клиентов в пуле
  idleTimeoutMillis: 30000, // закрыть клиентов, которые простаивают более 30 секунд
  connectionTimeoutMillis: 2000, // вернуть ошибку после 2 секунд, если подключение не может быть установлено
});

// Обработка ошибок пула
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Выполняет SQL запрос с параметрами
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res.rows as T[];
  } catch (error) {
    console.error('Database query error', { text, error });
    throw error;
  }
}

/**
 * Выполняет SQL запрос и возвращает первую строку
 */
export async function queryOne<T = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Получает account_id из JWT токена или localStorage
 */
export function getAccountId(request?: Request): number {
  // Server-side: извлекаем из токена в заголовках
  if (request) {
    const authHeader = request.headers.get('authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      try {
        // Декодируем JWT (без проверки подписи на клиенте)
        const parts = token.split('.')
        if (parts.length !== 3) {
          return 1
        }
        const base64Url = parts[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        try {
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          )
          const payload = JSON.parse(jsonPayload)
          return payload.account_id || 1
        } catch {
          return 1
        }
        return payload.account_id || 1
      } catch {
        return 1
      }
    }
  }

  // Client-side: из localStorage или из токена
  if (typeof window !== 'undefined') {
    const accountId = localStorage.getItem('account_id')
    if (accountId) {
      return parseInt(accountId, 10)
    }

    // Пытаемся извлечь из токена
    const token = localStorage.getItem('auth_token')
    if (token) {
      try {
        const parts = token.split('.')
        if (parts.length !== 3) {
          return 1
        }
        const base64Url = parts[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        )
        const payload = JSON.parse(jsonPayload)
        const accountId = payload.account_id || 1
        localStorage.setItem('account_id', String(accountId))
        return accountId
      } catch {
        return 1
      }
    }
  }

  return 1
}

/**
 * Закрывает все подключения в пуле
 * Используется при завершении работы приложения
 */
export async function closePool(): Promise<void> {
  await pool.end();
}

export default pool;
