-- ============================================================================
-- Migration: 0004_course_id_to_int
-- ============================================================================
-- Description: Changes course.course_id from TEXT to INT with auto-increment PK
--              Renames old course_id to course_code
--              Updates all foreign key references to use new course_id
-- Author: System
-- Date: 2024-01-01
-- Breaking: Yes (requires application code updates)
-- ============================================================================
-- 
-- This migration performs:
-- 1. Creates sequence for new course_id INT
-- 2. Adds new course_id INT column to course table
-- 3. Populates new course_id for each unique (course_code, account_id)
-- 4. Drops old constraints (PK, FK, unique)
-- 5. Renames old course_id to course_code
-- 6. Makes new course_id the primary key
-- 7. Updates all foreign keys in related tables
-- 8. Updates indexes
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: Create sequence for new course_id
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS course_course_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    START 1
    CACHE 1
    NO CYCLE;

-- ============================================================================
-- PHASE 2: Add new course_id INT column to course table
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'course' 
        AND column_name = 'course_id_int'
    ) THEN
        ALTER TABLE public.course ADD COLUMN course_id_int INT4;
    END IF;
END $$;

-- ============================================================================
-- PHASE 3: Populate new course_id for each unique (course_id, account_id)
-- ============================================================================

-- Assign unique course_id_int for each unique combination of (course_id, account_id)
-- We'll use the first occurrence (by bot_name) for each combination
DO $$
DECLARE
    rec RECORD;
    new_id INT4;
BEGIN
    -- Set sequence to start from 1
    PERFORM setval('course_course_id_seq', 1, false);
    
    -- For each unique (course_id, account_id), assign a new course_id_int
    FOR rec IN 
        SELECT DISTINCT course_id, account_id 
        FROM public.course 
        ORDER BY account_id, course_id
    LOOP
        new_id := nextval('course_course_id_seq');
        
        -- Update all rows with this (course_id, account_id) combination
        UPDATE public.course 
        SET course_id_int = new_id
        WHERE course.course_id = rec.course_id 
          AND course.account_id = rec.account_id;
    END LOOP;
END $$;

-- Make course_id_int NOT NULL after population
ALTER TABLE public.course ALTER COLUMN course_id_int SET NOT NULL;

-- ============================================================================
-- PHASE 4: Rename old course_id (TEXT) to course_code in related tables
-- ============================================================================

-- Rename course_id to course_code in course_element
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'course_element' 
        AND column_name = 'course_id'
        AND data_type = 'text'
    ) THEN
        ALTER TABLE public.course_element RENAME COLUMN course_id TO course_code;
    END IF;
END $$;

-- Rename course_id to course_code in course_deployment
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'course_deployment' 
        AND column_name = 'course_id'
        AND data_type = 'text'
    ) THEN
        ALTER TABLE public.course_deployment RENAME COLUMN course_id TO course_code;
    END IF;
END $$;

-- Rename course_id to course_code in courseparticipants
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'courseparticipants' 
        AND column_name = 'course_id'
        AND data_type = 'text'
    ) THEN
        ALTER TABLE public.courseparticipants RENAME COLUMN course_id TO course_code;
    END IF;
END $$;

-- Rename course_id to course_code in run
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'run' 
        AND column_name = 'course_id'
        AND data_type = 'text'
    ) THEN
        ALTER TABLE public.run RENAME COLUMN course_id TO course_code;
    END IF;
END $$;

-- Rename course_id to course_code in conversation
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'conversation' 
        AND column_name = 'course_id'
        AND data_type = 'text'
    ) THEN
        ALTER TABLE public.conversation RENAME COLUMN course_id TO course_code;
    END IF;
END $$;

-- Rename course_id to course_code in waiting_element
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'waiting_element' 
        AND column_name = 'course_id'
        AND data_type = 'text'
    ) THEN
        ALTER TABLE public.waiting_element RENAME COLUMN course_id TO course_code;
    END IF;
END $$;

-- ============================================================================
-- PHASE 5: Add course_id INT columns to related tables and populate them
-- ============================================================================

-- Add course_id_int to course_element
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'course_element' 
        AND column_name = 'course_id_int'
    ) THEN
        ALTER TABLE public.course_element ADD COLUMN course_id_int INT4;
    END IF;
END $$;

