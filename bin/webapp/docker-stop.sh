#!/bin/bash

# Остановка Docker Compose
# Использование: ./bin/webapp/docker-stop.sh

PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
cd "$PROJECT_ROOT/webapp" || exit 1

echo "🛑 Остановка Docker Compose"
echo ""

# Определяем команду docker-compose
DOCKER_COMPOSE_CMD=""
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    echo "❌ Docker Compose не найден"
    exit 1
fi

$DOCKER_COMPOSE_CMD down

echo ""
echo "✅ Сервисы остановлены"

