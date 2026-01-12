#!/bin/bash

echo "🔄 Пересоздание виртуального окружения с Python 3.12"
echo ""

cd "$(dirname "$0")" || exit

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

# Удаление старого venv
if [ -d "venv" ]; then
    echo "🗑️  Удаление старого venv..."
    rm -rf venv
    echo "✅ Старое venv удалено"
    echo ""
fi

# Создание нового venv
echo "📦 Создание нового venv с Python 3.12..."
$PYTHON312 -m venv venv

if [ $? -ne 0 ]; then
    echo "❌ Ошибка при создании venv"
    exit 1
fi

echo "✅ Новое venv создано"
echo ""

# Активация и проверка
echo "🔌 Активация venv..."
source venv/bin/activate

echo "✅ venv активирован"
echo "   Python версия: $(python --version)"
echo "   Python путь: $(which python)"
echo ""

# Обновление pip
echo "📦 Обновление pip..."
pip install --upgrade pip setuptools wheel

echo ""
echo "✅ pip обновлен"
echo "   pip версия: $(pip --version)"
echo ""

# Установка зависимостей
echo "📥 Установка зависимостей из requirements.txt..."
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Все зависимости успешно установлены!"
    echo ""
    echo "🎉 Виртуальное окружение готово к использованию!"
    echo ""
    echo "Для активации в будущем выполните:"
    echo "  cd webapp/backend"
    echo "  source venv/bin/activate"
    echo ""
    echo "Для запуска backend:"
    echo "  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
else
    echo ""
    echo "⚠️  Были ошибки при установке зависимостей"
    echo "Проверьте вывод выше для деталей"
    exit 1
fi

