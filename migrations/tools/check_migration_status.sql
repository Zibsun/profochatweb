-- ============================================================================
-- Check Migration Status
-- ============================================================================
-- This script checks which migrations have been applied by checking
-- for the existence of key tables/features introduced by each migration
-- ============================================================================

-- Check if schema_migrations table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_migrations')
        THEN 'EXISTS'
        ELSE 'NOT EXISTS'
    END as schema_migrations_table_status;

-- Get applied migrations from schema_migrations table (if exists)
SELECT 
    version,
    description,
    applied_at,
    applied_by
FROM schema_migrations
ORDER BY version;

-- Check for tables from each migration:

-- 0001: schema_migrations table itself
SELECT 
    '0001_create_schema_migrations' as migration,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_migrations')
        THEN 'APPLIED (table exists)'
        ELSE 'NOT APPLIED'
    END as status;

-- 0003: Check for SaaS tables (account, bot, course_deployment, enrollment_token)
SELECT 
    '0003_migrate_to_saas' as migration,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account')
           AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bot')
           AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_deployment')
        THEN 'APPLIED (key tables exist)'
        ELSE 'NOT APPLIED'
    END as status;

-- 0004: Check if course.course_id is INT (not TEXT)
SELECT 
    '0004_course_id_to_int' as migration,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'course' 
            AND column_name = 'course_id' 
            AND data_type = 'integer'
        )
        THEN 'APPLIED (course_id is INT)'
        ELSE 'NOT APPLIED'
    END as status;

-- 0005: Check for Groups tables (group, invite_link, schedule)
SELECT 
    '0005_introduce_groups' as migration,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group')
           AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invite_link')
           AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schedule')
        THEN 'APPLIED (tables exist)'
        ELSE 'NOT APPLIED'
    END as status;

-- Summary: List all tables to see current state
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
