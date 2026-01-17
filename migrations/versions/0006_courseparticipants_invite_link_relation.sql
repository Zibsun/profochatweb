-- ============================================================================
-- Migration: 0006_courseparticipants_invite_link_relation
-- ============================================================================
-- Description: Adds invite_link_id and course_group_id to courseparticipants table
--              Links course participants to invite links and course groups
-- Author: System
-- Date: 2024-01-01
-- Related: docs/reqs/course_participants_invite_link_relation.md
-- Breaking: No (backward compatible - adds nullable columns)
-- ============================================================================
-- 
-- This migration performs:
-- Phase 1: Add new columns (invite_link_id, course_group_id) to courseparticipants
-- Phase 2: Populate course_group_id for existing records (where possible)
-- Phase 3: Add foreign key constraints
-- Phase 4: Create indexes
-- Phase 5: Validation
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: Add new columns to courseparticipants table
-- ============================================================================

-- Add invite_link_id column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'courseparticipants' 
        AND column_name = 'invite_link_id'
    ) THEN
        ALTER TABLE public.courseparticipants 
            ADD COLUMN invite_link_id INT4 NULL;
        
        RAISE NOTICE 'Added column invite_link_id to courseparticipants';
    ELSE
        RAISE NOTICE 'Column invite_link_id already exists in courseparticipants';
    END IF;
END $$;

-- Add course_group_id column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'courseparticipants' 
        AND column_name = 'course_group_id'
    ) THEN
        ALTER TABLE public.courseparticipants 
            ADD COLUMN course_group_id INT4 NULL;
        
        RAISE NOTICE 'Added column course_group_id to courseparticipants';
    ELSE
        RAISE NOTICE 'Column course_group_id already exists in courseparticipants';
    END IF;
END $$;

-- ============================================================================
-- PHASE 2: Populate course_group_id for existing records
-- ============================================================================

-- Update course_group_id for records where we can uniquely determine the group
-- This handles cases where there's exactly one group for a course+account combination
DO $$
DECLARE
    updated_count INT;
BEGIN
    -- First, update records where there's exactly one matching group
    UPDATE public.courseparticipants cp
    SET course_group_id = (
        SELECT cg.course_group_id
        FROM public.course_group cg
        WHERE cg.course_id = cp.course_id
          AND cg.account_id = cp.account_id
        GROUP BY cg.course_group_id
        HAVING COUNT(*) = 1
        LIMIT 1
    )
    WHERE cp.course_group_id IS NULL
      AND EXISTS (
          SELECT 1
          FROM public.course_group cg
          WHERE cg.course_id = cp.course_id
            AND cg.account_id = cp.account_id
          GROUP BY cg.course_id, cg.account_id
          HAVING COUNT(DISTINCT cg.course_group_id) = 1
      );
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated course_group_id for % existing courseparticipants records', updated_count;
    
    -- Log records that couldn't be updated (multiple groups exist)
    SELECT COUNT(*) INTO updated_count
    FROM public.courseparticipants cp
    WHERE cp.course_group_id IS NULL
      AND EXISTS (
          SELECT 1
          FROM public.course_group cg
          WHERE cg.course_id = cp.course_id
            AND cg.account_id = cp.account_id
          GROUP BY cg.course_id, cg.account_id
          HAVING COUNT(DISTINCT cg.course_group_id) > 1
      );
    
    IF updated_count > 0 THEN
        RAISE NOTICE 'Warning: % courseparticipants records have multiple matching groups and were not updated. Manual review required.', updated_count;
    END IF;
END $$;

-- ============================================================================
-- PHASE 3: Add foreign key constraints
-- ============================================================================

-- Add FK constraint for invite_link_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'courseparticipants' 
        AND constraint_name = 'courseparticipants_invite_link_fkey'
    ) THEN
        ALTER TABLE public.courseparticipants
            ADD CONSTRAINT courseparticipants_invite_link_fkey 
            FOREIGN KEY (invite_link_id) 
            REFERENCES public.invite_link(invite_link_id) 
            ON DELETE SET NULL;
        
        RAISE NOTICE 'Added foreign key constraint courseparticipants_invite_link_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint courseparticipants_invite_link_fkey already exists';
    END IF;
END $$;

