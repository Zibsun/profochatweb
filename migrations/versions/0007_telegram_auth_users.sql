-- ============================================================================
-- Migration: 0007_telegram_auth_users
-- ============================================================================
-- Description: Creates new users table for Telegram authentication and updates account_member
--              to use user_id instead of telegram_user_id
-- Author: System
-- Date: 2026-01-18
-- Related: docs/reqs/multitenancy_telegram_auth.md, docs/reqs/multitenancy_telegram_auth_implementation_plan.md
-- Breaking: Yes (replaces users table structure)
-- ============================================================================
-- 
-- This migration performs:
-- Phase 1: Drop old users table and create new one with Telegram fields
-- Phase 2: Update account_member to use user_id
-- Phase 3: Add constraints and indexes
-- Phase 4: Set default telegram_auth_bot_name in account.settings
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: Create new users table
-- ============================================================================

-- Drop old users table if exists (users table is empty, safe to drop)
DROP TABLE IF EXISTS users CASCADE;

-- Create new users table with Telegram authentication structure
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    telegram_user_id BIGINT UNIQUE NOT NULL,
    telegram_username TEXT,
    first_name TEXT,
    last_name TEXT,
    language_code TEXT,
    photo_url TEXT,
    last_login_at TIMESTAMPTZ,
    is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
    email TEXT,  -- Legacy field (optional)
    password_hash TEXT,  -- Legacy field (optional)
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_telegram_user_id ON users(telegram_user_id);
CREATE INDEX idx_users_is_super_admin ON users(is_super_admin);

-- ============================================================================
-- PHASE 2: Update account_member table
-- ============================================================================

-- Add user_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'account_member' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE account_member 
            ADD COLUMN user_id INT REFERENCES users(user_id);
        
        -- Column user_id added
    ELSE
        -- Column user_id already exists
    END IF;
END $$;

-- Update unique constraint
DO $$
BEGIN
    -- Drop old constraint if exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'account_member_account_id_telegram_user_id_key'
    ) THEN
        ALTER TABLE account_member 
            DROP CONSTRAINT account_member_account_id_telegram_user_id_key;
        
        -- Old constraint dropped
    END IF;
    
    -- Add new constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'account_member_account_id_user_id_key'
    ) THEN
        ALTER TABLE account_member 
            ADD CONSTRAINT account_member_account_id_user_id_key 
            UNIQUE (account_id, user_id);
        
        -- New constraint added
    END IF;
END $$;

-- Add role check constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'account_member_role_check'
    ) THEN
        ALTER TABLE account_member 
            DROP CONSTRAINT account_member_role_check;
    END IF;
    
    ALTER TABLE account_member 
        ADD CONSTRAINT account_member_role_check 
        CHECK (role IN ('owner', 'admin', 'teacher', 'instructional_designer', 'member'));
    
    -- Role check constraint added
END $$;

-- ============================================================================
-- PHASE 3: Set default telegram_auth_bot_name in account.settings
-- ============================================================================

-- Update existing accounts to have telegram_auth_bot_name in settings
UPDATE account
SET settings = COALESCE(settings, '{}'::jsonb) || 
    jsonb_build_object('telegram_auth_bot_name', 'enraidrobot')
WHERE settings->>'telegram_auth_bot_name' IS NULL;

-- Default telegram_auth_bot_name set for existing accounts

-- ============================================================================
-- PHASE 4: Create trigger for updated_at
-- ============================================================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_users_updated_at ON users;
CREATE TRIGGER trigger_update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

-- Trigger for users.updated_at created

COMMIT;

-- ============================================================================
-- Migration completed successfully
-- ============================================================================
