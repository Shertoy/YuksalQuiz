-- =========================================================
-- Migration: 20261009_add_referral_tracking.sql
-- YuksalQuiz: Referal tizimini kuzatish va foydalanuvchilar
-- hisobiga referal ustunlarini qo'shish.
-- =========================================================

-- 1. users jadvaliga referal ustunlarini qo'shish
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_count INT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referred_by TEXT;

-- 2. wallet_transactions jadvalida referal tranzaksiyalarini tezkor qidirish uchun indeks
CREATE INDEX IF NOT EXISTS idx_wallet_tx_ref ON public.wallet_transactions (ref) WHERE type = 'referral';
