#!/usr/bin/env python3
"""
Тестовый скрипт для проверки работы backend
"""
import sys
import os

# Добавляем путь к app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Проверка импорта всех модулей"""
    print("🔍 Проверка импортов...")
    
    try:
        print("  ✓ Импорт FastAPI...")
        import fastapi
        print(f"    FastAPI версия: {fastapi.__version__}")
    except ImportError as e:
        print(f"  ❌ Ошибка импорта FastAPI: {e}")
        return False
    
    try:
        print("  ✓ Импорт SQLAlchemy...")
        import sqlalchemy
        print(f"    SQLAlchemy версия: {sqlalchemy.__version__}")
    except ImportError as e:
        print(f"  ❌ Ошибка импорта SQLAlchemy: {e}")
        return False
    
    try:
        print("  ✓ Импорт Pydantic...")
        import pydantic
        print(f"    Pydantic версия: {pydantic.__version__}")
    except ImportError as e:
        print(f"  ❌ Ошибка импорта Pydantic: {e}")
        return False
    
    try:
        print("  ✓ Импорт app.main...")
        from app.main import app
        print("    ✓ FastAPI приложение создано")
    except Exception as e:
        print(f"  ❌ Ошибка импорта app.main: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    try:
        print("  ✓ Импорт моделей...")
        from app.models import User, Course, Lesson, LessonStep
        print("    ✓ Модели импортированы")
    except Exception as e:
        print(f"  ❌ Ошибка импорта моделей: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    try:
        print("  ✓ Импорт схем...")
        from app.schemas import UserCreate, CourseResponse
        print("    ✓ Схемы импортированы")
    except Exception as e:
        print(f"  ❌ Ошибка импорта схем: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    try:
        print("  ✓ Импорт API endpoints...")
        from app.api.v1 import auth, courses, lessons, steps, chat, quiz
        print("    ✓ API endpoints импортированы")
    except Exception as e:
        print(f"  ❌ Ошибка импорта API endpoints: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

def test_fastapi_app():
    """Проверка создания FastAPI приложения"""
    print("\n🔍 Проверка FastAPI приложения...")
    
    try:
        from app.main import app
        
        # Проверка наличия роутеров
        routes = [route.path for route in app.routes]
        print(f"  ✓ Найдено {len(routes)} маршрутов")
        
        # Проверка основных endpoints
        expected_paths = ["/", "/api/v1/auth/register", "/api/v1/courses"]
        for path in expected_paths:
            if any(path in route for route in routes):
                print(f"    ✓ Маршрут {path} найден")
            else:
                print(f"    ⚠️  Маршрут {path} не найден")
        
        return True
    except Exception as e:
        print(f"  ❌ Ошибка при проверке приложения: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_database_config():
    """Проверка конфигурации базы данных"""
    print("\n🔍 Проверка конфигурации БД...")
    
    try:
        from app.database import Base, engine, get_db
        print("  ✓ Модуль database импортирован")
        
        # Проверка что Base определен
        if Base:
            print("  ✓ SQLAlchemy Base определен")
        
        return True
    except Exception as e:
        print(f"  ❌ Ошибка конфигурации БД: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_security():
    """Проверка модуля безопасности"""
    print("\n🔍 Проверка модуля безопасности...")
    
    try:
        from app.core.security import get_password_hash, verify_password, create_access_token
        
        # Тест хеширования пароля
        test_password = "test_password_123"
        hashed = get_password_hash(test_password)
        print("  ✓ Функция хеширования пароля работает")
        
        # Тест проверки пароля
        if verify_password(test_password, hashed):
            print("  ✓ Функция проверки пароля работает")
        else:
            print("  ❌ Функция проверки пароля не работает")
            return False
        
        # Тест создания токена
        token = create_access_token({"sub": "test_user"})
        if token:
            print("  ✓ Функция создания токена работает")
        
        return True
    except Exception as e:
        print(f"  ❌ Ошибка модуля безопасности: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 60)
    print("🧪 Тестирование Backend")
    print("=" * 60)
    print()
    
    results = []
    
    # Тест 1: Импорты
    results.append(("Импорты", test_imports()))
    
    # Тест 2: FastAPI приложение
    results.append(("FastAPI приложение", test_fastapi_app()))
    
    # Тест 3: Конфигурация БД
    results.append(("Конфигурация БД", test_database_config()))
    
    # Тест 4: Безопасность
    results.append(("Модуль безопасности", test_security()))
    
    # Итоги
    print("\n" + "=" * 60)
    print("📊 Результаты тестирования")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print()
    print(f"✅ Пройдено: {passed}")
    print(f"❌ Провалено: {failed}")
    print()
    
    if failed == 0:
        print("🎉 Все тесты пройдены! Backend готов к работе.")
        print()
        print("Для запуска сервера выполните:")
        print("  source venv/bin/activate")
        print("  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
        return 0
    else:
        print("⚠️  Некоторые тесты провалены. Проверьте ошибки выше.")
        return 1

if __name__ == "__main__":
    sys.exit(main())

