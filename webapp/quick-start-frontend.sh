#!/bin/bash

echo "🚀 Быстрый запуск Frontend (локально)"
echo ""

cd "$(dirname "$0")/frontend" || exit

# Проверка наличия Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен. Установите Node.js для продолжения."
    exit 1
fi

echo "✅ Node.js версия: $(node --version)"
echo ""

# Проверка наличия node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Установка зависимостей..."
    npm install
    echo ""
fi

# Проверка наличия .env.local
if [ ! -f ".env.local" ]; then
    echo "📝 Создание .env.local..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
    echo "✅ Файл .env.local создан"
    echo ""
fi

echo "🎨 Запуск dev сервера..."
echo ""
echo "🌐 Frontend будет доступен на: http://localhost:3000"
echo "🌐 Тестовая страница: http://localhost:3000/test"
echo ""
echo "Нажмите Ctrl+C для остановки"
echo ""

npm run dev

