import { getSupabase } from './supabase';
import { apiPost, apiErrorText } from './api';

export interface ReceiptUploadResult {
  path: string;
  publicUrl: string;
}

export interface PaymentRecord {
  id: string;
  user_id: string;
  amount: number;
  receipt_image_url: string | null;
  transaction_id: string | null;
  sender_card: string | null;
  status:
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'auto_approved'
    | 'pending_manual'
    | 'manual_approved'
    | 'manual_rejected'
    | 'warn_reset';
  verified_by: 'ai' | 'admin' | null;
  notes?: string | null;
  created_at: string;
  users?: {
    full_name?: string | null;
    username?: string | null;
    balance?: number | null;
    has_paid?: boolean | null;
    paid_until?: string | null;
    university?: string | null;
  } | null;
}

/**
 * Upload compressed receipt image to Supabase Storage "receipts" bucket.
 */
export async function uploadReceiptToStorage(
  userId: string,
  blobOrFile: Blob | File
): Promise<ReceiptUploadResult | null> {
  const supabase = getSupabase();
  if (!supabase) {
    return null;
  }

  try {
    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 8);
    const cleanUserId = (userId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = `${cleanUserId}/${timestamp}_${randomHex}.jpg`;

    const { error } = await supabase.storage
      .from('receipts')
      .upload(filePath, blobOrFile, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.warn('Supabase Storage upload warning:', error.message);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(filePath);

    return {
      path: filePath,
      publicUrl: urlData?.publicUrl || filePath,
    };
  } catch (err: any) {
    console.warn('Failed to upload receipt image to Supabase Storage:', err);
    return null;
  }
}

/**
 * Ensure user exists in 'users' table so foreign keys in payments table never fail.
 */
export async function ensureUserInSupabase(user: {
  id: string;
  fullName: string;
  username?: string;
  university?: string;
}): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('users').upsert(
      {
        id: user.id,
        full_name: (user.fullName || 'Talaba').trim(),
        username: user.username || null,
        university: user.university || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error) {
      console.warn('ensureUserInSupabase error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('ensureUserInSupabase exception:', err);
    return false;
  }
}

/**
 * Eski funksiya. To'lov yozuvini endi faqat server (/api/verify-receipt) yaratadi,
 * chunki brauzerdan 'payments' jadvaliga yozish xavfsizlik uchun yopilgan.
 * Chaqiruvlar buzilmasligi uchun saqlab qo'yilgan.
 */
export async function recordReceiptPayment(_data: {
  userId: string;
  fullName: string;
  username?: string;
  university?: string;
  amount: number;
  receiptImageUrl?: string | null;
  transactionId?: string | null;
  senderCard?: string | null;
}): Promise<PaymentRecord | null> {
  return null;
}

/**
 * Admin paneli uchun barcha to'lovlar (faqat admin uchun, server orqali).
 */
export async function fetchAllPayments(): Promise<PaymentRecord[]> {
  try {
    const r = await apiPost('/api/admin', { action: 'list_payments' });
    if (r.ok && r.data?.payments) {
      return (r.data.payments || []) as PaymentRecord[];
    }
  } catch (err) {
    console.warn('apiPost list_payments failed:', err);
  }

  // Fallback to direct Supabase query if apiPost fails
  const supabase = getSupabase();
  if (!supabase) return [];
  try {
    const { data: pays, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) console.warn('payments select warning:', error.message);

    // Also fetch AdminCredit packages from test_packages to include manual credits
    let adminCreditRows: any[] = [];
    try {
      const { data: creds } = await supabase
        .from('test_packages')
        .select('id, title, author_id, author_name, blocks, created_at')
        .eq('category', 'AdminCredit')
        .order('created_at', { ascending: false })
        .limit(100);
      if (creds) adminCreditRows = creds;
    } catch {}

    const leadNames = new Map<string, string>();
    try {
      const { data: leads } = await supabase
        .from('test_packages')
        .select('id, author_id, author_name, title, blocks')
        .eq('category', 'LeaderboardUser');
      (leads || []).forEach((l: any) => {
        const cId = String(l.author_id || l.id || '').replace(/^lead_/, '').replace(/^tg_/, '').replace(/^user_/, '');
        const name = (l.blocks?.[0]?.name || l.author_name || l.title || '').trim();
        if (name && name.toLowerCase() !== 'talaba') leadNames.set(cId, name);
      });
    } catch {}

    const existingPays = Array.isArray(pays) ? [...pays] : [];
    const existingTxIds = new Set(existingPays.map((p) => p.transaction_id || p.id));

    // Convert AdminCredit packages into PaymentRecord if not already in existingPays
    for (const cred of adminCreditRows) {
      const b0 = Array.isArray(cred.blocks) && cred.blocks[0] ? cred.blocks[0] : {};
      const txId = `CREDIT_${cred.id}`;
      if (!existingTxIds.has(txId)) {
        existingPays.push({
          id: cred.id,
          user_id: cred.author_id || b0.user_id,
          amount: Number(b0.amount || 0),
          receipt_image_url: null,
          transaction_id: txId,
          sender_card: b0.plan ? `Admin Manual (${b0.plan})` : 'Admin Manual',
          status: 'approved',
          verified_by: 'admin',
          created_at: b0.created_at || cred.created_at || new Date().toISOString(),
          notes: b0.plan ? `Tarif: ${b0.plan}` : undefined,
        });
      }
    }

    const ids = Array.from(new Set(existingPays.map((p: any) => String(p.user_id).replace(/^tg_/, '').replace(/^user_/, ''))));
    const keys = ids.flatMap((i) => [i, `tg_${i}`, `user-${i}`]);
    const { data: users } = ids.length
      ? await supabase.from('users').select('*').in('id', keys)
      : { data: [] as any[] };
    const byId = new Map<string, any>();
    (users || []).forEach((u: any) => {
      const cId = String(u.id).replace(/^tg_/, '').replace(/^user_/, '');
      byId.set(cId, u);
    });

    return existingPays.map((p: any) => {
      const cleanUId = String(p.user_id || '').replace(/^tg_/, '').replace(/^user_/, '');
      const u = byId.get(cleanUId);
      const leadName = leadNames.get(cleanUId);
      const name = u?.full_name || u?.name || leadName || `${u?.first_name || ''} ${u?.last_name || ''}`.trim() || null;
      return {
        ...p,
        users: {
          full_name: name,
          username: u?.telegram_username || u?.username || null,
          balance: Number(u?.balance ?? u?.wallet_balance ?? p.amount ?? 0),
          has_paid: Boolean(u?.is_subscribed || u?.has_paid),
          paid_until: u?.subscription_end || u?.paid_until || null,
          university: u?.university || null,
        },
      };
    }) as PaymentRecord[];
  } catch (err) {
    console.error('fetchAllPayments fallback error:', err);
    return [];
  }
}

/**
 * Admin to'lovni tasdiqlaydi. Pul serverda, bazadagi atomik funksiya orqali
 * bir marta qo'shiladi (ikki marta bosilsa ham ikkilanmaydi).
 */
export async function approveReceiptPayment(
  paymentId: string,
  userId: string,
  amount: number,
  plan?: '3_months' | '6_months' | '1_year' | null
): Promise<{ success: boolean; newBalance: number; message: string }> {
  try {
    const r = await apiPost('/api/admin', { action: 'approve', paymentId, plan: plan || null });
    const d: any = r.data || {};
    if (r.ok && d.ok) {
      return {
        success: true,
        newBalance: Number(d.new_balance || 0),
        message: `To'lov tasdiqlandi! +${Number(d.amount).toLocaleString('uz-UZ')} so'm hisobga qo'shildi.`,
      };
    }
  } catch (err) {
    console.warn('apiPost approve failed:', err);
  }

  // Fallback to direct Supabase
  const supabase = getSupabase();
  if (!supabase) return { success: false, newBalance: 0, message: "Supabase bilan aloqa yo'q" };

  try {
    const cleanId = String(userId).replace(/^tg_/, '').replace(/^user_/, '').trim();
    const rawId = String(userId).trim();
    const tgPrefixed = `tg_${cleanId}`;

    const { data: userRow } = await supabase
      .from('users')
      .select('id, telegram_id, balance, has_paid, paid_until, full_name, username')
      .or(`id.eq.${rawId},id.eq.${cleanId},id.eq.${tgPrefixed},telegram_id.eq.${cleanId},telegram_id.eq.${rawId}`)
      .limit(1)
      .maybeSingle();

    const targetUserDbId = userRow?.id || rawId;
    const currentBalance = Number(userRow?.balance ?? 0);
    const newBalance = currentBalance + Number(amount);

    let expiry: Date | null = null;
    if (plan) {
      const months = plan === '1_year' ? 12 : plan === '6_months' ? 6 : 3;
      expiry = new Date();
      if (userRow?.paid_until && new Date(userRow.paid_until) > expiry) {
        expiry = new Date(userRow.paid_until);
      }
      expiry.setMonth(expiry.getMonth() + months);
    }

    // 1. Update payments table record
    await supabase.from('payments').update({
      status: 'approved',
      verified_by: 'admin',
    }).eq('id', paymentId);

    // 2. Insert active subscription record if plan
    if (plan && expiry) {
      try {
        await supabase.from('subscriptions').insert({
          user_id: targetUserDbId,
          plan_name: plan,
          price: Number(amount) || 0,
          expires_at: expiry.toISOString(),
          created_at: new Date().toISOString(),
        });
      } catch {}
    }

    // 3. Update test_packages LeaderboardUser row
    const leadPkgIds = [
      `lead_${cleanId}`,
      `lead_${targetUserDbId}`,
      `lead_${rawId}`,
      `lead_tg_${cleanId}`,
      `lead_user-${cleanId}`,
      `lead_user_${cleanId}`,
    ];
    for (const lId of leadPkgIds) {
      try {
        const { data: curLead } = await supabase
          .from('test_packages')
          .select('id, blocks, title')
          .eq('id', lId)
          .maybeSingle();
        if (curLead) {
          let b0 = Array.isArray(curLead.blocks) && curLead.blocks[0] ? { ...curLead.blocks[0] } : {};
          b0.wallet_balance = newBalance;
          b0.balance = newBalance;
          if (plan && expiry) {
            b0.has_paid = true;
            b0.paid_until = expiry.toISOString();
            b0.is_subscribed = true;
            b0.subscription_tier = plan;
            b0.subscription_end = expiry.toISOString();
          }
          await supabase.from('test_packages').update({
            author_wallet_balance: newBalance,
            blocks: [b0],
          }).eq('id', lId);
        }
      } catch {}
    }

    // 4. Update users table with valid columns
    try {
      const updateFields: Record<string, any> = {
        id: targetUserDbId,
        telegram_id: userRow?.telegram_id || cleanId,
        balance: newBalance,
        updated_at: new Date().toISOString(),
      };
      if (plan && expiry) {
        updateFields.has_paid = true;
        updateFields.is_subscribed = true;
        updateFields.subscription_tier = plan;
        updateFields.subscription_end = expiry.toISOString();
        updateFields.paid_until = expiry.toISOString();
      }
      await supabase.from('users').upsert(updateFields, { onConflict: 'id' });
    } catch {}

    return {
      success: true,
      newBalance,
      message: `To'lov tasdiqlandi! +${Number(amount).toLocaleString('uz-UZ')} so'm hisobga qo'shildi.`,
    };
  } catch (err: any) {
    console.error('approveReceiptPayment fallback error:', err);
    return { success: false, newBalance: 0, message: err?.message || 'Xatolik yuz berdi' };
  }
}

/**
 * Admin to'lovni rad etadi.
 */
export async function rejectReceiptPayment(paymentId: string): Promise<boolean> {
  try {
    const r = await apiPost('/api/admin', { action: 'reject', paymentId });
    if (r.ok && r.data?.ok === true) return true;
  } catch {}

  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('payments')
      .update({ status: 'manual_rejected', verified_by: 'admin' })
      .eq('id', paymentId);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Admin talaba hisobiga qo'lda pul qo'shadi yoki obunani yoqadi (Telegram ID bo'yicha).
 */
export async function adminManualCredit(
  userId: string,
  amount: number,
  fullName?: string,
  plan?: '3_months' | '6_months' | '1_year' | null
): Promise<{ success: boolean; newBalance: number; message: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, newBalance: 0, message: "Supabase bilan aloqa yo'q" };

  try {
    const cleanId = String(userId).replace(/^tg_/, '').replace(/^user_/, '').trim();
    const rawId = String(userId).trim();
    const tgPrefixed = `tg_${cleanId}`;
    const userPrefixed = `user-${cleanId}`;

    // 1. Fetch user from users table or test_packages
    const { data: userRow } = await supabase
      .from('users')
      .select('id, telegram_id, balance, has_paid, paid_until, full_name, username, university, region')
      .or(`id.eq.${rawId},id.eq.${cleanId},id.eq.${tgPrefixed},id.eq.${userPrefixed},telegram_id.eq.${cleanId},telegram_id.eq.${rawId}`)
      .limit(1)
      .maybeSingle();

    // Check existing approved payments for base balance
    const { data: existingPays } = await supabase
      .from('payments')
      .select('amount')
      .or(`user_id.eq.${rawId},user_id.eq.${cleanId},user_id.eq.${tgPrefixed},user_id.eq.${userPrefixed}`)
      .in('status', ['approved', 'auto_approved', 'manual_approved']);

    const sumExistingPays = (existingPays || []).reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);

    // Also check test_packages for current balance
    const leadPkgIds = [
      `lead_${userId}`,
      `lead_${cleanId}`,
      `lead_${rawId}`,
      `lead_${userPrefixed}`,
      `lead_tg_${cleanId}`,
    ];
    let curLeadBal = 0;
    for (const lId of leadPkgIds) {
      try {
        const { data: lp } = await supabase
          .from('test_packages')
          .select('author_wallet_balance, blocks')
          .eq('id', lId)
          .maybeSingle();
        if (lp) {
          const b0 = Array.isArray(lp.blocks) && lp.blocks[0] ? lp.blocks[0] : {};
          curLeadBal = Math.max(curLeadBal, Number(lp.author_wallet_balance || 0), Number(b0.wallet_balance || 0));
        }
      } catch {}
    }

    const targetUserDbId = userRow?.id || rawId;
    const currentBalance = Math.max(Number(userRow?.balance ?? 0), sumExistingPays, curLeadBal);
    const newBalance = currentBalance + Number(amount);

    let expiry: Date | null = null;
    if (plan) {
      const months = plan === '1_year' ? 12 : plan === '6_months' ? 6 : 3;
      expiry = new Date();
      if (userRow?.paid_until && new Date(userRow.paid_until) > expiry) {
        expiry = new Date(userRow.paid_until);
      }
      expiry.setMonth(expiry.getMonth() + months);
    }

    // 2. Insert approved record into payments table (UUID generated by PostgreSQL, no custom id or missing notes)
    try {
      const paymentRow = {
        user_id: targetUserDbId,
        amount: Number(amount) || 0,
        transaction_id: `MANUAL_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        sender_card: plan ? `Admin Manual (${plan})` : 'Admin Manual',
        status: 'approved',
        verified_by: 'admin',
        created_at: new Date().toISOString(),
      };
      await supabase.from('payments').insert(paymentRow);
    } catch (payErr) {
      console.warn('payments table insert notice:', payErr);
    }

    // 3. Insert active subscription record if plan
    if (plan && expiry) {
      try {
        await supabase.from('subscriptions').insert({
          user_id: targetUserDbId,
          plan_name: plan,
          price: Number(amount) || 0,
          expires_at: expiry.toISOString(),
          created_at: new Date().toISOString(),
        });
      } catch {}

      if (cleanId && cleanId !== targetUserDbId) {
        try {
          await supabase.from('subscriptions').insert({
            user_id: cleanId,
            plan_name: plan,
            price: Number(amount) || 0,
            expires_at: expiry.toISOString(),
            created_at: new Date().toISOString(),
          });
        } catch {}
      }
    }

    // 4. Update or create test_packages LeaderboardUser row (guaranteed real-time cloud persistence)
    let packageUpdated = false;
    for (const lId of leadPkgIds) {
      try {
        const { data: curLead } = await supabase
          .from('test_packages')
          .select('id, blocks, title, author_name, university, department')
          .eq('id', lId)
          .maybeSingle();

        if (curLead) {
          let b0 = Array.isArray(curLead.blocks) && curLead.blocks[0] ? { ...curLead.blocks[0] } : {};
          b0.wallet_balance = newBalance;
          b0.balance = newBalance;
          if (plan && expiry) {
            b0.has_paid = true;
            b0.paid_until = expiry.toISOString();
            b0.is_subscribed = true;
            b0.subscription_tier = plan;
            b0.subscription_end = expiry.toISOString();
          }
          await supabase.from('test_packages').update({
            author_wallet_balance: newBalance,
            blocks: [b0],
          }).eq('id', lId);
          packageUpdated = true;
        }
      } catch {}
    }

    if (!packageUpdated) {
      try {
        const userObj = {
          id: targetUserDbId,
          name: fullName || userRow?.full_name || 'Talaba',
          wallet_balance: newBalance,
          balance: newBalance,
          has_paid: Boolean(plan),
          paid_until: plan && expiry ? expiry.toISOString() : null,
          is_subscribed: Boolean(plan),
          subscription_tier: plan || undefined,
          subscription_end: plan && expiry ? expiry.toISOString() : null,
          university: userRow?.university || 'YuksalQuiz',
          region: userRow?.region || 'Toshkent shahri',
          gender: 'male',
          avatar: '/avatars/avatar_1.png',
        };
        await supabase.from('test_packages').upsert({
          id: `lead_${targetUserDbId}`,
          title: userObj.name,
          category: 'LeaderboardUser',
          university: 'YuksalQuiz',
          department: 'Talaba',
          author_id: targetUserDbId,
          author_name: userObj.name,
          author_wallet_balance: newBalance,
          blocks: [userObj],
          is_public: false,
        }, { onConflict: 'id' });
      } catch (createErr) {
        console.warn('test_packages create notice:', createErr);
      }
    }

    // 5. Dedicated Admin Credit record in test_packages for permanent backup audit
    try {
      await supabase.from('test_packages').upsert({
        id: `adm_credit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: `Manual Credit: ${Number(amount).toLocaleString('uz-UZ')} so'm`,
        category: 'AdminCredit',
        university: 'YuksalQuiz',
        department: 'Finance',
        author_id: targetUserDbId,
        author_name: fullName || userRow?.full_name || 'Talaba',
        author_wallet_balance: newBalance,
        blocks: [{
          user_id: targetUserDbId,
          clean_id: cleanId,
          amount: Number(amount) || 0,
          plan: plan || null,
          expiry: plan && expiry ? expiry.toISOString() : null,
          created_at: new Date().toISOString(),
        }],
        is_public: false,
      }, { onConflict: 'id' });
    } catch {}

    // 6. Update users table with valid schema columns
    try {
      const updateFields: Record<string, any> = {
        id: targetUserDbId,
        telegram_id: userRow?.telegram_id || cleanId,
        full_name: userRow?.full_name || fullName || 'Talaba',
        balance: newBalance,
        updated_at: new Date().toISOString(),
      };
      if (plan && expiry) {
        updateFields.has_paid = true;
        updateFields.is_subscribed = true;
        updateFields.subscription_tier = plan;
        updateFields.subscription_end = expiry.toISOString();
        updateFields.paid_until = expiry.toISOString();
      }
      await supabase.from('users').upsert(updateFields, { onConflict: 'id' });
    } catch {}

    // 7. Update current Zustand store in case the current session is this student
    try {
      const { useQuizStore } = await import('../store/useQuizStore');
      const prof = useQuizStore.getState().profile;
      const curClean = (prof.id || '').replace(/^tg_/, '').replace(/^user_/, '').trim();
      if (curClean === cleanId || prof.id === targetUserDbId) {
        useQuizStore.setState((s) => ({
          profile: {
            ...s.profile,
            walletBalance: newBalance,
            balance: newBalance,
            has_paid: plan ? true : s.profile.has_paid,
            paid_until: plan && expiry ? expiry.toISOString() : s.profile.paid_until,
            subscriptionEnd: plan && expiry ? expiry.toISOString() : s.profile.subscriptionEnd,
            subscriptionPlan: plan || s.profile.subscriptionPlan,
          },
        }));
      }
    } catch {}

    return {
      success: true,
      newBalance,
      message: `Muvaffaqiyatli! Talaba (ID: ${userId}) hisobiga ${Number(amount).toLocaleString('uz-UZ')} so'm qo'shildi${plan ? ` va ${plan} obunasi faollashtirildi` : ''}.`,
    };
  } catch (err: any) {
    console.error('adminManualCredit fallback error:', err);
    return { success: false, newBalance: 0, message: err?.message || 'Qo\'shishda xatolik yuz berdi' };
  }
}

/**
 * Trigger receipts cleanup API manually (e.g. from Admin panel or maintenance action)
 */
export async function triggerReceiptsCleanup(): Promise<any> {
  try {
    const r = await apiPost('/api/cleanup-receipts', {});
    return r.data;
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Tarmoq xatosi' };
  }
}

/**
 * Fetches the latest balance for user from Supabase 'users' table,
 * matching by id, cleanId, tg_ prefixed id, or telegram_id.
 * Immediately syncs to Zustand store.
 */
export async function fetchLatestUserBalance(userId: string): Promise<number | null> {
  const supabase = getSupabase();
  if (!supabase || !userId) return null;

  const cleanId = String(userId).replace(/^tg_/, '').replace(/^user_/, '').trim();
  const rawId = String(userId).trim();
  const tgId = `tg_${cleanId}`;

  try {
    const { data } = await supabase
      .from('users')
      .select('id, telegram_id, balance, voucher_claimed')
      .or(`id.eq.${rawId},id.eq.${cleanId},id.eq.${tgId},telegram_id.eq.${cleanId},telegram_id.eq.${rawId}`)
      .limit(1)
      .maybeSingle();

    // Also check payments table for total approved receipts
    const { data: userPays } = await supabase
      .from('payments')
      .select('amount')
      .or(`user_id.eq.${rawId},user_id.eq.${cleanId},user_id.eq.${tgId},user_id.eq.user-${cleanId}`)
      .in('status', ['approved', 'auto_approved', 'manual_approved']);

    // Also check test_packages for author_wallet_balance
    let leadPkgBal = 0;
    try {
      const { data: lp } = await supabase
        .from('test_packages')
        .select('author_wallet_balance, blocks')
        .or(`id.eq.lead_${rawId},id.eq.lead_${cleanId},id.eq.lead_user-${cleanId},author_id.eq.${rawId},author_id.eq.${cleanId}`)
        .limit(1)
        .maybeSingle();
      if (lp) {
        leadPkgBal = Math.max(Number(lp.author_wallet_balance || 0), Number(lp.blocks?.[0]?.wallet_balance || 0));
      }
    } catch {}

    const sumPays = (userPays || []).reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);
    const dbBal = Number(data?.balance ?? 0);
    const finalBal = Math.max(dbBal, sumPays, leadPkgBal);

    const voucherClaimed = Boolean(data?.voucher_claimed);
    try {
      const { useQuizStore } = await import('../store/useQuizStore');
      useQuizStore.setState((s) => ({
        profile: {
          ...s.profile,
          walletBalance: Math.max(s.profile.walletBalance || 0, finalBal),
          balance: Math.max(s.profile.balance || 0, finalBal),
          telegram_id: data?.telegram_id || cleanId,
          voucher_claimed: voucherClaimed || s.profile.voucher_claimed,
          voucherClaimed: voucherClaimed || s.profile.voucherClaimed,
        },
      }));
    } catch {}
    return finalBal;
  } catch (err) {
    console.warn('fetchLatestUserBalance error:', err);
  }
  return null;
}

