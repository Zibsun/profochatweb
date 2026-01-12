#!/bin/bash

# Запуск Backend для разработки (локально)
# Использование: ./bin/webapp/dev-backend.sh

PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
cd "$PROJECT_ROOT/webapp/backend" || exit

echo "🚀 Запуск Backend для разработки"
echo ""

# Проверка наличия Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 не установлен. Установите Python 3.12+ для продолжения."
    exit 1
fi

echo "✅ Python версия: $(python3 --version)"
echo ""

# Проверка виртуального окружения
if [ ! -d "venv" ]; then
    echo "❌ Виртуальное окружение не найдено!"
    echo "Создайте его: python3.12 -m venv venv"
    echo "Или используйте: ./bin/webapp/setup-backend.sh"
    exit 1
fi

# Активация виртуального окружения
echo "🔌 Активация виртуального окружения..."
source venv/bin/activate || source venv/Scripts/activate

# Проверка установленных зависимостей
if ! python -c "import fastapi" 2>/dev/null; then
    echo "❌ Зависимости не установлены!"
    echo "Установите их: pip install -r requirements.txt"
    echo "Или используйте: ./bin/webapp/setup-backend.sh"
    exit 1
fi

# Проверка наличия .env файла
if [ ! -f ".env" ]; then
    echo "⚠️  Файл .env не найден"
    if [ -f ".env.example" ]; then
        echo "Создаю .env из примера..."
        cp .env.example .env
        echo "⚠️  Отредактируйте .env и укажите реальные значения!"
    else
        echo "Создайте .env файл вручную"
    fi
    echo ""
fi

echo "🔧 Запуск FastAPI сервера..."
echo ""
echo "🌐 Backend будет доступен на: http://localhost:8000"
echo "🌐 API документация: http://localhost:8000/docs"
echo ""
echo "Нажмите Ctrl+C для остановки"
echo ""

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

