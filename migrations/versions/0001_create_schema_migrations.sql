-- ============================================================================
-- Migration: 0001_create_schema_migrations
-- ============================================================================
-- Description: Create schema_migrations table for tracking applied migrations
-- Author: System
-- Date: 2024-01-01
-- Related: Initial setup
-- Breaking: No
-- ============================================================================

BEGIN;

-- ============================================================================
-- Changes
-- ============================================================================

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

-- ============================================================================
-- Record migration
-- ============================================================================

INSERT INTO schema_migrations (version, description, applied_by)
VALUES ('0001', 'Create schema_migrations table', current_user)
ON CONFLICT (version) DO NOTHING;

COMMIT;
