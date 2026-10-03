import { getSupabase } from './supabase';

export interface ReceiptUploadResult {
  path: string;
  publicUrl: string;
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

    const { data, error } = await supabase.storage
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
