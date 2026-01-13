#!/bin/bash

# ============================================================================
# Rollback Migration Script
# ============================================================================
# Description: Rolls back migrations
# Usage: ./migrations/tools/rollback.sh [VERSION] [--dry-run]
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$(cd "$SCRIPT_DIR/../versions" && pwd)"
ROLLBACKS_DIR="$(cd "$SCRIPT_DIR/../rollbacks" && pwd)"
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
        --help|-h)
            echo "Usage: $0 [VERSION] [--dry-run]"
            echo ""
            echo "Examples:"
            echo "  $0              # Rollback last migration"
            echo "  $0 0005         # Rollback to version 0005"
            echo "  $0 --dry-run    # Show what would be rolled back"
            exit 0
            ;;
        *)
            if [ -z "$TARGET_VERSION" ]; then
                TARGET_VERSION="$1"
            else
                echo "Error: Unknown option or multiple versions specified"
                exit 1
            fi
            shift
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
    echo "DATABASE_URL must be set to rollback migrations."
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

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get applied migrations
get_applied_migrations() {
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT version FROM schema_migrations ORDER BY version DESC;" 2>/dev/null | \
        tr -d ' ' | grep -v '^$' || true
}

# Get rollback SQL for a migration
get_rollback_sql() {
    local version="$1"
    local rollback_file="$ROLLBACKS_DIR/${version}_rollback.sql"
    
    if [ -f "$rollback_file" ]; then
        echo "$rollback_file"
    else
        echo ""
    fi
}

# Rollback migration
rollback_migration() {
    local version="$1"
    local migration_name=$(basename "$1" .sql)
    
    echo -e "${YELLOW}Rolling back: $migration_name${NC}"
    
    # Try to find rollback file
    local rollback_file=$(get_rollback_sql "$version")
    
    if [ -n "$rollback_file" ] && [ -f "$rollback_file" ]; then
        if [ "$DRY_RUN" = true ]; then
            echo "[DRY RUN] Would execute rollback: $rollback_file"
            return 0
        fi
        
        echo "Executing rollback script: $rollback_file"
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$rollback_file"; then
            echo -e "${GREEN}✓ Rolled back: $migration_name${NC}"
            return 0
        else
            echo -e "${RED}✗ Rollback failed: $migration_name${NC}"
            return 1
        fi
    else
        # Manual rollback - just remove from history
        if [ "$DRY_RUN" = true ]; then
            echo "[DRY RUN] Would remove $version from schema_migrations"
            return 0
        fi
        
        echo -e "${YELLOW}Warning: No rollback script found for $version${NC}"
        echo "Removing from migration history only."
        echo ""
        read -p "Continue? (yes/no): " confirm
        
        if [ "$confirm" != "yes" ]; then
            echo "Rollback cancelled"
            return 1
        fi
        
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
            "DELETE FROM schema_migrations WHERE version = '$version';" && \
            echo -e "${GREEN}✓ Removed $version from history${NC}" || \
            echo -e "${RED}✗ Failed to remove from history${NC}"
    fi
}

# Main
echo "Checking rollback status..."

APPLIED=$(get_applied_migrations)

if [ -z "$APPLIED" ]; then
    echo "No applied migrations found."
    exit 0
fi

if [ -z "$TARGET_VERSION" ]; then
    # Rollback last migration
    LAST_MIGRATION=$(echo "$APPLIED" | head -1)
    echo "Rolling back last migration: $LAST_MIGRATION"
    
    if [ "$DRY_RUN" = false ]; then
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            echo "Rollback cancelled"
            exit 0
        fi
    fi
    
    rollback_migration "$LAST_MIGRATION"
else
    # Rollback to specific version
    echo "Rolling back migrations after version: $TARGET_VERSION"
    
    if [ "$DRY_RUN" = false ]; then
        echo -e "${RED}Warning: This will rollback all migrations after $TARGET_VERSION${NC}"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            echo "Rollback cancelled"
            exit 0
        fi
    fi
    
    ROLLED_BACK=0
    for version in $APPLIED; do
        if [ "$version" \> "$TARGET_VERSION" ]; then
            if ! rollback_migration "$version"; then
                echo "Rollback stopped due to error"
                exit 1
            fi
            ROLLED_BACK=$((ROLLED_BACK + 1))
        fi
    done
    
    if [ $ROLLED_BACK -eq 0 ]; then
        echo "No migrations to rollback"
    else
        echo "Rolled back $ROLLED_BACK migration(s)"
    fi
fi

unset PGPASSWORD
