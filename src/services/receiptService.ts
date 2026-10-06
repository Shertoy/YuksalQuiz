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
  const r = await apiPost('/api/admin', { action: 'list_payments' });
  if (!r.ok) {
    console.warn('fetchAllPayments error:', apiErrorText(r));
    return [];
  }
  return (r.data?.payments || []) as PaymentRecord[];
}

/**
 * Admin to'lovni tasdiqlaydi. Pul serverda, bazadagi atomik funksiya orqali
 * bir marta qo'shiladi (ikki marta bosilsa ham ikkilanmaydi).
 */
export async function approveReceiptPayment(
  paymentId: string,
  _userId: string,
  _amount: number,
  plan?: '3_months' | '6_months' | '1_year' | null
): Promise<{ success: boolean; newBalance: number; message: string }> {
  const r = await apiPost('/api/admin', { action: 'approve', paymentId, plan: plan || null });
  const d: any = r.data || {};
  if (!r.ok || !d.ok) {
    const msg =
      d.reason === 'already_processed'
        ? `Bu to'lov allaqachon ko'rib chiqilgan (${d.status})`
        : apiErrorText(r, 'Tasdiqlashda xatolik');
    return { success: false, newBalance: 0, message: msg };
  }
  return {
    success: true,
    newBalance: Number(d.new_balance || 0),
    message: `To'lov tasdiqlandi! +${Number(d.amount).toLocaleString('uz-UZ')} so'm hisobga qo'shildi.`,
  };
}

/**
 * Admin to'lovni rad etadi.
 */
export async function rejectReceiptPayment(paymentId: string): Promise<boolean> {
  const r = await apiPost('/api/admin', { action: 'reject', paymentId });
  return r.ok && r.data?.ok === true;
}

/**
 * Admin talaba hisobiga qo'lda pul qo'shadi yoki obunani yoqadi (Telegram ID bo'yicha).
 */
export async function adminManualCredit(
  userId: string,
  amount: number,
  _fullName?: string,
  plan?: '3_months' | '6_months' | '1_year' | null
): Promise<{ success: boolean; newBalance: number; message: string }> {
  const r = await apiPost('/api/admin', { action: 'credit', userId, amount, plan: plan || null });
  const d: any = r.data || {};
  if (!r.ok || !d.ok) {
    return { success: false, newBalance: 0, message: apiErrorText(r, "Qo'shishda xatolik yuz berdi") };
  }
  return {
    success: true,
    newBalance: Number(d.new_balance || 0),
    message: `Muvaffaqiyatli! Talaba (ID: ${userId}) hisobiga ${Number(amount).toLocaleString('uz-UZ')} so'm qo'shildi.`,
  };
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
    const { data, error } = await supabase
      .from('users')
      .select('id, telegram_id, balance, wallet_balance, voucher_claimed')
      .or(`id.eq.${rawId},id.eq.${cleanId},id.eq.${tgId},telegram_id.eq.${cleanId},telegram_id.eq.${rawId}`)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const bal = Number(data.balance ?? data.wallet_balance ?? 0);
      const voucherClaimed = Boolean(data.voucher_claimed);
      try {
        const { useQuizStore } = await import('../store/useQuizStore');
        useQuizStore.setState((s) => ({
          profile: {
            ...s.profile,
            walletBalance: bal,
            balance: bal,
            telegram_id: data.telegram_id || cleanId,
            voucher_claimed: voucherClaimed || s.profile.voucher_claimed,
            voucherClaimed: voucherClaimed || s.profile.voucherClaimed,
          },
        }));
      } catch {}
      return bal;
    }
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