-- Add FK constraint for course_group_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'courseparticipants' 
        AND constraint_name = 'courseparticipants_course_group_fkey'
    ) THEN
        ALTER TABLE public.courseparticipants
            ADD CONSTRAINT courseparticipants_course_group_fkey 
            FOREIGN KEY (course_group_id) 
            REFERENCES public.course_group(course_group_id) 
            ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint courseparticipants_course_group_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint courseparticipants_course_group_fkey already exists';
    END IF;
END $$;

-- ============================================================================
-- PHASE 4: Create indexes
-- ============================================================================

-- Index for invite_link_id
CREATE INDEX IF NOT EXISTS idx_courseparticipants_invite_link 
    ON public.courseparticipants (invite_link_id)
    WHERE invite_link_id IS NOT NULL;

-- Index for course_group_id
CREATE INDEX IF NOT EXISTS idx_courseparticipants_course_group 
    ON public.courseparticipants (course_group_id)
    WHERE course_group_id IS NOT NULL;

-- Composite index for queries by group and account
CREATE INDEX IF NOT EXISTS idx_courseparticipants_group_account 
    ON public.courseparticipants (course_group_id, account_id)
    WHERE course_group_id IS NOT NULL;

-- ============================================================================
-- PHASE 5: Validation
-- ============================================================================

DO $$
BEGIN
    -- Check that invite_link_id column was added
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'courseparticipants' 
        AND column_name = 'invite_link_id'
    ) THEN
        RAISE EXCEPTION 'Column invite_link_id was not added to courseparticipants table';
    END IF;

    -- Check that course_group_id column was added
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'courseparticipants' 
        AND column_name = 'course_group_id'
    ) THEN
        RAISE EXCEPTION 'Column course_group_id was not added to courseparticipants table';
    END IF;

    -- Check that foreign key constraints were added
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'courseparticipants' 
        AND constraint_name = 'courseparticipants_invite_link_fkey'
    ) THEN
        RAISE EXCEPTION 'Foreign key constraint courseparticipants_invite_link_fkey was not added';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'courseparticipants' 
        AND constraint_name = 'courseparticipants_course_group_fkey'
    ) THEN
        RAISE EXCEPTION 'Foreign key constraint courseparticipants_course_group_fkey was not added';
    END IF;

    -- Check that indexes were created
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'courseparticipants' 
        AND indexname = 'idx_courseparticipants_invite_link'
    ) THEN
        RAISE EXCEPTION 'Index idx_courseparticipants_invite_link was not created';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'courseparticipants' 
        AND indexname = 'idx_courseparticipants_course_group'
    ) THEN
        RAISE EXCEPTION 'Index idx_courseparticipants_course_group was not created';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'courseparticipants' 
        AND indexname = 'idx_courseparticipants_group_account'
    ) THEN
        RAISE EXCEPTION 'Index idx_courseparticipants_group_account was not created';
    END IF;

    RAISE NOTICE 'Migration validation passed successfully';
END $$;

-- ============================================================================
-- Record migration
-- ============================================================================

INSERT INTO schema_migrations (version, description, applied_by)
VALUES ('0006', 'Add invite_link_id and course_group_id to courseparticipants table', current_user)
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ============================================================================
-- Notes
-- ============================================================================
-- 
-- This migration adds two new nullable columns to courseparticipants:
-- 1. invite_link_id - links participant to the invite link they used to join
-- 2. course_group_id - links participant to the specific course group
--
-- Key decisions:
-- - Both columns are NULLABLE to support backward compatibility
-- - invite_link_id uses ON DELETE SET NULL (if link is deleted, participant remains)
-- - course_group_id uses ON DELETE CASCADE (if group is deleted, participants are deleted)
-- - Existing records are automatically updated where a unique group match exists
-- - Records with multiple matching groups are left NULL and require manual review
--
-- Next steps:
-- 1. Update application code to populate invite_link_id when participants join via invite link
-- 2. Update application code to populate course_group_id for all new participants
-- 3. Manually review and update records with NULL course_group_id (where multiple groups exist)
-- 4. Consider making course_group_id NOT NULL in a future migration after data cleanup
-- 5. Update API endpoints to include invite_link_id and course_group_id in responses
-- ============================================================================
