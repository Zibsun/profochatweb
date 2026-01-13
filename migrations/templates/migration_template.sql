-- ============================================================================
-- Migration: <номер>_<описание>
-- ============================================================================
-- Description: <Подробное описание изменений>
-- Author: <Имя автора>
-- Date: <YYYY-MM-DD>
-- Related: <Issue/Ticket номер или ссылка>
-- Breaking: <Yes/No>
-- ============================================================================

BEGIN;

-- ============================================================================
-- Changes
-- ============================================================================

-- TODO: Добавить SQL изменения здесь
-- Примеры:
-- CREATE TABLE IF NOT EXISTS table_name (...);
-- ALTER TABLE table_name ADD COLUMN column_name TYPE;
-- CREATE INDEX IF NOT EXISTS idx_name ON table_name(column_name);

-- ============================================================================
-- Validation (optional)
-- ============================================================================

-- TODO: Добавить проверки если нужно
-- Пример:
-- DO $$
-- BEGIN
--     IF NOT EXISTS (
--         SELECT 1 FROM information_schema.tables 
--         WHERE table_name = 'table_name'
--     ) THEN
--         RAISE EXCEPTION 'Table table_name was not created';
--     END IF;
-- END $$;

-- ============================================================================
-- Record migration
-- ============================================================================

INSERT INTO schema_migrations (version, description, applied_by)
VALUES ('<номер>', '<Описание>', current_user)
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ============================================================================
-- Rollback (optional)
-- ============================================================================
-- Для отката выполнить:
-- BEGIN;
-- <SQL для отката>
-- DELETE FROM schema_migrations WHERE version = '<номер>';
-- COMMIT;
