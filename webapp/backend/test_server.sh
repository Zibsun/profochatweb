#!/bin/bash

echo "🚀 Тестирование запуска Backend сервера"
echo ""

cd "$(dirname "$0")" || exit

# Активация venv
if [ ! -d "venv" ]; then
    echo "❌ Виртуальное окружение не найдено!"
    exit 1
fi

source venv/bin/activate

# Проверка версии Python
echo "📋 Информация о окружении:"
echo "   Python: $(python --version)"
echo "   pip: $(pip --version | cut -d' ' -f1-2)"
echo ""

# Проверка установленных пакетов
echo "📦 Проверка ключевых пакетов:"
python -c "import fastapi; print('  ✓ FastAPI:', fastapi.__version__)" 2>/dev/null || echo "  ❌ FastAPI не установлен"
python -c "import sqlalchemy; print('  ✓ SQLAlchemy:', sqlalchemy.__version__)" 2>/dev/null || echo "  ❌ SQLAlchemy не установлен"
python -c "import uvicorn; print('  ✓ Uvicorn:', uvicorn.__version__)" 2>/dev/null || echo "  ❌ Uvicorn не установлен"
echo ""

# Запуск тестового скрипта
echo "🧪 Запуск тестов..."
python test_backend.py

echo ""
echo "=" * 60
echo "Для запуска сервера выполните:"
echo "  source venv/bin/activate"
echo "  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo "После запуска откройте в браузере:"
echo "  http://localhost:8000 - главная страница API"
echo "  http://localhost:8000/docs - документация API (Swagger)"
echo "  http://localhost:8000/redoc - альтернативная документация"
echo "=" * 60