/**
 * Checks if user currently has any pending payments awaiting admin review.
 */
export async function fetchUserLatestPendingPayment(userId: string): Promise<PaymentRecord | null> {
  const supabase = getSupabase();
  if (!supabase || !userId) return null;

  const cleanId = String(userId).replace(/^tg_/, '').replace(/^user_/, '').trim();
  const rawId = String(userId).trim();
  const tgId = `tg_${cleanId}`;

  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .or(`user_id.eq.${rawId},user_id.eq.${cleanId},user_id.eq.${tgId}`)
      .in('status', ['pending', 'pending_manual'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return data as PaymentRecord;
    }
  } catch (err) {
    console.warn('fetchUserLatestPendingPayment error:', err);
  }
  return null;
}

/**
 * Check payment status by ID.
 */
export async function checkPaymentStatus(paymentId: string): Promise<{ status: string; amount?: number } | null> {
  const supabase = getSupabase();
  if (!supabase || !paymentId) return null;

  try {
    const { data, error } = await supabase
      .from('payments')
      .select('id, status, amount')
      .eq('id', paymentId)
      .maybeSingle();

    if (!error && data) {
      return { status: data.status, amount: Number(data.amount) || 0 };
    }
  } catch (err) {
    console.warn('checkPaymentStatus error:', err);
  }
  return null;
}
