import { createClient } from '@supabase/supabase-js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '';
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '6219808382';
const OFFICIAL_CARD_NUMBER = (process.env.OFFICIAL_CARD_NUMBER || '9860080382320093').replace(/\D/g, '');
const OFFICIAL_CARD_SUFFIX = '0093';
const OFFICIAL_CARD_HOLDER = process.env.OFFICIAL_CARD_HOLDER || 'Alijonova Xalimaxon';

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

interface GeminiReceiptAnalysis {
  is_valid: boolean;
  detected_bank: 'Click' | 'Payme' | 'Uzum' | 'Boshqa bank' | string;
  amount: number | null;
  transaction_id: string | null;
  recipient_card: string | null;
  recipient_name: string | null;
  ai_reason: string;
}

/**
 * Send photo (or fallback message) with action buttons to Telegram Admin
 */
async function sendPhotoToAdmin({
  receiptImageUrl,
  base64Data,
  detectedMime,
  caption,
  inlineKeyboard,
}: {
  receiptImageUrl?: string | null;
  base64Data?: string | null;
  detectedMime?: string;
  caption: string;
  inlineKeyboard: any[][];
}) {
  if (!BOT_TOKEN) return;

  const adminChatId = ADMIN_TELEGRAM_ID;
  let sent = false;

  // 1. Try sendPhoto via public URL if available
  if (receiptImageUrl && receiptImageUrl.startsWith('http')) {
    try {
      const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          photo: receiptImageUrl,
          caption,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: inlineKeyboard },
        }),
      });
      const data = await resp.json();
      if (data.ok) {
        sent = true;
      } else {
        console.warn('sendPhoto with URL failed:', data.description);
      }
    } catch (err) {
      console.warn('sendPhoto URL exception:', err);
    }
  }

  // 2. Try sendPhoto via multipart/form-data with buffer if not yet sent
  if (!sent && base64Data) {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;
      const ext = detectedMime?.includes('png') ? 'png' : 'jpg';
      const crlf = '\r\n';
      const parts: Buffer[] = [];

      parts.push(
        Buffer.from(
          `--${boundary}${crlf}Content-Disposition: form-data; name="chat_id"${crlf}${crlf}${adminChatId}${crlf}`
        )
      );

      parts.push(
        Buffer.from(
          `--${boundary}${crlf}Content-Disposition: form-data; name="caption"${crlf}${crlf}${caption}${crlf}`
        )
      );

      parts.push(
        Buffer.from(
          `--${boundary}${crlf}Content-Disposition: form-data; name="parse_mode"${crlf}${crlf}HTML${crlf}`
        )
      );

      parts.push(
        Buffer.from(
          `--${boundary}${crlf}Content-Disposition: form-data; name="reply_markup"${crlf}${crlf}${JSON.stringify({
            inline_keyboard: inlineKeyboard,
          })}${crlf}`
        )
      );

      parts.push(
        Buffer.from(
          `--${boundary}${crlf}Content-Disposition: form-data; name="photo"; filename="receipt.${ext}"${crlf}Content-Type: ${
            detectedMime || 'image/jpeg'
          }${crlf}${crlf}`
        )
      );
      parts.push(buffer);
      parts.push(Buffer.from(`${crlf}--${boundary}--${crlf}`));

      const multipartBuffer = Buffer.concat(parts);

      const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body: multipartBuffer,
      });
      const data = await resp.json();
      if (data.ok) {
        sent = true;
      } else {
        console.warn('sendPhoto multipart failed:', data.description);
      }
    } catch (err) {
      console.warn('sendPhoto multipart exception:', err);
    }
  }

  // 3. Fallback: sendMessage if sendPhoto failed
  if (!sent) {
    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          text: caption,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: inlineKeyboard },
        }),
      });
    } catch (err) {
      console.error('sendMessage fallback exception:', err);
    }
  }
}

/**
 * Safely insert payment record into Supabase payments table
 */
