import { getServiceClient, setCors, verifyRequestUser, findUserRow, cleanId, tgSend } from './_lib/common.ts';

/**
 * Talaba hamyoni va referal tizimi uchun xavfsiz API.
 * Shaxs Telegram initData orqali aniqlanadi.
 *
 * POST /api/wallet
 *   { action: 'me' }
 *   { action: 'claim_voucher' }
 *   { action: 'purchase', plan: '3_months' | '6_months' | '1_year' }
 *   { action: 'process_referral', referrerId, newUserId }
 */
export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST kerak' });

  const db = getServiceClient();
  const action = String(req.body?.action || '');

  // 1. Yangi ro'yxatdan o'tgan foydalanuvchining referal bonusini hisoblash
  if (action === 'process_referral') {
    try {
      const referrerRaw = String(req.body?.referrerId || '').trim();
      const newUserIdRaw = String(req.body?.newUserId || '').trim();

      if (!referrerRaw || !newUserIdRaw) {
        return res.status(400).json({ ok: false, error: 'referrerId va newUserId talab qilinadi' });
      }

      const cReferrer = cleanId(referrerRaw);
      const cNewUser = cleanId(newUserIdRaw);

      // O'z-o'zini taklif qilish taqiqlanadi
      if (cReferrer === cNewUser) {
        return res.status(200).json({ ok: false, reason: 'self_referral_ignored' });
      }

      // Taklif qiluvchi foydalanuvchini bazadan topish
      const referrerRow = await findUserRow(db, cReferrer);
      if (!referrerRow) {
        return res.status(200).json({ ok: false, reason: 'referrer_not_found' });
      }

      // Ushbu yangi foydalanuvchi uchun allaqachon bonus berilganligini tekshirish (idempotentlik)
      const { data: existingTx } = await db
        .from('wallet_transactions')
        .select('id')
        .eq('type', 'referral')
        .eq('ref', `ref_${cNewUser}`)
        .limit(1)
        .maybeSingle();

      if (existingTx) {
        return res.status(200).json({ ok: true, already_credited: true });
      }

      // Taklif qiluvchining hisobiga +1000 so'm qo'shish
      let newBalance = 0;
      try {
        newBalance = await db.rpc('_wallet_change', {
          p_user: referrerRow.id,
          p_amount: 1000,
          p_type: 'referral',
          p_ref: `ref_${cNewUser}`,
          p_note: `Do'st taklifi bonusi (+1 000 so'm)`
        });
      } catch (rpcErr) {
        console.warn('_wallet_change rpc notice, performing direct atomic update:', rpcErr);
        const curBal = Number(referrerRow.balance ?? referrerRow.wallet_balance ?? 0);
        newBalance = curBal + 1000;
        await db.from('users').update({
          balance: newBalance,
          wallet_balance: newBalance,
          referral_count: Number(referrerRow.referral_count || 0) + 1,
          updated_at: new Date().toISOString()
        }).eq('id', referrerRow.id);

        await db.from('wallet_transactions').insert({
          user_id: referrerRow.id,
          type: 'referral',
          amount: 1000,
          balance_after: newBalance,
          ref: `ref_${cNewUser}`,
          note: `Do'st taklifi bonusi (+1 000 so'm)`
        });
      }

      // referral_count hisoblagichini oshirish
      const updatedRefCount = Number(referrerRow.referral_count || 0) + 1;
      await db.from('users').update({
        referral_count: updatedRefCount,
        updated_at: new Date().toISOString()
      }).eq('id', referrerRow.id);

      // test_packages jadvalida ham balansni yangilash
      try {
        await db.from('test_packages')
          .update({ author_wallet_balance: newBalance })
          .or(`id.eq.lead_${referrerRow.id},id.eq.lead_${cleanId(referrerRow.id)}`);
      } catch {}

      // Taklif qiluvchiga Telegram orqali xushxabar jo'natish
      const refTgId = referrerRow.telegram_id || cleanId(referrerRow.id);
      if (refTgId && /^\d+$/.test(refTgId)) {
        await tgSend(
          refTgId,
          `🎉 <b>Yangi do'stingiz qo'shildi!</b>\n\nSizning taklif havolangiz orqali yangi talaba ro'yxatdan o'tdi.\n💰 Hisobingizga <b>+1 000 so'm</b> bonus qo'shildi!\n📊 Jami takliflaringiz: <b>${updatedRefCount} ta</b>`
        );
      }

      return res.status(200).json({
        ok: true,
        credited: true,
        amount: 1000,
        referrer_id: referrerRow.id,
        new_referral_count: updatedRefCount
      });
    } catch (refErr: any) {
      console.error('process_referral error:', refErr);
      return res.status(500).json({ ok: false, error: refErr?.message || 'Referal hisoblashda xatolik' });
    }
  }

  const user = verifyRequestUser(req);
  if (!user) {
    return res.status(401).json({
      ok: false,
      reason: 'unauthorized',
      error: "Ilovani Telegram ichida oching. Brauzerda bu amal ishlamaydi.",
    });
  }

  try {
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
        referralCount: Number(row?.referral_count ?? 0),
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
      // Yangi foydalanuvchilar uchun vaucher aksiyasi tugatilgan. Eski berilganlar saqlanadi.
      return res.status(400).json({
        ok: false,
        reason: 'promotion_ended',
        error: "Boshlang'ich vaucher aksiyasi yakunlangan. Yangi foydalanuvchilarga vaucher berilmaydi.",
      });
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
