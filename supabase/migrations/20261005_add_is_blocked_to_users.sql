-- Migration: 20261005_add_is_blocked_to_users.sql
-- Adds user blocking and Telegram username columns to users table

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS telegram_username TEXT;
CREATE INDEX IF NOT EXISTS idx_users_is_blocked ON public.users (is_blocked);

-- Also add to user_profiles if present
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') THEN
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS telegram_username TEXT;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leaderboard_users') THEN
        ALTER TABLE public.leaderboard_users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
        ALTER TABLE public.leaderboard_users ADD COLUMN IF NOT EXISTS telegram_username TEXT;
    END IF;
END $$;