async function insertPaymentRecord(data: {
  user_id: string;
  amount: number;
  transaction_id: string;
  receipt_image_url: string | null;
  sender_card?: string | null;
  status: string;
  verified_by?: string | null;
  notes?: string | null;
}): Promise<string> {
  // First attempt with exact status ('auto_approved' / 'pending_manual')
  const { data: row, error } = await supabase
    .from('payments')
    .insert({
      user_id: data.user_id,
      amount: data.amount,
      transaction_id: data.transaction_id,
      receipt_image_url: data.receipt_image_url,
      sender_card: data.sender_card || null,
      status: data.status,
      verified_by: data.verified_by || null,
      notes: data.notes || null,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (row?.id) return row.id;

  // Fallback to standard status if database has legacy check constraint
  if (error) {
    console.warn('Payment insert with exact status failed, falling back:', error.message);
    const standardStatus = data.status.includes('approved') ? 'approved' : 'pending';

    const { data: fallbackRow } = await supabase
      .from('payments')
      .insert({
        user_id: data.user_id,
        amount: data.amount,
        transaction_id: data.transaction_id,
        receipt_image_url: data.receipt_image_url,
        sender_card: data.sender_card || null,
        status: standardStatus,
        verified_by: data.verified_by || null,
        notes: `[${data.status}] ${data.notes || ''}`.trim(),
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    return fallbackRow?.id || '';
  }

  return '';
}

export default async function handler(req: any, res: any) {
  // CORS Configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed. Use POST.' });
  }

  const {
    image,
    mimeType = 'image/jpeg',
    userId = 'anonymous_user',
    userName = 'Talaba',
    userUsername = '',
    university = 'Kiritilmagan',
    expectedAmount = 20000,
    receiptImageUrl: clientReceiptUrl = null,
  } = req.body || {};

  if (!image || typeof image !== 'string') {
    return res.status(400).json({
      ok: false,
      error: "Kvitansiya rasmi (base64) taqdim etilmadi.",
    });
  }

  // 1. Prepare base64 image data
  let base64Data = image.trim();
  let detectedMime = mimeType;
  if (base64Data.startsWith('data:')) {
    const commaIndex = base64Data.indexOf(',');
    if (commaIndex !== -1) {
      const header = base64Data.substring(0, commaIndex);
      const mimeMatch = header.match(/data:([^;]+);/);
      if (mimeMatch && mimeMatch[1]) {
        detectedMime = mimeMatch[1];
      }
      base64Data = base64Data.substring(commaIndex + 1);
    }
  }

  // 1.1 Upload receipt image to Supabase Storage bucket 'receipts'
  let receiptImageUrl: string | null = clientReceiptUrl;
  if (!receiptImageUrl && base64Data) {
    try {
      const fileBuffer = Buffer.from(base64Data, 'base64');
      const cleanUserId = (userId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_');
      const ext = detectedMime.includes('png') ? 'png' : detectedMime.includes('webp') ? 'webp' : 'jpg';
      const storagePath = `${cleanUserId}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('receipts')
        .upload(storagePath, fileBuffer, {
          contentType: detectedMime,
          upsert: true,
        });

      if (!uploadErr) {
        const { data: urlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(storagePath);
        receiptImageUrl = urlData?.publicUrl || storagePath;
      }
    } catch (storageErr) {
      console.warn('Storage upload error in verify-receipt:', storageErr);
    }
  }

  const cleanUsername = (userUsername || '').replace(/^@/, '').trim() || 'mavjud_emas';
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';

  let aiData: GeminiReceiptAnalysis | null = null;
  let aiError: string | null = null;

  // 2. Call Google Gemini Vision Model (Multi-bank Check: Click, Payme, Uzum, etc.)
  if (GEMINI_API_KEY) {
    try {
      const promptText = `
Siz O'zbekiston bank va to'lov tizimlari (Click, Click Up, Payme, Uzum Bank, Apelsin/Uzum, Zoomrad, Anorbank, Milliy bank, Ipak Yo'li, TBC Bank va boshqa banklar) orqali yuborilgan to'lov kvitansiyalarini sinchkovlik bilan tekshiruvchi professional AI inspektorsiz.

QIDIRILAYOTGAN RASMIY REKVIZITLAR (Qabul qiluvchi):
- Karta egasi: "Alijonova Xalimaxon" yoki "ALIJONOVA X." yoki "Xalimaxon" / "Halimaxon"
- Karta raqami: "9860080382320093" yoki oxirgi 4 raqami "0093"

QAT'IY BAHOLASH MEZONLARI:
A) is_valid = true (Muvaffaqiyatli):
   - Rasm haqiqiy to'lov cheki va to'lov muvaffaqiyatli yakunlangan (Bajarildi, O'tkazildi, Успешно, Оплачено).
   - To'langan aniq summa ko'ringan (musbat butun son, masalan: 20000, 35000, 40000, 50000).
   - Unikal tranzaksiya raqami / chek kodi / fiskal belgi aniq topilgan.
   - Qabul qiluvchi karta yoki ism rasmiy rekvizitlarga mos (Alijonova Xalimaxon yoki oxiri 0093).

B) is_valid = false (Noaniq / Rad etish):
   - Chek xira, kesilgan, noaniq, skrinshot xira yoki qisman olingan.
   - Qabul qiluvchi ko'rinmagan yoki boshqa shaxs/boshqa karta.
   - Summa yoki tranzaksiya ID si o'qib bo'lmaydi.
   - To'lov bekor qilingan yoki rad etilgan.

Faqat va faqat quyidagi toza JSON formatida javob bering:
{
  "is_valid": boolean,
  "detected_bank": "Click" | "Payme" | "Uzum" | "Boshqa bank",
  "amount": number | null,
  "transaction_id": string | null,
  "recipient_card": string | null,
  "recipient_name": string | null,
  "ai_reason": string
}
`;

      const modelNames = ['gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-1.5-flash-latest'];
      for (const model of modelNames) {
        if (aiData) break;
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        try {
          const geminiResp = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    { text: promptText },
                    {
                      inline_data: {
                        mime_type: detectedMime,
                        data: base64Data,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                response_mime_type: 'application/json',
              },
            }),
          });

          if (geminiResp.ok) {
            const geminiJson = await geminiResp.json();
            const candidate = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (candidate) {
              const cleanText = candidate.replace(/```json/g, '').replace(/```/g, '').trim();
              aiData = JSON.parse(cleanText) as GeminiReceiptAnalysis;
              break;
            }
          } else {
            const errText = await geminiResp.text();
            aiError = `Gemini (${model}) javobi: ${errText.substring(0, 100)}`;
          }
        } catch (fetchErr: any) {
          aiError = fetchErr?.message || 'Gemini aloqa xatosi';
        }
      }
    } catch (err: any) {
      aiError = err?.message || 'Gemini tahlilida kutilmagan xatolik';
    }
  } else {
    aiError = 'Serverda GEMINI_API_KEY o\'rnatilmagan';
  }

  // Ensure user exists in users table
  try {
    await supabase.from('users').upsert(
      {
        id: userId,
        first_name: (userName || '').split(' ')[0] || 'Talaba',
        last_name: (userName || '').split(' ').slice(1).join(' ') || '',
        name: (userName || 'Talaba').trim(),
        university: university || 'Kiritilmagan',
        telegram_username: cleanUsername,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  } catch (err) {
    console.warn('User upsert error:', err);
  }

  // =========================================================================
  // MANTIQIY JARAYONLAR (FLOWS):
  // =========================================================================

  // Check requisites match strictly
  const cardDigits = String(aiData?.recipient_card || '').replace(/\D/g, '');
  const cardMatches =
    cardDigits.endsWith(OFFICIAL_CARD_SUFFIX) ||
    cardDigits === OFFICIAL_CARD_NUMBER ||
    (OFFICIAL_CARD_NUMBER.length >= 8 && cardDigits.includes(OFFICIAL_CARD_NUMBER.slice(-8)));

  const normName = String(aiData?.recipient_name || '').toLowerCase();
  const nameMatches =
    normName.includes('alijonov') ||
    normName.includes('xalima') ||
    normName.includes('halima');

  const hasValidAmount = Boolean(aiData?.amount && Number(aiData.amount) > 0);
  const isValidOutcome = Boolean(
    aiData?.is_valid &&
    hasValidAmount &&
    (cardMatches || nameMatches || !aiData?.recipient_card)
  );

  // -------------------------------------------------------------------------
  // A HOLAT: AGAR AI TASDIQLASA (A) Muvaffaqiyatli (is_valid = true)
  // -------------------------------------------------------------------------
  if (aiData && isValidOutcome) {
    const paidAmount = Number(aiData.amount);
    const txId =
      aiData.transaction_id ||
      `TX_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const detectedBank = aiData.detected_bank || 'Click/Payme';

    // 1. Anti-replay duplicate check
    if (aiData.transaction_id) {
      try {
        const { data: existingTx } = await supabase
          .from('payments')
          .select('id, user_id, status')
          .eq('transaction_id', String(aiData.transaction_id).trim())
          .maybeSingle();

        if (existingTx) {
          const duplicateReason = `Ushbu chek allaqachon ishlatilgan (Tranzaksiya ID: ${aiData.transaction_id}).`;
          return res.status(200).json({
            ok: false,
            status: 'rejected',
            reason: duplicateReason,
            message: "Bu to'lov cheki allaqachon tizimda ro'yxatdan o'tgan!",
          });
        }
      } catch (e) {}
    }

    // 2. Pul darhol users.balance ga qo'shilsin
    let currentBalance = 0;
    try {
      const { data: userRow } = await supabase
        .from('users')
        .select('balance, wallet_balance')
        .eq('id', userId)
        .maybeSingle();

      if (userRow) {
        currentBalance = Number(userRow.balance ?? userRow.wallet_balance ?? 0);
      }
    } catch {}

    const newBalance = currentBalance + paidAmount;

    try {
      await supabase.from('users').upsert(
        {
          id: userId,
          balance: newBalance,
          wallet_balance: newBalance,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    } catch (err) {
      console.warn('Balance update error:', err);
    }

    // 3. payments jadvaliga status: 'auto_approved' deb yozilsin
    const paymentId = await insertPaymentRecord({
      user_id: userId,
      amount: paidAmount,
      transaction_id: txId,
      receipt_image_url: receiptImageUrl,
      sender_card: aiData.recipient_card || null,
      status: 'auto_approved',
      verified_by: 'ai',
      notes: `AI tasdiqladi: ${detectedBank} (${aiData.ai_reason || "To'g'ri"})`,
    });

    // 4. Adminga (ADMIN_TELEGRAM_ID) chek rasmi yuborilsin
    const captionText =
      `✅ <b>To'lov AI tomonidan tasdiqlandi</b>\n\n` +
      `👤 <b>Talaba:</b> ${userName} (@${cleanUsername})\n` +
      `🆔 <b>ID:</b> <code>${userId}</code>\n` +
      `💰 <b>Summa:</b> ${paidAmount.toLocaleString('uz-UZ')} so'm\n` +
      `🧾 <b>Tranzaksiya:</b> <code>${txId}</code>\n` +
      `🏦 <b>Tizim:</b> ${detectedBank}`;

    const inlineKeyboard = [
      [{ text: "✅ Hammasi to'g'ri", callback_data: 'noop_archive' }],
      [
        { text: '⚠️ Ogohlantirish + Balansni 0', callback_data: `warn_reset:${userId}:${paymentId}` },
        { text: '🚫 Bloklash', callback_data: `ban_user:${userId}` },
      ],
    ];

    await sendPhotoToAdmin({
      receiptImageUrl,
      base64Data,
      detectedMime,
      caption: captionText,
      inlineKeyboard,
    });

    return res.status(200).json({
      ok: true,
      status: 'approved',
      transactionId: txId,
      amount: paidAmount,
      newBalance,
      paymentSystem: detectedBank,
      message: `Kvitansiya muvaffaqiyatli tasdiqlandi! Hisobingizga +${paidAmount.toLocaleString('uz-UZ')} so'm qo'shildi.`,
    });
  }

  // -------------------------------------------------------------------------
  // B HOLAT: AGAR AI O'QIY OLMASA (B) Noaniq (is_valid = false)
  // -------------------------------------------------------------------------
  const finalAmount = aiData?.amount || expectedAmount || 20000;
  const fallbackTxId =
    aiData?.transaction_id ||
    `PENDING_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const aiReason =
    aiData?.ai_reason ||
    aiError ||
    "Chek xira, qabul qiluvchi ko'rinmagan yoki boshqa kartaga yuborilgan";

  // payments jadvaliga status: 'pending_manual' deb yoziladi
  const paymentId = await insertPaymentRecord({
    user_id: userId,
    amount: finalAmount,
    transaction_id: fallbackTxId,
    receipt_image_url: receiptImageUrl,
    sender_card: aiData?.recipient_card || null,
    status: 'pending_manual',
    verified_by: null,
    notes: `AI o'qiy olmadi: ${aiReason}`,
  });

  // Adminga chek rasmi yuboriladi
  const captionPending =
    `⚠️ <b>AI chekni to'liq o'qiy olmadi (Qo'lda tekshirish kerak)</b>\n\n` +
    `👤 <b>Talaba:</b> ${userName} (@${cleanUsername})\n` +
    `🆔 <b>ID:</b> <code>${userId}</code>\n` +
    `❓ <b>AI xulosasi:</b> ${aiReason}`;

  const inlineKeyboardPending = [
    [
      { text: "✅ Tasdiqlash (Balansga qo'shish)", callback_data: `manual_approve:${userId}:${paymentId}` },
      { text: "❌ Soxta / Rad etish", callback_data: `manual_reject:${userId}:${paymentId}` },
    ],
  ];

  await sendPhotoToAdmin({
    receiptImageUrl,
    base64Data,
    detectedMime,
    caption: captionPending,
    inlineKeyboard: inlineKeyboardPending,
  });

  // Talabaning hisobiga pul tushmaydi, ilovada xabar ko'rsatiladi
  return res.status(200).json({
    ok: true,
    status: 'pending',
    paymentId,
    transactionId: fallbackTxId,
    amount: finalAmount,
    message: "Kvitansiya qabul qilindi. Administrator tekshiruvidan so'ng balansingizga qo'shiladi",
  });
}
