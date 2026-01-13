-- ============================================================================
-- Rollback: 0003_migrate_to_saas
-- ============================================================================
-- Description: Rollback for SaaS migration (partial - some changes are irreversible)
-- Warning: This rollback is complex and may not fully restore previous state
-- ============================================================================
-- 
-- IMPORTANT: This rollback is partial. Some changes cannot be easily reverted:
-- - Foreign key constraints will be dropped
-- - New columns will be removed (but data may be lost)
-- - New tables will be dropped
-- 
-- For full rollback, restore from backup instead.
-- ============================================================================

BEGIN;

-- ============================================================================
-- Phase 7: Remove NOT NULL constraints
-- ============================================================================

DO $$
BEGIN
    -- Remove NOT NULL from account_id columns
    ALTER TABLE public.conversation ALTER COLUMN account_id DROP NOT NULL;
    ALTER TABLE public.run ALTER COLUMN account_id DROP NOT NULL;
    ALTER TABLE public.waiting_element ALTER COLUMN account_id DROP NOT NULL;
    ALTER TABLE public.course ALTER COLUMN account_id DROP NOT NULL;
    ALTER TABLE public.course_element ALTER COLUMN account_id DROP NOT NULL;
    ALTER TABLE public.courseparticipants ALTER COLUMN account_id DROP NOT NULL;
    ALTER TABLE public.bannedparticipants ALTER COLUMN account_id DROP NOT NULL;
EXCEPTION
    WHEN others THEN
        NULL;
END $$;

-- ============================================================================
-- Phase 6: Drop unique constraints
-- ============================================================================

DROP INDEX IF EXISTS run_one_active_per_bot_chat;
DROP INDEX IF EXISTS courseparticipants_unique;
DROP INDEX IF EXISTS bannedparticipants_unique;

-- ============================================================================
-- Phase 5: Drop indexes
-- ============================================================================

-- Drop new indexes (keep original ones)
DROP INDEX IF EXISTS idx_account_slug;
DROP INDEX IF EXISTS idx_account_active;
DROP INDEX IF EXISTS idx_account_member_account;
DROP INDEX IF EXISTS idx_account_member_telegram;
DROP INDEX IF EXISTS idx_account_member_active;
DROP INDEX IF EXISTS idx_bot_account;
DROP INDEX IF EXISTS idx_bot_name;
DROP INDEX IF EXISTS idx_bot_active;
DROP INDEX IF EXISTS idx_course_account;
DROP INDEX IF EXISTS idx_course_active;
DROP INDEX IF EXISTS idx_course_created;
DROP INDEX IF EXISTS idx_course_element_course;
DROP INDEX IF EXISTS idx_course_element_type;
DROP INDEX IF EXISTS idx_course_element_order;
DROP INDEX IF EXISTS idx_deployment_course;
DROP INDEX IF EXISTS idx_deployment_bot;
DROP INDEX IF EXISTS idx_deployment_active;
DROP INDEX IF EXISTS idx_token_deployment;
DROP INDEX IF EXISTS idx_token_token;
DROP INDEX IF EXISTS idx_token_active;
DROP INDEX IF EXISTS idx_token_expires;
DROP INDEX IF EXISTS idx_run_account;
DROP INDEX IF EXISTS idx_run_bot;
DROP INDEX IF EXISTS idx_run_deployment;
DROP INDEX IF EXISTS idx_run_chat;
DROP INDEX IF EXISTS idx_run_course;
DROP INDEX IF EXISTS idx_run_active;
DROP INDEX IF EXISTS idx_run_ended;
DROP INDEX IF EXISTS idx_conversation_account;
DROP INDEX IF EXISTS idx_conversation_run;
DROP INDEX IF EXISTS idx_conversation_chat;
DROP INDEX IF EXISTS idx_conversation_course;
DROP INDEX IF EXISTS idx_conversation_element;
DROP INDEX IF EXISTS idx_conversation_date;
DROP INDEX IF EXISTS idx_conversation_role;
DROP INDEX IF EXISTS idx_waiting_account;
DROP INDEX IF EXISTS idx_waiting_bot;
DROP INDEX IF EXISTS idx_waiting_run;
DROP INDEX IF EXISTS idx_waiting_active;
DROP INDEX IF EXISTS idx_waiting_date;
DROP INDEX IF EXISTS idx_banned_account;
DROP INDEX IF EXISTS idx_banned_bot;
DROP INDEX IF EXISTS idx_banned_chat;
DROP INDEX IF EXISTS idx_banned_active;
DROP INDEX IF EXISTS idx_courseparticipants_account;
DROP INDEX IF EXISTS idx_courseparticipants_course;
DROP INDEX IF EXISTS idx_courseparticipants_chat;
DROP INDEX IF EXISTS idx_courseparticipants_username;
DROP INDEX IF EXISTS idx_gen_settings_account;
DROP INDEX IF EXISTS idx_gen_settings_bot;
DROP INDEX IF EXISTS idx_gen_settings_key;