-- Populate course_id_int in course_element
UPDATE public.course_element ce
SET course_id_int = c.course_id_int
FROM public.course c
WHERE ce.course_code = c.course_id 
  AND ce.account_id = c.account_id;

-- Make course_id_int NOT NULL in course_element
ALTER TABLE public.course_element ALTER COLUMN course_id_int SET NOT NULL;

-- Add course_id_int to course_deployment
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'course_deployment' 
        AND column_name = 'course_id_int'
    ) THEN
        ALTER TABLE public.course_deployment ADD COLUMN course_id_int INT4;
    END IF;
END $$;

-- Populate course_id_int in course_deployment
UPDATE public.course_deployment cd
SET course_id_int = c.course_id_int
FROM public.course c
WHERE cd.course_code = c.course_id 
  AND cd.account_id = c.account_id;

-- Make course_id_int NOT NULL in course_deployment
ALTER TABLE public.course_deployment ALTER COLUMN course_id_int SET NOT NULL;

-- Add course_id_int to courseparticipants
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'courseparticipants' 
        AND column_name = 'course_id_int'
    ) THEN
        ALTER TABLE public.courseparticipants ADD COLUMN course_id_int INT4;
    END IF;
END $$;

-- Populate course_id_int in courseparticipants
UPDATE public.courseparticipants cp
SET course_id_int = c.course_id_int
FROM public.course c
WHERE cp.course_code = c.course_id 
  AND cp.account_id = c.account_id;

-- Make course_id_int NOT NULL in courseparticipants
ALTER TABLE public.courseparticipants ALTER COLUMN course_id_int SET NOT NULL;

-- Add course_id_int to run (optional, for future FK)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'run' 
        AND column_name = 'course_id_int'
    ) THEN
        ALTER TABLE public.run ADD COLUMN course_id_int INT4;
    END IF;
END $$;

-- Populate course_id_int in run
UPDATE public.run r
SET course_id_int = c.course_id_int
FROM public.course c
WHERE r.course_code = c.course_id 
  AND r.account_id = c.account_id;

-- Add course_id_int to conversation (optional, for future FK)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'conversation' 
        AND column_name = 'course_id_int'
    ) THEN
        ALTER TABLE public.conversation ADD COLUMN course_id_int INT4;
    END IF;
END $$;

-- Populate course_id_int in conversation
UPDATE public.conversation conv
SET course_id_int = c.course_id_int
FROM public.course c
WHERE conv.course_code = c.course_id 
  AND conv.account_id = c.account_id;

-- Add course_id_int to waiting_element (optional, for future FK)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'waiting_element' 
        AND column_name = 'course_id_int'
    ) THEN
        ALTER TABLE public.waiting_element ADD COLUMN course_id_int INT4;
    END IF;
END $$;

-- Populate course_id_int in waiting_element
UPDATE public.waiting_element we
SET course_id_int = c.course_id_int
FROM public.course c
WHERE we.course_code = c.course_id 
  AND we.account_id = c.account_id;

-- ============================================================================
-- PHASE 6: Drop old unique constraints and indexes
-- ============================================================================

-- Drop unique constraint on course_deployment
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'course_deployment_bot_id_course_id_account_id_environment_key'
    ) THEN
        ALTER TABLE public.course_deployment 
        DROP CONSTRAINT course_deployment_bot_id_course_id_account_id_environment_key;
    END IF;
END $$;

-- Drop unique index on courseparticipants
DROP INDEX IF EXISTS public.courseparticipants_unique;

-- ============================================================================
-- PHASE 7: Drop old foreign key constraints
-- ============================================================================

-- Drop FK from course_deployment
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'course_deployment_course_fkey'
    ) THEN
        ALTER TABLE public.course_deployment 
        DROP CONSTRAINT course_deployment_course_fkey;
    END IF;
END $$;

-- Drop FK from courseparticipants
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'courseparticipants_course_fkey'
    ) THEN
        ALTER TABLE public.courseparticipants 
        DROP CONSTRAINT courseparticipants_course_fkey;
    END IF;
END $$;

-- Drop FK from course_element if exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'course_element_course_fkey'
    ) THEN
        ALTER TABLE public.course_element 
        DROP CONSTRAINT course_element_course_fkey;
    END IF;
END $$;

-- ============================================================================
-- PHASE 8: Drop old primary key and unique constraints on course
-- ============================================================================

