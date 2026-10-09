-- =========================================================
-- Migration: 20261010_security_lockdown.sql
-- YuksalQuiz: pul va obuna himoyasi (idempotent, ma'lumot o'chirilmaydi).
--
-- Supabase Dashboard > SQL Editor ichida bir marta ishga tushiring.
-- Qayta ishga tushirish xavfsiz.
--
-- Nima qiladi:
--  1. users jadvalidagi barcha kerakli ustunlarni ta'minlaydi.
--  2. Brauzer (anon) balans/obuna/blok ustunlarini o'zgartira olmasligi
--     uchun himoya trigger'ini qaytaradi (20261009 da o'chirilgan edi).
--  3. Chek rasmlarini brauzerdan almashtirish/o'chirishni yopadi.
--  4. support_messages ga brauzerdan to'g'ridan-to'g'ri kirishni yopadi
--     (ilova faqat /api/support-chat orqali ishlaydi).
--  5. Bir to'lov / bir referal / bir test bloki uchun pul faqat
--     bir marta yozilishini baza darajasida kafolatlaydi.
--  6. approve_payment_with_amount: admin summa kiritib tasdiqlashi (atomar).
--  7. reverse_payment: soxta chek summasini to'liq qaytaradi (qarz bo'lishi mumkin,
--     keyingi tasdiqlangan to'lov qarzni yopadi).
--  8. Pulga oid funksiyalarni faqat server chaqira oladi.
--  9. payments va wallet_transactions ni hamma o'qiy olishini yopadi.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Ustunlar (trigger "has no field" xatosi bermasligi uchun)
-- ---------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS has_paid BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS paid_until TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_tier TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_subscribed BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS voucher_claimed BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS telegram_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_count INT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referred_by TEXT;

-- ---------------------------------------------------------
-- 2. Pul ustunlari himoyasi
--    anon/authenticated (brauzer) yozsa: pul ustunlari eski qiymatida qoladi.
--    service_role (server) va SECURITY DEFINER funksiyalar odatdagidek ishlaydi.
--    Profil (ism, universitet, statistika) yozish buzilmaydi.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_user_money_columns()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.balance := 0;
      NEW.wallet_balance := 0;
      NEW.has_paid := false;
      NEW.paid_until := NULL;
      NEW.subscription_tier := NULL;
      NEW.subscription_end := NULL;
      NEW.is_subscribed := false;
      NEW.voucher_claimed := false;
      NEW.is_blocked := false;
      NEW.referral_count := 0;
      NEW.referred_by := NULL;
    ELSE
      NEW.balance := OLD.balance;
      NEW.wallet_balance := OLD.wallet_balance;
      NEW.has_paid := OLD.has_paid;
      NEW.paid_until := OLD.paid_until;
      NEW.subscription_tier := OLD.subscription_tier;
      NEW.subscription_end := OLD.subscription_end;
      NEW.is_subscribed := OLD.is_subscribed;
      NEW.voucher_claimed := OLD.voucher_claimed;
      NEW.is_blocked := OLD.is_blocked;
      NEW.referral_count := OLD.referral_count;
      NEW.referred_by := OLD.referred_by;
      NEW.telegram_id := COALESCE(OLD.telegram_id, NEW.telegram_id);
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_user_money ON public.users;
CREATE TRIGGER trg_protect_user_money
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_money_columns();

-- Brauzer foydalanuvchi qatorini o'chira olmaydi
DROP POLICY IF EXISTS "Allow public delete users" ON public.users;

-- ---------------------------------------------------------
-- 3. Chek rasmlari: yuklash va ko'rish qoladi, almashtirish/o'chirish yopiladi.
--    (Eski cheklarni tozalash serverdagi cleanup-receipts orqali ishlaydi.)
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Public Update for receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete for receipts" ON storage.objects;

-- ---------------------------------------------------------
-- 4. Qo'llab-quvvatlash chati: faqat server (/api/support-chat, bot)
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Allow read support_messages" ON public.support_messages;
DROP POLICY IF EXISTS "Allow insert support_messages" ON public.support_messages;
DROP POLICY IF EXISTS "Allow update support_messages" ON public.support_messages;