-- ============================================================================
-- Phase 4: Drop foreign key constraints
-- ============================================================================

ALTER TABLE public.account_member DROP CONSTRAINT IF EXISTS account_member_account_id_fkey;
ALTER TABLE public.bot DROP CONSTRAINT IF EXISTS bot_account_id_fkey;
ALTER TABLE public.course DROP CONSTRAINT IF EXISTS course_account_id_fkey;
ALTER TABLE public.course_element DROP CONSTRAINT IF EXISTS course_element_course_fkey;
ALTER TABLE public.course_deployment DROP CONSTRAINT IF EXISTS course_deployment_course_fkey;
ALTER TABLE public.course_deployment DROP CONSTRAINT IF EXISTS course_deployment_bot_fkey;
ALTER TABLE public.enrollment_token DROP CONSTRAINT IF EXISTS enrollment_token_deployment_fkey;
ALTER TABLE public.run DROP CONSTRAINT IF EXISTS run_account_id_fkey;
ALTER TABLE public.run DROP CONSTRAINT IF EXISTS run_bot_id_fkey;
ALTER TABLE public.run DROP CONSTRAINT IF EXISTS run_deployment_id_fkey;
ALTER TABLE public.run DROP CONSTRAINT IF EXISTS run_token_id_fkey;
ALTER TABLE public.conversation DROP CONSTRAINT IF EXISTS conversation_account_id_fkey;
ALTER TABLE public.conversation DROP CONSTRAINT IF EXISTS conversation_run_id_fkey;
ALTER TABLE public.waiting_element DROP CONSTRAINT IF EXISTS waiting_element_account_id_fkey;
ALTER TABLE public.waiting_element DROP CONSTRAINT IF EXISTS waiting_element_bot_id_fkey;
ALTER TABLE public.waiting_element DROP CONSTRAINT IF EXISTS waiting_element_run_id_fkey;
ALTER TABLE public.bannedparticipants DROP CONSTRAINT IF EXISTS bannedparticipants_account_id_fkey;
ALTER TABLE public.bannedparticipants DROP CONSTRAINT IF EXISTS bannedparticipants_bot_id_fkey;
ALTER TABLE public.courseparticipants DROP CONSTRAINT IF EXISTS courseparticipants_account_id_fkey;
ALTER TABLE public.courseparticipants DROP CONSTRAINT IF EXISTS courseparticipants_course_fkey;
ALTER TABLE public.gen_settings DROP CONSTRAINT IF EXISTS gen_settings_account_id_fkey;
ALTER TABLE public.gen_settings DROP CONSTRAINT IF EXISTS gen_settings_bot_id_fkey;

-- ============================================================================
-- Phase 3: Remove new columns
-- ============================================================================

