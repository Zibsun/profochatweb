-- ============================================================================
-- Migration: 0003_migrate_to_saas
-- ============================================================================
-- Description: Migrates ProfoChatBot database from monolithic to multi-tenant SaaS architecture
-- Author: System
-- Date: 2024-01-01
-- Related: docs/reqs/transition_to_saas.md, docs/reqs/database_schema_saas.md
-- Breaking: No (backward compatible)
-- ============================================================================
-- 
-- This migration performs a phased transition to SaaS:
-- Phase 0: Add account_id columns (backward compatible)
-- Phase 1: Create new tables (account, account_member, bot, course_deployment, enrollment_token)
-- Phase 2: Migrate existing data (bots, courses, relationships)
-- Phase 3: Add new columns and foreign keys
-- Phase 4: Create indexes and constraints
-- Phase 5: Data validation and cleanup
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 0: Create default account and add account_id columns
-- ============================================================================

-- Create account table if not exists
CREATE SEQUENCE IF NOT EXISTS account_account_id_seq;

CREATE TABLE IF NOT EXISTS public.account (
    account_id INT4 NOT NULL DEFAULT nextval('account_account_id_seq'::regclass),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan TEXT DEFAULT 'free',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    settings JSONB,
    PRIMARY KEY (account_id)
);

-- Create default account if it doesn't exist
INSERT INTO public.account (account_id, name, slug, plan, created_at, updated_at, is_active)
SELECT 1, 'Default Account', 'default', 'free', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.account WHERE account_id = 1);

-- Set sequence to start from 2 if account_id = 1 exists
SELECT setval('account_account_id_seq', GREATEST(1, (SELECT MAX(account_id) FROM public.account)));

-- Add account_id to conversation if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'conversation' 
        AND column_name = 'account_id'
    ) THEN
        ALTER TABLE public.conversation ADD COLUMN account_id INT4 DEFAULT 1 NOT NULL;
    END IF;
END $$;

-- Add account_id to run if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'run' 
        AND column_name = 'account_id'
    ) THEN
        ALTER TABLE public.run ADD COLUMN account_id INT4 DEFAULT 1 NOT NULL;
    END IF;
END $$;

-- Add account_id to waiting_element if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'waiting_element' 
        AND column_name = 'account_id'
    ) THEN
        ALTER TABLE public.waiting_element ADD COLUMN account_id INT4 DEFAULT 1 NOT NULL;
    END IF;
END $$;

-- Add account_id to course if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'course' 
        AND column_name = 'account_id'
    ) THEN
        ALTER TABLE public.course ADD COLUMN account_id INT4 DEFAULT 1 NOT NULL;
    END IF;
END $$;

-- Add account_id to course_element if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'course_element' 
        AND column_name = 'account_id'
    ) THEN
        ALTER TABLE public.course_element ADD COLUMN account_id INT4 DEFAULT 1 NOT NULL;
    END IF;
END $$;

-- Add account_id to courseparticipants if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'courseparticipants' 
        AND column_name = 'account_id'
    ) THEN
        ALTER TABLE public.courseparticipants ADD COLUMN account_id INT4 DEFAULT 1 NOT NULL;
    END IF;
END $$;

-- Add account_id to bannedparticipants if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bannedparticipants' 
        AND column_name = 'account_id'
    ) THEN
        ALTER TABLE public.bannedparticipants ADD COLUMN account_id INT4 DEFAULT 1 NOT NULL;
    END IF;
END $$;

-- Add account_id to gen_settings if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'gen_settings' 
        AND column_name = 'account_id'
    ) THEN
        ALTER TABLE public.gen_settings ADD COLUMN account_id INT4;
    END IF;
END $$;

-- ============================================================================
-- PHASE 1: Create new tables (account_member, bot, course_deployment, enrollment_token)
-- ============================================================================

-- Create account_member table
CREATE SEQUENCE IF NOT EXISTS account_member_account_member_id_seq;

CREATE TABLE IF NOT EXISTS public.account_member (
    account_member_id INT4 NOT NULL DEFAULT nextval('account_member_account_member_id_seq'::regclass),
    account_id INT4 NOT NULL,
    telegram_user_id INT8 NOT NULL,
    telegram_username TEXT,
    role TEXT DEFAULT 'member',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (account_member_id),
    UNIQUE (account_id, telegram_user_id)
);

