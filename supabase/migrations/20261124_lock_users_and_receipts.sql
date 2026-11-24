-- =====================================================================
-- YuksalQuiz: 2026-11-24 xavfsizlik yangilanishi
--
-- Supabase Dashboard > SQL Editor ichida BIR MARTA ishga tushiring.
-- Qayta ishga tushirish xavfsiz. Hech qanday ma'lumot O'CHIRILMAYDI
-- (faqat ruxsatlar o'zgaradi va bitta yangi yordamchi jadval qo'shiladi).
--
-- MUHIM: avval yangi kodni deploy qiling (Vercel), keyin shu faylni ishga tushiring.
-- Aks holda eski ilova versiyasi profilni saqlay olmay qoladi.
--
-- Nima qiladi:
--  1. users jadvali: brauzer (anon) endi o'qiy ham, yoza ham olmaydi.
--     Avval istalgan odam boshqa talabaning qatorini o'zgartirib, uning hisobiga
--     "ulanib" olishi va barcha talabalarning balansini ko'rishi mumkin edi.
--     Ilova endi profilni /api/content orqali saqlaydi, reytingni /api/content orqali oladi.
--  2. subscriptions, test_results, payments, wallet_transactions, support_messages:
--     brauzerdan kirish yopiladi (faqat server).
--  3. app_settings: brauzer faqat o'qiydi (narxlar, yo'nalishlar), yoza olmaydi.
--  4. Cheklar ombori (receipts): hammaga ro'yxatni ko'rish va fayl yuklash yopiladi.
--     Chekni faqat server yuklaydi. Admin xabaridagi havolalar ishlashda davom etadi.
--  5. api_usage: so'rovlar sonini cheklash uchun yordamchi jadval (spam va AI kvotasidan himoya).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1-2. Server jadvallari: brauzer uchun barcha policy va ruxsatlar olib tashlanadi
-- ---------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  pol RECORD;
BEGIN
  FOREACH t IN ARRAY ARRAY['users', 'subscriptions', 'test_results', 'payments', 'wallet_transactions', 'support_messages']
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'Jadval topilmadi, o''tkazib yuborildi: %', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 3. app_settings: faqat o'qish
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.app_settings') IS NOT NULL THEN
    ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
    REVOKE INSERT, UPDATE, DELETE ON public.app_settings FROM anon, authenticated;
    GRANT SELECT ON public.app_settings TO anon, authenticated;
    GRANT ALL ON public.app_settings TO service_role;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'app_settings' AND cmd = 'SELECT'
    ) THEN
      CREATE POLICY "app_settings public read" ON public.app_settings FOR SELECT USING (true);
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 4. Cheklar ombori: ro'yxat va brauzerdan yuklash yopiladi.
--    Bucket "public" bo'lib qoladi: aniq havolasi bor fayl (admin xabaridagi) ochiladi,
--    lekin barcha cheklar ro'yxatini olib bo'lmaydi.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Public Access for receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload for receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public Update for receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete for receipts" ON storage.objects;

-- ---------------------------------------------------------------------
-- 5. So'rovlar hisobi (rate limit). Faqat server yozadi va o'qiydi.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.api_usage (
  id         BIGSERIAL PRIMARY KEY,
  key        TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_usage_key_time ON public.api_usage (key, created_at DESC);
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_usage FROM anon, authenticated;
GRANT ALL ON public.api_usage TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.api_usage_id_seq TO service_role;

-- Reyting natijalari tez topilishi uchun
DO $$
BEGIN
  IF to_regclass('public.test_results') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_test_results_user ON public.test_results (user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- TEKSHIRUV (faqat o'qiydi). Har bir qatorda "brauzer_kira_oladi" = false bo'lishi kerak.
-- ---------------------------------------------------------------------
SELECT t AS jadval,
       has_table_privilege('anon', 'public.' || t, 'SELECT')
         OR has_table_privilege('anon', 'public.' || t, 'INSERT')
         OR has_table_privilege('anon', 'public.' || t, 'UPDATE') AS brauzer_kira_oladi
FROM unnest(ARRAY['users', 'subscriptions', 'test_results', 'payments', 'wallet_transactions', 'support_messages', 'api_usage']) AS t
WHERE to_regclass('public.' || t) IS NOT NULL;
