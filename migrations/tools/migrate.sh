#!/bin/bash

# ============================================================================
# Migration Runner Script
# ============================================================================
# Description: Applies all pending migrations
# Usage: ./migrations/tools/migrate.sh [--dry-run] [--to VERSION]
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$(cd "$SCRIPT_DIR/../versions" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

DRY_RUN=false
TARGET_VERSION=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --to)
            TARGET_VERSION="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [--dry-run] [--to VERSION]"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

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

# Get applied migrations
get_applied_migrations() {
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT version FROM schema_migrations ORDER BY version;" 2>/dev/null | \
        tr -d ' ' | grep -v '^$' || true
}

# Get all migration files
get_all_migrations() {
    ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | xargs -n1 basename | \
        sed 's/\.sql$//' | sort -V
}

# Apply migration
apply_migration() {
    local migration_file="$1"
    local migration_name=$(basename "$migration_file")
    
    if [ "$DRY_RUN" = true ]; then
        echo "[DRY RUN] Would apply: $migration_name"
        return 0
    fi
    
    echo "Applying: $migration_name"
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file"; then
        echo "✓ Applied: $migration_name"
        return 0
    else
        echo "✗ Failed: $migration_name"
        return 1
    fi
}

# Main
echo "Checking migration status..."

APPLIED=$(get_applied_migrations)
ALL_MIGRATIONS=$(get_all_migrations)

if [ -z "$ALL_MIGRATIONS" ]; then
    echo "No migration files found in $MIGRATIONS_DIR"
    exit 0
fi

PENDING=0
for migration in $ALL_MIGRATIONS; do
    if ! echo "$APPLIED" | grep -q "^${migration}$"; then
        if [ -n "$TARGET_VERSION" ] && [ "$migration" \> "$TARGET_VERSION" ]; then
            break
        fi
        
        migration_file="$MIGRATIONS_DIR/${migration}.sql"
        if ! apply_migration "$migration_file"; then
            echo "Migration failed. Stopping."
            exit 1
        fi
        PENDING=$((PENDING + 1))
    fi
done

if [ $PENDING -eq 0 ]; then
    echo "All migrations are up to date."
else
    echo "Applied $PENDING migration(s)."
fi

unset PGPASSWORD
