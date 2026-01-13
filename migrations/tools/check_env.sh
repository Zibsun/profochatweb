#!/bin/bash

# ============================================================================
# DATABASE_URL Diagnostic Script
# ============================================================================
# Description: Checks DATABASE_URL configuration and provides diagnostics
# Usage: ./migrations/tools/check_env.sh
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  DATABASE_URL Configuration Check${NC}                            ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check for .env files
echo -e "${CYAN}Checking for .env files...${NC}"
ENV_FOUND=false

if [ -f "$PROJECT_ROOT/.env" ]; then
    echo -e "  ${GREEN}✓${NC} Found: $PROJECT_ROOT/.env"
    ENV_FOUND=true
else
    echo -e "  ${YELLOW}○${NC} Not found: $PROJECT_ROOT/.env"
fi

if [ -f "$PROJECT_ROOT/webapp/backend/.env" ]; then
    echo -e "  ${GREEN}✓${NC} Found: $PROJECT_ROOT/webapp/backend/.env"
    ENV_FOUND=true
else
    echo -e "  ${YELLOW}○${NC} Not found: $PROJECT_ROOT/webapp/backend/.env"
fi

echo ""

# Load DATABASE_URL from multiple locations
if [ -z "${DATABASE_URL:-}" ] && [ -f "$PROJECT_ROOT/.env" ]; then
    DATABASE_URL=$(grep -E '^DATABASE_URL=' "$PROJECT_ROOT/.env" | cut -d'=' -f2- | sed 's/^["'\'']//; s/["'\'']$//' | head -1)
    export DATABASE_URL
fi

if [ -z "${DATABASE_URL:-}" ] && [ -f "$PROJECT_ROOT/webapp/backend/.env" ]; then
    DATABASE_URL=$(grep -E '^DATABASE_URL=' "$PROJECT_ROOT/webapp/backend/.env" | cut -d'=' -f2- | sed 's/^["'\'']//; s/["'\'']$//' | head -1)
    export DATABASE_URL
fi

# Check if DATABASE_URL is set
echo -e "${CYAN}Checking DATABASE_URL...${NC}"
if [ -z "${DATABASE_URL:-}" ]; then
    echo -e "  ${RED}✗${NC} DATABASE_URL is not set"
    echo ""
    echo -e "${YELLOW}To set DATABASE_URL:${NC}"
    echo ""
    echo "1. Create a .env file in one of these locations:"
    echo "   - $PROJECT_ROOT/.env"
    echo "   - $PROJECT_ROOT/webapp/backend/.env"
    echo ""
    echo "2. Add this line to the .env file:"
    echo "   DATABASE_URL=postgresql://user:password@host:port/database"
    echo ""
    echo "3. Or export it as an environment variable:"
    echo "   export DATABASE_URL='postgresql://user:password@host:port/database'"
    echo ""
    echo "For more information, see: migrations/DATABASE_URL_SETUP.md"
    exit 1
else
    echo -e "  ${GREEN}✓${NC} DATABASE_URL is set"
    
    # Mask password in display
    MASKED_URL=$(echo "$DATABASE_URL" | sed 's/:\/\/[^:]*:[^@]*@/:\/\/***:***@/')
    echo -e "  ${BLUE}Value:${NC} $MASKED_URL"
fi

echo ""

# Normalize DATABASE_URL (remove spaces, quotes, convert postgres:// to postgresql://)
DATABASE_URL=$(echo "$DATABASE_URL" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//' | sed 's/^["'\'']//; s/["'\'']$//' | sed 's|^postgres://|postgresql://|')

# Parse DATABASE_URL
# Support formats:
# - postgresql://user:password@host:port/database
# - postgresql://user:password@host/database (default port 5432)
# - postgresql://user:@host:port/database (empty password)
# - postgresql://user:@host/database (empty password, default port)

echo -e "${CYAN}Parsing DATABASE_URL...${NC}"
if [[ $DATABASE_URL =~ ^postgresql://([^:]+):([^@]*)@([^:]+):([^/]+)/(.+)$ ]]; then
    # Format: postgresql://user:password@host:port/database (password can be empty)
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASSWORD="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
    echo -e "  ${GREEN}✓${NC} Format is valid"
    echo -e "  ${BLUE}User:${NC} $DB_USER"
    if [ -z "$DB_PASSWORD" ]; then
        echo -e "  ${BLUE}Password:${NC} (empty)"
    else
        echo -e "  ${BLUE}Password:${NC} ***"
    fi
    echo -e "  ${BLUE}Host:${NC} $DB_HOST"
    echo -e "  ${BLUE}Port:${NC} $DB_PORT"
    echo -e "  ${BLUE}Database:${NC} $DB_NAME"
elif [[ $DATABASE_URL =~ ^postgresql://([^:]+):([^@]*)@([^/]+)/(.+)$ ]]; then
    # Format: postgresql://user:password@host/database (password can be empty, default port)
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASSWORD="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="5432"
    DB_NAME="${BASH_REMATCH[4]}"
    echo -e "  ${GREEN}✓${NC} Format is valid (using default port 5432)"
    echo -e "  ${BLUE}User:${NC} $DB_USER"
    if [ -z "$DB_PASSWORD" ]; then
        echo -e "  ${BLUE}Password:${NC} (empty)"
    else
        echo -e "  ${BLUE}Password:${NC} ***"
    fi
    echo -e "  ${BLUE}Host:${NC} $DB_HOST"
    echo -e "  ${BLUE}Port:${NC} $DB_PORT (default)"
    echo -e "  ${BLUE}Database:${NC} $DB_NAME"
else
    echo -e "  ${RED}✗${NC} Invalid format"
    echo ""
    echo "Expected format: postgresql://user:password@host:port/database"
    echo "Example: postgresql://postgres:mypass@localhost:5432/mydb"
    exit 1
fi

echo ""

# Test connection
echo -e "${CYAN}Testing database connection...${NC}"
export PGPASSWORD="$DB_PASSWORD"

if command -v psql &> /dev/null; then
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Connection successful"
        
        # Get PostgreSQL version
        PG_VERSION=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version();" | head -n1 | xargs)
        echo -e "  ${BLUE}PostgreSQL version:${NC} $PG_VERSION"
        
        # Check if schema_migrations table exists
        TABLE_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'schema_migrations');" 2>/dev/null | tr -d ' ')
        
        if [ "$TABLE_EXISTS" = "t" ]; then
            echo -e "  ${GREEN}✓${NC} schema_migrations table exists"
            
            # Count applied migrations
            MIGRATION_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
                "SELECT COUNT(*) FROM schema_migrations;" 2>/dev/null | tr -d ' ')
            echo -e "  ${BLUE}Applied migrations:${NC} $MIGRATION_COUNT"
        else
            echo -e "  ${YELLOW}○${NC} schema_migrations table does not exist (will be created by first migration)"
        fi
    else
        echo -e "  ${RED}✗${NC} Connection failed"
        echo ""
        echo "Possible issues:"
        echo "  - Database server is not running"
        echo "  - Incorrect host, port, username, password, or database name"
        echo "  - Firewall blocking connection"
        echo "  - Database does not exist"
        echo ""
        echo "Try connecting manually:"
        echo "  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
        unset PGPASSWORD
        exit 1
    fi
else
    echo -e "  ${YELLOW}○${NC} psql command not found (skipping connection test)"
    echo "  Install PostgreSQL client tools to test connection"
fi

unset PGPASSWORD

echo ""
echo -e "${GREEN}✓${NC} Configuration check complete"