-- Drop old PK (course_id, bot_name)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'course_pkey'
    ) THEN
        ALTER TABLE public.course 
        DROP CONSTRAINT course_pkey;
    END IF;
END $$;

-- Drop unique constraint (course_id, account_id)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'course_course_id_account_id_key'
    ) THEN
        ALTER TABLE public.course 
        DROP CONSTRAINT course_course_id_account_id_key;
    END IF;
END $$;

-- ============================================================================
-- PHASE 9: Rename columns: course_id -> course_code, course_id_int -> course_id
-- ============================================================================

-- Rename old course_id to course_code
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'course' 
        AND column_name = 'course_id'
        AND data_type = 'text'
    ) THEN
        ALTER TABLE public.course RENAME COLUMN course_id TO course_code;
    END IF;
END $$;

-- Rename course_id_int to course_id in course table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'course' 
        AND column_name = 'course_id_int'
    ) THEN
        ALTER TABLE public.course RENAME COLUMN course_id_int TO course_id;
    END IF;
END $$;

-- Rename course_id_int to course_id in related tables
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'course_element' 
        AND column_name = 'course_id_int'
    ) THEN
        ALTER TABLE public.course_element RENAME COLUMN course_id_int TO course_id;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'course_deployment' 
        AND column_name = 'course_id_int'
    ) THEN
        ALTER TABLE public.course_deployment RENAME COLUMN course_id_int TO course_id;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'courseparticipants' 
        AND column_name = 'course_id_int'
    ) THEN
        ALTER TABLE public.courseparticipants RENAME COLUMN course_id_int TO course_id;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'run' 
        AND column_name = 'course_id_int'
    ) THEN
        ALTER TABLE public.run RENAME COLUMN course_id_int TO course_id;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'conversation' 
        AND column_name = 'course_id_int'
    ) THEN
        ALTER TABLE public.conversation RENAME COLUMN course_id_int TO course_id;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'waiting_element' 
        AND column_name = 'course_id_int'
    ) THEN
        ALTER TABLE public.waiting_element RENAME COLUMN course_id_int TO course_id;
    END IF;
END $$;

-- ============================================================================
-- PHASE 10: Set up new primary key and default value for course.course_id
-- ============================================================================

-- Set default value for course_id using sequence
ALTER TABLE public.course 
    ALTER COLUMN course_id SET DEFAULT nextval('course_course_id_seq'::regclass);

-- Make course_id the primary key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'course_pkey'
    ) THEN
        ALTER TABLE public.course 
        ADD CONSTRAINT course_pkey PRIMARY KEY (course_id);
    END IF;
END $$;

-- Add unique constraint on (course_code, account_id) for backward compatibility
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'course_course_code_account_id_key'
    ) THEN
        ALTER TABLE public.course 
        ADD CONSTRAINT course_course_code_account_id_key 
        UNIQUE (course_code, account_id);
    END IF;
END $$;

-- ============================================================================
-- PHASE 11: Create new foreign key constraints
-- ============================================================================

-- Add FK from course_element to course
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'course_element_course_fkey'
    ) THEN
        ALTER TABLE public.course_element 
        ADD CONSTRAINT course_element_course_fkey 
        FOREIGN KEY (course_id) REFERENCES public.course(course_id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add FK from course_deployment to course
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'course_deployment_course_fkey'
    ) THEN
        ALTER TABLE public.course_deployment 
        ADD CONSTRAINT course_deployment_course_fkey 
        FOREIGN KEY (course_id) REFERENCES public.course(course_id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add FK from courseparticipants to course
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'courseparticipants_course_fkey'
    ) THEN
        ALTER TABLE public.courseparticipants 
        ADD CONSTRAINT courseparticipants_course_fkey 
        FOREIGN KEY (course_id) REFERENCES public.course(course_id) ON DELETE CASCADE;
    END IF;
END $$;

-- Optional: Add FK from run to course (if needed)
-- DO $$
-- BEGIN
--     IF NOT EXISTS (
--         SELECT 1 FROM pg_constraint 
--         WHERE conname = 'run_course_fkey'
--     ) THEN
--         ALTER TABLE public.run 
--         ADD CONSTRAINT run_course_fkey 
--         FOREIGN KEY (course_id) REFERENCES public.course(course_id) ON DELETE RESTRICT;
--     END IF;
-- END $$;

