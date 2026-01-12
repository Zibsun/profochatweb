# Версии Python в проекте

## Текущая ситуация

### Основной проект (Telegram бот)
- **Python 3.12** (используется в основном venv)
- Требования: Python 3.12+ (из документации)

### Webapp Backend
- **Dockerfile**: Python 3.12-slim
- **Виртуальное окружение**: Python 3.13.1 ⚠️ **НЕСООТВЕТСТВИЕ**

## Проблема

Виртуальное окружение webapp создано с Python 3.13.1, но:
- Dockerfile использует Python 3.12
- Основной проект использует Python 3.12
- Это может вызвать проблемы совместимости

## Решение

### Вариант 1: Пересоздать venv с Python 3.12 (рекомендуется)

```bash
cd webapp/backend

# Удалите старое окружение
rm -rf venv

# Создайте новое с Python 3.12
python3.12 -m venv venv

# Или если python3.12 не найден, используйте python3 (но убедитесь что это 3.12)
python3 -m venv venv

# Активируйте
source venv/bin/activate

# Проверьте версию
python --version  # Должно быть Python 3.12.x

# Установите зависимости
pip install --upgrade pip
pip install -r requirements.txt
```

### Вариант 2: Использовать Python 3.13 (если хотите)

Если хотите использовать Python 3.13, обновите Dockerfile:

```dockerfile
FROM python:3.13-slim
```

Но убедитесь, что все зависимости совместимы с Python 3.13.

### Вариант 3: Использовать pyenv для управления версиями

```bash
# Установите pyenv (если еще не установлен)
brew install pyenv

# Установите Python 3.12
pyenv install 3.12.7

# Установите локальную версию для проекта
cd webapp/backend
pyenv local 3.12.7

# Пересоздайте venv
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Рекомендация

**Используйте Python 3.12** для обоих проектов:
- ✅ Совместимость с основным проектом
- ✅ Стабильность (3.12 - LTS версия)
- ✅ Все зависимости протестированы на 3.12

## Проверка версии

После пересоздания venv проверьте:

```bash
source venv/bin/activate
python --version
which python  # Должен указывать на venv/bin/python
```

