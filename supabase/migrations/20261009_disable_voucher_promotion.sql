-- =========================================================
-- Migration: 20261009_disable_voucher_promotion.sql
-- Yangi foydalanuvchilar uchun boshlang'ich vaucher aksiyasini to'xtatish.
-- Eski berilgan vaucherlar va balanslar to'liq saqlanadi.
-- =========================================================

-- 1. App settings jadvalida vaucher summasini 0 qilib belgilash
INSERT INTO public.app_settings (key, value, updated_at)
VALUES ('voucher_amount', '0'::jsonb, now())
ON CONFLICT (key) DO UPDATE
SET value = '0'::jsonb, updated_at = now();

-- 2. claim_voucher funksiyasini yangi foydalanuvchilarga bermaydigan qilish
CREATE OR REPLACE FUNCTION public.claim_voucher(p_user TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN jsonb_build_object(
    'ok', false,
    'reason', 'promotion_ended',
    'error', 'Boshlang''ich vaucher aksiyasi yakunlangan. Yangi foydalanuvchilarga vaucher berilmaydi.'
  );
END $$;
