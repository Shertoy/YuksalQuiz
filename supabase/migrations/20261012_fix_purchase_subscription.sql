-- =====================================================================
-- YuksalQuiz: obuna sotib olishdagi "Server xatosi" ni tuzatish
--
-- Muammo: purchase_subscription oxirida eski "subscriptions" jadvaliga tarix yozadi.
-- Bu jadvalning tuzilishi bazada turlicha bo'lishi mumkin (masalan, user_id UUID turida
-- yoki plan_name majburiy). Shu yozuv xato bersa, butun xarid bekor bo'lardi.
--
-- Yechim: balansdan yechish va obuna muddatini yozish asosiy ish bo'lib qoladi.
-- subscriptions jadvaliga tarix yozish ixtiyoriy: xato bersa ham xarid to'xtamaydi.
-- Ma'lumotlar o'chirilmaydi.
-- =====================================================================

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
    -- Narx bazada yozilmagan bo'lsa, ilovadagi standart narxlar ishlatiladi
    price := CASE p_plan WHEN '3_months' THEN 35000 WHEN '6_months' THEN 60000 ELSE 100000 END;
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

  -- Tarix (ixtiyoriy): xato bo'lsa xarid bekor bo'lmaydi
  BEGIN
    UPDATE public.subscriptions SET status = 'expired'
    WHERE user_id::text IN (rid, public.norm_tg_id(rid)) AND status = 'active';

    INSERT INTO public.subscriptions (user_id, plan, plan_name, status, expires_at, amount_paid, payment_method)
    VALUES (rid, p_plan, p_plan, 'active', new_end, price, 'balance');
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'subscriptions tarixi yozilmadi: %', SQLERRM;
  END;

  RETURN jsonb_build_object('ok', true, 'plan', p_plan, 'price', price,
                            'new_balance', nb, 'subscription_end', new_end);
END $$;

REVOKE ALL ON FUNCTION public.purchase_subscription(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_subscription(text, text) TO service_role;

-- Tekshiruv: natijada bitta qator, "tayyor" = true bo'lishi kerak
SELECT 'purchase_subscription yangilandi' AS holat,
       to_regprocedure('public.purchase_subscription(text,text)') IS NOT NULL AS tayyor;
