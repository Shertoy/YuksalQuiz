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
        upsert: false,
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
 * Admin to'lovni tasdiqlaydi. Pul faqat serverda, bazadagi atomar funksiya orqali
 * bir marta qo'shiladi. Brauzerdan to'g'ridan-to'g'ri yozish yo'q: baza uni rad etadi
 * va avval "muvaffaqiyatli" deb yolg'on xabar chiqarardi.
 */
export async function approveReceiptPayment(
  paymentId: string,
  _userId: string,
  amount: number,
  plan?: '3_months' | '6_months' | '1_year' | null
): Promise<{ success: boolean; newBalance: number; message: string }> {
  const r = await apiPost('/api/admin', {
    action: 'approve',
    paymentId,
    amount: Number(amount) > 0 ? Math.round(Number(amount)) : null,
    plan: plan || null,
  });
  const d: any = r.data || {};
  if (r.ok && d.ok) {
    return {
      success: true,
      newBalance: Number(d.new_balance || 0),
      message: `To'lov tasdiqlandi! +${Number(d.amount).toLocaleString('uz-UZ')} so'm hisobga qo'shildi.`,
    };
  }
  return { success: false, newBalance: 0, message: adminReasonText(d) || apiErrorText(r, 'Tasdiqlab bo\'lmadi') };
}

/**
 * Admin to'lovni rad etadi (faqat server orqali).
 */
export async function rejectReceiptPayment(paymentId: string): Promise<boolean> {
  const r = await apiPost('/api/admin', { action: 'reject', paymentId });
  return Boolean(r.ok && r.data?.ok === true);
}

export type ManualCreditMode = 'subscription_only' | 'add_funds' | 'set_balance' | 'both';

function adminReasonText(d: any): string {
  const reason = String(d?.reason || '');
  if (reason === 'already_processed') return `Bu to'lov allaqachon ko'rib chiqilgan (${d?.status || '-'})`;
  if (reason === 'bad_amount') return "Summa ko'rsatilmagan. Avval to'g'ri summani kiriting.";
  if (reason === 'payment_not_found') return "To'lov topilmadi";
  if (reason === 'unauthorized' || reason === 'forbidden') return "Admin huquqi tasdiqlanmadi. Qayta kiring.";
  return '';
}

/**
 * Admin talaba hisobiga qo'lda pul qo'shadi, balansni belgilaydi yoki obunani yoqadi.
 * Hammasi server (/api/admin credit) orqali; natija bazada haqiqatan yozilgandagina "muvaffaqiyatli".
 */
export async function adminManualCredit(
  userId: string,
  amount: number,
  _fullName?: string,
  plan?: '3_months' | '6_months' | '1_year' | null,
  mode: ManualCreditMode = 'add_funds'
): Promise<{ success: boolean; newBalance: number; message: string }> {
  const usePlan = mode === 'subscription_only' || mode === 'both' ? plan || null : null;
  const useAmount = mode === 'subscription_only' ? 0 : Math.round(Number(amount) || 0);
  const r = await apiPost('/api/admin', {
    action: 'credit',
    userId,
    amount: useAmount,
    plan: usePlan,
    mode,
  });
  const d: any = r.data || {};
  if (!r.ok || !d.ok) {
    return { success: false, newBalance: 0, message: adminReasonText(d) || apiErrorText(r, "Qo'shishda xatolik yuz berdi") };
  }
  const newBalance = Number(d.new_balance || 0);
  const planLabel = usePlan === '1_year' ? '1 yillik' : usePlan === '6_months' ? '6 oylik' : '3 oylik';
  let msg = '';
  if (mode === 'subscription_only') {
    msg = `Muvaffaqiyatli! Talaba (ID: ${userId}) uchun ${planLabel} obuna faollashtirildi (balans: ${newBalance.toLocaleString('uz-UZ')} so'm).`;
  } else if (mode === 'set_balance') {
    msg = `Muvaffaqiyatli! Talaba (ID: ${userId}) balansi ${newBalance.toLocaleString('uz-UZ')} so'm qilib belgilandi.`;
  } else if (mode === 'both') {
    msg = `Muvaffaqiyatli! Talaba (ID: ${userId}) hisobiga +${useAmount.toLocaleString('uz-UZ')} so'm qo'shildi va ${planLabel} obuna faollashtirildi.`;
  } else {
    msg = `Muvaffaqiyatli! Talaba (ID: ${userId}) hisobiga +${useAmount.toLocaleString('uz-UZ')} so'm qo'shildi. Yangi balans: ${newBalance.toLocaleString('uz-UZ')} so'm.`;
  }
  return { success: true, newBalance, message: msg };
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
 * Talabaning hamyon ma'lumoti faqat serverdan (/api/wallet me).
 * Bir necha chaqiriq bir vaqtda kelsa, bitta so'rov ishlatiladi.
 */
let walletMeInflight: Promise<any | null> | null = null;
let walletMeCache: { at: number; data: any } | null = null;

async function fetchWalletMe(): Promise<any | null> {
  if (walletMeCache && Date.now() - walletMeCache.at < 1500) return walletMeCache.data;
  if (walletMeInflight) return walletMeInflight;
  walletMeInflight = (async () => {
    try {
      const r = await apiPost('/api/wallet', { action: 'me' });
      if (r.ok && r.data?.ok) {
        walletMeCache = { at: Date.now(), data: r.data };
        return r.data;
      }
      return null;
    } finally {
      walletMeInflight = null;
    }
  })();
  return walletMeInflight;
}

/**
 * Serverdagi balansni qaytaradi va store'ni yangilaydi (max() emas, aynan server qiymati).
 */
export async function fetchLatestUserBalance(userId: string): Promise<number | null> {
  if (!userId) return null;
  try {
    const { useQuizStore } = await import('../store/useQuizStore');
    const bal = await useQuizStore.getState().syncUser();
    return typeof bal === 'number' ? bal : null;
  } catch (err) {
    console.warn('fetchLatestUserBalance error:', err);
  }
  return null;
}

/**
 * Talabaning admin tekshiruvini kutayotgan oxirgi to'lovi.
 */
export async function fetchUserLatestPendingPayment(userId: string): Promise<PaymentRecord | null> {
  if (!userId) return null;
  const me = await fetchWalletMe();
  const pending = (me?.payments || []).find((p: any) => p.status === 'pending' || p.status === 'pending_manual');
  return pending ? (pending as PaymentRecord) : null;
}

/**
 * To'lov holatini tekshirish (faqat talabaning o'z to'lovlari ichidan).
 */
export async function checkPaymentStatus(paymentId: string): Promise<{ status: string; amount?: number } | null> {
  if (!paymentId) return null;
  walletMeCache = null;
  const me = await fetchWalletMe();
  const pay = (me?.payments || []).find((p: any) => p.id === paymentId);
  return pay ? { status: pay.status, amount: Number(pay.amount) || 0 } : null;
}
