-- ============================================================================
-- Mark migration 0005 as applied
-- ============================================================================
-- This script adds 0005_introduce_groups to schema_migrations
-- if the tables already exist (migration was applied manually)
-- ============================================================================

BEGIN;

-- Ensure schema_migrations table exists
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    description TEXT,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    applied_by TEXT,
    execution_time_ms INT
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at 
ON schema_migrations(applied_at);

-- Add 0005 if Groups tables exist but migration is not recorded
INSERT INTO schema_migrations (version, description, applied_by)
SELECT 
    '0005',
    'Introduce Groups model - replaces CourseDeployment with Group, adds InviteLink and Schedule',
    current_user
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group')
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invite_link')
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schedule')
  AND NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = '0005')
ON CONFLICT (version) DO NOTHING;

-- Show result
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM schema_migrations WHERE version = '0005')
        THEN 'Migration 0005 marked as applied'
        ELSE 'Migration 0005 was not added (tables may not exist or already recorded)'
    END as status;

-- Show all migrations
SELECT 
    version,
    description,
    applied_at,
    applied_by
FROM schema_migrations
ORDER BY version;

COMMIT;