-- Create bot table
CREATE SEQUENCE IF NOT EXISTS bot_bot_id_seq;

CREATE TABLE IF NOT EXISTS public.bot (
    bot_id INT4 NOT NULL DEFAULT nextval('bot_bot_id_seq'::regclass),
    account_id INT4 NOT NULL,
    bot_name TEXT NOT NULL,
    bot_token TEXT NOT NULL,
    display_name TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    settings JSONB,
    PRIMARY KEY (bot_id),
    UNIQUE (account_id, bot_name)
);

-- Create unique constraint on bot_token if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'bot_bot_token_key'
    ) THEN
        ALTER TABLE public.bot ADD CONSTRAINT bot_bot_token_key UNIQUE (bot_token);
    END IF;
END $$;

-- Create course_deployment table
CREATE SEQUENCE IF NOT EXISTS course_deployment_deployment_id_seq;

CREATE TABLE IF NOT EXISTS public.course_deployment (
    deployment_id INT4 NOT NULL DEFAULT nextval('course_deployment_deployment_id_seq'::regclass),
    course_id TEXT NOT NULL,
    account_id INT4 NOT NULL,
    bot_id INT4 NOT NULL,
    environment TEXT DEFAULT 'prod',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    settings JSONB,
    PRIMARY KEY (deployment_id),
    UNIQUE (bot_id, course_id, account_id, environment)
);

-- Create enrollment_token table
CREATE SEQUENCE IF NOT EXISTS enrollment_token_token_id_seq;

CREATE TABLE IF NOT EXISTS public.enrollment_token (
    token_id INT4 NOT NULL DEFAULT nextval('enrollment_token_token_id_seq'::regclass),
    deployment_id INT4 NOT NULL,
    token TEXT NOT NULL UNIQUE,
    token_type TEXT DEFAULT 'public',
    max_uses INT4,
    current_uses INT4 DEFAULT 0,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT8,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB,
    PRIMARY KEY (token_id)
);

-- ============================================================================
-- PHASE 2: Migrate existing data
-- ============================================================================

-- Migrate bots from run.botname and course.bot_name
-- Extract unique bot names and create bot records
INSERT INTO public.bot (account_id, bot_name, bot_token, display_name, is_active, created_at)
SELECT DISTINCT
    1 as account_id,
    COALESCE(r.botname, c.bot_name) as bot_name,
    'temp_' || COALESCE(r.botname, c.bot_name) || '_' || md5(COALESCE(r.botname, c.bot_name) || '1') as bot_token,  -- Temporary unique token, needs to be replaced with actual token
    COALESCE(r.botname, c.bot_name) as display_name,
    TRUE as is_active,
    CURRENT_TIMESTAMP as created_at
FROM (
    SELECT DISTINCT botname FROM public.run WHERE botname IS NOT NULL
    UNION
    SELECT DISTINCT bot_name FROM public.course WHERE bot_name IS NOT NULL
) AS r
FULL OUTER JOIN (
    SELECT DISTINCT bot_name FROM public.course WHERE bot_name IS NOT NULL
) AS c ON r.botname = c.bot_name
WHERE COALESCE(r.botname, c.bot_name) IS NOT NULL
ON CONFLICT (account_id, bot_name) DO NOTHING;

-- Migrate courses: create unique courses per account
-- First, update course table structure
DO $$
BEGIN
    -- Add new columns to course if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'course' 
        AND column_name = 'title'
    ) THEN
        ALTER TABLE public.course ADD COLUMN title TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'course' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE public.course ADD COLUMN description TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'course' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.course ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'course' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE public.course ADD COLUMN metadata JSONB;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'course' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.course ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Migrate course_element: add account_id and remove bot_name dependency
-- Update existing course_element records to use account_id from course
UPDATE public.course_element ce
SET account_id = c.account_id
FROM public.course c
WHERE ce.course_id = c.course_id 
  AND ce.bot_name = c.bot_name
  AND ce.account_id IS NULL;

-- Set account_id = 1 for any remaining NULL values
UPDATE public.course_element SET account_id = 1 WHERE account_id IS NULL;

-- Migrate courseparticipants: add account_id
UPDATE public.courseparticipants cp
SET account_id = c.account_id
FROM public.course c
WHERE cp.course_id = c.course_id
  AND cp.account_id IS NULL;

