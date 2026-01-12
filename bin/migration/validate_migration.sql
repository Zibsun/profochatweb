-- ============================================================================
-- Migration Validation Script
-- ============================================================================
-- Description: Validates data integrity after SaaS migration
-- Run this script after migration_to_saas.sql to verify everything is correct
-- ============================================================================

\echo '============================================================================'
\echo 'Migration Validation Report'
\echo '============================================================================'
\echo ''

-- ============================================================================
-- 1. Basic Counts
-- ============================================================================

\echo '1. Basic Record Counts:'
\echo '------------------------'

SELECT 'Accounts' as entity, COUNT(*) as count FROM public.account
UNION ALL
SELECT 'Bots', COUNT(*) FROM public.bot
UNION ALL
SELECT 'Courses', COUNT(*) FROM public.course
UNION ALL
SELECT 'Course Elements', COUNT(*) FROM public.course_element
UNION ALL
SELECT 'Course Deployments', COUNT(*) FROM public.course_deployment
UNION ALL
SELECT 'Enrollment Tokens', COUNT(*) FROM public.enrollment_token
UNION ALL
SELECT 'Runs (Total)', COUNT(*) FROM public.run
UNION ALL
SELECT 'Runs (Active)', COUNT(*) FROM public.run WHERE is_active = TRUE
UNION ALL
SELECT 'Conversations', COUNT(*) FROM public.conversation
UNION ALL
SELECT 'Waiting Elements', COUNT(*) FROM public.waiting_element
UNION ALL
SELECT 'Banned Participants', COUNT(*) FROM public.bannedparticipants
UNION ALL
SELECT 'Course Participants', COUNT(*) FROM public.courseparticipants;

\echo ''

-- ============================================================================
-- 2. Data Integrity Checks
-- ============================================================================

\echo '2. Data Integrity Checks:'
\echo '-------------------------'

-- Check for NULL account_id
SELECT 'Runs with NULL account_id' as check_name, COUNT(*) as issues
FROM public.run WHERE account_id IS NULL
UNION ALL
SELECT 'Conversations with NULL account_id', COUNT(*)
FROM public.conversation WHERE account_id IS NULL
UNION ALL
SELECT 'Courses with NULL account_id', COUNT(*)
FROM public.course WHERE account_id IS NULL
UNION ALL
SELECT 'Course Elements with NULL account_id', COUNT(*)
FROM public.course_element WHERE account_id IS NULL;

\echo ''

-- Check for NULL bot_id in runs
SELECT 'Runs with NULL bot_id' as check_name, COUNT(*) as issues
FROM public.run WHERE bot_id IS NULL AND botname IS NOT NULL;

\echo ''

-- Check for NULL deployment_id in active runs
SELECT 'Active Runs with NULL deployment_id' as check_name, COUNT(*) as issues
FROM public.run WHERE is_active = TRUE AND deployment_id IS NULL;

\echo ''

