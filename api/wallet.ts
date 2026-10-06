import { getServiceClient, setCors, verifyRequestUser, findUserRow } from './_lib/common';

/**
 * Talaba hamyoni uchun xavfsiz API.
 * Shaxs Telegram initData orqali aniqlanadi (soxta userId o'tmaydi).
 *
 * POST /api/wallet
 *   { action: 'me' }
 *   { action: 'claim_voucher' }
 *   { action: 'purchase', plan: '3_months' | '6_months' | '1_year' }
 */
export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST kerak' });

  const user = verifyRequestUser(req);
  if (!user) {
    return res.status(401).json({
      ok: false,
      reason: 'unauthorized',
      error: "Ilovani Telegram ichida oching. Brauzerda bu amal ishlamaydi.",
    });
  }

  try {
    const db = getServiceClient();
    const action = String(req.body?.action || '');
    const tgKey = `tg_${user.id}`;

    const row = await findUserRow(db, user.id);
    if (row?.is_blocked) {
      return res.status(403).json({ ok: false, reason: 'blocked', error: 'Hisobingiz bloklangan' });
    }

    if (action === 'me') {
      const { data: prices } = await db
        .from('app_settings')
        .select('key, value')
        .in('key', ['price_3_months', 'price_6_months', 'price_1_year', 'voucher_amount']);
      const map: Record<string, number> = {};
      (prices || []).forEach((p: any) => (map[p.key] = Number(p.value)));
      const end = row?.subscription_end || row?.paid_until || null;
      const active = end ? new Date(end) > new Date() : false;
      return res.status(200).json({
        ok: true,
        balance: Number(row?.balance ?? row?.wallet_balance ?? 0),
        voucherClaimed: Boolean(row?.voucher_claimed),
        subscription: { active, plan: active ? row?.subscription_tier || null : null, end: active ? end : null },
        prices: {
          '3_months': map.price_3_months ?? 35000,
          '6_months': map.price_6_months ?? 60000,
          '1_year': map.price_1_year ?? 100000,
        },
        voucherAmount: map.voucher_amount ?? 20000,
      });
    }

    if (action === 'claim_voucher') {
      const { data, error } = await db.rpc('claim_voucher', { p_user: row?.id || tgKey });
      if (error) throw error;
      // Foydalanuvchi qatori yangi bo'lsa, ismini ham yozib qo'yamiz
      await db
        .from('users')
        .update({
          telegram_id: user.id,
          telegram_username: user.username || null,
          first_name: row?.first_name || user.firstName || null,
        })
        .eq('id', row?.id || tgKey);
      return res.status(data?.ok ? 200 : 409).json(data);
    }

    if (action === 'purchase') {
      const plan = String(req.body?.plan || '');
      if (!row) {
        return res.status(404).json({ ok: false, reason: 'user_not_found', error: 'Avval ro\'yxatdan o\'ting' });
      }
      const { data, error } = await db.rpc('purchase_subscription', { p_user: row.id, p_plan: plan });
      if (error) throw error;
      return res.status(data?.ok ? 200 : 400).json(data);
    }

    return res.status(400).json({ ok: false, error: "Noma'lum action" });
  } catch (err: any) {
    console.error('wallet api error:', err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server xatosi' });
  }
}