ALTER TABLE public.run DROP COLUMN IF EXISTS token_id;
ALTER TABLE public.run DROP COLUMN IF EXISTS ended_at;
ALTER TABLE public.run DROP COLUMN IF EXISTS is_active;
ALTER TABLE public.run DROP COLUMN IF EXISTS utm_medium;
ALTER TABLE public.run DROP COLUMN IF EXISTS utm_term;
ALTER TABLE public.run DROP COLUMN IF EXISTS utm_content;
ALTER TABLE public.run DROP COLUMN IF EXISTS metadata;
ALTER TABLE public.run DROP COLUMN IF EXISTS deployment_id;
ALTER TABLE public.run DROP COLUMN IF EXISTS bot_id;

ALTER TABLE public.waiting_element DROP COLUMN IF EXISTS created_at;
ALTER TABLE public.waiting_element DROP COLUMN IF EXISTS run_id;
ALTER TABLE public.waiting_element DROP COLUMN IF EXISTS bot_id;

ALTER TABLE public.bannedparticipants DROP COLUMN IF EXISTS metadata;
ALTER TABLE public.bannedparticipants DROP COLUMN IF EXISTS bot_id;

ALTER TABLE public.courseparticipants DROP COLUMN IF EXISTS added_by;
ALTER TABLE public.courseparticipants DROP COLUMN IF EXISTS added_at;
ALTER TABLE public.courseparticipants DROP COLUMN IF EXISTS chat_id;

ALTER TABLE public.course DROP COLUMN IF EXISTS is_active;
ALTER TABLE public.course DROP COLUMN IF EXISTS metadata;
ALTER TABLE public.course DROP COLUMN IF EXISTS updated_at;
ALTER TABLE public.course DROP COLUMN IF EXISTS description;
ALTER TABLE public.course DROP COLUMN IF EXISTS title;

ALTER TABLE public.gen_settings DROP COLUMN IF EXISTS updated_at;
ALTER TABLE public.gen_settings DROP COLUMN IF EXISTS created_at;
ALTER TABLE public.gen_settings DROP COLUMN IF EXISTS bot_id;

-- Remove account_id columns (keep for now, set to NULL)
-- ALTER TABLE public.conversation DROP COLUMN IF EXISTS account_id;
-- ALTER TABLE public.run DROP COLUMN IF EXISTS account_id;
-- ALTER TABLE public.waiting_element DROP COLUMN IF EXISTS account_id;
-- ALTER TABLE public.course DROP COLUMN IF EXISTS account_id;
-- ALTER TABLE public.course_element DROP COLUMN IF EXISTS account_id;
-- ALTER TABLE public.courseparticipants DROP COLUMN IF EXISTS account_id;
-- ALTER TABLE public.bannedparticipants DROP COLUMN IF EXISTS account_id;
-- ALTER TABLE public.gen_settings DROP COLUMN IF EXISTS account_id;

-- ============================================================================
-- Phase 2: Drop new tables
-- ============================================================================

DROP TABLE IF EXISTS public.enrollment_token CASCADE;
DROP TABLE IF EXISTS public.course_deployment CASCADE;
DROP TABLE IF EXISTS public.bot CASCADE;
DROP TABLE IF EXISTS public.account_member CASCADE;
-- Note: account table is kept as it may contain data

-- ============================================================================
-- Phase 1: Drop sequences
-- ============================================================================

DROP SEQUENCE IF EXISTS enrollment_token_token_id_seq;
DROP SEQUENCE IF EXISTS course_deployment_deployment_id_seq;
DROP SEQUENCE IF EXISTS bot_bot_id_seq;
DROP SEQUENCE IF EXISTS account_member_account_member_id_seq;
-- Note: account_account_id_seq is kept

-- ============================================================================
-- Remove from migration history
-- ============================================================================

DELETE FROM schema_migrations WHERE version = '0003';

COMMIT;

-- ============================================================================
-- Warning
-- ============================================================================
-- 
-- This rollback does NOT:
-- - Remove account_id columns (data preservation)
-- - Drop account table (may contain data)
-- - Restore original course PK structure (would require data migration)
-- 
-- For complete rollback, restore from backup created before migration.
-- ============================================================================
