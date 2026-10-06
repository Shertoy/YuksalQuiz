-- =========================================================
-- Migration: 20261007_fix_wallet_security.sql
-- YuksalQuiz: to'lov, balans, vaucher va obuna mantiqini
-- bazaning o'zida xavfsiz va atomik qilish.
--
-- Bu skriptni Supabase > SQL Editor ichida bir marta ishga tushiring.
-- Qayta ishga tushirsa ham xato bermaydi (idempotent).
-- =========================================================

-- ---------------------------------------------------------
-- 1. Kodda ishlatiladigan, lekin bazada yo'q ustunlar
-- ---------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS telegram_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS telegram_username TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS voucher_claimed BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_tier TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_subscribed BOOLEAN DEFAULT false;

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS verified_by TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS sender_card TEXT;

-- To'lov holatlari ro'yxati (oldingi migratsiya xatoni yutib yuborgan edi)
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check CHECK (
  status IN (
    'pending', 'approved', 'rejected',
    'auto_approved', 'pending_manual',
    'manual_approved', 'manual_rejected', 'warn_reset'
  )
);

-- ---------------------------------------------------------
-- 2. Sozlamalar jadvali (narxlar va vaucher summasi)
--    Admin o'zgartirgan narx endi hamma talabaga ko'rinadi.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.app_settings (key, value) VALUES
  ('price_3_months', '35000'::jsonb),
  ('price_6_months', '60000'::jsonb),
  ('price_1_year',   '100000'::jsonb),
  ('voucher_amount', '20000'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_settings public read" ON public.app_settings;
CREATE POLICY "app_settings public read" ON public.app_settings
  FOR SELECT TO anon, authenticated USING (true);

-- ---------------------------------------------------------
-- 3. Pul harakatlari jurnali (audit)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL,
  type          TEXT NOT NULL,
  amount        NUMERIC NOT NULL,
  balance_after NUMERIC,
  ref           TEXT,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON public.wallet_transactions (user_id, created_at DESC);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wallet_tx public read" ON public.wallet_transactions;
CREATE POLICY "wallet_tx public read" ON public.wallet_transactions
  FOR SELECT TO anon, authenticated USING (true);

-- ---------------------------------------------------------
-- 4. Yordamchi funksiyalar
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.norm_tg_id(p TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(btrim(COALESCE(p, '')), '^(tg_|user_)', '');
$$;

-- Foydalanuvchini id, tg_ID yoki telegram_id bo'yicha topadi
CREATE OR REPLACE FUNCTION public._resolve_user(p TEXT)
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT u.id
  FROM public.users u
  WHERE u.id = p
     OR u.id = public.norm_tg_id(p)
     OR u.id = 'tg_' || public.norm_tg_id(p)
     OR u.telegram_id = public.norm_tg_id(p)
  ORDER BY (u.id = p) DESC,
           (u.id = 'tg_' || public.norm_tg_id(p)) DESC,
           u.created_at ASC
  LIMIT 1;
$$;

-- Balansni xavfsiz o'zgartiradi (qator qulflanadi)
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
  IF nb < 0 THEN
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
-- 5. To'lovni tasdiqlash (admin yoki AI). Ikki marta bosilsa ham
--    pul faqat bir marta qo'shiladi.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_payment(
  p_payment_id UUID,
  p_actor TEXT,
  p_status TEXT DEFAULT 'manual_approved'
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pay public.payments%ROWTYPE;
  nb NUMERIC;
  verifier TEXT;
BEGIN
  IF p_status NOT IN ('manual_approved', 'auto_approved', 'approved') THEN
    RAISE EXCEPTION 'bad_status';
  END IF;

  SELECT * INTO pay FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'payment_not_found');
  END IF;

  IF pay.status NOT IN ('pending', 'pending_manual', 'rejected', 'manual_rejected') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_processed', 'status', pay.status);
  END IF;

  IF pay.amount IS NULL OR pay.amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'bad_amount');
  END IF;

  nb := public._wallet_change(
    pay.user_id, pay.amount, 'deposit', pay.id::text,
    'To''lov tasdiqlandi (' || p_status || ')'
  );

  verifier := CASE WHEN p_status = 'auto_approved' THEN 'ai' ELSE 'admin' END;

  UPDATE public.payments
  SET status = p_status,
      verified_by = verifier,
      notes = COALESCE(notes || ' | ', '') || p_actor || ' tasdiqladi: ' || now()::text
  WHERE id = pay.id;

  RETURN jsonb_build_object(
    'ok', true,
    'payment_id', pay.id,
    'user_id', public.norm_tg_id(pay.user_id),
    'amount', pay.amount,
    'new_balance', nb
  );
END $$;

