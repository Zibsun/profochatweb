#!/bin/bash

# Запуск всего стека для разработки (Backend + Frontend)
# Использование: ./bin/webapp/dev-all.sh

PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

echo "🚀 Запуск всего стека для разработки"
echo ""
echo "Backend будет запущен в одном терминале"
echo "Frontend будет запущен в другом терминале"
echo ""
echo "Нажмите Ctrl+C для остановки всех процессов"
echo ""

# Функция для очистки при выходе
cleanup() {
    echo ""
    echo "🛑 Остановка всех процессов..."
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null
    fi
    kill $(jobs -p) 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Запуск backend в фоне
echo "🔧 Запуск Backend..."
cd "$PROJECT_ROOT/webapp/backend" || exit 1

# Проверка наличия виртуального окружения
if [ ! -d "venv" ]; then
    echo "❌ Ошибка: Виртуальное окружение 'venv' не найдено в webapp/backend!"
    echo "Создайте его: ./bin/webapp/setup-backend.sh"
    exit 1
fi

source venv/bin/activate || exit 1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Небольшая задержка перед запуском frontend
sleep 2

# Запуск frontend в фоне
echo "🎨 Запуск Frontend..."
cd "$PROJECT_ROOT/webapp/frontend" || exit 1

# Проверка наличия node_modules
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules не найдены. Запустите: ./bin/webapp/setup-frontend.sh"
    echo "Продолжаю запуск..."
fi

# Очистка кэша Next.js перед запуском
echo "🧹 Очистка кэша Next.js..."
rm -rf .next 2>/dev/null
rm -rf node_modules/.cache 2>/dev/null

npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Оба сервера запущены!"
echo ""
echo "🌐 Backend: http://localhost:8000"
echo "🌐 Frontend: http://localhost:3000"
echo ""
echo "Нажмите Ctrl+C для остановки"
echo ""

# Ждем завершения
wait
