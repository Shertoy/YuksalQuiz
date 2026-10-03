-- Migration: 20261004_add_total_tests_column.sql
-- Add total_tests column to users table and backfill from tests_completed

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_tests NUMERIC DEFAULT 0;

-- Backfill total_tests if tests_completed has values
UPDATE public.users 
SET total_tests = COALESCE(tests_completed, 0) 
WHERE (total_tests IS NULL OR total_tests = 0) AND tests_completed > 0;
