#!/bin/bash

# ============================================================================
# Create Migration Script
# ============================================================================
# Description: Creates a new migration file with proper numbering
# Usage: ./migrations/tools/create_migration.sh <description>
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$(cd "$SCRIPT_DIR/../versions" && pwd)"
TEMPLATE_FILE="$SCRIPT_DIR/../templates/migration_template.sql"

if [ $# -eq 0 ]; then
    echo "Usage: $0 <description>"
    echo "Example: $0 add_user_preferences"
    exit 1
fi

DESCRIPTION="$1"
DESCRIPTION_CLEAN=$(echo "$DESCRIPTION" | tr '[:upper:]' '[:lower:]' | tr ' ' '_' | sed 's/[^a-z0-9_]//g')

# Find the highest migration number
LAST_MIGRATION=$(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort -V | tail -1)

if [ -z "$LAST_MIGRATION" ]; then
    NEXT_NUMBER="0001"
else
    LAST_NUMBER=$(basename "$LAST_MIGRATION" | cut -d'_' -f1)
    NEXT_NUMBER=$(printf "%04d" $((10#$LAST_NUMBER + 1)))
fi

MIGRATION_FILE="$MIGRATIONS_DIR/${NEXT_NUMBER}_${DESCRIPTION_CLEAN}.sql"

# Create template if it doesn't exist
if [ ! -f "$TEMPLATE_FILE" ]; then
    mkdir -p "$(dirname "$TEMPLATE_FILE")"
    cat > "$TEMPLATE_FILE" << 'EOF'
-- ============================================================================
-- Migration: <номер>_<описание>
-- ============================================================================
-- Description: <Подробное описание изменений>
-- Author: <Имя автора>
-- Date: <YYYY-MM-DD>
-- Related: <Issue/Ticket номер или ссылка>
-- ============================================================================

BEGIN;

-- ============================================================================
-- Changes
-- ============================================================================

-- TODO: Добавить SQL изменения здесь

-- ============================================================================
-- Validation (optional)
-- ============================================================================

-- TODO: Добавить проверки если нужно

-- ============================================================================
-- Record migration
-- ============================================================================

INSERT INTO schema_migrations (version, description, applied_by)
VALUES ('<номер>', '<Описание>', current_user)
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ============================================================================
-- Rollback (optional)
-- ============================================================================
-- Для отката выполнить:
-- BEGIN;
-- <SQL для отката>
-- DELETE FROM schema_migrations WHERE version = '<номер>';
-- COMMIT;
EOF
fi

# Create migration file from template
sed -e "s/<номер>/$NEXT_NUMBER/g" \
    -e "s/<описание>/$DESCRIPTION_CLEAN/g" \
    -e "s/<Описание>/$DESCRIPTION/g" \
    -e "s/<Подробное описание изменений>/$DESCRIPTION/g" \
    -e "s/<Имя автора>/$USER/g" \
    -e "s/<YYYY-MM-DD>/$(date +%Y-%m-%d)/g" \
    "$TEMPLATE_FILE" > "$MIGRATION_FILE"

echo "Created migration: $MIGRATION_FILE"
echo ""
echo "Edit the file to add your SQL changes:"
echo "  $EDITOR $MIGRATION_FILE"
