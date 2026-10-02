-- =========================================================
-- YuksalQuiz: Supabase Bazasini Sozlash Skripti (SQL Schema)
-- =========================================================
-- Ushbu SQL kodni Supabase Dashboard > SQL Editor > New query
-- bo'limiga qo'yib, "RUN" tugmasini bosing.
-- =========================================================

-- 1. Testlar to'plami jadvali (test_packages)
CREATE TABLE IF NOT EXISTS public.test_packages (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Oliy Ta''lim (HEMIS)',
    university TEXT NOT NULL,
    is_custom_university BOOLEAN DEFAULT false,
    is_pending_review BOOLEAN DEFAULT false,
    department TEXT NOT NULL,
    is_public BOOLEAN DEFAULT true,
    password TEXT,
    total_questions INTEGER DEFAULT 0,
    blocks JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    author_id TEXT,
    author_name TEXT,
    is_community_created BOOLEAN DEFAULT true,
    author_wallet_balance NUMERIC DEFAULT 0
);

-- 2. Tezkor qidiruv uchun indekslar yaratish
CREATE INDEX IF NOT EXISTS idx_test_packages_category ON public.test_packages(category);
CREATE INDEX IF NOT EXISTS idx_test_packages_created_at ON public.test_packages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_packages_is_public ON public.test_packages(is_public);

-- 3. Row Level Security (RLS) xavfsizlik qoidalarini yoqish
ALTER TABLE public.test_packages ENABLE ROW LEVEL SECURITY;

-- 4. Barcha foydalanuvchilar (anon va ro'yxatdan o'tganlar) testlarni o'qishi uchun ruxsat
DROP POLICY IF EXISTS "Allow public read access" ON public.test_packages;
CREATE POLICY "Allow public read access"
ON public.test_packages
FOR SELECT
TO anon, authenticated
USING (true);

-- 5. Foydalanuvchilar yangi test yaratishi va yuklashi uchun ruxsat
DROP POLICY IF EXISTS "Allow public insert access" ON public.test_packages;
CREATE POLICY "Allow public insert access"
ON public.test_packages
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 6. Testlarni tahrirlash uchun ruxsat
DROP POLICY IF EXISTS "Allow public update access" ON public.test_packages;
CREATE POLICY "Allow public update access"
ON public.test_packages
FOR UPDATE
TO anon, authenticated
USING (true);

-- 7. Testlarni o'chirish uchun ruxsat (Admin)
DROP POLICY IF EXISTS "Allow public delete access" ON public.test_packages;
CREATE POLICY "Allow public delete access"
ON public.test_packages
FOR DELETE
TO anon, authenticated
USING (true);

-- 8. Realtime (jonli yangilanish)ni yoqish
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'test_packages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.test_packages;
  END IF;
END $$;
