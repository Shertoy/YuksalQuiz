-- Migration: 20261003_sync_users_and_test_results.sql
-- Synchronizes `users`, `payments`, `subscriptions`, and `test_results` tables

-- 1. Create or extend users table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    name TEXT,
    avatar TEXT DEFAULT '/avatars/avatar_1.png',
    university TEXT,
    region TEXT,
    gender TEXT DEFAULT 'male',
    academic_year INT DEFAULT 1,
    coins NUMERIC DEFAULT 0,
    balance NUMERIC DEFAULT 0,
    wallet_balance NUMERIC DEFAULT 0,
    has_paid BOOLEAN DEFAULT false,
    paid_until TIMESTAMPTZ,
    tests_completed NUMERIC DEFAULT 0,
    correct_answers NUMERIC DEFAULT 0,
    correct_answers_count NUMERIC DEFAULT 0,
    total_score NUMERIC DEFAULT 0,
    score_points NUMERIC DEFAULT 0,
    total_time NUMERIC DEFAULT 0,
    total_time_spent_seconds NUMERIC DEFAULT 0,
    accuracy_percentage NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all rating and balance columns exist on users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT '/avatars/avatar_1.png';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS university TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'male';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS academic_year INT DEFAULT 1;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS coins NUMERIC DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS has_paid BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS paid_until TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tests_completed NUMERIC DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS correct_answers NUMERIC DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS correct_answers_count NUMERIC DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_score NUMERIC DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS score_points NUMERIC DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_time NUMERIC DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_time_spent_seconds NUMERIC DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS accuracy_percentage NUMERIC DEFAULT 0;

-- 2. Create payments table for Gemini AI receipt verification
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    receipt_image_url TEXT,
    transaction_id TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON public.payments (transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments (status);

-- 3. Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    plan TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    started_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    amount_paid NUMERIC DEFAULT 0,
    payment_method TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions (status);

-- 4. Create test_results table
CREATE TABLE IF NOT EXISTS public.test_results (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    test_package_id TEXT,
    test_title TEXT,
    block_id TEXT,
    block_title TEXT,
    score NUMERIC NOT NULL DEFAULT 0,
    total_questions NUMERIC NOT NULL DEFAULT 0,
    percentage NUMERIC NOT NULL DEFAULT 0,
    time_spent_seconds NUMERIC NOT NULL DEFAULT 0,
    total_time NUMERIC NOT NULL DEFAULT 0,
    is_passed BOOLEAN DEFAULT false,
    user_answers JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_test_results_user_id ON public.test_results (user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_test_package_id ON public.test_results (test_package_id);
CREATE INDEX IF NOT EXISTS idx_test_results_score ON public.test_results (score DESC);

-- Enable RLS and permissive policies for all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- users policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Allow public read users') THEN
        CREATE POLICY "Allow public read users" ON public.users FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Allow public insert users') THEN
        CREATE POLICY "Allow public insert users" ON public.users FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Allow public update users') THEN
        CREATE POLICY "Allow public update users" ON public.users FOR UPDATE USING (true);
    END IF;

    -- payments policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Allow public read payments') THEN
        CREATE POLICY "Allow public read payments" ON public.payments FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Allow public insert payments') THEN
        CREATE POLICY "Allow public insert payments" ON public.payments FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Allow public update payments') THEN
        CREATE POLICY "Allow public update payments" ON public.payments FOR UPDATE USING (true);
    END IF;

    -- subscriptions policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'Allow public read subscriptions') THEN
        CREATE POLICY "Allow public read subscriptions" ON public.subscriptions FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'Allow public insert subscriptions') THEN
        CREATE POLICY "Allow public insert subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'Allow public update subscriptions') THEN
        CREATE POLICY "Allow public update subscriptions" ON public.subscriptions FOR UPDATE USING (true);
    END IF;

    -- test_results policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'test_results' AND policyname = 'Allow public read test_results') THEN
        CREATE POLICY "Allow public read test_results" ON public.test_results FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'test_results' AND policyname = 'Allow public insert test_results') THEN
        CREATE POLICY "Allow public insert test_results" ON public.test_results FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'test_results' AND policyname = 'Allow public update test_results') THEN
        CREATE POLICY "Allow public update test_results" ON public.test_results FOR UPDATE USING (true);
    END IF;
END $$;
