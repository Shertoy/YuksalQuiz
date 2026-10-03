import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://kupbaphqyyvmpqxmrtrn.supabase.co';

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1cGJhcGhxeXl2bXBxeG1ydHJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5MDgwMDYsImV4cCI6MjEwNjQ4NDAwNn0.ieqSwohIUgfAwQ2EUF1CWSr-TT46SiLOSGDxYoFY2OE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Extracts the storage relative path (e.g. "userId/123456_receipt.jpg")
 * from a full Supabase storage URL or stored path inside the "receipts" bucket.
 */
function extractReceiptStoragePath(urlOrPath: string | null): string | null {
  if (!urlOrPath || typeof urlOrPath !== 'string') return null;
  const trimmed = urlOrPath.trim();
  if (!trimmed) return null;

  // Case 1: Full Supabase Storage URL containing "/receipts/"
  // e.g. https://.../storage/v1/object/public/receipts/user1/test.jpg?t=...
  const match = trimmed.match(/\/receipts\/(.+?)(\?.*)?$/);
  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }

  // Case 2: Prefixed with "receipts/"
  if (trimmed.startsWith('receipts/')) {
    return trimmed.replace(/^receipts\//, '');
  }

  // Case 3: Already relative path (e.g. "user123/12345_receipt.jpg")
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return trimmed;
  }

  return null;
}

export default async function handler(req: any, res: any) {
  // CORS Configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed. Use GET or POST.',
    });
  }

  // Optional Vercel Cron Secret validation if configured
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers?.authorization;
  if (cronSecret && authHeader && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({
      ok: false,
      error: 'Unauthorized CRON request',
    });
  }

  try {
    // 7 days ago timestamp (UTC)
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();

    // 1. Find payments created more than 7 days ago with a non-null receipt_image_url
    const { data: expiredPayments, error: fetchErr } = await supabase
      .from('payments')
      .select('id, user_id, transaction_id, amount, status, receipt_image_url, created_at')
      .lt('created_at', cutoffDate)
      .not('receipt_image_url', 'is', null);

    if (fetchErr) {
      console.error('Database query error in cleanup-receipts:', fetchErr);
      return res.status(500).json({
        ok: false,
        error: `To'lovlarni qidirishda xatolik: ${fetchErr.message}`,
      });
    }

    if (!expiredPayments || expiredPayments.length === 0) {
      return res.status(200).json({
        ok: true,
        message: '7 kundan oshgan kvitansiyalar mavjud emas. Tozalash shart emas.',
        cleanedPaymentsCount: 0,
        deletedFilesCount: 0,
        cutoffDate,
      });
    }

    // 2. Extract unique storage file paths to remove from 'receipts' bucket
    const filePaths = expiredPayments
      .map((p) => extractReceiptStoragePath(p.receipt_image_url))
      .filter((p): p is string => Boolean(p));

    const uniqueFilePaths = Array.from(new Set(filePaths));
    let deletedFilesCount = 0;

    if (uniqueFilePaths.length > 0) {
      // Remove in chunks of 50 to prevent payload overflow
      const CHUNK_SIZE = 50;
      for (let i = 0; i < uniqueFilePaths.length; i += CHUNK_SIZE) {
        const chunk = uniqueFilePaths.slice(i, i + CHUNK_SIZE);
        const { error: removeErr } = await supabase.storage
          .from('receipts')
          .remove(chunk);

        if (removeErr) {
          console.warn('Supabase storage remove warning for batch:', removeErr.message);
        } else {
          deletedFilesCount += chunk.length;
        }
      }
    }

    // 3. Nullify receipt_image_url in payments table while keeping payment history intact
    const paymentIds = expiredPayments.map((p) => p.id);
    const BATCH_SIZE = 100;
    for (let i = 0; i < paymentIds.length; i += BATCH_SIZE) {
      const idChunk = paymentIds.slice(i, i + BATCH_SIZE);
      const { error: updateErr } = await supabase
        .from('payments')
        .update({ receipt_image_url: null })
        .in('id', idChunk);

      if (updateErr) {
        console.error('Failed to update payments table in cleanup-receipts:', updateErr.message);
      }
    }

    return res.status(200).json({
      ok: true,
      message: `${paymentIds.length} ta 7 kundan oshgan kvitansiya rasmi Supabase Storage'dan o'chirildi va bazada tozalandi. To'lov tarixi saqlab qolindi.`,
      cleanedPaymentsCount: paymentIds.length,
      deletedFilesCount,
      cutoffDate,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Unhandled exception in cleanup-receipts:', error);
    return res.status(500).json({
      ok: false,
      error: `Server xatoligi: ${error?.message || 'Noma\'lum xatolik'}`,
    });
  }
}
