-- ============================================================================
-- Seed: 0001_default_account
-- ============================================================================
-- Description: Create default account for existing data
-- Author: System
-- Date: 2024-01-01
-- Related: Baseline migration
-- ============================================================================

BEGIN;

-- Create default account if it doesn't exist
INSERT INTO account (account_id, name, slug, plan, created_at, updated_at, is_active)
SELECT 1, 'Default Account', 'default', 'free', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, TRUE
WHERE NOT EXISTS (SELECT 1 FROM account WHERE account_id = 1);

COMMIT;