-- ---------------------------------------------------------
-- 5. Ikki marta pul yozilmasligi uchun noyob indekslar.
--    Bazada eski dublikatlar bo'lsa, indeks yaratilmaydi va NOTICE chiqadi
--    (migratsiya to'xtamaydi, ma'lumot o'chirilmaydi).
-- ---------------------------------------------------------
DO $$
BEGIN
  BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_tx_deposit_ref
      ON public.wallet_transactions (type, ref)
      WHERE type IN ('deposit', 'referral') AND ref IS NOT NULL;
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'uq_wallet_tx_deposit_ref yaratilmadi: bazada dublikat deposit/referral yozuvlari bor';
  END;

  BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_tx_coin_reward
      ON public.wallet_transactions (user_id, type, ref)
      WHERE type = 'coin_reward' AND ref IS NOT NULL;
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'uq_wallet_tx_coin_reward yaratilmadi: bazada dublikat coin_reward yozuvlari bor';
  END;
END $$;

-- Bir xil chek rasmini qayta yuborishni aniqlash uchun
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS receipt_hash TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS notes TEXT;
CREATE INDEX IF NOT EXISTS idx_payments_receipt_hash ON public.payments (receipt_hash);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON public.payments (transaction_id);

-- ---------------------------------------------------------
-- 5b. Balans o'zgartirish: qarzdor (manfiy balansli) talabaga pul TUSHIRISH
--     har doim ruxsat etiladi. Faqat yechish balansni 0 dan pastga tushira olmaydi.
--     (Aks holda soxta chek qaytarilgandan keyin haqiqiy to'lov ham tasdiqlanmay qolardi.)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public._wallet_change(
  p_user TEXT, p_amount NUMERIC, p_type TEXT, p_ref TEXT, p_note TEXT
) RETURNS NUMERIC
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rid TEXT;
  cur NUMERIC;
  nb  NUMERIC;
BEGIN
  rid := public._resolve_user(p_user);
  IF rid IS NULL THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  SELECT COALESCE(balance, wallet_balance, 0) INTO cur
  FROM public.users WHERE id = rid FOR UPDATE;

  nb := cur + p_amount;
  IF p_amount < 0 AND nb < 0 THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  UPDATE public.users
  SET balance = nb, wallet_balance = nb, updated_at = now()
  WHERE id = rid;

  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, ref, note)
  VALUES (rid, p_type, p_amount, nb, p_ref, p_note);

  RETURN nb;
END $$;

-- ---------------------------------------------------------
-- 6. Admin summa kiritib tasdiqlaydi (AI summani o'qiy olmagan chek).
--    Faqat pending/pending_manual holatda ishlaydi -> ikki marta tushmaydi.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_payment_with_amount(
  p_payment_id UUID,
  p_amount NUMERIC,
  p_actor TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pay public.payments%ROWTYPE;
  nb NUMERIC;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 10000000 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'bad_amount');
  END IF;

  SELECT * INTO pay FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'payment_not_found');
  END IF;
  IF pay.status NOT IN ('pending', 'pending_manual') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_processed', 'status', pay.status);
  END IF;

  nb := public._wallet_change(
    pay.user_id, p_amount, 'deposit', pay.id::text,
    'To''lov tasdiqlandi (admin summa kiritdi)'
  );

  UPDATE public.payments
  SET amount = p_amount,
      status = 'manual_approved',
      verified_by = 'admin',
      notes = COALESCE(notes || ' | ', '') || p_actor || ' summa kiritib tasdiqladi: '
              || p_amount::text || ' (' || now()::text || ')'
  WHERE id = pay.id;

  RETURN jsonb_build_object(
    'ok', true,
    'payment_id', pay.id,
    'user_id', public.norm_tg_id(pay.user_id),
    'amount', p_amount,
    'new_balance', nb
  );
END $$;