-- Optional: Add FK from conversation to course (if needed)
-- DO $$
-- BEGIN
--     IF NOT EXISTS (
--         SELECT 1 FROM pg_constraint 
--         WHERE conname = 'conversation_course_fkey'
--     ) THEN
--         ALTER TABLE public.conversation 
--         ADD CONSTRAINT conversation_course_fkey 
--         FOREIGN KEY (course_id) REFERENCES public.course(course_id) ON DELETE RESTRICT;
--     END IF;
-- END $$;

-- Optional: Add FK from waiting_element to course (if needed)
-- DO $$
-- BEGIN
--     IF NOT EXISTS (
--         SELECT 1 FROM pg_constraint 
--         WHERE conname = 'waiting_element_course_fkey'
--     ) THEN
--         ALTER TABLE public.waiting_element 
--         ADD CONSTRAINT waiting_element_course_fkey 
--         FOREIGN KEY (course_id) REFERENCES public.course(course_id) ON DELETE RESTRICT;
--     END IF;
-- END $$;

-- ============================================================================
-- PHASE 12: Recreate unique constraints with new course_id
-- ============================================================================

-- Recreate unique constraint on course_deployment with new course_id (INT)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'course_deployment_bot_id_course_id_account_id_environment_key'
    ) THEN
        ALTER TABLE public.course_deployment 
        ADD CONSTRAINT course_deployment_bot_id_course_id_account_id_environment_key 
        UNIQUE (bot_id, course_id, account_id, environment);
    END IF;
END $$;

-- Recreate unique index on courseparticipants with new course_id (INT)
CREATE UNIQUE INDEX IF NOT EXISTS courseparticipants_unique 
ON public.courseparticipants 
USING btree (course_id, account_id, COALESCE(chat_id, (0)::bigint), COALESCE(username, ''::text));

-- ============================================================================
-- PHASE 13: Update indexes
-- ============================================================================

-- Drop old indexes that reference course_id (text) or course_code
DROP INDEX IF EXISTS public.idx_course_element_course;
DROP INDEX IF EXISTS public.idx_course_element_order;
DROP INDEX IF EXISTS public.idx_course_element_type;
DROP INDEX IF EXISTS public.idx_deployment_course;
DROP INDEX IF EXISTS public.idx_courseparticipants_course;
DROP INDEX IF EXISTS public.idx_courseparticipants_2;
DROP INDEX IF EXISTS public.idx_run_course;
DROP INDEX IF EXISTS public.idx_conversation_course;
DROP INDEX IF EXISTS public.idx_conversation_element;
DROP INDEX IF EXISTS public.idx_course_courseid_botname;

-- Create new indexes with INT course_id
CREATE INDEX IF NOT EXISTS idx_course_element_course ON public.course_element USING btree (course_id, account_id);
CREATE INDEX IF NOT EXISTS idx_course_element_order ON public.course_element USING btree (course_id, account_id, course_element_id);
CREATE INDEX IF NOT EXISTS idx_course_element_type ON public.course_element USING btree (course_id, account_id, element_type);
CREATE INDEX IF NOT EXISTS idx_deployment_course ON public.course_deployment USING btree (course_id, account_id);
CREATE INDEX IF NOT EXISTS idx_courseparticipants_course ON public.courseparticipants USING btree (course_id, account_id);
CREATE INDEX IF NOT EXISTS idx_courseparticipants_coursecode ON public.courseparticipants USING btree (course_code, account_id);
CREATE INDEX IF NOT EXISTS idx_run_course ON public.run USING btree (course_id, account_id);
CREATE INDEX IF NOT EXISTS idx_conversation_course ON public.conversation USING btree (course_id, account_id);
CREATE INDEX IF NOT EXISTS idx_conversation_element ON public.conversation USING btree (course_id, account_id, element_id);
CREATE INDEX IF NOT EXISTS idx_course_coursecode_botname ON public.course USING btree (course_code, bot_name);

-- ============================================================================
-- PHASE 14: Clean up old course_code columns from related tables (optional)
-- ============================================================================

-- Note: We keep course_code columns in related tables for backward compatibility
-- They can be removed in a future migration if not needed

-- ============================================================================
-- PHASE 15: Update sequence to continue from max course_id
-- ============================================================================

SELECT setval('course_course_id_seq', COALESCE((SELECT MAX(course_id) FROM public.course), 1), true);

COMMIT;
