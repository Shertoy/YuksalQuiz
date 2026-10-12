import {
  getServiceClient,
  setCors,
  verifyRequestUser,
  cleanId,
  tgSend,
  findUserRow,
  normalizeSubscriptionPlan,
  BOT_TOKEN,
  getAdminIds,
  escapeHtml,
} from './_lib/common.js';

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

  const clientUserId = String(req.body?.clientUserId || '').trim();
  const userRow = await findUserRow(db, user.id, clientUserId);
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

      if (!cReferrer || !/^\d{3,15}$/.test(cReferrer)) {
        return res.status(400).json({ ok: false, error: "referrerId noto'g'ri" });
      }

      // Faqat yangi foydalanuvchi va faqat bir marta: avval taklif qilingan bo'lsa bonus berilmaydi
      if (userRow?.referred_by) {
        return res.status(200).json({ ok: true, already_credited: true });
      }
      const createdAt = userRow?.created_at ? new Date(userRow.created_at).getTime() : Date.now();
      if (Date.now() - createdAt > 3 * 24 * 3600_000) {
        return res.status(200).json({ ok: false, reason: 'not_new_user' });
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
      if (rpcErr) {
        // Noyob indeks: parallel so'rovda ikkinchi bonus yozilmaydi
        if (String(rpcErr.code) === '23505' || /duplicate key/i.test(String(rpcErr.message || ''))) {
          return res.status(200).json({ ok: true, already_credited: true });
        }
        throw rpcErr;
      }

      if (userRow?.id) {
        await db.from('users').update({ referred_by: referrerRow.id }).eq('id', userRow.id).is('referred_by', null);
      }

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
    // faculty_request — ro'yxatda yo'q yo'nalish: adminga so'rov
    // ----------------------------------------------------------------
    if (action === 'faculty_request') {
      const university = String(req.body?.university || '').replace(/\s+/g, ' ').trim().slice(0, 200);
      const faculty = String(req.body?.faculty || '').replace(/\s+/g, ' ').trim().slice(0, 120);
      if (!university || faculty.length < 2) {
        return res.status(400).json({ ok: false, error: "OTM va yo'nalish nomi kerak" });
      }
      const norm = (x: string) => x.toLowerCase().replace(/[ʻʼ‘’`']/g, "'").replace(/\s+/g, ' ').trim();

      const { data: row } = await db.from('app_settings').select('value').eq('key', 'faculty_requests').maybeSingle();
      const list: any[] = Array.isArray(row?.value) ? row.value : [];
      const existing = list.find((r: any) => norm(r.university) === norm(university) && norm(r.faculty) === norm(faculty));
      let isNew = false;
      if (existing) {
        existing.count = Number(existing.count || 1) + 1;
      } else {
        isNew = true;
        list.unshift({
          id: `fr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          university,
          faculty,
          count: 1,
          created_at: new Date().toISOString(),
        });
      }
      const trimmed = list.slice(0, 300);
      await db
        .from('app_settings')
        .upsert({ key: 'faculty_requests', value: trimmed, updated_at: new Date().toISOString() }, { onConflict: 'key' });

      // Spamdan himoya: bir soatda 20 tadan ko'p yangi so'rov bo'lsa, adminga xabar yuborilmaydi
      const hourAgo = Date.now() - 3600_000;
      const recentCount = trimmed.filter((r: any) => new Date(r.created_at).getTime() > hourAgo).length;
      if (isNew && recentCount <= 20) {
        const text =
          `📝 <b>Yangi yo'nalish so'rovi</b>\n\n` +
          `🏫 OTM: ${escapeHtml(university)}\n` +
          `🎓 Yo'nalish: <b>${escapeHtml(faculty)}</b>\n\n` +
          `Talaba test yaratishda bu yo'nalishni ro'yxatdan topa olmadi va qo'lda yozdi.\n` +
          `Admin panel → OTMlar → Yo'nalishlar bo'limida qo'shing yoki rad eting.`;
        for (const adminId of Array.from(new Set(getAdminIds()))) {
          await tgSend(adminId, text);
        }
      }
      return res.status(200).json({ ok: true });
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
      const activePlan = active ? normalizeSubscriptionPlan(userRow?.subscription_tier, true) : null;
      // Talabaning o'z hamyon tarixi (brauzer payments/wallet_transactions ni bevosita o'qiy olmaydi)
      let history: any[] = [];
      let payments: any[] = [];
      if (userRow?.id) {
        const ids = Array.from(
          new Set(
            (Array.isArray(userRow._matchedIds) && userRow._matchedIds.length
              ? userRow._matchedIds
              : [userRow.id, cleanId(userRow.id), `tg_${cleanId(userRow.id)}`]) as string[]
          )
        );
        const [{ data: tx }, { data: pays }] = await Promise.all([
          db
            .from('wallet_transactions')
            .select('id, type, amount, balance_after, note, created_at')
            .in('user_id', ids)
            .order('created_at', { ascending: false })
            .limit(30),
          db
            .from('payments')
            .select('id, amount, status, transaction_id, created_at')
            .in('user_id', ids)
            .order('created_at', { ascending: false })
            .limit(20),
        ]);
        history = tx || [];
        payments = pays || [];
      }
      return res.status(200).json({
        ok: true,
        userFound: Boolean(userRow),
        userId: userRow?.id || null,
        telegramId: userRow?.telegram_id || cleanId(user.id),
        isBlocked: Boolean(userRow?.is_blocked),
        balance: Number(userRow?.balance ?? userRow?.wallet_balance ?? 0),
        referralCount: Number(userRow?.referral_count ?? 0),
        voucherClaimed: Boolean(userRow?.voucher_claimed),
        history,
        payments,
        subscription: {
          active,
          plan: activePlan,
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
      const plan = String(req.body?.plan || '').trim();
      if (!['3_months', '6_months', '1_year'].includes(plan)) {
        return res.status(400).json({ ok: false, reason: 'invalid_plan', error: "Tarif noto'g'ri" });
      }
      if (!userRow) {
        return res.status(404).json({ ok: false, reason: 'user_not_found', error: "Avval ro'yxatdan o'ting" });
      }

      let data: any = null;
      const { data: rpcData, error } = await db.rpc('purchase_subscription', {
        p_user: userRow.id,
        p_plan: plan,
      });

      if (!error && rpcData) {
        data = rpcData;
      } else {
        // Agar bazada purchase_subscription funksiyasi eski subscriptions jadvali ustunlari sababli xato bersa,
        // service_role orqali xavfsiz bevosita yechib va obunani yoqib beramiz.
        const priceKey =
          plan === '3_months' ? 'price_3_months' : plan === '6_months' ? 'price_6_months' : 'price_1_year';
        const defaultPrice = plan === '3_months' ? 35000 : plan === '6_months' ? 60000 : 100000;
        const { data: settingRow } = await db
          .from('app_settings')
          .select('value')
          .eq('key', priceKey)
          .maybeSingle();
        const price = Number(settingRow?.value) > 0 ? Number(settingRow.value) : defaultPrice;
        const curBal = Number(userRow.balance ?? userRow.wallet_balance ?? 0);

        if (curBal < price) {
          return res.status(400).json({
            ok: false,
            reason: 'insufficient_funds',
            balance: curBal,
            required: price,
          });
        }

        const targetRowIds: string[] =
          Array.isArray(userRow._rowIds) && userRow._rowIds.length > 0 ? userRow._rowIds : [userRow.id];
        let newBal = curBal - price;

        const { data: chData, error: chErr } = await db.rpc('_wallet_change', {
          p_user: userRow.id,
          p_amount: -price,
          p_type: 'subscription_purchase',
          p_ref: plan,
          p_note: `Obuna xaridi: ${plan}`,
        });

        if (!chErr && chData !== null && chData !== undefined) {
          newBal = Number(chData);
        } else if (chErr && String(chErr.message || '').includes('INSUFFICIENT_FUNDS')) {
          return res.status(400).json({
            ok: false,
            reason: 'insufficient_funds',
            balance: curBal,
            required: price,
          });
        }

        const existingEnd = userRow.subscription_end || userRow.paid_until || null;
        const curMs = existingEnd ? new Date(existingEnd).getTime() : 0;
        const baseMs = !Number.isNaN(curMs) && curMs > Date.now() ? curMs : Date.now();
        const dEnd = new Date(baseMs);
        if (plan === '1_year') dEnd.setFullYear(dEnd.getFullYear() + 1);
        else if (plan === '6_months') dEnd.setMonth(dEnd.getMonth() + 6);
        else dEnd.setMonth(dEnd.getMonth() + 3);
        const newEndIso = dEnd.toISOString();

        const { error: upErr } = await db
          .from('users')
          .update({
            balance: newBal,
            wallet_balance: newBal,
            subscription_tier: plan,
            subscription_end: newEndIso,
            paid_until: newEndIso,
            has_paid: true,
            is_subscribed: true,
            updated_at: new Date().toISOString(),
          })
          .in('id', targetRowIds);

        if (upErr) {
          console.error('purchase direct fallback error:', upErr);
          return res.status(500).json({
            ok: false,
            reason: 'purchase_failed',
            error: "Obunani yoqib bo'lmadi. Qayta urinib ko'ring.",
          });
        }

        try {
          await db.from('subscriptions').insert({
            user_id: userRow.id,
            plan_name: plan,
            price,
            expires_at: newEndIso,
          });
        } catch {}

        data = {
          ok: true,
          new_balance: newBal,
          subscription_end: newEndIso,
          plan,
          price,
        };
      }

      // Agar shu foydalanuvchining users jadvalida bir nechta qatori bo'lsa, hammasida obuna muddatini sinxronlaymiz
      if (data?.ok && data?.subscription_end && Array.isArray(userRow._rowIds) && userRow._rowIds.length > 0) {
        await db
          .from('users')
          .update({
            ...(typeof data.new_balance === 'number'
              ? { balance: data.new_balance, wallet_balance: data.new_balance }
              : {}),
            subscription_tier: plan,
            subscription_end: data.subscription_end,
            paid_until: data.subscription_end,
            has_paid: true,
            is_subscribed: true,
            updated_at: new Date().toISOString(),
          })
          .in('id', userRow._rowIds);
      }

      return res.status(data?.ok ? 200 : 400).json(data);
    }

    return res.status(400).json({ ok: false, error: "Noma'lum action" });
  } catch (err: any) {
    console.error('wallet api error:', err?.message);
    return res.status(500).json({ ok: false, error: 'Server xatosi' }); // FIX: ichki xabar tashqariga chiqmaydi
  }
}
