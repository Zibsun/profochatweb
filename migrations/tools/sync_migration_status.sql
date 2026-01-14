-- ============================================================================
-- Sync Migration Status
-- ============================================================================
-- This script checks the actual database state and adds missing entries
-- to schema_migrations for migrations that have already been applied
-- ============================================================================
-- 
-- Usage: Run this script BEFORE applying new migrations if you suspect
-- that some migrations were applied manually without recording in schema_migrations
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

-- Check and add 0001 if schema_migrations table exists (it was created by 0001)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_migrations')
       AND NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = '0001')
    THEN
        INSERT INTO schema_migrations (version, description, applied_by)
        VALUES ('0001', 'Create schema_migrations table', current_user)
        ON CONFLICT (version) DO NOTHING;
        
        RAISE NOTICE 'Added 0001_create_schema_migrations to schema_migrations';
    END IF;
END $$;

-- Check and add 0003 if SaaS tables exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bot')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_deployment')
       AND NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = '0003')
    THEN
        INSERT INTO schema_migrations (version, description, applied_by)
        VALUES ('0003', 'Migrate to SaaS architecture', current_user)
        ON CONFLICT (version) DO NOTHING;
        
        RAISE NOTICE 'Added 0003_migrate_to_saas to schema_migrations';
    END IF;
END $$;

-- Check and add 0004 if course.course_id is INT
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'course' 
        AND column_name = 'course_id' 
        AND data_type = 'integer'
    )
    AND NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = '0004')
    THEN
        INSERT INTO schema_migrations (version, description, applied_by)
        VALUES ('0004', 'Change course_id from TEXT to INT', current_user)
        ON CONFLICT (version) DO NOTHING;
        
        RAISE NOTICE 'Added 0004_course_id_to_int to schema_migrations';
    END IF;
END $$;

-- Check and add 0005 if Groups tables exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invite_link')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schedule')
       AND NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = '0005')
    THEN
        INSERT INTO schema_migrations (version, description, applied_by)
        VALUES ('0005', 'Introduce Groups model - replaces CourseDeployment with Group, adds InviteLink and Schedule', current_user)
        ON CONFLICT (version) DO NOTHING;
        
        RAISE NOTICE 'Added 0005_introduce_groups to schema_migrations';
    END IF;
END $$;

-- Show current status
SELECT 
    version,
    description,
    applied_at,
    applied_by
FROM schema_migrations
ORDER BY version;

COMMIT;

-- ============================================================================
-- After running this script, check status with:
-- ./migrations/tools/status.sh
-- ============================================================================
