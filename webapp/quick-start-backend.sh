#!/bin/bash

echo "🚀 Быстрый запуск Backend (локально)"
echo ""

cd "$(dirname "$0")/backend" || exit

# Проверка наличия Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 не установлен. Установите Python 3.12+ для продолжения."
    exit 1
fi

echo "✅ Python версия: $(python3 --version)"
echo ""

# Проверка виртуального окружения
if [ ! -d "venv" ]; then
    echo "📦 Создание виртуального окружения..."
    python3 -m venv venv
    echo ""
fi

# Активация виртуального окружения
echo "🔌 Активация виртуального окружения..."
source venv/bin/activate || source venv/Scripts/activate

# Проверка установленных зависимостей
if ! python -c "import fastapi" 2>/dev/null; then
    echo "📦 Установка зависимостей..."
    pip install -r requirements.txt
    echo ""
fi

# Проверка наличия .env файла
if [ ! -f ".env" ]; then
    echo "📝 Создание файла .env из примера..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "⚠️  Не забудьте отредактировать .env и указать:"
        echo "   - DATABASE_URL"
        echo "   - SECRET_KEY"
        echo "   - OPENAI_API_KEY"
        echo ""
    else
        echo "⚠️  Файл .env.example не найден, создайте .env вручную"
        echo ""
    fi
fi

echo "🔧 Запуск FastAPI сервера..."
echo ""
echo "🌐 Backend будет доступен на: http://localhost:8000"
echo "🌐 API документация: http://localhost:8000/docs"
echo ""
echo "Нажмите Ctrl+C для остановки"
echo ""

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

