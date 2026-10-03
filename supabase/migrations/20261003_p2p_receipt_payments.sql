-- Migration: 20261003_p2p_receipt_payments.sql
-- Gemini AI P2P Receipt Verification & Payments Table

-- 1. Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    receipt_image_url TEXT,
    transaction_id TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT
);

-- Index for fast lookup by transaction_id and user_id
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON public.payments (transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments (status);

-- Enable RLS and permissive policies for Mini App and Service operations
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Allow public read payments'
    ) THEN
        CREATE POLICY "Allow public read payments" ON public.payments FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Allow public insert payments'
    ) THEN
        CREATE POLICY "Allow public insert payments" ON public.payments FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Allow public update payments'
    ) THEN
        CREATE POLICY "Allow public update payments" ON public.payments FOR UPDATE USING (true);
    END IF;
END $$;

-- 2. Create or extend users table with has_paid & paid_until
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    university TEXT,
    region TEXT,
    coins NUMERIC DEFAULT 0,
    has_paid BOOLEAN DEFAULT false,
    paid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS has_paid BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS paid_until TIMESTAMPTZ;

-- Also support user_profiles if used in custom Supabase installations
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') THEN
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC DEFAULT 0;
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS has_paid BOOLEAN DEFAULT false;
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS paid_until TIMESTAMPTZ;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leaderboard_users') THEN
        ALTER TABLE public.leaderboard_users ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;
        ALTER TABLE public.leaderboard_users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC DEFAULT 0;
        ALTER TABLE public.leaderboard_users ADD COLUMN IF NOT EXISTS has_paid BOOLEAN DEFAULT false;
        ALTER TABLE public.leaderboard_users ADD COLUMN IF NOT EXISTS paid_until TIMESTAMPTZ;
    END IF;
END $$;
