#!/bin/bash

echo "🚀 Быстрый запуск ProfoChatBot Web"
echo ""

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите Docker для продолжения."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Установите Docker Compose для продолжения."
    exit 1
fi

echo "✅ Docker найден"
echo ""

# Переход в директорию webapp
cd "$(dirname "$0")" || exit

# Проверка наличия .env файла
if [ ! -f backend/.env ]; then
    echo "📝 Создание файла .env из примера..."
    cp backend/.env.example backend/.env 2>/dev/null || echo "⚠️  Файл .env.example не найден, создайте backend/.env вручную"
    echo "⚠️  Не забудьте отредактировать backend/.env и указать OPENAI_API_KEY и SECRET_KEY"
    echo ""
fi

# Запуск Docker Compose
echo "🐳 Запуск Docker Compose..."
docker-compose up -d

echo ""
echo "⏳ Ожидание запуска сервисов..."
sleep 5

# Проверка статуса
echo ""
echo "📊 Статус сервисов:"
docker-compose ps

echo ""
echo "✅ Сервисы запущены!"
echo ""
echo "🌐 Откройте в браузере:"
echo "   - Frontend: http://localhost:3000"
echo "   - Тестовая страница: http://localhost:3000/test"
echo "   - Backend API: http://localhost:8000"
echo "   - API документация: http://localhost:8000/docs"
echo ""
echo "📝 Для применения миграций БД выполните:"
echo "   docker-compose exec backend alembic upgrade head"
echo ""
echo "🛑 Для остановки выполните:"
echo "   docker-compose down"

