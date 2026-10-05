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
  is_receipt: boolean;
  is_successful: boolean;
  amount: number | null;
  transaction_id: string | null;
  recipient_card: string | null;
  recipient_name: string | null;
  transaction_time: string | null;
  payment_system: string;
  confidence: 'high' | 'medium' | 'low';
  rejection_reason: string | null;
}

/**
 * Robust date parser supporting ISO, DD.MM.YYYY, YYYY-MM-DD and Uzbek/Russian timestamps
 */
function parseReceiptDate(dateStr: string | null): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const trimmed = dateStr.trim();
  const direct = new Date(trimmed);
  if (!isNaN(direct.getTime()) && trimmed.includes('-')) {
    return direct;
  }

  const dmyMatch = trimmed.match(
    /(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/
  );
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 12;
    const min = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const sec = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;

    const dt = new Date(Date.UTC(year, month, day, hour - 5, min, sec));
    if (!isNaN(dt.getTime())) {
      return dt;
    }
  }

  return null;
}

/**
 * Send photo to Telegram Admin using sendPhoto (with multipart or public URL)
 * Fallback to sendMessage if photo upload fails.
 */
async function sendPhotoToAdmin({
  receiptImageUrl,
  base64Data,
  detectedMime,
  caption,
  userId,
}: {
  receiptImageUrl?: string | null;
  base64Data?: string | null;
  detectedMime?: string;
  caption: string;
  userId: string;
}) {
  if (!BOT_TOKEN) return;

  const adminChatId = ADMIN_TELEGRAM_ID;
  const inline_keyboard = [
    [
      { text: '⚠️ Balansni 0 qilish', callback_data: `reset_balance:${userId}` },
      { text: '🚫 Foydalanuvchini bloklash', callback_data: `ban_user:${userId}` },
    ],
  ];

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
          reply_markup: { inline_keyboard },
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
            inline_keyboard,
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
          reply_markup: { inline_keyboard },
        }),
      });
    } catch (err) {
      console.error('sendMessage fallback exception:', err);
    }
  }
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

  const GEMINI_API_KEY =
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    '';

  let aiData: GeminiReceiptAnalysis | null = null;
  let aiError: string | null = null;

  // 2. Call Google Gemini 1.5 Flash Vision Model
  if (GEMINI_API_KEY) {
    try {
      const promptText = `
Siz O'zbekistondagi to'lov tizimlari (Click, Click Up, Payme, Uzum Bank, Apelsin, Zoomrad, Anorbank, Milliy bank, Ipak Yo'li, TBC Bank va boshqa bank ilovalari) orqali amalga oshirilgan to'lov cheklari/kvitansiyalarini sinchkovlik bilan tekshiruvchi professional AI inspektorsiz.
Ushbu rasmdagi chekni tahlil qiling va qat'iy JSON formatida qaytaring:

{
  "is_receipt": boolean, // Bu to'lov cheki/kvitansiyasi yoki o'tkazma skrinshotimi
  "is_successful": boolean, // To'lov muvaffaqiyatli yakunlanganmi (masalan: Muvaffaqiyatli, O'tkazildi, Bajarildi, Успешно, Оплачено, Исполнен)
  "amount": number | null, // To'langan aniq summa faqat toza butun son ko'rinishida (masalan: 20000, 35000, 40000, 50000). So'm, UZS so'zlari yoki nuqtalarsiz
  "transaction_id": string | null, // Chek kodi, fiskal belgi yoki tranzaksiya ID si (masalan: 12345678, CLK-123456, TX123456789). Faqat unikal ID. Topilmasa null
  "recipient_card": string | null, // Pul o'tkazilgan qabul qiluvchi karta raqami yoki oxirgi 4 raqami (masalan: "9860080382320093", "82320093", "0093"). Topilmasa null
  "recipient_name": string | null, // Qabul qiluvchi ismi/familiyasi ("Alijonova Xalimaxon" yoki shunga yaqin: "Alijonova X.", "Alijonova Halimaxon"). Topilmasa null
  "transaction_time": string | null, // O'tkazma vaqti va sanasi (masalan: "2026-10-05 21:40:00" yoki "05.10.2026 21:40")
  "payment_system": string, // "Click" | "Payme" | "Uzum" | "Bank" | "Unknown"
  "confidence": "high" | "medium" | "low", // Tahlil ishonchliligi
  "rejection_reason": string | null // Agar soxta, bekor qilingan, summa yo'q yoki noaniq bo'lsa sababi
}
`;

      // Priority: Gemini 1.5 Flash (as requested), with fallback to 2.5 Flash
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
            aiError = `Gemini (${model}) xatosi: ${errText.substring(0, 120)}`;
          }
        } catch (fetchErr: any) {
          aiError = fetchErr?.message || 'Gemini aloqa xatosi';
        }
      }
    } catch (err: any) {
      aiError = err?.message || 'Gemini tahlilida kutilmagan xatolik';
      console.warn('Gemini call exception:', err);
    }
  } else {
    aiError = 'Serverda GEMINI_API_KEY o\'rnatilmagan';
  }

  // =========================================================================
  // 3. STRICT ANTI-CHEAT & REQUISITES VALIDATIONS
  // =========================================================================
  const cleanUsername = (userUsername || '').replace(/^@/, '').trim() || 'mavjud_emas';
  const displayCreatedAt = new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' });

  if (aiData) {
    // 1. To'lov cheki emasligi yoki muvaffaqiyatsiz bo'lsa -> Rad etish
    if (aiData.is_successful === false || aiData.is_receipt === false) {
      const rejectReason =
        aiData.rejection_reason ||
        "Taqdim etilgan rasm to'lov cheki emas yoki to'lov muvaffaqiyatli yakunlanmagan.";

      try {
        await supabase.from('payments').insert({
          user_id: userId,
          amount: aiData.amount || expectedAmount || 0,
          receipt_image_url: receiptImageUrl,
          status: 'rejected',
          notes: rejectReason,
          created_at: new Date().toISOString(),
        });
      } catch {}

      return res.status(200).json({
        ok: false,
        status: 'rejected',
        reason: rejectReason,
        message: `To'lov rad etildi: ${rejectReason}`,
      });
    }

    // 2. Karta egasi (Alijonova Xalimaxon) va Karta raqami tekshiruvi
    const cardDigits = String(aiData.recipient_card || '').replace(/\D/g, '');
    const cardMatches =
      cardDigits.endsWith(OFFICIAL_CARD_SUFFIX) ||
      cardDigits === OFFICIAL_CARD_NUMBER ||
      (OFFICIAL_CARD_NUMBER.length >= 8 && cardDigits.includes(OFFICIAL_CARD_NUMBER.slice(-8)));

    const normName = String(aiData.recipient_name || '').toLowerCase();
    const nameMatches =
      normName.includes('alijonov') ||
      normName.includes('xalima') ||
      normName.includes('halima');

    if (!cardMatches && !nameMatches && (cardDigits.length >= 4 || normName.length >= 3)) {
      const wrongRequisitesReason = `Qabul qiluvchi karta yoki ism rasmiy rekvizitlarga (9860 **** **** ${OFFICIAL_CARD_SUFFIX}, ${OFFICIAL_CARD_HOLDER}) to'g'ri kelmadi.`;

      try {
        await supabase.from('payments').insert({
          user_id: userId,
          amount: aiData.amount || expectedAmount || 0,
          status: 'rejected',
          notes: wrongRequisitesReason,
          created_at: new Date().toISOString(),
        });
      } catch {}

      return res.status(200).json({
        ok: false,
        status: 'rejected',
        reason: wrongRequisitesReason,
        message: "Kvitansiyadagi rekvizitlar (karta yoki ism) bizning rasmiy rekvizitlarimizga mos emas!",
      });
    }

    // 3. Unikal tranzaksiya raqami tekshiruvi (Anti-tamper / Anti-replay)
    if (aiData.transaction_id) {
      const cleanTxId = String(aiData.transaction_id).trim();
      try {
        const { data: existingTx } = await supabase
          .from('payments')
          .select('id, user_id, status, created_at')
          .eq('transaction_id', cleanTxId)
          .maybeSingle();

        if (existingTx) {
          const duplicateReason = `Bu chek allaqachon ishlatilgan (Tranzaksiya ID: ${cleanTxId}). Bir xil chekdan qayta foydalanish taqiqlanadi!`;

          return res.status(200).json({
            ok: false,
            status: 'rejected',
            reason: duplicateReason,
            message: "Bu chek allaqachon ishlatilgan!",
          });
        }
      } catch (dbErr) {
        console.warn('DB check transaction_id error:', dbErr);
      }
    }

    // =========================================================================
    // 4. AVTOMATIK TASDIQLASH (AI TASDIQLADI)
    // =========================================================================
    const paidAmount = Number(aiData.amount);
    const hasValidAmount = Boolean(paidAmount && paidAmount > 0);
    const txId =
      aiData.transaction_id ||
      `TX_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    if (hasValidAmount && aiData.is_successful) {
      // 1. Supabase `users` jadvalida foydalanuvchini yangilash
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

      // 2. `payments` jadvaliga yozish
      try {
        await supabase.from('payments').insert({
          user_id: userId,
          amount: paidAmount,
          transaction_id: txId,
          receipt_image_url: receiptImageUrl,
          sender_card: aiData.recipient_card || null,
          status: 'approved',
          verified_by: 'ai',
          created_at: new Date().toISOString(),
          notes: `Gemini AI tasdiqladi (${aiData.payment_system}).`,
        });
      } catch (err) {
        console.warn('Payment insert error:', err);
      }

      // 3. `users.balance` ga summani qo'shish (balance = balance + amount)
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

      // 4. Admin Telegramiga (ADMIN_TELEGRAM_ID) chek rasmi bilan xabar yuborish (sendPhoto)
      const captionText =
        `🔔 <b>Yangi to'lov qabul qilindi (AI tasdiqladi)</b>\n\n` +
        `👤 <b>Talaba:</b> ${userName} (@${cleanUsername})\n` +
        `🆔 <b>Telegram ID:</b> <code>${userId}</code>\n` +
        `🏫 <b>OTM:</b> ${university}\n` +
        `💰 <b>Summa:</b> ${paidAmount.toLocaleString('uz-UZ')} so'm\n` +
        `🧾 <b>Tranzaksiya ID:</b> <code>${txId}</code>\n` +
        `⏰ <b>Sana:</b> ${displayCreatedAt}`;

      await sendPhotoToAdmin({
        receiptImageUrl,
        base64Data,
        detectedMime,
        caption: captionText,
        userId,
      });

      return res.status(200).json({
        ok: true,
        status: 'approved',
        transactionId: txId,
        amount: paidAmount,
        newBalance,
        paymentSystem: aiData.payment_system,
        message: `Kvitansiya muvaffaqiyatli tasdiqlandi! Hisobingizga +${paidAmount.toLocaleString('uz-UZ')} so'm qo'shildi.`,
      });
    }
  }

  // =========================================================================
  // 5. FALLBACK: QO'LDA KO'RIB CHIQISH (PENDING REVIEW)
  // =========================================================================
  const fallbackTxId =
    aiData?.transaction_id ||
    `PENDING_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const finalAmount = aiData?.amount || expectedAmount || 20000;

  try {
    await supabase.from('users').upsert(
      {
        id: userId,
        name: (userName || 'Talaba').trim(),
        university: university || 'Kiritilmagan',
        telegram_username: cleanUsername,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  } catch {}

  try {
    await supabase.from('payments').insert({
      user_id: userId,
      amount: finalAmount,
      transaction_id: fallbackTxId,
      receipt_image_url: receiptImageUrl,
      sender_card: aiData?.recipient_card || null,
      status: 'pending',
      verified_by: null,
      created_at: new Date().toISOString(),
      notes: aiError || 'Rasm xiraligi sababli tekshirishga yuborildi',
    });
  } catch {}

  const pendingCaptionText =
    `⏳ <b>Yangi to'lov (Ko'rib chiqish kutilmoqda)</b>\n\n` +
    `👤 <b>Talaba:</b> ${userName} (@${cleanUsername})\n` +
    `🆔 <b>Telegram ID:</b> <code>${userId}</code>\n` +
    `🏫 <b>OTM:</b> ${university}\n` +
    `💰 <b>Summa:</b> ${finalAmount.toLocaleString('uz-UZ')} so'm\n` +
    `🧾 <b>Tranzaksiya ID:</b> <code>${fallbackTxId}</code>\n` +
    `⏰ <b>Sana:</b> ${displayCreatedAt}\n\n` +
    `ℹ️ <i>AI chekni to'liq o'qiy olmadi. Iltimos, tekshiring.</i>`;

  await sendPhotoToAdmin({
    receiptImageUrl,
    base64Data,
    detectedMime,
    caption: pendingCaptionText,
    userId,
  });

  return res.status(200).json({
    ok: true,
    status: 'pending',
    transactionId: fallbackTxId,
    amount: finalAmount,
    message: "Kvitansiya qabul qilindi va adminga yuborildi. Tez orada tekshirilib tasdiqlanadi.",
  });
}