CREATE OR REPLACE FUNCTION public.reject_payment(p_payment_id UUID, p_actor TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pay public.payments%ROWTYPE;
BEGIN
  SELECT * INTO pay FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'payment_not_found');
  END IF;
  IF pay.status NOT IN ('pending', 'pending_manual') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_processed', 'status', pay.status);
  END IF;

  UPDATE public.payments
  SET status = 'manual_rejected',
      verified_by = 'admin',
      notes = COALESCE(notes || ' | ', '') || p_actor || ' rad etdi: ' || now()::text
  WHERE id = pay.id;

  RETURN jsonb_build_object('ok', true, 'user_id', public.norm_tg_id(pay.user_id));
END $$;

-- Soxta chek: faqat shu chek orqali qo'shilgan summa balansdan qaytariladi
CREATE OR REPLACE FUNCTION public.reverse_payment(p_payment_id UUID, p_actor TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pay public.payments%ROWTYPE;
  rid TEXT;
  cur NUMERIC;
  take NUMERIC;
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

  take := LEAST(cur, pay.amount);
  nb := cur - take;

  UPDATE public.users SET balance = nb, wallet_balance = nb, updated_at = now() WHERE id = rid;
  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, ref, note)
  VALUES (rid, 'reversal', -take, nb, pay.id::text, 'Soxta chek: summa qaytarildi');

  UPDATE public.payments
  SET status = 'warn_reset',
      notes = COALESCE(notes || ' | ', '') || p_actor || ' ogohlantirdi, ' || take::text || ' so''m qaytarildi: ' || now()::text
  WHERE id = pay.id;

  RETURN jsonb_build_object('ok', true, 'user_id', public.norm_tg_id(pay.user_id),
                            'reversed', take, 'new_balance', nb);
END $$;

