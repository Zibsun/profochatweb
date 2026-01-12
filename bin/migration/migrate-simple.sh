#!/bin/bash

# ============================================================================
# Simple Migration Script (Quick Start)
# ============================================================================
# This is a simplified version that loads .env and runs migration
# Usage: ./bin/migration/migrate-simple.sh
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Load .env file if exists
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | xargs)
fi

# Run main migration script
exec "$SCRIPT_DIR/migrate.sh" "$@"
