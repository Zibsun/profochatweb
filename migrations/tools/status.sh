#!/bin/bash

# ============================================================================
# Migration Status Script
# ============================================================================
# Description: Shows status of migrations
# Usage: ./migrations/tools/status.sh
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$(cd "$SCRIPT_DIR/../versions" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Load DATABASE_URL
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | xargs)
fi

if [ -z "${DATABASE_URL:-}" ]; then
    echo "Error: DATABASE_URL is not set"
    exit 1
fi

# Parse DATABASE_URL
if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASSWORD="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
elif [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^/]+)/(.+) ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASSWORD="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="5432"
    DB_NAME="${BASH_REMATCH[4]}"
else
    echo "Error: Invalid DATABASE_URL format"
    exit 1
fi

export PGPASSWORD="$DB_PASSWORD"

# Check if schema_migrations table exists
TABLE_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'schema_migrations');" 2>/dev/null | tr -d ' ')

if [ "$TABLE_EXISTS" != "t" ]; then
    echo "Warning: schema_migrations table does not exist."
    echo "Run migrations/tools/init_history.sh first."
    exit 1
fi

# Get applied migrations
APPLIED=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT version FROM schema_migrations ORDER BY version;" 2>/dev/null | \
    tr -d ' ' | grep -v '^$' || true)

# Get all migration files
ALL_MIGRATIONS=$(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | xargs -n1 basename | \
    sed 's/\.sql$//' | sort -V || true)

echo "Migration Status"
echo "================"
echo ""

if [ -z "$ALL_MIGRATIONS" ]; then
    echo "No migration files found."
    exit 0
fi

PENDING_COUNT=0
APPLIED_COUNT=0

for migration in $ALL_MIGRATIONS; do
    if echo "$APPLIED" | grep -q "^${migration}$"; then
        echo "✓ $migration (applied)"
        APPLIED_COUNT=$((APPLIED_COUNT + 1))
    else
        echo "○ $migration (pending)"
        PENDING_COUNT=$((PENDING_COUNT + 1))
    fi
done

echo ""
echo "Summary:"
echo "  Applied:  $APPLIED_COUNT"
echo "  Pending: $PENDING_COUNT"
echo "  Total:   $((APPLIED_COUNT + PENDING_COUNT))"

unset PGPASSWORD