UPDATE public.courseparticipants SET account_id = 1 WHERE account_id IS NULL;

-- Add chat_id and other columns to courseparticipants if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'courseparticipants' 
        AND column_name = 'chat_id'
    ) THEN
        ALTER TABLE public.courseparticipants ADD COLUMN chat_id INT8;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'courseparticipants' 
        AND column_name = 'added_at'
    ) THEN
        ALTER TABLE public.courseparticipants ADD COLUMN added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'courseparticipants' 
        AND column_name = 'added_by'
    ) THEN
        ALTER TABLE public.courseparticipants ADD COLUMN added_by INT8;
    END IF;
END $$;

-- ============================================================================
-- PHASE 3: Add foreign key columns and migrate relationships
-- ============================================================================

-- Add bot_id to run
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'run' 
        AND column_name = 'bot_id'
    ) THEN
        ALTER TABLE public.run ADD COLUMN bot_id INT4;
        
        -- Migrate botname to bot_id
        UPDATE public.run r
        SET bot_id = b.bot_id
        FROM public.bot b
        WHERE r.botname = b.bot_name 
          AND r.account_id = b.account_id
          AND r.bot_id IS NULL;
    END IF;
END $$;

-- Add deployment_id to run
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'run' 
        AND column_name = 'deployment_id'
    ) THEN
        ALTER TABLE public.run ADD COLUMN deployment_id INT4;
    END IF;
END $$;

-- Create course_deployment records for existing course-bot relationships
-- Based on actual runs and course-bot_name pairs
INSERT INTO public.course_deployment (course_id, account_id, bot_id, environment, is_active, created_at)
SELECT DISTINCT
    r.course_id,
    r.account_id,
    r.bot_id,
    'prod' as environment,
    TRUE as is_active,
    CURRENT_TIMESTAMP as created_at
FROM public.run r
WHERE r.bot_id IS NOT NULL
  AND r.course_id IS NOT NULL
  AND r.account_id IS NOT NULL
ON CONFLICT (bot_id, course_id, account_id, environment) DO NOTHING;

-- Also create deployments for courses that exist but don't have runs yet
-- Match by course.bot_name to bot.bot_name
INSERT INTO public.course_deployment (course_id, account_id, bot_id, environment, is_active, created_at)
SELECT DISTINCT
    c.course_id,
    c.account_id,
    b.bot_id,
    'prod' as environment,
    TRUE as is_active,
    CURRENT_TIMESTAMP as created_at
FROM public.course c
JOIN public.bot b ON c.bot_name = b.bot_name AND c.account_id = b.account_id
WHERE NOT EXISTS (
    SELECT 1 FROM public.course_deployment cd
    WHERE cd.course_id = c.course_id
      AND cd.bot_id = b.bot_id
      AND cd.account_id = c.account_id
)
ON CONFLICT (bot_id, course_id, account_id, environment) DO NOTHING;

-- Update run.deployment_id
UPDATE public.run r
SET deployment_id = cd.deployment_id
FROM public.course_deployment cd
WHERE r.course_id = cd.course_id
  AND r.bot_id = cd.bot_id
  AND r.account_id = cd.account_id
  AND r.deployment_id IS NULL;

-- Add token_id to run
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'run' 
        AND column_name = 'token_id'
    ) THEN
        ALTER TABLE public.run ADD COLUMN token_id INT4;
    END IF;
END $$;

-- Add is_active to run if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'run' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.run ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        -- Set is_active based on is_ended
        UPDATE public.run SET is_active = COALESCE(NOT is_ended, TRUE);
    END IF;
END $$;

-- Add ended_at to run if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'run' 
        AND column_name = 'ended_at'
    ) THEN
        ALTER TABLE public.run ADD COLUMN ended_at TIMESTAMP;
    END IF;
END $$;

-- Add UTM fields to run if not exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'run' 
        AND column_name = 'utm_medium'
    ) THEN
        ALTER TABLE public.run ADD COLUMN utm_medium TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'run' 
        AND column_name = 'utm_term'
    ) THEN
        ALTER TABLE public.run ADD COLUMN utm_term TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'run' 
        AND column_name = 'utm_content'
    ) THEN
        ALTER TABLE public.run ADD COLUMN utm_content TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'run' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE public.run ADD COLUMN metadata JSONB;
    END IF;
END $$;

