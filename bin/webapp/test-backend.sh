#!/bin/bash

# Тестирование Backend
# Использование: ./bin/webapp/test-backend.sh

PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
cd "$PROJECT_ROOT/webapp/backend" || exit

echo "🧪 Тестирование Backend"
echo ""

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
if [ -f "test_backend_safe.py" ]; then
    python test_backend_safe.py
else
    echo "❌ Файл test_backend_safe.py не найден"
    exit 1
fi

echo ""
echo "=" | head -c 60 && echo ""
echo "Для запуска сервера выполните:"
echo "  ./bin/webapp/dev-backend.sh"
echo ""
echo "После запуска откройте в браузере:"
echo "  http://localhost:8000 - главная страница API"
echo "  http://localhost:8000/docs - документация API (Swagger)"
echo "=" | head -c 60 && echo ""

