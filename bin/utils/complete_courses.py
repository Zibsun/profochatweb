#!/usr/bin/env python3
"""
Скрипт для пометки курсов как завершенных (для тестирования)
Позволяет быстро завершить все активные курсы или курсы конкретного пользователя
"""
import os
import sys
import argparse
import psycopg2
from psycopg2.extras import RealDictCursor

# Загружаем переменные окружения (опционально)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # dotenv не установлен, используем переменные окружения напрямую
    pass

DATABASE_URL = os.environ.get('DATABASE_URL')

if not DATABASE_URL:
    print("❌ Ошибка: DATABASE_URL не установлен!")
    print("Установите DATABASE_URL в файле .env или в переменных окружения")
    sys.exit(1)

# Получаем BOT_NAME из переменных окружения
BOT_NAME = os.environ.get('BOT_NAME', 'web_bot')


def get_db_connection():
    """Получить подключение к базе данных"""
    try:
        return psycopg2.connect(DATABASE_URL)
    except psycopg2.Error as e:
        print(f"❌ Ошибка подключения к базе данных: {e}")
        sys.exit(1)


def get_active_runs(chat_id=None, course_id=None, bot_name=None):
    """Получить список активных курсов"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            query = """
                SELECT run_id, chat_id, username, course_id, date_inserted, is_ended
                FROM run
                WHERE (is_ended IS NULL OR is_ended = FALSE)
            """
            params = []
            
            if bot_name:
                query += " AND botname = %s"
                params.append(bot_name)
            
            if chat_id:
                query += " AND chat_id = %s"
                params.append(chat_id)
            
            if course_id:
                query += " AND course_id = %s"
                params.append(course_id)
            
            query += " ORDER BY date_inserted DESC"
            
            cursor.execute(query, params)
            return cursor.fetchall()
    finally:
        conn.close()


def complete_courses(chat_id=None, course_id=None, bot_name=None, dry_run=False, yes=False):
    """Пометить курсы как завершенные"""
    # Показываем фильтры
    filters = []
    if bot_name:
        filters.append(f"botname = {bot_name}")
    if chat_id:
        filters.append(f"chat_id = {chat_id}")
    if course_id:
        filters.append(f"course_id = {course_id}")
    
    if filters:
        print(f"🔍 Фильтры: {', '.join(filters)}")
    else:
        print("🔍 Фильтры: нет (все активные курсы)")
    
    # Сначала получаем список активных курсов
    runs = get_active_runs(chat_id=chat_id, course_id=course_id, bot_name=bot_name)
    
    if not runs:
        print("✅ Нет активных курсов для завершения")
        return 0
    
    print(f"\n📋 Найдено активных курсов: {len(runs)}")
    print("\n" + "="*80)
    
    # Показываем список курсов
    for run in runs:
        status = "✅ завершен" if run['is_ended'] else "⏳ активен"
        print(f"Run ID: {run['run_id']:6d} | Chat ID: {run['chat_id']:10d} | "
              f"Username: {run['username']:20s} | Course: {run['course_id']:20s} | "
              f"Дата: {run['date_inserted']} | {status}")
    
    print("="*80)
    
    if dry_run:
        print("\n🔍 Режим проверки (dry-run). Изменения не будут применены.")
        return len(runs)
    
    # Подтверждение (если не указан флаг --yes)
    if not yes:
        print(f"\n⚠️  Вы уверены, что хотите пометить {len(runs)} курс(ов) как завершенные?")
        response = input("Введите 'yes' для подтверждения: ")
        
        if response.lower() != 'yes':
            print("❌ Операция отменена")
            return 0
    
    # Помечаем курсы как завершенные
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            query = """
                UPDATE run 
                SET is_ended = TRUE 
                WHERE (is_ended IS NULL OR is_ended = FALSE)
            """
            params = []
            
            if bot_name:
                query += " AND botname = %s"
                params.append(bot_name)
            
            if chat_id:
                query += " AND chat_id = %s"
                params.append(chat_id)
            
            if course_id:
                query += " AND course_id = %s"
                params.append(course_id)
            
            cursor.execute(query, params)
            updated_count = cursor.rowcount
            conn.commit()
            
            print(f"\n✅ Успешно помечено как завершенные: {updated_count} курс(ов)")
            return updated_count
    except psycopg2.Error as e:
        conn.rollback()
        print(f"❌ Ошибка при обновлении базы данных: {e}")
        sys.exit(1)
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser(
        description='Пометить курсы как завершенные (для тестирования)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Примеры использования:
  # Пометить все курсы как завершенные
  python complete_courses.py --all
  
  # Пометить курсы конкретного пользователя
  python complete_courses.py --chat-id 123456789
  
  # Пометить конкретный курс
  python complete_courses.py --course-id test_course
  
  # Проверить, что будет изменено (без применения изменений)
  python complete_courses.py --all --dry-run
  
  # Указать конкретного бота
  python complete_courses.py --all --bot-name my_bot
  
  # Автоматически подтвердить без запроса
  python complete_courses.py --all --yes
        """
    )
    
    parser.add_argument(
        '--all',
        action='store_true',
        help='Пометить все активные курсы как завершенные'
    )
    
    parser.add_argument(
        '--chat-id',
        type=int,
        help='Пометить курсы конкретного пользователя (chat_id)'
    )
    
    parser.add_argument(
        '--course-id',
        type=str,
        help='Пометить конкретный курс как завершенный'
    )
    
    parser.add_argument(
        '--bot-name',
        type=str,
        default=BOT_NAME,
        help=f'Фильтр по имени бота (botname). По умолчанию: {BOT_NAME or "не установлен"}'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Режим проверки: показать что будет изменено, но не применять изменения'
    )
    
    parser.add_argument(
        '--yes',
        '-y',
        action='store_true',
        help='Автоматически подтвердить операцию без запроса подтверждения'
    )
    
    args = parser.parse_args()
    
    # Проверка аргументов
    if not args.all and not args.chat_id and not args.course_id:
        parser.error("Необходимо указать один из параметров: --all, --chat-id или --course-id")
    
    if args.all and (args.chat_id or args.course_id):
        parser.error("Нельзя использовать --all вместе с --chat-id или --course-id")
    
    # Используем BOT_NAME по умолчанию, если не указан явно
    bot_name = args.bot_name if args.bot_name else BOT_NAME
    
    # Выполняем операцию
    complete_courses(
        chat_id=args.chat_id,
        course_id=args.course_id,
        bot_name=bot_name,
        dry_run=args.dry_run,
        yes=args.yes
    )


if __name__ == '__main__':
    main()