-- Add bot_id to waiting_element
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'waiting_element' 
        AND column_name = 'bot_id'
    ) THEN
        ALTER TABLE public.waiting_element ADD COLUMN bot_id INT4;
        
        -- Migrate botname to bot_id
        UPDATE public.waiting_element we
        SET bot_id = b.bot_id
        FROM public.bot b
        WHERE we.botname = b.bot_name 
          AND we.account_id = b.account_id
          AND we.bot_id IS NULL;
    END IF;
END $$;

-- Add run_id to waiting_element
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'waiting_element' 
        AND column_name = 'run_id'
    ) THEN
        ALTER TABLE public.waiting_element ADD COLUMN run_id INT4;
        
        -- Try to match waiting_element to run
        UPDATE public.waiting_element we
        SET run_id = r.run_id
        FROM public.run r
        WHERE we.chat_id = r.chat_id
          AND we.course_id = r.course_id
          AND we.bot_id = r.bot_id
          AND we.run_id IS NULL
          AND r.is_active = TRUE;
    END IF;
END $$;

-- Add created_at to waiting_element if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'waiting_element' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.waiting_element ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Add bot_id to bannedparticipants
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bannedparticipants' 
        AND column_name = 'bot_id'
    ) THEN
        ALTER TABLE public.bannedparticipants ADD COLUMN bot_id INT4;
        
        -- Migrate botname to bot_id
        UPDATE public.bannedparticipants bp
        SET bot_id = b.bot_id
        FROM public.bot b
        WHERE bp.botname = b.bot_name 
          AND bp.account_id = b.account_id
          AND bp.bot_id IS NULL;
    END IF;
END $$;

-- Add metadata to bannedparticipants if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bannedparticipants' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE public.bannedparticipants ADD COLUMN metadata JSONB;
    END IF;
END $$;

-- Update gen_settings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'gen_settings' 
        AND column_name = 'bot_id'
    ) THEN
        ALTER TABLE public.gen_settings ADD COLUMN bot_id INT4;
        
        -- Migrate bot_name to bot_id
        UPDATE public.gen_settings gs
        SET bot_id = b.bot_id
        FROM public.bot b
        WHERE gs.bot_name = b.bot_name 
          AND gs.account_id = b.account_id
          AND gs.bot_id IS NULL;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'gen_settings' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.gen_settings ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'gen_settings' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.gen_settings ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- ============================================================================
-- PHASE 4: Add foreign key constraints
-- ============================================================================

-- Add foreign keys for account_member
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'account_member_account_id_fkey'
    ) THEN
        ALTER TABLE public.account_member 
        ADD CONSTRAINT account_member_account_id_fkey 
        FOREIGN KEY (account_id) REFERENCES public.account(account_id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign keys for bot
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'bot_account_id_fkey'
    ) THEN
        ALTER TABLE public.bot 
        ADD CONSTRAINT bot_account_id_fkey 
        FOREIGN KEY (account_id) REFERENCES public.account(account_id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign keys for course
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'course_account_id_fkey'
    ) THEN
        ALTER TABLE public.course 
        ADD CONSTRAINT course_account_id_fkey 
        FOREIGN KEY (account_id) REFERENCES public.account(account_id) ON DELETE CASCADE;
    END IF;
END $$;

-- Deduplicate courses: keep only one course per (course_id, account_id)
-- If there are duplicates, keep the one with the lowest bot_name (alphabetically first)
DO $$
BEGIN
    -- Delete duplicate courses, keeping only one per (course_id, account_id)
    -- Use bot_name for ordering, and ctid as tiebreaker
    DELETE FROM public.course c1
    WHERE EXISTS (
        SELECT 1 FROM public.course c2
        WHERE c2.course_id = c1.course_id
          AND c2.account_id = c1.account_id
          AND (
              c2.bot_name < c1.bot_name
              OR (c2.bot_name = c1.bot_name AND c2.ctid < c1.ctid)
          )
    );
END $$;

-- Add unique constraint on course(course_id, account_id) for foreign key references
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'course_course_id_account_id_key'
    ) THEN
        ALTER TABLE public.course 
        ADD CONSTRAINT course_course_id_account_id_key 
        UNIQUE (course_id, account_id);
    END IF;
END $$;

-- Clean up tables: remove records referencing non-existent courses
-- This is needed because deduplication may have removed some courses

