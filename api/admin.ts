import {
  getServiceClient,
  setCors,
  verifyRequestUser,
  isAdminId,
  cleanId,
  tgSend,
} from './_lib/common';

/**
 * Admin paneli uchun xavfsiz API. Faqat ADMIN_TELEGRAM_IDS ichidagi,
 * Telegram imzosi tasdiqlangan foydalanuvchi ishlata oladi.
 *
 * POST /api/admin  { action, ... }
 *   whoami | list_payments | approve | reject | reverse | credit | set_prices | set_blocked
 */
export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST kerak' });

  const caller = verifyRequestUser(req);
  if (!caller) {
    return res.status(401).json({ ok: false, reason: 'unauthorized', error: 'Telegram orqali kiring' });
  }
  if (!isAdminId(caller.id)) {
    return res.status(403).json({ ok: false, reason: 'forbidden', error: "Sizda admin huquqi yo'q" });
  }

  const action = String(req.body?.action || '');
  const actor = caller.id;

  try {
    const db = getServiceClient();

    if (action === 'whoami') {
      return res.status(200).json({ ok: true, admin: true, id: actor });
    }

    if (action === 'list_payments') {
      const { data: pays, error } = await db
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw error;

      const ids = Array.from(new Set((pays || []).map((p: any) => cleanId(p.user_id))));
      const keys = ids.flatMap((i) => [i, `tg_${i}`]);
      const { data: users } = ids.length
        ? await db.from('users').select('*').in('id', keys)
        : { data: [] as any[] };
      const byId = new Map<string, any>();
      (users || []).forEach((u: any) => byId.set(cleanId(u.id), u));

      const out = (pays || []).map((p: any) => {
        const u = byId.get(cleanId(p.user_id));
        const name =
          u?.full_name || u?.name || `${u?.first_name || ''} ${u?.last_name || ''}`.trim() || null;
        return {
          ...p,
          users: u
            ? {
                full_name: name,
                username: u.telegram_username || u.username || null,
                balance: Number(u.balance ?? u.wallet_balance ?? 0),
                has_paid: Boolean(u.is_subscribed || u.has_paid),
                paid_until: u.subscription_end || u.paid_until || null,
                university: u.university || null,
              }
            : null,
        };
      });
      return res.status(200).json({ ok: true, payments: out });
    }

    if (action === 'approve') {
      const paymentId = String(req.body?.paymentId || '');
      const plan = req.body?.plan || null;
      const { data, error } = await db.rpc('approve_payment', {
        p_payment_id: paymentId,
        p_actor: actor,
        p_status: 'manual_approved',
      });
      if (error) throw error;
      if (!data?.ok) return res.status(409).json(data);

      let subEnd: string | null = null;
      if (plan) {
        const r = await db.rpc('admin_credit', { p_user: data.user_id, p_amount: 0, p_actor: actor, p_plan: plan });
        subEnd = (r.data as any)?.subscription_end || null;
      }
      await tgSend(
        data.user_id,
        `To'lovingiz tasdiqlandi. Hisobingizga ${Number(data.amount).toLocaleString('uz-UZ')} so'm qo'shildi.`
      );
      return res.status(200).json({ ...data, subscription_end: subEnd });
    }

    if (action === 'reject') {
      const { data, error } = await db.rpc('reject_payment', {
        p_payment_id: String(req.body?.paymentId || ''),
        p_actor: actor,
      });
      if (error) throw error;
      if (!data?.ok) return res.status(409).json(data);
      await tgSend(data.user_id, "Siz yuborgan to'lov kvitansiyasi tasdiqlanmadi. Iltimos, haqiqiy chekni yuklang.");
      return res.status(200).json(data);
    }

    if (action === 'reverse') {
      const { data, error } = await db.rpc('reverse_payment', {
        p_payment_id: String(req.body?.paymentId || ''),
        p_actor: actor,
      });
      if (error) throw error;
      if (!data?.ok) return res.status(409).json(data);
      await tgSend(
        data.user_id,
        "Diqqat: yuborgan chekingizda qoidabuzarlik aniqlandi va summa hisobingizdan qaytarildi. Takrorlansa hisobingiz bloklanadi."
      );
      return res.status(200).json(data);
    }

    if (action === 'credit') {
      const userId = cleanId(req.body?.userId);
      const amount = Number(req.body?.amount || 0);
      const plan = req.body?.plan || null;
      if (!userId) return res.status(400).json({ ok: false, error: 'userId kerak' });
      if (!amount && !plan) return res.status(400).json({ ok: false, error: 'Summa yoki tarif kerak' });
      const { data, error } = await db.rpc('admin_credit', {
        p_user: `tg_${userId}`,
        p_amount: amount,
        p_actor: actor,
        p_plan: plan,
      });
      if (error) throw error;
      const parts: string[] = [];
      if (amount) parts.push(`hisobingizga ${amount.toLocaleString('uz-UZ')} so'm qo'shildi`);
      if (plan) parts.push('obunangiz faollashtirildi');
      await tgSend(userId, `Administrator tomonidan ${parts.join(' va ')}.`);
      return res.status(200).json(data);
    }

    if (action === 'set_prices') {
      const { error } = await db.rpc('admin_set_prices', {
        p3: Number(req.body?.p3),
        p6: Number(req.body?.p6),
        p12: Number(req.body?.p12),
      });
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (action === 'set_blocked') {
      const userId = cleanId(req.body?.userId);
      const blocked = Boolean(req.body?.blocked);
      const { error } = await db
        .from('users')
        .update({ is_blocked: blocked, updated_at: new Date().toISOString() })
        .or(`id.eq.${userId},id.eq.tg_${userId},telegram_id.eq.${userId}`);
      if (error) throw error;
      await tgSend(userId, blocked ? 'Hisobingiz bloklandi.' : 'Hisobingiz qayta faollashtirildi.');
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ ok: false, error: "Noma'lum action" });
  } catch (err: any) {
    console.error('admin api error:', err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server xatosi' });
  }
}
