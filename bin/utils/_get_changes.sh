#!/bin/bash
# Скрипт для сбора списка измененных файлов и создания changed.txt
#
# Использование:
#   bin/utils/_get_changes.sh [коммит_или_ветка]
#
# Примеры:
#   bin/utils/_get_changes.sh          - только незакоммиченные изменения (staged, unstaged, untracked) относительно HEAD
#   bin/utils/_get_changes.sh HEAD~1   - изменения из последнего коммита + незакоммиченные изменения
#   bin/utils/_get_changes.sh main     - изменения относительно ветки main + незакоммиченные изменения
#

COMMIT=${1:-HEAD}

> changed.txt

# Получаем измененные файлы из коммитов в диапазоне COMMIT..HEAD
for commit in $(git rev-list --reverse "${COMMIT}"..HEAD 2>/dev/null); do
  git diff-tree --no-commit-id --name-only -r --diff-filter=AM "$commit" | \
  grep -vE "^docs/|^venv/|^tests/|^AGENTS\.md$|^CLAUDE\.md$" >> changed.txt
done

# Добавляем незакоммиченные изменения (staged + unstaged) относительно HEAD
git diff HEAD --name-only --diff-filter=AM | \
grep -vE "^docs/|^venv/|^tests/|^AGENTS\.md$|^CLAUDE\.md$" >> changed.txt

# Добавляем неотслеживаемые (untracked) файлы
git ls-files --others --exclude-standard | \
grep -vE "^docs/|^venv/|^tests/|^AGENTS\.md$|^CLAUDE\.md$" >> changed.txt

# Оставляем только уникальные пути к файлам
sort -u changed.txt -o changed.txt

echo "✅ Файл changed.txt создан!"
echo "Количество файлов: $(wc -l < changed.txt | tr -d ' ')"
echo "Список файлов:"
cat changed.txt