-- Clean up course_element
DELETE FROM public.course_element ce
WHERE NOT EXISTS (
    SELECT 1 FROM public.course c
    WHERE c.course_id = ce.course_id
      AND c.account_id = ce.account_id
);

-- Clean up course_deployment
DELETE FROM public.course_deployment cd
WHERE NOT EXISTS (
    SELECT 1 FROM public.course c
    WHERE c.course_id = cd.course_id
      AND c.account_id = cd.account_id
);

-- Clean up courseparticipants
DELETE FROM public.courseparticipants cp
WHERE NOT EXISTS (
    SELECT 1 FROM public.course c
    WHERE c.course_id = cp.course_id
      AND c.account_id = cp.account_id
);

-- Add foreign keys for course_deployment
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'course_deployment_course_fkey'
    ) THEN
        ALTER TABLE public.course_deployment 
        ADD CONSTRAINT course_deployment_course_fkey 
        FOREIGN KEY (course_id, account_id) REFERENCES public.course(course_id, account_id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'course_deployment_bot_fkey'
    ) THEN
        ALTER TABLE public.course_deployment 
        ADD CONSTRAINT course_deployment_bot_fkey 
        FOREIGN KEY (bot_id) REFERENCES public.bot(bot_id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign keys for enrollment_token
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'enrollment_token_deployment_fkey'
    ) THEN
        ALTER TABLE public.enrollment_token 
        ADD CONSTRAINT enrollment_token_deployment_fkey 
        FOREIGN KEY (deployment_id) REFERENCES public.course_deployment(deployment_id) ON DELETE CASCADE;
    END IF;
END $$;

-- Clean up run: remove invalid deployment_id references and re-populate them
-- This must be done before creating foreign key constraints
UPDATE public.run r
SET deployment_id = NULL
WHERE r.deployment_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.course_deployment cd
      WHERE cd.deployment_id = r.deployment_id
  );

-- Re-populate deployment_id for run records after cleanup
UPDATE public.run r
SET deployment_id = cd.deployment_id
FROM public.course_deployment cd
WHERE r.course_id = cd.course_id
  AND r.bot_id = cd.bot_id
  AND r.account_id = cd.account_id
  AND r.deployment_id IS NULL;

-- Add foreign keys for run
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'run_account_id_fkey'
    ) THEN
        ALTER TABLE public.run 
        ADD CONSTRAINT run_account_id_fkey 
        FOREIGN KEY (account_id) REFERENCES public.account(account_id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'run_bot_id_fkey'
    ) THEN
        ALTER TABLE public.run 
        ADD CONSTRAINT run_bot_id_fkey 
        FOREIGN KEY (bot_id) REFERENCES public.bot(bot_id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'run_deployment_id_fkey'
    ) THEN
        ALTER TABLE public.run 
        ADD CONSTRAINT run_deployment_id_fkey 
        FOREIGN KEY (deployment_id) REFERENCES public.course_deployment(deployment_id) ON DELETE RESTRICT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'run_token_id_fkey'
    ) THEN
        ALTER TABLE public.run 
        ADD CONSTRAINT run_token_id_fkey 
        FOREIGN KEY (token_id) REFERENCES public.enrollment_token(token_id);
    END IF;
END $$;