-- Check for orphaned runs (bot_id doesn't exist)
SELECT 'Orphaned Runs (bot_id not found)' as check_name, COUNT(*) as issues
FROM public.run r
LEFT JOIN public.bot b ON r.bot_id = b.bot_id
WHERE r.bot_id IS NOT NULL AND b.bot_id IS NULL;

\echo ''

-- Check for orphaned runs (deployment_id doesn't exist)
SELECT 'Orphaned Runs (deployment_id not found)' as check_name, COUNT(*) as issues
FROM public.run r
LEFT JOIN public.course_deployment cd ON r.deployment_id = cd.deployment_id
WHERE r.deployment_id IS NOT NULL AND cd.deployment_id IS NULL;

\echo ''

-- Check for orphaned conversations (run_id doesn't exist)
SELECT 'Orphaned Conversations (run_id not found)' as check_name, COUNT(*) as issues
FROM public.conversation c
LEFT JOIN public.run r ON c.run_id = r.run_id
WHERE c.run_id IS NOT NULL AND r.run_id IS NULL;

\echo ''

-- Check for orphaned waiting_elements (bot_id doesn't exist)
SELECT 'Orphaned Waiting Elements (bot_id not found)' as check_name, COUNT(*) as issues
FROM public.waiting_element we
LEFT JOIN public.bot b ON we.bot_id = b.bot_id
WHERE we.bot_id IS NOT NULL AND b.bot_id IS NULL;

\echo ''

-- Check for orphaned waiting_elements (run_id doesn't exist)
SELECT 'Orphaned Waiting Elements (run_id not found)' as check_name, COUNT(*) as issues
FROM public.waiting_element we
LEFT JOIN public.run r ON we.run_id = r.run_id
WHERE we.run_id IS NOT NULL AND r.run_id IS NULL;

\echo ''

-- Check for duplicate active runs per bot+chat
SELECT 'Duplicate Active Runs (violates unique constraint)' as check_name, COUNT(*) as issues
FROM (
    SELECT bot_id, chat_id, COUNT(*) as cnt
    FROM public.run
    WHERE is_active = TRUE
    GROUP BY bot_id, chat_id
    HAVING COUNT(*) > 1
) duplicates;

\echo ''

-- ============================================================================
-- 3. Foreign Key Integrity
-- ============================================================================

\echo '3. Foreign Key Integrity:'
\echo '-------------------------'

-- Check account foreign keys
SELECT 
    'Runs referencing non-existent account' as check_name,
    COUNT(*) as issues
FROM public.run r
LEFT JOIN public.account a ON r.account_id = a.account_id
WHERE r.account_id IS NOT NULL AND a.account_id IS NULL
UNION ALL
SELECT 
    'Conversations referencing non-existent account',
    COUNT(*)
FROM public.conversation c
LEFT JOIN public.account a ON c.account_id = a.account_id
WHERE c.account_id IS NOT NULL AND a.account_id IS NULL
UNION ALL
SELECT 
    'Courses referencing non-existent account',
    COUNT(*)
FROM public.course c
LEFT JOIN public.account a ON c.account_id = a.account_id
WHERE c.account_id IS NOT NULL AND a.account_id IS NULL;

\echo ''

-- Check bot foreign keys
SELECT 
    'Runs referencing non-existent bot' as check_name,
    COUNT(*) as issues
FROM public.run r
LEFT JOIN public.bot b ON r.bot_id = b.bot_id
WHERE r.bot_id IS NOT NULL AND b.bot_id IS NULL
UNION ALL
SELECT 
    'Waiting Elements referencing non-existent bot',
    COUNT(*)
FROM public.waiting_element we
LEFT JOIN public.bot b ON we.bot_id = b.bot_id
WHERE we.bot_id IS NOT NULL AND b.bot_id IS NULL
UNION ALL
SELECT 
    'Banned Participants referencing non-existent bot',
    COUNT(*)
FROM public.bannedparticipants bp
LEFT JOIN public.bot b ON bp.bot_id = b.bot_id
WHERE bp.bot_id IS NOT NULL AND b.bot_id IS NULL;

\echo ''

-- Check course foreign keys
SELECT 
    'Course Elements referencing non-existent course' as check_name,
    COUNT(*) as issues
FROM public.course_element ce
LEFT JOIN public.course c ON ce.course_id = c.course_id AND ce.account_id = c.account_id
WHERE ce.course_id IS NOT NULL AND c.course_id IS NULL
UNION ALL
SELECT 
    'Course Deployments referencing non-existent course',
    COUNT(*)
FROM public.course_deployment cd
LEFT JOIN public.course c ON cd.course_id = c.course_id AND cd.account_id = c.account_id
WHERE cd.course_id IS NOT NULL AND c.course_id IS NULL
UNION ALL
SELECT 
    'Course Participants referencing non-existent course',
    COUNT(*)
FROM public.courseparticipants cp
LEFT JOIN public.course c ON cp.course_id = c.course_id AND cp.account_id = c.account_id
WHERE cp.course_id IS NOT NULL AND c.course_id IS NULL;

\echo ''

-- ============================================================================
-- 4. Migration Completeness
-- ============================================================================

\echo '4. Migration Completeness:'
\echo '---------------------------'

-- Check if bots have tokens (should be filled manually)
SELECT 'Bots without tokens (need manual update)' as check_name, COUNT(*) as issues
FROM public.bot WHERE bot_token = '' OR bot_token IS NULL;

\echo ''

-- Check if courses have deployments
SELECT 'Courses without deployments' as check_name, COUNT(*) as issues
FROM public.course c
LEFT JOIN public.course_deployment cd ON c.course_id = cd.course_id AND c.account_id = cd.account_id
WHERE cd.deployment_id IS NULL;

\echo ''

-- Check if active runs have deployments
SELECT 'Active Runs without deployments' as check_name, COUNT(*) as issues
FROM public.run WHERE is_active = TRUE AND deployment_id IS NULL;

\echo ''

-- Check if waiting_elements have run_id
SELECT 'Waiting Elements without run_id' as check_name, COUNT(*) as issues
FROM public.waiting_element WHERE run_id IS NULL;

\echo ''

-- ============================================================================
-- 5. Data Consistency
-- ============================================================================

\echo '5. Data Consistency:'
\echo '-------------------'

-- Check if run.account_id matches deployment.account_id
SELECT 'Runs with mismatched account_id' as check_name, COUNT(*) as issues
FROM public.run r
JOIN public.course_deployment cd ON r.deployment_id = cd.deployment_id
WHERE r.account_id != cd.account_id;

\echo ''

-- Check if run.course_id matches deployment.course_id
SELECT 'Runs with mismatched course_id' as check_name, COUNT(*) as issues
FROM public.run r
JOIN public.course_deployment cd ON r.deployment_id = cd.deployment_id
WHERE r.course_id != cd.course_id;

\echo ''

-- Check if run.bot_id matches deployment.bot_id
SELECT 'Runs with mismatched bot_id' as check_name, COUNT(*) as issues
FROM public.run r
JOIN public.course_deployment cd ON r.deployment_id = cd.deployment_id
WHERE r.bot_id != cd.bot_id;

\echo ''

-- Check if conversation.account_id matches run.account_id
SELECT 'Conversations with mismatched account_id' as check_name, COUNT(*) as issues
FROM public.conversation c
JOIN public.run r ON c.run_id = r.run_id
WHERE c.account_id != r.account_id;

\echo ''

-- ============================================================================
-- 6. Index Verification
-- ============================================================================

\echo '6. Index Verification:'
\echo '---------------------'

SELECT 
    tablename,
    indexname,
    CASE 
        WHEN indexdef LIKE '%UNIQUE%' THEN 'UNIQUE'
        ELSE 'INDEX'
    END as index_type
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
      'account', 'account_member', 'bot', 'course', 'course_element',
      'course_deployment', 'enrollment_token', 'run', 'conversation',
      'waiting_element', 'bannedparticipants', 'courseparticipants'
  )
ORDER BY tablename, indexname;

\echo ''

-- ============================================================================
-- 7. Constraint Verification
-- ============================================================================

\echo '7. Constraint Verification:'
\echo '-------------------------'

SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN (
      'account', 'account_member', 'bot', 'course', 'course_element',
      'course_deployment', 'enrollment_token', 'run', 'conversation',
      'waiting_element', 'bannedparticipants', 'courseparticipants'
  )
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

\echo ''

-- ============================================================================
-- 8. Summary Report
-- ============================================================================

\echo '============================================================================'
\echo 'Summary:'
\echo '============================================================================'

DO $$
DECLARE
    total_issues INT := 0;
    runs_without_bot INT;
    runs_without_deployment INT;
    orphaned_runs INT;
    duplicate_active_runs INT;
BEGIN
    -- Count issues
    SELECT COUNT(*) INTO runs_without_bot
    FROM public.run WHERE bot_id IS NULL AND botname IS NOT NULL;
    
    SELECT COUNT(*) INTO runs_without_deployment
    FROM public.run WHERE is_active = TRUE AND deployment_id IS NULL;
    
    SELECT COUNT(*) INTO orphaned_runs
    FROM public.run r
    LEFT JOIN public.bot b ON r.bot_id = b.bot_id
    WHERE r.bot_id IS NOT NULL AND b.bot_id IS NULL;
    
    SELECT COUNT(*) INTO duplicate_active_runs
    FROM (
        SELECT bot_id, chat_id
        FROM public.run
        WHERE is_active = TRUE
        GROUP BY bot_id, chat_id
        HAVING COUNT(*) > 1
    ) duplicates;
    
    total_issues := runs_without_bot + runs_without_deployment + orphaned_runs + duplicate_active_runs;
    
    IF total_issues = 0 THEN
        RAISE NOTICE '✓ Migration validation PASSED - No critical issues found';
    ELSE
        RAISE WARNING '✗ Migration validation FAILED - Found % issues', total_issues;
        RAISE NOTICE '  - Runs without bot_id: %', runs_without_bot;
        RAISE NOTICE '  - Active runs without deployment_id: %', runs_without_deployment;
        RAISE NOTICE '  - Orphaned runs: %', orphaned_runs;
        RAISE NOTICE '  - Duplicate active runs: %', duplicate_active_runs;
    END IF;
END $$;

\echo ''
\echo '============================================================================'
\echo 'Validation Complete'
\echo '============================================================================'
