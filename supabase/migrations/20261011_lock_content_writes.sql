-- =====================================================================
-- YuksalQuiz: testlar va kontent jadvallariga brauzerdan yozishni yopish
--
-- MUHIM: bu skriptni faqat yangi kod (api/content.ts) Vercel'da ishga tushgandan
-- va test yaratish / tahrirlash / o'chirish sinovdan o'tgandan KEYIN ishga tushiring.
--
-- Nima qiladi:
--   test_packages, quizzes, questions, universities, leaderboard_users jadvallari:
--     * hamma o'qiy oladi (avvalgidek)
--     * brauzer (anon / authenticated) yoza olmaydi
--     * server (service role) yozadi — /api/content orqali
-- Ma'lumotlar o'chirilmaydi. Faqat ruxsatlar o'zgaradi.
-- =====================================================================

DO $$
DECLARE
  t text;
  pol record;
BEGIN
  FOREACH t IN ARRAY ARRAY['test_packages', 'quizzes', 'questions', 'universities', 'leaderboard_users']
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'Jadval yo''q, o''tkazib yuborildi: %', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Yozishga ruxsat beruvchi barcha eski siyosatlarni olib tashlash
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    -- O'qish hamma uchun ochiq qoladi
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND cmd = 'SELECT'
    ) THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (true)', t || ' public read', t);
    END IF;

    -- Qo'shimcha himoya: brauzer rollaridan yozish huquqini olish
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

-- Natijani ko'rish: har bir jadval uchun qolgan siyosatlar (faqat SELECT bo'lishi kerak)
SELECT tablename AS jadval, policyname AS siyosat, cmd AS amal
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('test_packages', 'quizzes', 'questions', 'universities', 'leaderboard_users')
ORDER BY tablename, cmd;