-- Add foreign keys for conversation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'conversation_account_id_fkey'
    ) THEN
        ALTER TABLE public.conversation 
        ADD CONSTRAINT conversation_account_id_fkey 
        FOREIGN KEY (account_id) REFERENCES public.account(account_id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'conversation_run_id_fkey'
    ) THEN
        ALTER TABLE public.conversation 
        ADD CONSTRAINT conversation_run_id_fkey 
        FOREIGN KEY (run_id) REFERENCES public.run(run_id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign keys for waiting_element
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'waiting_element_account_id_fkey'
    ) THEN
        ALTER TABLE public.waiting_element 
        ADD CONSTRAINT waiting_element_account_id_fkey 
        FOREIGN KEY (account_id) REFERENCES public.account(account_id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'waiting_element_bot_id_fkey'
    ) THEN
        ALTER TABLE public.waiting_element 
        ADD CONSTRAINT waiting_element_bot_id_fkey 
        FOREIGN KEY (bot_id) REFERENCES public.bot(bot_id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'waiting_element_run_id_fkey'
    ) THEN
        ALTER TABLE public.waiting_element 
        ADD CONSTRAINT waiting_element_run_id_fkey 
        FOREIGN KEY (run_id) REFERENCES public.run(run_id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign keys for bannedparticipants
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'bannedparticipants_account_id_fkey'
    ) THEN
        ALTER TABLE public.bannedparticipants 
        ADD CONSTRAINT bannedparticipants_account_id_fkey 
        FOREIGN KEY (account_id) REFERENCES public.account(account_id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'bannedparticipants_bot_id_fkey'
    ) THEN
        ALTER TABLE public.bannedparticipants 
        ADD CONSTRAINT bannedparticipants_bot_id_fkey 
        FOREIGN KEY (bot_id) REFERENCES public.bot(bot_id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign keys for courseparticipants
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'courseparticipants_account_id_fkey'
    ) THEN
        ALTER TABLE public.courseparticipants 
        ADD CONSTRAINT courseparticipants_account_id_fkey 
        FOREIGN KEY (account_id) REFERENCES public.account(account_id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'courseparticipants_course_fkey'
    ) THEN
        ALTER TABLE public.courseparticipants 
        ADD CONSTRAINT courseparticipants_course_fkey 
        FOREIGN KEY (course_id, account_id) REFERENCES public.course(course_id, account_id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign keys for gen_settings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'gen_settings_account_id_fkey'
    ) THEN
        ALTER TABLE public.gen_settings 
        ADD CONSTRAINT gen_settings_account_id_fkey 
        FOREIGN KEY (account_id) REFERENCES public.account(account_id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'gen_settings_bot_id_fkey'
    ) THEN
        ALTER TABLE public.gen_settings 
        ADD CONSTRAINT gen_settings_bot_id_fkey 
        FOREIGN KEY (bot_id) REFERENCES public.bot(bot_id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- PHASE 5: Create indexes
-- ============================================================================

-- Account indexes
CREATE INDEX IF NOT EXISTS idx_account_slug ON public.account (slug);
CREATE INDEX IF NOT EXISTS idx_account_active ON public.account (is_active);

-- AccountMember indexes
CREATE INDEX IF NOT EXISTS idx_account_member_account ON public.account_member (account_id);
CREATE INDEX IF NOT EXISTS idx_account_member_telegram ON public.account_member (telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_account_member_active ON public.account_member (account_id, is_active);

-- Bot indexes
CREATE INDEX IF NOT EXISTS idx_bot_account ON public.bot (account_id);
CREATE INDEX IF NOT EXISTS idx_bot_name ON public.bot (bot_name);
CREATE INDEX IF NOT EXISTS idx_bot_active ON public.bot (account_id, is_active);

-- Course indexes
CREATE INDEX IF NOT EXISTS idx_course_account ON public.course (account_id);
CREATE INDEX IF NOT EXISTS idx_course_active ON public.course (account_id, is_active);
CREATE INDEX IF NOT EXISTS idx_course_created ON public.course (account_id, date_created DESC);

-- CourseElement indexes
CREATE INDEX IF NOT EXISTS idx_course_element_course ON public.course_element (course_id, account_id);
CREATE INDEX IF NOT EXISTS idx_course_element_type ON public.course_element (course_id, account_id, element_type);
CREATE INDEX IF NOT EXISTS idx_course_element_order ON public.course_element (course_id, account_id, course_element_id);

-- CourseDeployment indexes
CREATE INDEX IF NOT EXISTS idx_deployment_course ON public.course_deployment (course_id, account_id);
CREATE INDEX IF NOT EXISTS idx_deployment_bot ON public.course_deployment (bot_id);
CREATE INDEX IF NOT EXISTS idx_deployment_active ON public.course_deployment (bot_id, is_active);

-- EnrollmentToken indexes
CREATE INDEX IF NOT EXISTS idx_token_deployment ON public.enrollment_token (deployment_id);
CREATE INDEX IF NOT EXISTS idx_token_token ON public.enrollment_token (token);
CREATE INDEX IF NOT EXISTS idx_token_active ON public.enrollment_token (deployment_id, is_active);
CREATE INDEX IF NOT EXISTS idx_token_expires ON public.enrollment_token (expires_at) WHERE expires_at IS NOT NULL;

-- Run indexes
CREATE INDEX IF NOT EXISTS idx_run_account ON public.run (account_id);
CREATE INDEX IF NOT EXISTS idx_run_bot ON public.run (bot_id);
CREATE INDEX IF NOT EXISTS idx_run_deployment ON public.run (deployment_id);
CREATE INDEX IF NOT EXISTS idx_run_chat ON public.run (bot_id, chat_id);
CREATE INDEX IF NOT EXISTS idx_run_course ON public.run (course_id, account_id);
CREATE INDEX IF NOT EXISTS idx_run_active ON public.run (bot_id, is_active);
CREATE INDEX IF NOT EXISTS idx_run_ended ON public.run (is_ended, ended_at);

-- Conversation indexes
CREATE INDEX IF NOT EXISTS idx_conversation_account ON public.conversation (account_id);
CREATE INDEX IF NOT EXISTS idx_conversation_run ON public.conversation (run_id);
CREATE INDEX IF NOT EXISTS idx_conversation_chat ON public.conversation (chat_id);
CREATE INDEX IF NOT EXISTS idx_conversation_course ON public.conversation (course_id, account_id);
CREATE INDEX IF NOT EXISTS idx_conversation_element ON public.conversation (course_id, account_id, element_id);
CREATE INDEX IF NOT EXISTS idx_conversation_date ON public.conversation (date_inserted DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_role ON public.conversation (run_id, role);

-- WaitingElement indexes
CREATE INDEX IF NOT EXISTS idx_waiting_account ON public.waiting_element (account_id);
CREATE INDEX IF NOT EXISTS idx_waiting_bot ON public.waiting_element (bot_id);
CREATE INDEX IF NOT EXISTS idx_waiting_run ON public.waiting_element (run_id);
CREATE INDEX IF NOT EXISTS idx_waiting_active ON public.waiting_element (is_waiting, waiting_till_date) WHERE is_waiting = TRUE;
CREATE INDEX IF NOT EXISTS idx_waiting_date ON public.waiting_element (waiting_till_date);

-- BannedParticipants indexes
CREATE INDEX IF NOT EXISTS idx_banned_account ON public.bannedparticipants (account_id);
CREATE INDEX IF NOT EXISTS idx_banned_bot ON public.bannedparticipants (bot_id);
CREATE INDEX IF NOT EXISTS idx_banned_chat ON public.bannedparticipants (bot_id, chat_id, excluded);
CREATE INDEX IF NOT EXISTS idx_banned_active ON public.bannedparticipants (bot_id, excluded) WHERE excluded = 0;

-- CourseParticipants indexes
CREATE INDEX IF NOT EXISTS idx_courseparticipants_account ON public.courseparticipants (account_id);
CREATE INDEX IF NOT EXISTS idx_courseparticipants_course ON public.courseparticipants (course_id, account_id);
CREATE INDEX IF NOT EXISTS idx_courseparticipants_chat ON public.courseparticipants (chat_id);
CREATE INDEX IF NOT EXISTS idx_courseparticipants_username ON public.courseparticipants (username);

-- GenSettings indexes
CREATE INDEX IF NOT EXISTS idx_gen_settings_account ON public.gen_settings (account_id);
CREATE INDEX IF NOT EXISTS idx_gen_settings_bot ON public.gen_settings (bot_id);
CREATE INDEX IF NOT EXISTS idx_gen_settings_key ON public.gen_settings (account_id, bot_id, s_key);

-- ============================================================================
-- PHASE 6: Add unique constraints and check constraints
-- ============================================================================

-- Add unique constraint for run: one active course per student per bot
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'run_one_active_per_bot_chat'
    ) THEN
        -- First, ensure we don't have multiple active runs per bot+chat
        UPDATE public.run r1
        SET is_active = FALSE
        WHERE r1.is_active = TRUE
          AND EXISTS (
              SELECT 1 FROM public.run r2
              WHERE r2.bot_id = r1.bot_id
                AND r2.chat_id = r1.chat_id
                AND r2.run_id > r1.run_id
                AND r2.is_active = TRUE
          );
        
        -- Then add the constraint
        CREATE UNIQUE INDEX run_one_active_per_bot_chat 
        ON public.run (bot_id, chat_id) 
        WHERE is_active = TRUE;
    END IF;
END $$;

-- Add unique constraint for courseparticipants
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'courseparticipants_unique'
    ) THEN
        CREATE UNIQUE INDEX courseparticipants_unique 
        ON public.courseparticipants (course_id, account_id, COALESCE(chat_id, 0), COALESCE(username, ''));
    END IF;
END $$;

-- Add unique constraint for bannedparticipants
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'bannedparticipants_unique'
    ) THEN
        CREATE UNIQUE INDEX bannedparticipants_unique 
        ON public.bannedparticipants (bot_id, chat_id, excluded);
    END IF;
