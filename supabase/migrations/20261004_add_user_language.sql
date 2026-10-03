-- Migration: 20261004_add_user_language.sql
-- Add language column to users table with default 'uz'

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'uz';

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') THEN
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'uz';
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leaderboard_users') THEN
        ALTER TABLE public.leaderboard_users ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'uz';
    END IF;
END $$;
