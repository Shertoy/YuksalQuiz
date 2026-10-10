import {
  getServiceClient,
  setCors,
  verifyRequestUser,
  isAdminId,
  adminAccessProblem,
  cleanId,
  tgSend,
} from './_lib/common.js';

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
    return res.status(401).json({ ok: false, reason: 'unauthorized', error: adminAccessProblem(req, null) });
  }
  if (!isAdminId(caller.id)) {
    return res.status(403).json({ ok: false, reason: 'forbidden', error: adminAccessProblem(req, caller) });
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
      const customAmount = Math.round(Number(req.body?.amount || 0));
      // Admin summa ko'rsatsa (AI o'qiy olmagan chek), summa bilan atomar tasdiqlanadi
      const { data: current } = await db.from('payments').select('amount').eq('id', paymentId).maybeSingle();
      const useCustom = customAmount > 0 && Number(current?.amount || 0) !== customAmount;
      const { data, error } = useCustom
        ? await db.rpc('approve_payment_with_amount', {
            p_payment_id: paymentId,
            p_amount: customAmount,
            p_actor: actor,
          })
        : await db.rpc('approve_payment', {
            p_payment_id: paymentId,
            p_actor: actor,
            p_status: 'manual_approved',
          });
      if (error) throw error;
      if (!data?.ok) return res.status(409).json(data);

      let subEnd: string | null = null;
      if (plan) {
        // tg_ prefiksli va oddiy ID bilan sinab ko'ramiz
        const tryIds = [data.user_id, `tg_${data.user_id}`, cleanId(data.user_id)];
        for (const pid of tryIds) {
          const r = await db.rpc('admin_credit', { p_user: pid, p_amount: 0, p_actor: actor, p_plan: plan });
          if (!r.error && r.data?.ok) {
            subEnd = (r.data as any)?.subscription_end || null;
            break;
          }
        }
      }

      const msgParts = [`Hisobingizga ${Number(data.amount).toLocaleString('uz-UZ')} so'm qo'shildi`];
      if (plan) msgParts.push('obunangiz faollashtirildi');
      await tgSend(data.user_id, `To'lovingiz tasdiqlandi. ${msgParts.join(' va ')}.`);
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
      const plan = req.body?.plan || null;
      const mode = String(req.body?.mode || 'add_funds');
      let amount = Math.round(Number(req.body?.amount || 0));
      if (!userId) return res.status(400).json({ ok: false, error: 'userId kerak' });

      // "Balansni belgilash": joriy balans bilan farq hisoblanadi va shu farq yoziladi
      if (mode === 'set_balance') {
        if (amount < 0) return res.status(400).json({ ok: false, error: "Balans manfiy bo'lishi mumkin emas" });
        const { data: rows } = await db
          .from('users')
          .select('id, balance, wallet_balance')
          .or(`id.eq.${userId},id.eq.tg_${userId},telegram_id.eq.${userId}`)
          .order('created_at', { ascending: true })
          .limit(1);
        const row = Array.isArray(rows) ? rows[0] : null;
        if (!row) return res.status(404).json({ ok: false, error: 'Talaba topilmadi' });
        const cur = Number(row.balance ?? row.wallet_balance ?? 0);
        const delta = amount - cur;
        if (delta !== 0) {
          const { error: chErr } = await db.rpc('_wallet_change', {
            p_user: row.id,
            p_amount: delta,
            p_type: 'admin_set_balance',
            p_ref: actor,
            p_note: `Admin balansni ${amount} qilib belgiladi`,
          });
          if (chErr) throw chErr;
        }
        amount = 0;
        if (!plan) {
          await tgSend(userId, `Administrator hisobingiz balansini ${Number(req.body?.amount || 0).toLocaleString('uz-UZ')} so'm qilib belgiladi.`);
          return res.status(200).json({ ok: true, new_balance: Number(req.body?.amount || 0) });
        }
      }

      if (!amount && !plan) return res.status(400).json({ ok: false, error: 'Summa yoki tarif kerak' });

      // tg_ prefiksli ID bilan sinab ko'ramiz, keyin oddiy ID bilan
      let data: any = null;
      let error: any = null;

      const tryIds = [`tg_${userId}`, userId];
      for (const pid of tryIds) {
        const r = await db.rpc('admin_credit', {
          p_user: pid,
          p_amount: amount,
          p_actor: actor,
          p_plan: plan,
        });
        if (!r.error && r.data?.ok) {
          data = r.data;
          break;
        }
        error = r.error || r.data;
      }

      if (!data?.ok) {
        console.error('admin_credit error:', error);
        return res.status(500).json({ ok: false, error: "Bazaga yozib bo'lmadi. Migratsiyalar ishga tushirilganini tekshiring." });
      }

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

    // ---------------- OTM yo'nalishlari (fakultetlar) ----------------
    const normName = (x: string) => String(x || '').toLowerCase().replace(/[ʻʼ‘’`']/g, "'").replace(/\s+/g, ' ').trim();
    const loadSetting = async (key: string, fallback: any) => {
      const { data } = await db.from('app_settings').select('value').eq('key', key).maybeSingle();
      return data?.value ?? fallback;
    };
    const saveSetting = async (key: string, value: any) => {
      const { error } = await db
        .from('app_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
    };

    if (action === 'set_faculties') {
      const university = String(req.body?.university || '').replace(/\s+/g, ' ').trim().slice(0, 200);
      const raw: any[] = Array.isArray(req.body?.faculties) ? req.body.faculties : [];
      if (!university) return res.status(400).json({ ok: false, error: 'OTM nomi kerak' });
      const seen = new Set<string>();
      const faculties: string[] = [];
      for (const f of raw) {
        const name = String(f || '').replace(/\s+/g, ' ').trim().slice(0, 120);
        if (name.length < 2 || seen.has(normName(name))) continue;
        seen.add(normName(name));
        faculties.push(name);
      }
      if (faculties.length > 80) return res.status(400).json({ ok: false, error: "Yo'nalishlar juda ko'p (80 tadan oshmasin)" });

      const overrides: Record<string, string[]> = (await loadSetting('university_faculties', {})) || {};
      // Shu OTMning eski yozuvlarini (nomi biroz boshqacha bo'lsa ham) almashtiramiz
      for (const k of Object.keys(overrides)) {
        if (normName(k) === normName(university)) delete overrides[k];
      }
      overrides[university] = faculties;
      await saveSetting('university_faculties', overrides);

      // Ro'yxatga qo'shilgan yo'nalishlar bo'yicha so'rovlarni yopamiz
      const requests: any[] = (await loadSetting('faculty_requests', [])) || [];
      const remaining = requests.filter(
        (r: any) => !(normName(r.university) === normName(university) && seen.has(normName(r.faculty)))
      );
      if (remaining.length !== requests.length) await saveSetting('faculty_requests', remaining);

      return res.status(200).json({ ok: true, overrides, requests: remaining });
    }

    if (action === 'dismiss_faculty_request') {
      const id = String(req.body?.id || '');
      const requests: any[] = (await loadSetting('faculty_requests', [])) || [];
      const remaining = requests.filter((r: any) => r.id !== id);
      await saveSetting('faculty_requests', remaining);
      return res.status(200).json({ ok: true, requests: remaining });
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
    return res.status(500).json({ ok: false, error: 'Server xatosi' });
  }
}