-- ---------------------------------------------------------
-- 6. Vaucher: bir marta, balansga qo'shiladi
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_voucher(p_user TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rid TEXT;
  claimed BOOLEAN;
  amt NUMERIC;
  nb NUMERIC;
BEGIN
  rid := public._resolve_user(p_user);
  IF rid IS NULL THEN
    INSERT INTO public.users (id, telegram_id)
    VALUES (p_user, public.norm_tg_id(p_user))
    ON CONFLICT (id) DO NOTHING;
    rid := public._resolve_user(p_user);
  END IF;

  SELECT COALESCE(voucher_claimed, false) INTO claimed
  FROM public.users WHERE id = rid FOR UPDATE;

  IF claimed THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_claimed');
  END IF;

  SELECT COALESCE((value #>> '{}')::numeric, 20000) INTO amt
  FROM public.app_settings WHERE key = 'voucher_amount';
  amt := COALESCE(amt, 20000);

  nb := public._wallet_change(rid, amt, 'voucher', NULL, 'Boshlang''ich vaucher');
  UPDATE public.users SET voucher_claimed = true WHERE id = rid;

  RETURN jsonb_build_object('ok', true, 'amount', amt, 'new_balance', nb);
END $$;

-- ---------------------------------------------------------
-- 7. Obuna sotib olish: balansdan yechiladi, muddat uzayadi
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purchase_subscription(p_user TEXT, p_plan TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rid TEXT;
  price NUMERIC;
  months INT;
  base TIMESTAMPTZ;
  new_end TIMESTAMPTZ;
  nb NUMERIC;
  cur NUMERIC;
BEGIN
  IF p_plan NOT IN ('3_months', '6_months', '1_year') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'bad_plan');
  END IF;
  months := CASE p_plan WHEN '3_months' THEN 3 WHEN '6_months' THEN 6 ELSE 12 END;

  SELECT COALESCE((value #>> '{}')::numeric, 0) INTO price
  FROM public.app_settings WHERE key = 'price_' || p_plan;
  IF price IS NULL OR price <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'price_not_set');
  END IF;

  rid := public._resolve_user(p_user);
  IF rid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'user_not_found');
  END IF;

  SELECT COALESCE(balance, wallet_balance, 0),
         GREATEST(now(), COALESCE(subscription_end, paid_until, now()))
  INTO cur, base
  FROM public.users WHERE id = rid FOR UPDATE;

  IF cur < price THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_balance',
                              'missing', price - cur, 'price', price);
  END IF;

  new_end := base + make_interval(months => months);
  nb := public._wallet_change(rid, -price, 'subscription', p_plan, 'Obuna: ' || p_plan);

  UPDATE public.users
  SET subscription_tier = p_plan,
      subscription_end = new_end,
      paid_until = new_end,
      has_paid = true,
      is_subscribed = true,
      updated_at = now()
  WHERE id = rid;

  UPDATE public.subscriptions SET status = 'expired'
  WHERE user_id IN (rid, public.norm_tg_id(rid)) AND status = 'active';

  INSERT INTO public.subscriptions (user_id, plan, status, expires_at, amount_paid, payment_method)
  VALUES (rid, p_plan, 'active', new_end, price, 'balance');

  RETURN jsonb_build_object('ok', true, 'plan', p_plan, 'price', price,
                            'new_balance', nb, 'subscription_end', new_end);
END $$;

-- ---------------------------------------------------------
-- 8. Admin: qo'lda pul qo'shish yoki obunani bepul yoqish
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_credit(
  p_user TEXT, p_amount NUMERIC, p_actor TEXT, p_plan TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rid TEXT;
  nb NUMERIC := NULL;
  months INT;
  base TIMESTAMPTZ;
  new_end TIMESTAMPTZ;
BEGIN
  rid := public._resolve_user(p_user);
  IF rid IS NULL THEN
    INSERT INTO public.users (id, telegram_id)
    VALUES (p_user, public.norm_tg_id(p_user))
    ON CONFLICT (id) DO NOTHING;
    rid := public._resolve_user(p_user);
  END IF;

  IF COALESCE(p_amount, 0) <> 0 THEN
    nb := public._wallet_change(rid, p_amount, 'admin_credit', p_actor, 'Admin tomonidan');
    INSERT INTO public.payments (user_id, amount, transaction_id, status, verified_by, sender_card, notes)
    VALUES (public.norm_tg_id(rid), p_amount, 'MANUAL_' || gen_random_uuid()::text,
            'manual_approved', 'admin', 'Admin Manual', p_actor || ' qo''shdi');
  END IF;

  IF p_plan IN ('3_months', '6_months', '1_year') THEN
    months := CASE p_plan WHEN '3_months' THEN 3 WHEN '6_months' THEN 6 ELSE 12 END;
    SELECT GREATEST(now(), COALESCE(subscription_end, paid_until, now()))
    INTO base FROM public.users WHERE id = rid FOR UPDATE;
    new_end := base + make_interval(months => months);

    UPDATE public.users
    SET subscription_tier = p_plan, subscription_end = new_end, paid_until = new_end,
        has_paid = true, is_subscribed = true, updated_at = now()
    WHERE id = rid;

    UPDATE public.subscriptions SET status = 'expired'
    WHERE user_id IN (rid, public.norm_tg_id(rid)) AND status = 'active';
    INSERT INTO public.subscriptions (user_id, plan, status, expires_at, amount_paid, payment_method)
    VALUES (rid, p_plan, 'active', new_end, 0, 'admin');
  END IF;

  IF nb IS NULL THEN
    SELECT COALESCE(balance, wallet_balance, 0) INTO nb FROM public.users WHERE id = rid;
  END IF;

  RETURN jsonb_build_object('ok', true, 'user_id', public.norm_tg_id(rid),
                            'new_balance', nb, 'subscription_end', new_end);
END $$;

-- Admin narxlarni o'zgartiradi
CREATE OR REPLACE FUNCTION public.admin_set_prices(p3 NUMERIC, p6 NUMERIC, p12 NUMERIC)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p3 <= 0 OR p6 <= 0 OR p12 <= 0 THEN
    RAISE EXCEPTION 'bad_price';
  END IF;
  INSERT INTO public.app_settings (key, value, updated_at) VALUES
    ('price_3_months', to_jsonb(p3), now()),
    ('price_6_months', to_jsonb(p6), now()),
    ('price_1_year',   to_jsonb(p12), now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
END $$;

-- Bu funksiyalarni faqat server (service_role) chaqira oladi.
DO $$
DECLARE
  fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public._wallet_change(text, numeric, text, text, text)',
    'public.approve_payment(uuid, text, text)',
    'public.reject_payment(uuid, text)',
    'public.reverse_payment(uuid, text)',
    'public.claim_voucher(text)',
    'public.purchase_subscription(text, text)',
    'public.admin_credit(text, numeric, text, text)',
    'public.admin_set_prices(numeric, numeric, numeric)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;

-- ---------------------------------------------------------
-- 9. Himoya: brauzer (anon/authenticated) pul va obuna
--    ustunlarini o'zgartira olmaydi. Faqat yuqoridagi funksiyalar,
--    service_role yoki Supabase SQL Editor o'zgartira oladi.
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
      NEW.telegram_id := COALESCE(OLD.telegram_id, NEW.telegram_id);
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_user_money ON public.users;
CREATE TRIGGER trg_protect_user_money
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_money_columns();

-- To'lovlar va obunalarni faqat server yozadi
DROP POLICY IF EXISTS "Allow public insert payments" ON public.payments;
DROP POLICY IF EXISTS "Allow public update payments" ON public.payments;
DROP POLICY IF EXISTS "Allow public insert subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Allow public update subscriptions" ON public.subscriptions;

-- Testlarni o'chirish/tahrirlash: faqat o'qish ochiq qoladi,
-- o'zgartirish keyingi bosqichda server orqali yopiladi.
