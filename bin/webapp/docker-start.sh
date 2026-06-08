#!/bin/bash

# Запуск через Docker Compose
# Использование: ./bin/webapp/docker-start.sh

PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
cd "$PROJECT_ROOT/webapp" || exit 1

echo "🚀 Запуск через Docker Compose"
echo ""

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите Docker для продолжения."
    exit 1
fi

# Проверка наличия docker-compose или docker compose
DOCKER_COMPOSE_CMD=""
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    echo "❌ Docker Compose не установлен. Установите Docker Compose для продолжения."
    exit 1
fi

echo "✅ Docker найден"
echo "✅ Используется команда: $DOCKER_COMPOSE_CMD"
echo ""

# Проверка наличия .env файла
if [ ! -f "backend/.env" ]; then
    echo "📝 Создание файла .env из примера..."
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        echo "⚠️  Не забудьте отредактировать backend/.env и указать OPENAI_API_KEY и SECRET_KEY"
    else
        echo "⚠️  Файл backend/.env.example не найден, создайте backend/.env вручную"
    fi
    echo ""
fi

# Запуск Docker Compose
echo "🐳 Запуск Docker Compose..."
COMPOSE_FILES="-f docker-compose.yml"
if [ -f "docker-compose.local.yml" ]; then
    COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.local.yml"
    echo "📋 Найден docker-compose.local.yml — локальные переопределения применены"
fi
$DOCKER_COMPOSE_CMD $COMPOSE_FILES up -d

echo ""
echo "⏳ Ожидание запуска сервисов..."
sleep 5

# Проверка статуса
echo ""
echo "📊 Статус сервисов:"
$DOCKER_COMPOSE_CMD ps

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
echo "   $DOCKER_COMPOSE_CMD exec backend alembic upgrade head"
echo ""
echo "🛑 Для остановки выполните:"
echo "   ./bin/webapp/docker-stop.sh"

