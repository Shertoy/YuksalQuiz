import { getSupabase } from './supabase';

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
  status: 'pending' | 'approved' | 'rejected';
  verified_by: 'ai' | 'admin' | null;
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
 * Immediately record submitted receipt to 'payments' table in Supabase.
 * Guaranteed safe delivery even if AI verification endpoint is slow or offline.
 */
export async function recordReceiptPayment(data: {
  userId: string;
  fullName: string;
  username?: string;
  university?: string;
  amount: number;
  receiptImageUrl?: string | null;
  transactionId?: string | null;
  senderCard?: string | null;
}): Promise<PaymentRecord | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    // 1. Ensure foreign key constraint is satisfied
    await ensureUserInSupabase({
      id: data.userId,
      fullName: data.fullName,
      username: data.username,
      university: data.university,
    });

    const txId =
      data.transactionId ||
      `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // 2. Insert into payments table
    const { data: inserted, error } = await supabase
      .from('payments')
      .insert({
        user_id: data.userId,
        amount: Number(data.amount) || 0,
        receipt_image_url: data.receiptImageUrl || null,
        transaction_id: txId,
        sender_card: data.senderCard || null,
        status: 'pending',
        verified_by: null,
        created_at: new Date().toISOString(),
      })
      .select('*, users(full_name, username, balance, has_paid, paid_until, university)')
      .single();

    if (error) {
      console.warn('recordReceiptPayment error:', error.message);
      return null;
    }

    return inserted as PaymentRecord;
  } catch (err) {
    console.warn('recordReceiptPayment exception:', err);
    return null;
  }
}

/**
 * Fetch all payments with user details for Admin Panel.
 */
export async function fetchAllPayments(): Promise<PaymentRecord[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*, users(full_name, username, balance, has_paid, paid_until, university)')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('fetchAllPayments error:', error.message);
      return [];
    }

    return (data || []) as PaymentRecord[];
  } catch (err) {
    console.warn('fetchAllPayments exception:', err);
    return [];
  }
}

/**
 * Admin approves a receipt payment:
 * 1. Sets status to 'approved' and verified_by to 'admin'.
 * 2. Credits user's balance in 'users' table.
 * 3. Activates subscription if plan is specified.
 */
export async function approveReceiptPayment(
  paymentId: string,
  userId: string,
  amount: number,
  plan?: '3_months' | '6_months' | '1_year' | null
): Promise<{ success: boolean; newBalance: number; message: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, newBalance: 0, message: "Supabase bilan aloqa yo'q" };
  }

  try {
    // 1. Get current user balance & status
    const { data: userRow } = await supabase
      .from('users')
      .select('balance, has_paid, paid_until, full_name')
      .eq('id', userId)
      .maybeSingle();

    const currentBalance = Number(userRow?.balance || 0);
    const newBalance = currentBalance + Number(amount);

    const updateFields: Record<string, any> = {
      id: userId,
      full_name: userRow?.full_name || 'Talaba',
      balance: newBalance,
      updated_at: new Date().toISOString(),
    };

    if (plan) {
      const months = plan === '1_year' ? 12 : plan === '6_months' ? 6 : 3;
      let expiry = new Date();
      if (userRow?.paid_until && new Date(userRow.paid_until) > expiry) {
        expiry = new Date(userRow.paid_until);
      }
      expiry.setMonth(expiry.getMonth() + months);
      updateFields.has_paid = true;
      updateFields.paid_until = expiry.toISOString();
    }

    // 2. Update user profile
    await supabase.from('users').upsert(updateFields, { onConflict: 'id' });

    // 3. Update payment status to 'approved'
    const { error: payError } = await supabase
      .from('payments')
      .update({
        status: 'approved',
        verified_by: 'admin',
      })
      .eq('id', paymentId);

    if (payError) {
      console.warn('Error updating payment status:', payError.message);
    }

    return {
      success: true,
      newBalance,
      message: `To'lov tasdiqlandi! +${amount.toLocaleString('uz-UZ')} so'm hisobga qo'shildi.`,
    };
  } catch (err: any) {
    console.error('approveReceiptPayment exception:', err);
    return {
      success: false,
      newBalance: 0,
      message: err?.message || 'Xatolik yuz berdi',
    };
  }
}

/**
 * Admin rejects a receipt payment.
 */
export async function rejectReceiptPayment(paymentId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('payments')
      .update({
        status: 'rejected',
        verified_by: 'admin',
      })
      .eq('id', paymentId);

    return !error;
  } catch (err) {
    console.error('rejectReceiptPayment exception:', err);
    return false;
  }
}

/**
 * Admin manually credits any student's balance or activates subscription by User / Telegram ID.
 */
export async function adminManualCredit(
  userId: string,
  amount: number,
  fullName?: string,
  plan?: '3_months' | '6_months' | '1_year' | null
): Promise<{ success: boolean; newBalance: number; message: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, newBalance: 0, message: "Supabase bilan aloqa yo'q" };
  }

  try {
    await ensureUserInSupabase({
      id: userId,
      fullName: fullName || 'Talaba',
    });

    const { data: userRow } = await supabase
      .from('users')
      .select('balance, has_paid, paid_until, full_name')
      .eq('id', userId)
      .maybeSingle();

    const currentBalance = Number(userRow?.balance || 0);
    const newBalance = currentBalance + Number(amount);

    const updateFields: Record<string, any> = {
      id: userId,
      full_name: userRow?.full_name || fullName || 'Talaba',
      balance: newBalance,
      updated_at: new Date().toISOString(),
    };

    if (plan) {
      const months = plan === '1_year' ? 12 : plan === '6_months' ? 6 : 3;
      let expiry = new Date();
      if (userRow?.paid_until && new Date(userRow.paid_until) > expiry) {
        expiry = new Date(userRow.paid_until);
      }
      expiry.setMonth(expiry.getMonth() + months);
      updateFields.has_paid = true;
      updateFields.paid_until = expiry.toISOString();
    }

    await supabase.from('users').upsert(updateFields, { onConflict: 'id' });

    // Also record this as an approved payment in payments history
    const txId = `MANUAL_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    await supabase.from('payments').insert({
      user_id: userId,
      amount: Number(amount),
      receipt_image_url: null,
      transaction_id: txId,
      sender_card: 'Admin Manual',
      status: 'approved',
      verified_by: 'admin',
      created_at: new Date().toISOString(),
    });

    return {
      success: true,
      newBalance,
      message: `Muvaffaqiyatli! Talaba (ID: ${userId}) hisobiga ${amount.toLocaleString('uz-UZ')} so'm qo'shildi.`,
    };
  } catch (err: any) {
    console.error('adminManualCredit exception:', err);
    return {
      success: false,
      newBalance: 0,
      message: err?.message || 'Qo\'shishda xatolik yuz berdi',
    };
  }
}

/**
 * Trigger receipts cleanup API manually (e.g. from Admin panel or maintenance action)
 */
export async function triggerReceiptsCleanup(): Promise<any> {
  try {
    const response = await fetch('/api/cleanup-receipts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return await response.json();
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
