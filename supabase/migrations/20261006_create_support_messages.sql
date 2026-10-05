-- Migration: 20261006_create_support_messages.sql
-- Hybrid AI-Admin Support System messages table

CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    user_name TEXT,
    user_username TEXT,
    message TEXT NOT NULL,
    reply TEXT,
    sender TEXT NOT NULL DEFAULT 'user' CHECK (sender IN ('user', 'ai', 'admin')),
    status TEXT NOT NULL DEFAULT 'resolved_by_ai' CHECK (status IN ('resolved_by_ai', 'forwarded_to_admin', 'replied_by_admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure columns exist if table was already created
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS user_username TEXT;
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS reply TEXT;
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS sender TEXT DEFAULT 'user';
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'resolved_by_ai';
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_support_messages_user_id ON public.support_messages (user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON public.support_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_status ON public.support_messages (status);

-- Enable RLS
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Allow reading
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'support_messages' AND policyname = 'Allow read support_messages'
    ) THEN
        CREATE POLICY "Allow read support_messages" ON public.support_messages
            FOR SELECT TO anon, authenticated
            USING (true);
    END IF;
END $$;

-- Allow inserting
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'support_messages' AND policyname = 'Allow insert support_messages'
    ) THEN
        CREATE POLICY "Allow insert support_messages" ON public.support_messages
            FOR INSERT TO anon, authenticated
            WITH CHECK (true);
    END IF;
END $$;

-- Allow updating
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'support_messages' AND policyname = 'Allow update support_messages'
    ) THEN
        CREATE POLICY "Allow update support_messages" ON public.support_messages
            FOR UPDATE TO anon, authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;