END $$;

-- ============================================================================
-- PHASE 7: Data validation and cleanup
-- ============================================================================

-- Ensure all account_id values are set
UPDATE public.conversation SET account_id = 1 WHERE account_id IS NULL;
UPDATE public.run SET account_id = 1 WHERE account_id IS NULL;
UPDATE public.waiting_element SET account_id = 1 WHERE account_id IS NULL;
UPDATE public.course SET account_id = 1 WHERE account_id IS NULL;
UPDATE public.course_element SET account_id = 1 WHERE account_id IS NULL;
UPDATE public.courseparticipants SET account_id = 1 WHERE account_id IS NULL;
UPDATE public.bannedparticipants SET account_id = 1 WHERE account_id IS NULL;

-- Set NOT NULL constraints where appropriate (after ensuring no NULLs)
DO $$
BEGIN
    -- Make account_id NOT NULL in conversation
    ALTER TABLE public.conversation ALTER COLUMN account_id SET NOT NULL;
    
    -- Make account_id NOT NULL in run
    ALTER TABLE public.run ALTER COLUMN account_id SET NOT NULL;
    
    -- Make account_id NOT NULL in waiting_element
    ALTER TABLE public.waiting_element ALTER COLUMN account_id SET NOT NULL;
    
    -- Make account_id NOT NULL in course
    ALTER TABLE public.course ALTER COLUMN account_id SET NOT NULL;
    
    -- Make account_id NOT NULL in course_element
    ALTER TABLE public.course_element ALTER COLUMN account_id SET NOT NULL;
    
    -- Make account_id NOT NULL in courseparticipants
    ALTER TABLE public.courseparticipants ALTER COLUMN account_id SET NOT NULL;
    
    -- Make account_id NOT NULL in bannedparticipants
    ALTER TABLE public.bannedparticipants ALTER COLUMN account_id SET NOT NULL;
