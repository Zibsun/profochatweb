#!/bin/bash

# ============================================================================
# Initialize Migration History Script
# ============================================================================
# Description: Creates schema_migrations table for tracking applied migrations
# Usage: ./migrations/tools/init_history.sh
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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
    echo "DATABASE_URL must be set to initialize migration history."
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

echo "Initializing migration history table..."

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Create schema_migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    description TEXT,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    applied_by TEXT,
    execution_time_ms INT
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at 
ON schema_migrations(applied_at);

-- Show current status
SELECT 
    'Migration history table created successfully!' as status,
    COUNT(*) as existing_migrations
FROM schema_migrations;
EOF

echo ""
echo "✓ Migration history table initialized"

unset PGPASSWORD
