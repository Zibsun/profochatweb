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
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

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
    echo "DATABASE_URL must be set to check migration status."
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

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  Migration Status${NC}                                          ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ -z "$ALL_MIGRATIONS" ]; then
    echo "No migration files found."
    exit 0
fi

PENDING_COUNT=0
APPLIED_COUNT=0

echo "Migrations:"
echo ""

for migration in $ALL_MIGRATIONS; do
    if echo "$APPLIED" | grep -q "^${migration}$"; then
        # Get applied date if available
        APPLIED_DATE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
            "SELECT TO_CHAR(applied_at, 'YYYY-MM-DD HH24:MI') FROM schema_migrations WHERE version = '$migration';" 2>/dev/null | tr -d ' ' || echo "")
        
        if [ -n "$APPLIED_DATE" ]; then
            echo -e "  ${GREEN}✓${NC} $migration ${GREEN}(applied: $APPLIED_DATE)${NC}"
        else
            echo -e "  ${GREEN}✓${NC} $migration ${GREEN}(applied)${NC}"
        fi
        APPLIED_COUNT=$((APPLIED_COUNT + 1))
    else
        echo -e "  ${YELLOW}○${NC} $migration ${YELLOW}(pending)${NC}"
        PENDING_COUNT=$((PENDING_COUNT + 1))
    fi
done

echo ""
echo "Summary:"
echo -e "  ${GREEN}Applied:${NC}  $APPLIED_COUNT"
echo -e "  ${YELLOW}Pending:${NC}  $PENDING_COUNT"
echo -e "  ${BLUE}Total:${NC}    $((APPLIED_COUNT + PENDING_COUNT))"

if [ $PENDING_COUNT -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}Run './migrations/tools/migrate.sh' to apply pending migrations${NC}"
fi

unset PGPASSWORD
