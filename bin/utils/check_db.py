#!/usr/bin/env python3
"""
Скрипт для проверки подключения к базе данных
"""
import os
from dotenv import load_dotenv
import psycopg2

# Загружаем переменные окружения
load_dotenv()

DATABASE_URL = os.environ.get('DATABASE_URL')

if not DATABASE_URL:
    print("❌ Ошибка: DATABASE_URL не установлен!")
    print("Установите DATABASE_URL в файле .env или в переменных окружения")
    exit(1)

print(f"📊 DATABASE_URL: {DATABASE_URL}")

try:
    conn = psycopg2.connect(DATABASE_URL)
    print("✅ Подключение к базе данных успешно!")
    
    cur = conn.cursor()
    cur.execute("SELECT version();")
    version = cur.fetchone()
    print(f"📦 PostgreSQL версия: {version[0]}")
    
    cur.execute("SELECT current_database();")
    db_name = cur.fetchone()
    print(f"🗄️  Текущая база данных: {db_name[0]}")
    
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
    """)
    tables = cur.fetchall()
    print(f"\n📋 Таблицы в базе данных ({len(tables)}):")
    for table in tables:
        print(f"   - {table[0]}")
    
    cur.close()
    conn.close()
    print("\n✅ Все проверки пройдены успешно!")
    
except psycopg2.Error as e:
    print(f"❌ Ошибка подключения к базе данных: {e}")
    exit(1)