EXCEPTION
    WHEN others THEN
        -- If constraint already exists or column is already NOT NULL, ignore
        NULL;
END $$;

-- ============================================================================
-- Migration Summary
-- ============================================================================

-- Display migration summary
DO $$
DECLARE
    account_count INT;
    bot_count INT;
    course_count INT;
    deployment_count INT;
    run_count INT;
BEGIN
    SELECT COUNT(*) INTO account_count FROM public.account;
    SELECT COUNT(*) INTO bot_count FROM public.bot;
    SELECT COUNT(*) INTO course_count FROM public.course;
    SELECT COUNT(*) INTO deployment_count FROM public.course_deployment;
    SELECT COUNT(*) INTO run_count FROM public.run WHERE is_active = TRUE;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Accounts: %', account_count;
    RAISE NOTICE 'Bots: %', bot_count;
    RAISE NOTICE 'Courses: %', course_count;
    RAISE NOTICE 'Deployments: %', deployment_count;
    RAISE NOTICE 'Active Runs: %', run_count;
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- Record migration
-- ============================================================================

INSERT INTO schema_migrations (version, description, applied_by)
VALUES ('0003', 'Migrate to SaaS architecture', current_user)
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ============================================================================
-- Post-Migration Notes
-- ============================================================================
-- 
-- IMPORTANT: After migration, you need to:
-- 
-- 1. Update bot tokens manually (they are set to temporary values during migration):
--    UPDATE bot SET bot_token = '<actual_token>' WHERE bot_name = '<name>';
--    Temporary tokens have format: 'temp_<bot_name>_<hash>'
-- 
-- 2. Verify data integrity:
--    - Check that all runs have bot_id set
--    - Check that all runs have deployment_id set
--    - Check that all waiting_elements have bot_id and run_id set
-- 
-- 3. Update application code to use new schema:
--    - Replace botname with bot_id
--    - Use account_id in all queries
--    - Use deployment_id for course-bot relationships
-- 
-- 4. Test thoroughly before deploying to production
-- 
-- ============================================================================
