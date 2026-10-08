-- =========================================================
-- Migration: 20261009_fix_trigger_and_wallet.sql
-- YuksalQuiz: Bazadagi wallet_balance ustuni va trigger xatosini
-- to'liq tuzatish (idempotent, xavfsiz).
--
-- Bu SQL skriptini Supabase Dashboard > SQL Editor ichida ishga tushiring:
-- 1. "record new has no field wallet_balance" xatosini bartaraf etadi.
-- 2. users jadvaliga wallet_balance ustunini qo'shadi.
-- 3. payments va subscriptions jadvallarida chet el kalit (FK) to'siqlarini yumshatadi.
-- =========================================================

-- 1. Users jadvaliga barcha kerakli ustunlarni xavfsiz qo'shish
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS telegram_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS telegram_username TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS voucher_claimed BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_tier TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_subscribed BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS paid_until TIMESTAMPTZ;

-- 2. Xatoga sabab bo'lgan eski triggerni olib tashlash
DROP TRIGGER IF EXISTS trg_protect_user_money ON public.users;
DROP FUNCTION IF EXISTS public.protect_user_money_columns();

-- 3. Payments va subscriptions dagi qattiq Foreign Key cheklovini olib tashlash
-- (Bu orqali har qanday talaba ID siga pul va obuna muammosiz yoziladi)
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;

-- 4. Payments status tekshiruvini kengaytirish
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check CHECK (
  status IN (
    'pending', 'approved', 'rejected',
    'auto_approved', 'pending_manual',
    'manual_approved', 'manual_rejected', 'warn_reset'
  )
);

-- 5. Subscriptions jadvalida plan_name ustuni mavjudligini ta'minlash
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS plan_name TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS plan TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;

-- 6. Balanslarni sinxronlashtirish: balance va wallet_balance ni tenglashtirish
UPDATE public.users
SET wallet_balance = COALESCE(balance, 0)
WHERE wallet_balance IS NULL OR wallet_balance = 0;

UPDATE public.users
SET balance = COALESCE(wallet_balance, 0)
WHERE balance IS NULL OR balance = 0;
