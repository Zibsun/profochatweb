-- ============================================================================
-- Migration: 0008_add_email_password_auth
-- ============================================================================
-- Description: Adds support for email/password authentication to users table
--              Adds username field, makes email unique, adds indexes
-- Author: System
-- Date: 2026-01-18
-- Related: docs/reference/api/authentication.md
-- Breaking: No (backward compatible, adds optional fields)
-- ============================================================================
-- 
-- This migration performs:
-- Phase 0: Make telegram_user_id nullable (to support email/password auth)
-- Phase 1: Add username field to users table
-- Phase 2: Make email unique (for email/password users)
-- Phase 3: Add indexes for email lookup
-- Phase 4: Add constraint to ensure email/password users have both fields
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 0: Make telegram_user_id nullable (to support email/password auth)
-- ============================================================================

-- Make telegram_user_id nullable to support both auth types
-- Check if column is NOT NULL and make it nullable
DO $$
BEGIN
    -- Check if column exists and is NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'telegram_user_id'
        AND is_nullable = 'NO'
    ) THEN
        -- Remove NOT NULL constraint
        ALTER TABLE users 
            ALTER COLUMN telegram_user_id DROP NOT NULL;
        
        -- telegram_user_id is now nullable
    END IF;
END $$;

-- ============================================================================
-- PHASE 1: Add username field
-- ============================================================================

-- Add username column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'username'
    ) THEN
        ALTER TABLE users 
            ADD COLUMN username TEXT;
        
        -- Column username added
    ELSE
        -- Column username already exists
    END IF;
END $$;

-- ============================================================================
-- PHASE 2: Make email unique (for email/password authentication)
-- ============================================================================

-- Remove duplicate emails if any exist (keep the one with the lowest user_id)
DO $$
DECLARE
    dup_record RECORD;
BEGIN
    FOR dup_record IN 
        SELECT email, MIN(user_id) as keep_user_id
        FROM users
        WHERE email IS NOT NULL
        GROUP BY email
        HAVING COUNT(*) > 1
    LOOP
        -- Delete duplicates, keeping the one with lowest user_id
        DELETE FROM users
        WHERE email = dup_record.email
        AND user_id != dup_record.keep_user_id;
    END LOOP;
END $$;

-- Create unique constraint on email (only for non-null values)
-- PostgreSQL unique constraint allows multiple NULL values, which is what we want
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_email_key'
    ) THEN
        ALTER TABLE users 
            DROP CONSTRAINT users_email_key;
    END IF;
    
    -- Add unique constraint on email
    ALTER TABLE users 
        ADD CONSTRAINT users_email_key UNIQUE (email);
    
    -- Unique constraint on email added
END $$;

-- ============================================================================
-- PHASE 3: Add indexes for email lookup
-- ============================================================================

-- Create index on email for fast lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) 
WHERE email IS NOT NULL;

-- Index for email lookup created

-- ============================================================================
-- PHASE 4: Add constraint to ensure email/password users have both fields
-- ============================================================================

-- Add check constraint: if email is provided, password_hash must also be provided
-- This ensures data integrity for email/password authentication
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_email_password_check'
    ) THEN
        ALTER TABLE users 
            DROP CONSTRAINT users_email_password_check;
    END IF;
    
    -- Add constraint: email and password_hash must both be present or both be NULL
    -- This allows Telegram users (no email/password) and email/password users (both required)
    ALTER TABLE users 
        ADD CONSTRAINT users_email_password_check 
        CHECK (
            (email IS NULL AND password_hash IS NULL) OR
            (email IS NOT NULL AND password_hash IS NOT NULL)
        );
    
    -- Constraint added: email and password_hash must both be present or both be NULL
END $$;

-- ============================================================================
-- PHASE 5: Add comment to document the dual authentication support
-- ============================================================================

COMMENT ON COLUMN users.email IS 'Email for email/password authentication. Must be unique if provided. Required together with password_hash for email/password users.';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hash of password for email/password authentication. Required together with email for email/password users.';
COMMENT ON COLUMN users.username IS 'Username for email/password authentication. Optional but recommended for email/password users.';
COMMENT ON COLUMN users.telegram_user_id IS 'Telegram user ID for Telegram authentication. Required for Telegram users.';

-- Comments added

-- ============================================================================
-- Validation
-- ============================================================================

-- Verify that username column was added
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'username'
    ) THEN
        RAISE EXCEPTION 'Column username was not added';
    END IF;
END $$;

-- Verify that email unique constraint exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_email_key'
    ) THEN
        RAISE EXCEPTION 'Unique constraint on email was not created';
    END IF;
END $$;

-- Verify that email/password check constraint exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_email_password_check'
    ) THEN
        RAISE EXCEPTION 'Check constraint on email/password was not created';
    END IF;
END $$;

-- Validation passed

-- ============================================================================
-- Record migration
-- ============================================================================

INSERT INTO schema_migrations (version, description, applied_by)
VALUES ('0008', 'Add email/password authentication support to users table', current_user)
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ============================================================================
-- Migration completed successfully
-- ============================================================================
-- 
-- Summary of changes:
-- 1. Added username column (TEXT, nullable)
-- 2. Made email unique (allows multiple NULL values for Telegram users)
-- 3. Added index on email for fast lookups
-- 4. Added constraint: email and password_hash must both be present or both be NULL
-- 5. Added documentation comments
-- 
-- The users table now supports both:
-- - Telegram authentication (telegram_user_id required, email/password optional)
-- - Email/password authentication (email and password_hash required, telegram_user_id optional)
-- ============================================================================
