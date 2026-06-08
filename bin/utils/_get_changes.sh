#!/bin/bash
# Скрипт для сбора списка измененных файлов и создания changed.txt
if [ -z "$1" ]; then
  echo "Использование: $0 <коммит_или_ветка>"
  echo "Пример: $0 HEAD~1"
  echo "Пример: $0 main"
  exit 1
fi

COMMIT=$1

# Получаем измененные файлы (A - добавленные, M - измененные)
# Проходим циклом по всем коммитам после заданного вплоть до HEAD
> changed.txt
for commit in $(git rev-list --reverse "${COMMIT}"..HEAD); do
  git diff-tree --no-commit-id --name-only -r --diff-filter=AM "$commit" | \
  grep -vE "^docs/|^venv/|^tests/|^AGENTS\.md$|^CLAUDE\.md$" >> changed.txt
done

# Оставляем только уникальные пути к файлам (так как файл мог меняться в нескольких коммитах)
sort -u changed.txt -o changed.txt

echo "✅ Файл changed.txt создан!"
echo "Количество файлов: $(wc -l < changed.txt | tr -d ' ')"
echo "Список файлов:"
cat changed.txt
