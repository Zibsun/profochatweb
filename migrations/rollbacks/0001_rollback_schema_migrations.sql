-- ============================================================================
-- Rollback: 0001_create_schema_migrations
-- ============================================================================
-- Description: Rollback for schema_migrations table creation
-- ============================================================================

BEGIN;

-- Drop indexes
DROP INDEX IF EXISTS idx_schema_migrations_applied_at;

-- Drop table
DROP TABLE IF EXISTS schema_migrations;

-- Remove from migration history (if exists)
-- Note: This won't work if table doesn't exist, but that's fine
DELETE FROM schema_migrations WHERE version = '0001';

COMMIT;
