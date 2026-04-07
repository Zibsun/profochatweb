#!/bin/bash
# Скрипт для "пуша" измененных файлов на сервер через tar over ssh
# Скрипт читает пути из changed.txt и распаковывает их по тем же путям на сервере.
# ТИПИЧНЫЙ ПРОЦЕСС:
# local: sh cmd/_get_changes <the oldest commit>
# local: sh cmd/_deploy.sh -f changed.txt
# server: sh backup.sh tmp
# local: sh _deploy.sh
# server: sh restore tmp

MODE="list"
FILES_LIST="changed.txt"
SINGLE_FILE=""
PORT=22
USER_HOST="profoweb@scrumtrek.ru"
DEST_DIR="/var/www/profochatweb"

# Разбор параметров командной строки
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -f|--file) MODE="single"; SINGLE_FILE="$2"; shift ;;
        -p|--port) PORT="$2"; shift ;;
        -h|--host) USER_HOST="$2"; shift ;;
        -d|--dest) DEST_DIR="$2"; shift ;;
        *) 
            echo "Использование: $0 [-f specific_file] [-p port] [-h user@host] [-d dest_dir]"
            echo "Пример 1 (загружаем файлы из changed.txt): $0"
            echo "Пример 2 (один конкретный файл): $0 -f elements/message.py"
            exit 1 
            ;;
    esac
    shift
done

#if [ ! -f "changed.txt" ]; then
#  echo "❌ Ошибка: файл changed.txt не найден! Запустите сначала cmd/deploy/get_changes.sh"
#  exit 1
#fi

echo "🚀 Деплой файлов на $USER_HOST:$PORT в папку $DEST_DIR..."

if [ "$MODE" = "single" ]; then
    if [ ! -f "$SINGLE_FILE" ]; then
        echo "❌ Ошибка: файл $SINGLE_FILE не найден!"
        exit 1
    fi
    echo "📦 Деплоим только один файл: $SINGLE_FILE"
    tar cf - "$SINGLE_FILE" | ssh -p "$PORT" "$USER_HOST" "cd $DEST_DIR && tar xvf -"

    if [ $? -eq 0 ]; then
        echo "✅ Деплой файла $SINGLE_FILE успешно завершен!"
    else
        echo "❌ Ошибка при деплое."
        exit 1
    fi
else
    if [ ! -f "$FILES_LIST" ]; then
        echo "❌ Ошибка: файл $FILES_LIST не найден! Сначала запустите cmd/_get_changes.sh"
        exit 1
    fi
    echo "📦 Деплоим измененные файлы по списку из $FILES_LIST..."
    # Флаг -T заставляет tar читать список файлов из $FILES_LIST.
    tar cf - -T "$FILES_LIST" | ssh -p "$PORT" "$USER_HOST" "cd $DEST_DIR && tar xvf -"
    
    if [ $? -eq 0 ]; then
        echo "✅ Деплой (по списку из $FILES_LIST) успешно завершен!"
    else
        echo "❌ Ошибка при деплое."
        exit 1
    fi
fi
