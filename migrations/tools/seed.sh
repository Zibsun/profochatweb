#!/bin/bash

# ============================================================================
# Seed Data Script
# ============================================================================
# Description: Applies seed data migrations
# Usage: ./migrations/tools/seed.sh [--dry-run]
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEEDS_DIR="$(cd "$SCRIPT_DIR/../seeds" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

DRY_RUN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [--dry-run]"
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
    echo "DATABASE_URL must be set to apply seed data."
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

# Get all seed files
get_all_seeds() {
    ls -1 "$SEEDS_DIR"/*.sql 2>/dev/null | xargs -n1 basename | \
        sed 's/\.sql$//' | sort -V || true
}

# Apply seed
apply_seed() {
    local seed_file="$1"
    local seed_name=$(basename "$seed_file")
    
    if [ "$DRY_RUN" = true ]; then
        echo "[DRY RUN] Would apply: $seed_name"
        return 0
    fi
    
    echo "Applying seed: $seed_name"
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$seed_file"; then
        echo "✓ Applied: $seed_name"
        return 0
    else
        echo "✗ Failed: $seed_name"
        return 1
    fi
}

# Main
echo "Applying seed data..."

ALL_SEEDS=$(get_all_seeds)

if [ -z "$ALL_SEEDS" ]; then
    echo "No seed files found in $SEEDS_DIR"
    exit 0
fi

APPLIED=0
for seed in $ALL_SEEDS; do
    seed_file="$SEEDS_DIR/${seed}.sql"
    if apply_seed "$seed_file"; then
        APPLIED=$((APPLIED + 1))
    else
        echo "Seed failed. Stopping."
        exit 1
    fi
done

if [ $APPLIED -eq 0 ]; then
    echo "No seeds to apply."
else
    echo "Applied $APPLIED seed(s)."
fi

unset PGPASSWORD
