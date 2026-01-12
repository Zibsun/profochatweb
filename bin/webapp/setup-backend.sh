#!/bin/bash

# Настройка Backend (создание venv, установка зависимостей)
# Использование: ./bin/webapp/setup-backend.sh

PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
cd "$PROJECT_ROOT/webapp/backend" || exit

echo "🔧 Настройка Backend"
echo ""

# Проверка наличия Python 3.12
PYTHON312=""
if command -v python3.12 &> /dev/null; then
    PYTHON312=$(which python3.12)
elif [ -f "/opt/homebrew/opt/python@3.12/bin/python3.12" ]; then
    PYTHON312="/opt/homebrew/opt/python@3.12/bin/python3.12"
elif [ -f "/opt/homebrew/bin/python3.12" ]; then
    PYTHON312="/opt/homebrew/bin/python3.12"
else
    echo "❌ Python 3.12 не найден!"
    echo "Установите Python 3.12 через Homebrew:"
    echo "  brew install python@3.12"
    exit 1
fi

echo "✅ Найден Python 3.12: $PYTHON312"
echo "   Версия: $($PYTHON312 --version)"
echo ""

# Проверка/создание виртуального окружения
if [ ! -d "venv" ]; then
    echo "📦 Создание виртуального окружения..."
    $PYTHON312 -m venv venv
    echo "✅ venv создано"
else
    echo "✅ Виртуальное окружение уже существует"
fi

echo ""

# Активация виртуального окружения
echo "🔌 Активация виртуального окружения..."
source venv/bin/activate

# Обновление pip
echo "📦 Обновление pip..."
pip install --upgrade pip setuptools wheel

echo ""

# Установка зависимостей
echo "📥 Установка зависимостей из requirements.txt..."
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Установка завершена!"
    echo ""
    echo "📝 Создайте .env файл если еще не создан:"
    echo "   cp .env.example .env"
    echo "   # Отредактируйте .env"
    echo ""
    echo "Для запуска backend выполните:"
    echo "   ./bin/webapp/dev-backend.sh"
else
    echo ""
    echo "⚠️  Были ошибки при установке зависимостей"
    exit 1
fi

