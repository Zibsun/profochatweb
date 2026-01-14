-- ============================================================================
-- Migration: 0005_introduce_groups
-- ============================================================================
-- Description: Introduces Groups model - replaces CourseDeployment with Group
--              Adds InviteLink (replaces EnrollmentToken) and Schedule tables
--              Updates Run table to reference Group instead of CourseDeployment
-- Author: System
-- Date: 2024-01-01
-- Related: docs/reqs/groups_model.md
-- Breaking: No (backward compatible - adds new tables, nullable columns)
-- ============================================================================
-- 
-- This migration performs:
-- Phase 1: Create new tables (group, invite_link, schedule)
-- Phase 2: Add nullable columns to run table (group_id, invite_link_id)
-- Phase 3: Create indexes and constraints
-- Phase 4: Data migration (optional, can be done separately)
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: Create new tables
-- ============================================================================

-- Create group table
CREATE SEQUENCE IF NOT EXISTS group_group_id_seq;

CREATE TABLE IF NOT EXISTS public.group (
    group_id INT4 NOT NULL DEFAULT nextval('group_group_id_seq'::regclass),
    account_id INT4 NOT NULL,
    bot_id INT4 NOT NULL,
    course_id INT4 NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    settings JSONB,
    PRIMARY KEY (group_id),
    FOREIGN KEY (account_id) REFERENCES public.account(account_id) ON DELETE CASCADE,
    FOREIGN KEY (bot_id) REFERENCES public.bot(bot_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES public.course(course_id) ON DELETE CASCADE,
    UNIQUE (bot_id, course_id, name)
);

-- Create invite_link table
CREATE SEQUENCE IF NOT EXISTS invite_link_invite_link_id_seq;

CREATE TABLE IF NOT EXISTS public.invite_link (
    invite_link_id INT4 NOT NULL DEFAULT nextval('invite_link_invite_link_id_seq'::regclass),
    group_id INT4 NOT NULL,
    token TEXT NOT NULL UNIQUE,
    max_uses INT4,
    current_uses INT4 DEFAULT 0,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT8,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB,
    PRIMARY KEY (invite_link_id),
    FOREIGN KEY (group_id) REFERENCES public.group(group_id) ON DELETE CASCADE
);

-- Create schedule table
CREATE SEQUENCE IF NOT EXISTS schedule_schedule_id_seq;

CREATE TABLE IF NOT EXISTS public.schedule (
    schedule_id INT4 NOT NULL DEFAULT nextval('schedule_schedule_id_seq'::regclass),
    group_id INT4 NOT NULL,
    schedule_type TEXT NOT NULL,  -- weekly, daily, custom
    schedule_config JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (schedule_id),
    FOREIGN KEY (group_id) REFERENCES public.group(group_id) ON DELETE CASCADE,
    UNIQUE (group_id)
);

-- ============================================================================
-- PHASE 2: Add nullable columns to run table (for backward compatibility)
-- ============================================================================

-- Add group_id to run table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'run' 
        AND column_name = 'group_id'
    ) THEN
        ALTER TABLE public.run ADD COLUMN group_id INT4;
        ALTER TABLE public.run ADD CONSTRAINT run_group_id_fkey 
            FOREIGN KEY (group_id) REFERENCES public.group(group_id) ON DELETE RESTRICT;
    END IF;
END $$;

-- Add invite_link_id to run table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'run' 
        AND column_name = 'invite_link_id'
    ) THEN
        ALTER TABLE public.run ADD COLUMN invite_link_id INT4;
        ALTER TABLE public.run ADD CONSTRAINT run_invite_link_id_fkey 
            FOREIGN KEY (invite_link_id) REFERENCES public.invite_link(invite_link_id);
    END IF;
END $$;

-- ============================================================================
-- PHASE 3: Create indexes
-- ============================================================================

-- Indexes for group table
CREATE INDEX IF NOT EXISTS idx_group_account ON public.group (account_id);
CREATE INDEX IF NOT EXISTS idx_group_bot ON public.group (bot_id);
CREATE INDEX IF NOT EXISTS idx_group_course ON public.group (course_id);
CREATE INDEX IF NOT EXISTS idx_group_active ON public.group (bot_id, is_active);

-- Indexes for invite_link table
CREATE INDEX IF NOT EXISTS idx_invite_link_group ON public.invite_link (group_id);
CREATE INDEX IF NOT EXISTS idx_invite_link_token ON public.invite_link (token);
CREATE INDEX IF NOT EXISTS idx_invite_link_active ON public.invite_link (group_id, is_active);
CREATE INDEX IF NOT EXISTS idx_invite_link_expires ON public.invite_link (expires_at) 
    WHERE expires_at IS NOT NULL;

-- Indexes for schedule table
CREATE INDEX IF NOT EXISTS idx_schedule_group ON public.schedule (group_id);
CREATE INDEX IF NOT EXISTS idx_schedule_active ON public.schedule (group_id, is_active);

-- Indexes for run table (new columns)
CREATE INDEX IF NOT EXISTS idx_run_group ON public.run (group_id);
CREATE INDEX IF NOT EXISTS idx_run_invite_link ON public.run (invite_link_id);

-- ============================================================================
-- PHASE 4: Validation
-- ============================================================================

DO $$
BEGIN
    -- Check that group table was created
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'group'
    ) THEN
        RAISE EXCEPTION 'Table group was not created';
    END IF;

    -- Check that invite_link table was created
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'invite_link'
    ) THEN
        RAISE EXCEPTION 'Table invite_link was not created';
    END IF;

    -- Check that schedule table was created
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schedule'
    ) THEN
        RAISE EXCEPTION 'Table schedule was not created';
    END IF;

    -- Check that group_id column was added to run
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'run' 
        AND column_name = 'group_id'
    ) THEN
        RAISE EXCEPTION 'Column group_id was not added to run table';
    END IF;

    -- Check that invite_link_id column was added to run
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'run' 
        AND column_name = 'invite_link_id'
    ) THEN
        RAISE EXCEPTION 'Column invite_link_id was not added to run table';
    END IF;
END $$;

-- ============================================================================
-- Record migration
-- ============================================================================

INSERT INTO schema_migrations (version, description, applied_by)
VALUES ('0005', 'Introduce Groups model - replaces CourseDeployment with Group, adds InviteLink and Schedule', current_user)
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ============================================================================
-- Notes
-- ============================================================================
-- 
-- This migration creates the new Groups model tables but does NOT:
-- 1. Migrate data from CourseDeployment to Group (see separate migration script)
-- 2. Remove CourseDeployment or EnrollmentToken tables (for backward compatibility)
-- 3. Make group_id/invite_link_id NOT NULL (will be done after data migration)
--
-- Next steps:
-- 1. Migrate existing CourseDeployment records to Group
-- 2. Migrate existing EnrollmentToken records to InviteLink
-- 3. Update Run records to reference Group and InviteLink
-- 4. Update application code to use Groups model
-- 5. After full migration, remove CourseDeployment and EnrollmentToken tables
-- ============================================================================
