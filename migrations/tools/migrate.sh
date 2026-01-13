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
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

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

# Load DATABASE_URL from multiple locations
if [ -z "${DATABASE_URL:-}" ] && [ -f "$PROJECT_ROOT/.env" ]; then
    DATABASE_URL=$(grep -E '^DATABASE_URL=' "$PROJECT_ROOT/.env" | cut -d'=' -f2- | sed 's/^["'\'']//; s/["'\'']$//' | head -1)
    export DATABASE_URL
fi

if [ -z "${DATABASE_URL:-}" ] && [ -f "$PROJECT_ROOT/webapp/backend/.env" ]; then
    DATABASE_URL=$(grep -E '^DATABASE_URL=' "$PROJECT_ROOT/webapp/backend/.env" | cut -d'=' -f2- | sed 's/^["'\'']//; s/["'\'']$//' | head -1)
    export DATABASE_URL
fi

if [ -z "${DATABASE_URL:-}" ]; then
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "  ERROR: DATABASE_URL is not set"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo "DATABASE_URL must be set to run migrations."
    echo ""
    echo "You can set it in one of the following ways:"
    echo ""
    echo "1. Create a .env file in the project root:"
    echo "   $PROJECT_ROOT/.env"
    echo ""
    echo "2. Create a .env file in the backend directory:"
    echo "   $PROJECT_ROOT/webapp/backend/.env"
    echo ""
    echo "3. Export it as an environment variable:"
    echo "   export DATABASE_URL='postgresql://user:password@host:port/database'"
    echo ""
    echo "Format: postgresql://[user]:[password]@[host]:[port]/[database]"
    echo ""
    echo "Example:"
    echo "   DATABASE_URL=postgresql://myuser:mypass@localhost:5432/mydb"
    echo ""
    echo "For more information, see: migrations/DATABASE_URL_SETUP.md"
    echo ""
    exit 1
fi

# Normalize DATABASE_URL (remove spaces, quotes, convert postgres:// to postgresql://)
DATABASE_URL=$(echo "$DATABASE_URL" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//' | sed 's/^["'\'']//; s/["'\'']$//' | sed 's|^postgres://|postgresql://|')

# Parse DATABASE_URL
# Support formats:
# - postgresql://user:password@host:port/database
# - postgresql://user:password@host/database (default port 5432)
# - postgresql://user:@host:port/database (empty password)
# - postgresql://user:@host/database (empty password, default port)

if [[ $DATABASE_URL =~ ^postgresql://([^:]+):([^@]*)@([^:]+):([^/]+)/(.+)$ ]]; then
    # Format: postgresql://user:password@host:port/database (password can be empty)
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASSWORD="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
elif [[ $DATABASE_URL =~ ^postgresql://([^:]+):([^@]*)@([^/]+)/(.+)$ ]]; then
    # Format: postgresql://user:password@host/database (password can be empty, default port)
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASSWORD="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="5432"
    DB_NAME="${BASH_REMATCH[4]}"
else
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "  ERROR: Invalid DATABASE_URL format"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    # Mask password in display
    MASKED_URL=$(echo "$DATABASE_URL" | sed 's/:\/\/[^:]*:[^@]*@/:\/\/***:***@/' 2>/dev/null || echo "$DATABASE_URL")
    echo "Received value: $MASKED_URL"
    echo ""
    echo "Expected format: postgresql://[user]:[password]@[host]:[port]/[database]"
    echo ""
    echo "Examples:"
    echo "  postgresql://user:password@localhost:5432/database"
    echo "  postgresql://user:password@localhost/database  (port defaults to 5432)"
    echo "  postgresql://user:@localhost:5432/database  (empty password)"
    echo "  postgresql://user:@localhost/database  (empty password, default port)"
    echo ""
    echo "Common issues:"
    echo "  - Missing 'postgresql://' prefix"
    echo "  - Special characters in password need URL encoding"
    echo "  - Spaces or quotes around the value"
    echo ""
    echo "For more information, see: migrations/DATABASE_URL_SETUP.md"
    echo ""
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

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Apply migration
apply_migration() {
    local migration_file="$1"
    local migration_name=$(basename "$migration_file")
    local migration_version=$(basename "$migration_file" .sql | cut -d'_' -f1)
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${BLUE}[DRY RUN]${NC} Would apply: $migration_name"
        return 0
    fi
    
    echo -e "${BLUE}Applying:${NC} $migration_name"
    
    local start_time=$(date +%s%N)
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file" 2>&1; then
        local end_time=$(date +%s%N)
        local duration_ms=$(( (end_time - start_time) / 1000000 ))
        
        # Update execution time if migration was recorded
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
            "UPDATE schema_migrations SET execution_time_ms = $duration_ms WHERE version = '$migration_version';" \
            > /dev/null 2>&1 || true
        
        echo -e "${GREEN}✓ Applied:${NC} $migration_name (${duration_ms}ms)"
        return 0
    else
        echo -e "${RED}✗ Failed:${NC} $migration_name"
        return 1
    fi
}

# Main
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  Migration Runner${NC}                                           ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY RUN MODE]${NC} No changes will be made"
    echo ""
fi

echo "Checking migration status..."

APPLIED=$(get_applied_migrations)
ALL_MIGRATIONS=$(get_all_migrations)

if [ -z "$ALL_MIGRATIONS" ]; then
    echo "No migration files found in $MIGRATIONS_DIR"
    exit 0
fi

# Check if schema_migrations table exists
TABLE_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'schema_migrations');" 2>/dev/null | tr -d ' ')

if [ "$TABLE_EXISTS" != "t" ]; then
    echo -e "${YELLOW}Warning:${NC} schema_migrations table does not exist."
    echo "The first migration (0001_create_schema_migrations.sql) will create it."
    echo ""
fi

PENDING=0
PENDING_LIST=""

for migration in $ALL_MIGRATIONS; do
    if ! echo "$APPLIED" | grep -q "^${migration}$"; then
        if [ -n "$TARGET_VERSION" ] && [ "$migration" \> "$TARGET_VERSION" ]; then
            break
        fi
        PENDING_LIST="$PENDING_LIST $migration"
        PENDING=$((PENDING + 1))
    fi
done

if [ $PENDING -eq 0 ]; then
    echo -e "${GREEN}✓ All migrations are up to date.${NC}"
    echo ""
    echo "Applied migrations:"
    echo "$APPLIED" | while read -r version; do
        echo "  ✓ $version"
    done
    exit 0
fi

echo -e "${YELLOW}Found $PENDING pending migration(s):${NC}"
for migration in $PENDING_LIST; do
    echo "  ○ $migration"
done
echo ""

if [ "$DRY_RUN" = false ]; then
    read -p "Apply these migrations? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Migration cancelled"
        exit 0
    fi
    echo ""
fi

APPLIED_COUNT=0
for migration in $PENDING_LIST; do
    if [ -n "$TARGET_VERSION" ] && [ "$migration" \> "$TARGET_VERSION" ]; then
        break
    fi
    
    migration_file="$MIGRATIONS_DIR/${migration}.sql"
    if apply_migration "$migration_file"; then
        APPLIED_COUNT=$((APPLIED_COUNT + 1))
    else
        echo ""
        echo -e "${RED}Migration failed. Stopping.${NC}"
        echo "You may need to manually fix the issue and re-run migrations."
        exit 1
    fi
done

echo ""
if [ $APPLIED_COUNT -gt 0 ]; then
    echo -e "${GREEN}✓ Successfully applied $APPLIED_COUNT migration(s).${NC}"
else
    echo "No migrations were applied."
fi

unset PGPASSWORD
