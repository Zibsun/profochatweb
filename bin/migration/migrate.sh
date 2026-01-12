#!/bin/bash

# ============================================================================
# Migration Script: Transition to SaaS Architecture
# ============================================================================
# Description: Automated migration script with backup and validation
# Usage: ./bin/migration/migrate.sh [--dry-run] [--skip-backup] [--rollback]
# ============================================================================

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory (this script is in bin/migration/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Migration files (all in the same directory as this script)
MIGRATION_SQL="$SCRIPT_DIR/migration_to_saas.sql"
VALIDATION_SQL="$SCRIPT_DIR/validate_migration.sql"
BACKUP_DIR="$PROJECT_ROOT/backups"

# Flags
DRY_RUN=false
SKIP_BACKUP=false
ROLLBACK=false

# Database connection parameters (will be parsed from DATABASE_URL)
DB_HOST=""
DB_PORT=""
DB_NAME=""
DB_USER=""
DB_PASSWORD=""

# Backup file path
BACKUP_FILE=""

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_step() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}▶ $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

parse_database_url() {
    local db_url="${DATABASE_URL:-}"
    
    if [ -z "$db_url" ]; then
        log_error "DATABASE_URL environment variable is not set"
        log_info "Please set it in .env file or export it:"
        log_info "  export DATABASE_URL='postgresql://user:password@host:port/database'"
        exit 1
    fi
    
    # Parse postgresql://user:password@host:port/database
    if [[ $db_url =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
        DB_USER="${BASH_REMATCH[1]}"
        DB_PASSWORD="${BASH_REMATCH[2]}"
        DB_HOST="${BASH_REMATCH[3]}"
        DB_PORT="${BASH_REMATCH[4]}"
        DB_NAME="${BASH_REMATCH[5]}"
    elif [[ $db_url =~ postgresql://([^:]+):([^@]+)@([^/]+)/(.+) ]]; then
        # Without port (default 5432)
        DB_USER="${BASH_REMATCH[1]}"
        DB_PASSWORD="${BASH_REMATCH[2]}"
        DB_HOST="${BASH_REMATCH[3]}"
        DB_PORT="5432"
        DB_NAME="${BASH_REMATCH[4]}"
    else
        log_error "Invalid DATABASE_URL format. Expected: postgresql://user:password@host:port/database"
        exit 1
    fi
    
    log_info "Database: $DB_NAME @ $DB_HOST:$DB_PORT"
    log_info "User: $DB_USER"
}

test_connection() {
    log_info "Testing database connection..."
    
    export PGPASSWORD="$DB_PASSWORD"
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        log_success "Database connection successful"
    else
        log_error "Cannot connect to database. Please check your DATABASE_URL"
        exit 1
    fi
    unset PGPASSWORD
}

create_backup() {
    if [ "$SKIP_BACKUP" = true ]; then
        log_warning "Skipping backup (--skip-backup flag)"
        return
    fi
    
    log_step "Creating Database Backup"
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Generate backup filename with timestamp
    local timestamp=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/profochatbot_backup_${timestamp}.dump"
    
    log_info "Backup file: $BACKUP_FILE"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would create backup: $BACKUP_FILE"
    else
        if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F c -f "$BACKUP_FILE"; then
            log_success "Backup created successfully"
            log_info "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
        else
            log_error "Backup failed"
            exit 1
        fi
    fi
    
    unset PGPASSWORD
}

restore_backup() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    log_step "Restoring Database from Backup"
    
    log_warning "This will DROP all existing data and restore from backup!"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log_info "Restore cancelled"
        exit 0
    fi
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Drop existing connections
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();
    " > /dev/null 2>&1 || true
    
    # Drop and recreate database
    log_info "Dropping existing database..."
    dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" || true
    
    log_info "Creating new database..."
    createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
    
    log_info "Restoring from backup..."
    if pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$backup_file"; then
        log_success "Database restored successfully"
    else
        log_error "Restore failed"
        exit 1
    fi
    
    unset PGPASSWORD
}

run_migration() {
    log_step "Running Migration"
    
    if [ ! -f "$MIGRATION_SQL" ]; then
        log_error "Migration SQL file not found: $MIGRATION_SQL"
        exit 1
    fi
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would run migration: $MIGRATION_SQL"
        log_info "Migration SQL preview (first 50 lines):"
        head -n 50 "$MIGRATION_SQL"
        return
    fi
    
    export PGPASSWORD="$DB_PASSWORD"
    
    log_info "Executing migration script..."
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_SQL" 2>&1 | tee /tmp/migration_output.log; then
        log_success "Migration completed successfully"
    else
        log_error "Migration failed. Check /tmp/migration_output.log for details"
        log_error "You can restore from backup: $BACKUP_FILE"
        exit 1
    fi
    
    unset PGPASSWORD
}

validate_migration() {
    log_step "Validating Migration"
    
    if [ ! -f "$VALIDATION_SQL" ]; then
        log_warning "Validation SQL file not found: $VALIDATION_SQL"
        log_info "Skipping validation"
        return
    fi
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would run validation: $VALIDATION_SQL"
        return
    fi
    
    export PGPASSWORD="$DB_PASSWORD"
    
    log_info "Running validation checks..."
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$VALIDATION_SQL" 2>&1 | tee /tmp/validation_output.log; then
        # Check for errors in validation
        if grep -qi "FAILED\|ERROR\|issues" /tmp/validation_output.log; then
            log_warning "Validation found some issues. Check /tmp/validation_output.log"
        else
            log_success "Validation passed"
        fi
    else
        log_warning "Validation script encountered errors. Check /tmp/validation_output.log"
    fi
    
    unset PGPASSWORD
}

list_backups() {
    log_step "Available Backups"
    
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
        log_info "No backups found in $BACKUP_DIR"
        return
    fi
    
    echo ""
    printf "%-50s %15s %20s\n" "Filename" "Size" "Date"
    echo "─────────────────────────────────────────────────────────────────────────────"
    
    for backup in "$BACKUP_DIR"/*.dump; do
        if [ -f "$backup" ]; then
            local filename=$(basename "$backup")
            local size=$(du -h "$backup" | cut -f1)
            local date=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$backup" 2>/dev/null || stat -c "%y" "$backup" 2>/dev/null | cut -d' ' -f1,2 | cut -d'.' -f1)
            printf "%-50s %15s %20s\n" "$filename" "$size" "$date"
        fi
    done
    echo ""
}

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    --dry-run          Show what would be done without actually doing it
    --skip-backup      Skip creating backup (not recommended)
    --rollback FILE    Restore database from backup file
    --list-backups     List all available backups
    --help             Show this help message

Examples:
    # Normal migration with backup
    $0

    # Dry run to see what would happen
    $0 --dry-run

    # Skip backup (dangerous!)
    $0 --skip-backup

    # Restore from backup
    $0 --rollback backups/profochatbot_backup_20240101_120000.dump

    # List available backups
    $0 --list-backups

Environment Variables:
    DATABASE_URL       PostgreSQL connection string (required)
                      Format: postgresql://user:password@host:port/database

EOF
}

# ============================================================================
# Main Script
# ============================================================================

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --rollback)
                ROLLBACK=true
                BACKUP_FILE="$2"
                shift 2
                ;;
            --list-backups)
                list_backups
                exit 0
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Handle rollback
    if [ "$ROLLBACK" = true ]; then
        if [ -z "$BACKUP_FILE" ]; then
            log_error "Backup file not specified"
            show_usage
            exit 1
        fi
        parse_database_url
        test_connection
        restore_backup "$BACKUP_FILE"
        exit 0
    fi
    
    # Print banner
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  ${GREEN}ProfoChatBot SaaS Migration Script${NC}                                    ${BLUE}║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN MODE - No changes will be made"
    fi
    
    # Check prerequisites
    log_step "Checking Prerequisites"
    check_command psql
    check_command pg_dump
    check_command pg_restore
    
    # Parse database URL
    parse_database_url
    
    # Test connection
    test_connection
    
    # Check if migration SQL exists
    if [ ! -f "$MIGRATION_SQL" ]; then
        log_error "Migration SQL file not found: $MIGRATION_SQL"
        exit 1
    fi
    
    # Show migration info
    log_step "Migration Information"
    log_info "Migration script: $MIGRATION_SQL"
    log_info "Database: $DB_NAME"
    log_info "Host: $DB_HOST:$DB_PORT"
    
    if [ "$DRY_RUN" = false ]; then
        log_warning "This will modify your database structure!"
        read -p "Continue? (yes/no): " confirm
        
        if [ "$confirm" != "yes" ]; then
            log_info "Migration cancelled"
            exit 0
        fi
    fi
    
    # Create backup
    create_backup
    
    # Run migration
    run_migration
    
    # Validate migration
    validate_migration
    
    # Summary
    log_step "Migration Summary"
    if [ "$DRY_RUN" = false ]; then
        log_success "Migration completed!"
        if [ -n "$BACKUP_FILE" ]; then
            log_info "Backup saved to: $BACKUP_FILE"
        fi
        log_info "Next steps:"
        log_info "  1. Review validation output in /tmp/validation_output.log"
        log_info "  2. Update bot tokens manually (see README.md)"
        log_info "  3. Update application code to use new schema"
        log_info "  4. Test your application thoroughly"
        echo ""
        log_warning "If something went wrong, restore from backup:"
        log_info "  $0 --rollback $BACKUP_FILE"
    else
        log_info "Dry run completed. No changes were made."
    fi
}

# Run main function
main "$@"
