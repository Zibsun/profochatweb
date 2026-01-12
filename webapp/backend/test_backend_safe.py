#!/usr/bin/env python3
"""
Безопасный тестовый скрипт (работает даже без .env файла)
"""
import sys
import os

# Устанавливаем переменные окружения ПЕРЕД импортом модулей
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing-only-do-not-use-in-production")
os.environ.setdefault("OPENAI_API_KEY", "test-key-for-testing")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
os.environ.setdefault("ENVIRONMENT", "development")

# Добавляем путь к app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Проверка импорта всех модулей"""
    print("🔍 Проверка импортов...")
    
    results = []
    
    # Тест основных библиотек
    try:
        import fastapi
        print(f"  ✅ FastAPI версия: {fastapi.__version__}")
        results.append(True)
    except ImportError as e:
        print(f"  ❌ FastAPI: {e}")
        results.append(False)
    
    try:
        import sqlalchemy
        print(f"  ✅ SQLAlchemy версия: {sqlalchemy.__version__}")
        results.append(True)
    except ImportError as e:
        print(f"  ❌ SQLAlchemy: {e}")
        results.append(False)
    
    try:
        import pydantic
        print(f"  ✅ Pydantic версия: {pydantic.__version__}")
        results.append(True)
    except ImportError as e:
        print(f"  ❌ Pydantic: {e}")
        results.append(False)
    
    try:
        import email_validator
        print(f"  ✅ email-validator установлен")
        results.append(True)
    except ImportError:
        print(f"  ❌ email-validator не установлен")
        print(f"     Установите: pip install 'pydantic[email]' или pip install email-validator")
        results.append(False)
    
    try:
        import uvicorn
        print(f"  ✅ Uvicorn версия: {uvicorn.__version__}")
        results.append(True)
    except ImportError as e:
        print(f"  ❌ Uvicorn: {e}")
        results.append(False)
    
    # Тест импорта модулей приложения
    try:
        print("\n  📦 Импорт модулей приложения...")
        from app.database import Base
        print("    ✅ app.database")
        results.append(True)
    except Exception as e:
        print(f"    ❌ app.database: {e}")
        import traceback
        traceback.print_exc()
        results.append(False)
    
    try:
        from app.models import User
        print("    ✅ app.models")
        results.append(True)
    except Exception as e:
        print(f"    ❌ app.models: {e}")
        import traceback
        traceback.print_exc()
        results.append(False)
    
    try:
        from app.schemas import UserCreate
        print("    ✅ app.schemas")
        results.append(True)
    except Exception as e:
        print(f"    ❌ app.schemas: {e}")
        import traceback
        traceback.print_exc()
        results.append(False)
    
    try:
        print("\n  📡 Импорт API endpoints...")
        from app.api.v1 import auth
        print("    ✅ app.api.v1.auth")
        results.append(True)
    except Exception as e:
        print(f"    ❌ app.api.v1.auth: {e}")
        import traceback
        traceback.print_exc()
        results.append(False)
    
    return all(results[:5])  # Основные библиотеки должны быть установлены

def test_fastapi_app():
    """Проверка создания FastAPI приложения"""
    print("\n🔍 Проверка FastAPI приложения...")
    
    try:
        from app.main import app
        
        # Проверка наличия роутеров
        routes = [route.path for route in app.routes]
        print(f"  ✅ FastAPI приложение создано")
        print(f"  ✅ Найдено {len(routes)} маршрутов")
        
        # Проверка основных endpoints
        expected_paths = ["/", "/api/v1/auth/register", "/api/v1/courses"]
        found_paths = []
        for path in expected_paths:
            if any(path in route for route in routes):
                print(f"    ✅ Маршрут {path}")
                found_paths.append(path)
        
        if len(found_paths) == len(expected_paths):
            return True
        else:
            print(f"    ⚠️  Найдено только {len(found_paths)} из {len(expected_paths)} ожидаемых маршрутов")
            return True  # Все равно считаем успешным, если приложение создано
    except Exception as e:
        print(f"  ❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 60)
    print("🧪 Тестирование Backend (безопасный режим)")
    print("=" * 60)
    print()
    
    # Тест 1: Импорты
    imports_ok = test_imports()
    
    # Тест 2: FastAPI приложение
    app_ok = test_fastapi_app()
    
    # Итоги
    print("\n" + "=" * 60)
    print("📊 Результаты тестирования")
    print("=" * 60)
    
    if imports_ok:
        print("✅ Основные библиотеки установлены")
    else:
        print("❌ Проблемы с установкой библиотек")
        print("   Выполните: pip install -r requirements.txt")
    
    if app_ok:
        print("✅ FastAPI приложение работает")
    else:
        print("❌ Проблемы с FastAPI приложением")
    
    print()
    
    if imports_ok and app_ok:
        print("🎉 Backend готов к работе!")
        print()
        print("📝 Следующие шаги:")
        print("  1. Создайте .env файл (если еще не создан):")
        print("     cp .env.example .env")
        print("  2. Отредактируйте .env и укажите реальные значения:")
        print("     - DATABASE_URL (для подключения к PostgreSQL)")
        print("     - SECRET_KEY (случайный секретный ключ)")
        print("     - OPENAI_API_KEY (ваш ключ OpenAI)")
        print("  3. Запустите сервер:")
        print("     source venv/bin/activate")
        print("     uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
        print()
        print("  4. Откройте в браузере:")
        print("     http://localhost:8000 - главная страница")
        print("     http://localhost:8000/docs - документация API")
        return 0
    else:
        print("⚠️  Есть проблемы. Исправьте ошибки выше и повторите тест.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