-- ---------------------------------------------------------
-- 7. Soxta chek: tushgan summa TO'LIQ qaytariladi.
--    Talaba pulni sarflab ulgurgan bo'lsa, balans manfiy (qarz) bo'ladi
--    va keyingi to'lovdan avtomatik yopiladi.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reverse_payment(p_payment_id UUID, p_actor TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pay public.payments%ROWTYPE;
  rid TEXT;
  cur NUMERIC;
  nb NUMERIC;
BEGIN
  SELECT * INTO pay FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'payment_not_found');
  END IF;
  IF pay.status NOT IN ('auto_approved', 'approved', 'manual_approved') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_credited', 'status', pay.status);
  END IF;

  rid := public._resolve_user(pay.user_id);
  IF rid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'user_not_found');
  END IF;

  SELECT COALESCE(balance, wallet_balance, 0) INTO cur
  FROM public.users WHERE id = rid FOR UPDATE;

  nb := cur - COALESCE(pay.amount, 0);

  UPDATE public.users SET balance = nb, wallet_balance = nb, updated_at = now() WHERE id = rid;
  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, ref, note)
  VALUES (rid, 'reversal', -COALESCE(pay.amount, 0), nb, pay.id::text, 'Soxta chek: summa qaytarildi');

  UPDATE public.payments
  SET status = 'warn_reset',
      notes = COALESCE(notes || ' | ', '') || p_actor || ' ogohlantirdi, '
              || COALESCE(pay.amount, 0)::text || ' so''m qaytarildi: ' || now()::text
  WHERE id = pay.id;

  RETURN jsonb_build_object('ok', true, 'user_id', public.norm_tg_id(pay.user_id),
                            'reversed', COALESCE(pay.amount, 0), 'new_balance', nb);
END $$;

-- ---------------------------------------------------------
-- 8. Pulga oid funksiyalar faqat server (service_role) uchun
-- ---------------------------------------------------------
DO $$
DECLARE
  fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public._wallet_change(text, numeric, text, text, text)',
    'public.approve_payment(uuid, text, text)',
    'public.approve_payment_with_amount(uuid, numeric, text)',
    'public.reject_payment(uuid, text)',
    'public.reverse_payment(uuid, text)',
    'public.claim_voucher(text)',
    'public.purchase_subscription(text, text)',
    'public.admin_credit(text, numeric, text, text)',
    'public.admin_set_prices(numeric, numeric, numeric)'
  ] LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'Funksiya topilmadi: %', fn;
    END;
  END LOOP;
END $$;

-- ---------------------------------------------------------
-- 9. To'lovlar va hamyon tarixi: brauzer hammaning to'lovini o'qiy olmaydi.
--    Ilova o'z tarixini /api/wallet (action: history) orqali oladi.
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Allow public read payments" ON public.payments;
DROP POLICY IF EXISTS "wallet_tx public read" ON public.wallet_transactions;

-- ---------------------------------------------------------
-- 10. Obuna muddatini users jadvaliga yig'ish (hech kim premiumini yo'qotmasligi uchun).
--     Ilova endi obunani faqat users.subscription_end bo'yicha tekshiradi.
-- ---------------------------------------------------------
-- 10a. subscriptions jadvalidagi faol obunalar
UPDATE public.users u
SET subscription_end = s.max_end,
    paid_until = s.max_end,
    is_subscribed = true,
    has_paid = true,
    subscription_tier = COALESCE(u.subscription_tier, s.plan)
FROM (
  SELECT public.norm_tg_id(user_id) AS uid,
         MAX(expires_at) AS max_end,
         (ARRAY_AGG(COALESCE(plan, plan_name) ORDER BY expires_at DESC))[1] AS plan
  FROM public.subscriptions
  WHERE expires_at > now()
  GROUP BY public.norm_tg_id(user_id)
) s
WHERE (public.norm_tg_id(u.id) = s.uid OR u.telegram_id = s.uid)
  AND (COALESCE(u.subscription_end, u.paid_until) IS NULL
       OR COALESCE(u.subscription_end, u.paid_until) < s.max_end);

