#!/bin/bash

echo "🔧 Установка недостающих зависимостей"
echo ""

cd "$(dirname "$0")" || exit

if [ ! -d "venv" ]; then
    echo "❌ Виртуальное окружение не найдено!"
    echo "Создайте его сначала: python3.12 -m venv venv"
    exit 1
fi

source venv/bin/activate

echo "📦 Установка email-validator..."
pip install 'pydantic[email]' email-validator

echo ""
echo "✅ Зависимости установлены!"
echo ""
echo "Теперь запустите тест:"
echo "  python test_backend_safe.py"

