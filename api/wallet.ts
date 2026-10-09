import {
  getServiceClient,
  setCors,
  verifyRequestUser,
  cleanId,
  tgSend,
  findUserRow,
  BOT_TOKEN,
} from './_lib/common.ts';

/**
 * Talaba hamyoni va referal tizimi uchun xavfsiz API (YuksalQuiz).
 *
 * FIX xulasasi:
 * - process_referral autentifikatsiyadan KEYIN ishlaydi
 * - newUserId initData dan olinadi, clientdan qabul qilinmaydi
 * - RPC xato bo'lganda fallback yo'q — butun operatsiya to'xtaydi
 * - _wallet_change muvaffaqiyatsizlikda balansni bevosita o'zgartirmaydi
 */

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST kerak' });

  const db = getServiceClient();
  const action = String(req.body?.action || '');

  // FIX [CRITICAL]: Barcha amallar (process_referral ham) avval autentifikatsiyadan o'tadi
  const user = verifyRequestUser(req);
  if (!user) {
    return res.status(401).json({
      ok: false,
      reason: 'unauthorized',
      error: 'Ilovani Telegram ichida oching.',
    });
  }

  const userRow = await findUserRow(db, user.id);
  if (userRow?.is_blocked) {
    return res.status(403).json({ ok: false, reason: 'blocked', error: 'Hisobingiz bloklangan' });
  }

  try {
    // ----------------------------------------------------------------
    // process_referral
    // FIX: newUserId endi clientdan emas, tasdiqlangan initData dan olinadi
    // ----------------------------------------------------------------
    if (action === 'process_referral') {
      const referrerRaw = String(req.body?.referrerId || '').trim();
      // FIX: newUserId = tekshirilgan foydalanuvchi (taklif linkiga kirgani)
      const cNewUser = cleanId(user.id);
      const cReferrer = cleanId(referrerRaw);

      if (!cReferrer) {
        return res.status(400).json({ ok: false, error: 'referrerId talab qilinadi' });
      }
      if (cReferrer === cNewUser) {
        return res.status(200).json({ ok: false, reason: 'self_referral_ignored' });
      }

      const referrerRow = await findUserRow(db, cReferrer);
      if (!referrerRow) {
        return res.status(200).json({ ok: false, reason: 'referrer_not_found' });
      }

      // FIX: bloklangan taklif qiluvchi bonus ololmaydi
      if (referrerRow.is_blocked) {
        return res.status(200).json({ ok: false, reason: 'referrer_blocked' });
      }

      // Idempotentlik tekshiruvi
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

      // FIX [HIGH]: RPC xato bo'lsa fallback yo'q — operatsiya to'xtaydi
      const { data: rpcResult, error: rpcErr } = await db.rpc('_wallet_change', {
        p_user: referrerRow.id,
        p_amount: 1000,
        p_type: 'referral',
        p_ref: `ref_${cNewUser}`,
        p_note: `Do'st taklifi bonusi (+1 000 so'm)`,
      });
      if (rpcErr) throw rpcErr;

      const newBalance = Number(rpcResult ?? 0);
      const updatedRefCount = Number(referrerRow.referral_count || 0) + 1;

      await db
        .from('users')
        .update({ referral_count: updatedRefCount, updated_at: new Date().toISOString() })
        .eq('id', referrerRow.id);

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
        new_referral_count: updatedRefCount,
      });
    }

    // ----------------------------------------------------------------
    // me
    // ----------------------------------------------------------------
    if (action === 'me') {
      const { data: prices } = await db
        .from('app_settings')
        .select('key, value')
        .in('key', ['price_3_months', 'price_6_months', 'price_1_year', 'voucher_amount']);
      const map: Record<string, number> = {};
      (prices || []).forEach((p: any) => (map[p.key] = Number(p.value)));
      const end = userRow?.subscription_end || userRow?.paid_until || null;
      const active = end ? new Date(end) > new Date() : false;
      return res.status(200).json({
        ok: true,
        balance: Number(userRow?.balance ?? userRow?.wallet_balance ?? 0),
        referralCount: Number(userRow?.referral_count ?? 0),
        voucherClaimed: Boolean(userRow?.voucher_claimed),
        subscription: {
          active,
          plan: active ? userRow?.subscription_tier || null : null,
          end: active ? end : null,
        },
        prices: {
          '3_months': map.price_3_months ?? 35000,
          '6_months': map.price_6_months ?? 60000,
          '1_year': map.price_1_year ?? 100000,
        },
        voucherAmount: map.voucher_amount ?? 20000,
      });
    }

    // ----------------------------------------------------------------
    // claim_voucher — aksiya tugatilgan
    // ----------------------------------------------------------------
    if (action === 'claim_voucher') {
      return res.status(400).json({
        ok: false,
        reason: 'promotion_ended',
        error: "Boshlang'ich vaucher aksiyasi yakunlangan.",
      });
    }

    // ----------------------------------------------------------------
    // purchase
    // ----------------------------------------------------------------
    if (action === 'purchase') {
      const plan = String(req.body?.plan || '');
      if (!userRow) {
        return res.status(404).json({ ok: false, reason: 'user_not_found', error: "Avval ro'yxatdan o'ting" });
      }
      const { data, error } = await db.rpc('purchase_subscription', {
        p_user: userRow.id,
        p_plan: plan,
      });
      if (error) throw error;
      return res.status(data?.ok ? 200 : 400).json(data);
    }

    return res.status(400).json({ ok: false, error: "Noma'lum action" });
  } catch (err: any) {
    console.error('wallet api error:', err?.message);
    return res.status(500).json({ ok: false, error: 'Server xatosi' }); // FIX: ichki xabar tashqariga chiqmaydi
  }
}
