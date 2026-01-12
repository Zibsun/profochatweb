#!/bin/bash

# Настройка Frontend (установка зависимостей)
# Использование: ./bin/webapp/setup-frontend.sh

PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
cd "$PROJECT_ROOT/webapp/frontend" || exit

echo "🔧 Настройка Frontend"
echo ""

# Проверка наличия Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен. Установите Node.js для продолжения."
    exit 1
fi

echo "✅ Node.js версия: $(node --version)"
echo ""

# Установка зависимостей
echo "📦 Установка зависимостей..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Установка завершена!"
    echo ""
    echo "📝 Создайте .env.local если нужно:"
    echo "   echo 'NEXT_PUBLIC_API_URL=http://localhost:8000' > .env.local"
    echo ""
    echo "Для запуска frontend выполните:"
    echo "   ./bin/webapp/dev-frontend.sh"
else
    echo ""
    echo "⚠️  Были ошибки при установке зависимостей"
    exit 1
fi

