#!/bin/bash

# Просмотр логов Docker Compose
# Использование: ./bin/webapp/docker-logs.sh [service]
# service может быть: backend, frontend, db или не указан (все сервисы)

PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
cd "$PROJECT_ROOT/webapp" || exit 1

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

if [ -n "$1" ]; then
    echo "📋 Логи сервиса: $1"
    $DOCKER_COMPOSE_CMD logs -f "$1"
else
    echo "📋 Логи всех сервисов"
    $DOCKER_COMPOSE_CMD logs -f
fi