-- 10b. Admin panelidan berilgan obunalar (test_packages, category = 'AdminCredit')
DO $$
BEGIN
  UPDATE public.users u
  SET subscription_end = x.max_end,
      paid_until = x.max_end,
      is_subscribed = true,
      has_paid = true,
      subscription_tier = COALESCE(u.subscription_tier, x.plan)
  FROM (
    SELECT public.norm_tg_id(author_id) AS uid,
           MAX((blocks->0->>'expiry')::timestamptz) AS max_end,
           (ARRAY_AGG(blocks->0->>'plan' ORDER BY (blocks->0->>'expiry') DESC))[1] AS plan
    FROM public.test_packages
    WHERE category = 'AdminCredit'
      AND (blocks->0->>'expiry') ~ '^\d{4}-\d{2}-\d{2}'
    GROUP BY public.norm_tg_id(author_id)
  ) x
  WHERE (public.norm_tg_id(u.id) = x.uid OR u.telegram_id = x.uid)
    AND x.max_end > now()
    AND (COALESCE(u.subscription_end, u.paid_until) IS NULL
         OR COALESCE(u.subscription_end, u.paid_until) < x.max_end);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'AdminCredit obunalarini ko''chirib bo''lmadi: %', SQLERRM;
END $$;

-- 10c. Obunasi bor deb belgilangan, lekin sanasi yozilmagan foydalanuvchilar:
--      faqat haqiqiy to'lovi (tasdiqlangan chek) bor bo'lsa 90 kun beriladi.
--      Bayroqni brauzer o'zi qo'ygan bo'lishi mumkin (trigger o'chiq bo'lgan davrda),
--      shuning uchun to'lovsiz bayroqlarga avtomatik obuna berilmaydi.
UPDATE public.users u
SET subscription_end = now() + interval '90 days',
    paid_until = now() + interval '90 days'
WHERE (u.is_subscribed = true OR u.has_paid = true)
  AND u.subscription_end IS NULL
  AND u.paid_until IS NULL
  AND EXISTS (
    SELECT 1 FROM public.payments p
    WHERE public.norm_tg_id(p.user_id) = public.norm_tg_id(u.id)
      AND p.status IN ('approved', 'auto_approved', 'manual_approved')
  );
-- To'lovsiz bayroqlar ro'yxatini ko'rish (o'zgartirmaydi):
-- SELECT id, full_name, has_paid, is_subscribed, subscription_tier FROM public.users
-- WHERE (is_subscribed OR has_paid) AND subscription_end IS NULL AND paid_until IS NULL;

-- 10d. paid_until bor, subscription_end yo'q bo'lsa tenglashtirish
UPDATE public.users
SET subscription_end = paid_until
WHERE subscription_end IS NULL AND paid_until IS NOT NULL;

-- ---------------------------------------------------------
-- TEKSHIRISH (ixtiyoriy, faqat o'qiydi): balansi tasdiqlangan to'lovlar
-- yig'indisidan katta farq qiladigan foydalanuvchilar. Ilova endi faqat
-- users.balance ni ko'rsatadi, shuning uchun shu ro'yxatni bir ko'rib chiqing.
--
-- SELECT * FROM (
--   SELECT u.id, u.full_name, u.balance,
--     (SELECT COALESCE(SUM(p.amount), 0) FROM public.payments p
--       WHERE public.norm_tg_id(p.user_id) = public.norm_tg_id(u.id)
--         AND p.status IN ('approved','auto_approved','manual_approved')) AS approved_sum,
--     (SELECT COALESCE(SUM(s.amount_paid), 0) FROM public.subscriptions s
--       WHERE public.norm_tg_id(s.user_id) = public.norm_tg_id(u.id)) AS spent_on_subs
--   FROM public.users u
-- ) t
-- WHERE approved_sum - spent_on_subs > COALESCE(balance, 0)
-- ORDER BY approved_sum - spent_on_subs - COALESCE(balance, 0) DESC;
