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

    // Uzbekistan time is UTC+5
    const dt = new Date(Date.UTC(year, month, day, hour - 5, min, sec));
    if (!isNaN(dt.getTime())) {
      return dt;
    }
  }

  return null;
}

/**
 * Send notification to Telegram Admin
 */
async function notifyAdmin(payload: {
  title: string;
  userId: string;
  userName: string;
  amount?: number | null;
  transactionId?: string | null;
  card?: string | null;
  recipientName?: string | null;
  status: 'approved' | 'pending' | 'rejected';
  paymentId?: string;
  reason?: string | null;
  receiptImageUrl?: string | null;
}) {
  if (!BOT_TOKEN) return;

  try {
    const statusEmoji =
      payload.status === 'approved' ? '✅' : payload.status === 'pending' ? '⚠️' : '❌';

    let text = `${statusEmoji} <b>${payload.title}</b>\n\n`;
    text += `👤 <b>Talaba:</b> ${payload.userName} (ID: <code>${payload.userId}</code>)\n`;
    if (payload.amount) {
      text += `💰 <b>Summa:</b> ${payload.amount.toLocaleString('uz-UZ')} so'm\n`;
    }
    if (payload.transactionId) {
      text += `🆔 <b>Tranzaksiya ID:</b> <code>${payload.transactionId}</code>\n`;
    }
    if (payload.card) {
      text += `💳 <b>Karta:</b> ${payload.card}\n`;
    }
    if (payload.recipientName) {
      text += `📝 <b>Qabul qiluvchi:</b> ${payload.recipientName}\n`;
    }
    text += `🕒 <b>Vaqt:</b> ${new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}\n`;

    if (payload.receiptImageUrl) {
      text += `🖼️ <b>Kvitansiya:</b> <a href="${payload.receiptImageUrl}">Chek rasmini ko'rish</a>\n`;
    }

    if (payload.reason) {
      text += `\n⚠️ <b>Izoh:</b> ${payload.reason}\n`;
    }

    const body: Record<string, any> = {
      chat_id: ADMIN_TELEGRAM_ID,
      text,
      parse_mode: 'HTML',
    };

    // If pending review, provide inline action buttons for admin
    if (payload.status === 'pending' && payload.paymentId) {
      body.reply_markup = {
        inline_keyboard: [
          [
            {
              text: '✅ Tasdiqlash',
              callback_data: `approve_pay_${payload.paymentId}`,
            },
            {
              text: '❌ Rad etish',
              callback_data: `reject_pay_${payload.paymentId}`,
            },
          ],
        ],
      };
    }

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('Failed to send Telegram admin notification:', err);
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

  // 1.1 Ensure receipt image is saved to Supabase Storage bucket 'receipts'
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
Siz O'zbekistondagi to'lov tizimlari (Click, Click Up, Payme, Uzum Bank, Apelsin/Uzum, Zoomrad, Anorbank, Milliy bank, Ipak Yo'li, TBC Bank va boshqa bank ilovalari) orqali amalga oshirilgan to'lov cheklari/kvitansiyalarini sinchkovlik bilan tekshiruvchi professional AI inspektorsiz.
Ushbu rasmdagi chekni tahlil qiling va qat'iy JSON formatida qaytaring:

{
  "is_receipt": boolean, // Bu to'lov cheki/kvitansiyasi yoki o'tkazma skrinshotimi
  "is_successful": boolean, // To'lov muvaffaqiyatli yakunlanganmi (masalan: Muvaffaqiyatli, O'tkazildi, Bajarildi, Успешно, Оплачено, Исполнен)
  "amount": number | null, // To'langan aniq summa faqat toza butun son ko'rinishida (masalan: 20000, 35000, 40000, 50000). So'm, UZS so'zlari yoki nuqtalarsiz
  "transaction_id": string | null, // Chek kodi, fiskal belgi yoki tranzaksiya ID si (masalan: 12345678, CLK-123456, TX123456789). Faqat unikal ID. Topilmasa null
  "recipient_card": string | null, // Pul o'tkazilgan qabul qiluvchi karta raqami yoki oxirgi 4 raqami (masalan: "9860080382320093", "82320093", "0093"). Topilmasa null
  "recipient_name": string | null, // Qabul qiluvchi ismi/familiyasi ("Alijonova Xalimaxon" yoki shunga yaqin: "Alijonova X.", "Alijonova Halimaxon"). Topilmasa null
  "transaction_time": string | null, // O'tkazma vaqti va sanasi (masalan: "2026-10-03 21:40:00" yoki "03.10.2026 21:40")
  "payment_system": string, // "Click" | "Payme" | "Uzum" | "Bank" | "Unknown"
  "confidence": "high" | "medium" | "low", // Tahlil ishonchliligi
  "rejection_reason": string | null // Agar soxta, bekor qilingan, summa yo'q yoki noaniq bo'lsa sababi
}
`;

      // Try Gemini 2.5 Flash, then fallback to 1.5 Flash
      const modelNames = ['gemini-2.5-flash', 'gemini-1.5-flash'];
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
    aiError = 'Serverda GEMINI_API_KEY o\'rnatilmagan (Admin tekshiruviga yuboriladi)';
  }

  // =========================================================================
  // 3. STRICT ANTI-CHEAT & SECURITY VALIDATIONS
  // =========================================================================

  if (aiData) {
    // Filtrlash 1: Agar is_successful false bo'lsa -> Rad etilsin
    if (aiData.is_successful === false || aiData.is_receipt === false) {
      const rejectReason =
        aiData.rejection_reason ||
        "Taqdim etilgan rasm to'lov cheki emas yoki to'lov muvaffaqiyatli yakunlanmagan (Bekor qilingan).";

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

    // Filtrlash 2: recipient_card yoki recipient_name bizning rekvizitlarga to'g'ri kelishi shart!
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

    // Agar na karta, na ism to'g'ri kelmasa -> Rad etilsin!
    if (!cardMatches && !nameMatches && (cardDigits.length >= 4 || normName.length >= 3)) {
      const wrongRequisitesReason = `Qabul qiluvchi karta yoki ism bizning rekvizitlarga (9860 **** **** ${OFFICIAL_CARD_SUFFIX}, ${OFFICIAL_CARD_HOLDER}) to'g'ri kelmadi.`;

      try {
        await supabase.from('payments').insert({
          user_id: userId,
          amount: aiData.amount || expectedAmount || 0,
          status: 'rejected',
          notes: wrongRequisitesReason,
          created_at: new Date().toISOString(),
        });
      } catch {}

      await notifyAdmin({
        title: "Boshqa kartaga to'lov cheki aniqlandi (Anti-Cheat)",
        userId,
        userName,
        amount: aiData.amount,
        card: aiData.recipient_card,
        recipientName: aiData.recipient_name,
        status: 'rejected',
        reason: wrongRequisitesReason,
      });

      return res.status(200).json({
        ok: false,
        status: 'rejected',
        reason: wrongRequisitesReason,
        message: "Kvitansiyadagi rekvizitlar (karta yoki ism) bizning rasmiy rekvizitlarimizga mos emas!",
      });
    }

    // Filtrlash 3: transaction_id bazadagi payments jadvalida allaqachon mavjud bo'lsa -> Rad etilsin!
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

          await notifyAdmin({
            title: "Qayta ishlatilgan chek aniqlandi (Anti-Cheat)",
            userId,
            userName,
            amount: aiData.amount,
            transactionId: cleanTxId,
            status: 'rejected',
            reason: duplicateReason,
          });

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

    // Filtrlash 4: Vaqt yangiligi tekshiruvi (Maksimal 30 daqiqa oldingi chek)
    if (aiData.transaction_time) {
      const parsedDate = parseReceiptDate(aiData.transaction_time);
      if (parsedDate) {
        const nowMs = Date.now();
        const diffMs = nowMs - parsedDate.getTime();
        const diffMinutes = Math.floor(diffMs / (60 * 1000));

        // Chek vaqti 24 soat (1440 daqiqa) ichida yuklangan bo'lishi kifoya
        if (diffMinutes > 1440) {
          const expiredReason = `Kvitansiya vaqti 24 soatdan eski (${Math.floor(diffMinutes / 60)} soat oldin: ${aiData.transaction_time}). Iltimos, yangi to'lov chekini yuklang.`;

          try {
            await supabase.from('payments').insert({
              user_id: userId,
              amount: aiData.amount || expectedAmount || 0,
              status: 'rejected',
              notes: expiredReason,
              created_at: new Date().toISOString(),
            });
          } catch {}

          return res.status(200).json({
            ok: false,
            status: 'rejected',
            reason: expiredReason,
            message: "To'lov chekining amal qilish muddati (30 daqiqa) o'tib ketgan!",
          });
        }
      }
    }

    // =========================================================================
    // AVTOMATIK TASDIQLASH (AI AUTOMATIC APPROVAL)
    // =========================================================================
    const paidAmount = Number(aiData.amount);
    const hasValidAmount = Boolean(paidAmount && paidAmount > 0);
    const txId = aiData.transaction_id || `TX_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Agar to'lov muvaffaqiyatli va summa aniqlangan bo'lsa -> darhol avtomatik tasdiqlash
    if (hasValidAmount && aiData.is_successful) {
      // 1. Foydalanuvchi users jadvalida mavjudligini ta'minlash (Foreign key xatosi bo'lmasligi uchun)
      try {
        await supabase.from('users').upsert({
          id: userId,
          full_name: (userName || 'Talaba').trim(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      } catch (err) {
        console.warn('User upsert error:', err);
      }

      // 2. payments jadvaliga status: 'approved' qilib yozish
      let paymentRecordId = '';
      try {
        const { data: payRow } = await supabase
          .from('payments')
          .insert({
            user_id: userId,
            amount: paidAmount,
            transaction_id: txId,
            receipt_image_url: receiptImageUrl,
            sender_card: aiData.recipient_card || null,
            status: 'approved',
            verified_by: 'ai',
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        paymentRecordId = payRow?.id || '';
      } catch (err) {
        console.warn('Payment insert error:', err);
      }

      // 3. Foydalanuvchining users.balance hisobiga o'sha summani darhol qo'shish (balance = balance + amount)
      let currentBalance = 0;
      try {
        const { data: userRow } = await supabase
          .from('users')
          .select('balance')
          .eq('id', userId)
          .maybeSingle();

        if (userRow) {
          currentBalance = Number(userRow.balance ?? 0);
        }
      } catch {}

      const newBalance = currentBalance + paidAmount;

      try {
        await supabase.from('users').upsert({
          id: userId,
          full_name: (userName || 'Talaba').trim(),
          balance: newBalance,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      } catch (err) {
        console.warn('Balance update error:', err);
      }

      // Telegram Admin xabarnomasi
      await notifyAdmin({
        title: "To'lov Gemini AI tomonidan avtomatik tasdiqlandi va balans to'ldirildi!",
        userId,
        userName,
        amount: paidAmount,
        transactionId: txId,
        card: aiData.recipient_card || `*${OFFICIAL_CARD_SUFFIX}`,
        recipientName: aiData.recipient_name || OFFICIAL_CARD_HOLDER,
        status: 'approved',
        reason: `${aiData.payment_system} cheki to'g'ri keldi. Hisobiga +${paidAmount.toLocaleString('uz-UZ')} so'm qo'shildi (Yangi balans: ${newBalance.toLocaleString('uz-UZ')} so'm).`,
        receiptImageUrl,
      });

      return res.status(200).json({
        ok: true,
        status: 'approved',
        transactionId: txId,
        amount: paidAmount,
        newBalance: newBalance,
        paymentSystem: aiData.payment_system,
        message: `Kvitansiya muvaffaqiyatli tasdiqlandi! Hisobingizga ${paidAmount.toLocaleString('uz-UZ')} so'm qo'shildi.`,
      });
    }
  }

  // =========================================================================
  // 4. FALLBACK: PENDING REVIEW BY TELEGRAM ADMIN
  // =========================================================================
  // Agar AI rasm xiraligi sababli aniqlay olmasa -> status: 'pending' qilinib adminga inline tugmalar bilan yuboriladi
  const fallbackTxId =
    aiData?.transaction_id ||
    `PENDING_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const finalAmount = aiData?.amount || expectedAmount || 20000;
  // 1. Foydalanuvchi users jadvalida mavjudligini ta'minlash
  try {
    await supabase.from('users').upsert({
      id: userId,
      full_name: (userName || 'Talaba').trim(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('User upsert error:', err);
  }

  try {
    const { data: pendingRow } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        amount: finalAmount,
        transaction_id: fallbackTxId,
        receipt_image_url: receiptImageUrl,
        sender_card: aiData?.recipient_card || null,
        status: 'pending',
        verified_by: null,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    pendingPaymentId = pendingRow?.id || '';
  } catch (err) {
    console.warn('Insert pending payment error:', err);
  }

  // Admin botiga [✅ Tasdiqlash] va [❌ Rad etish] inline tugmalari bilan yuborish
  await notifyAdmin({
    title: "Yangi Kvitansiya (Admin Tasdiqlashi Kutilmoqda)",
    userId,
    userName,
    amount: finalAmount,
    transactionId: fallbackTxId,
    card: aiData?.recipient_card || 'Aniqlanmadi',
    recipientName: aiData?.recipient_name || 'Aniqlanmadi',
    status: 'pending',
    paymentId: pendingPaymentId,
    receiptImageUrl,
    reason: aiData
      ? `AI rasm xiraligi yoki ishonch pastligi sababli aniqlay olmadi (${aiData.confidence}). Iltimos, chekni ko'rib tasdiqlang.`
      : `AI javob bermadi (${aiError || 'Noma\'lum'}). Qo'lda tekshirish zarur.`,
  });

  return res.status(200).json({
    ok: true,
    status: 'pending',
    paymentId: pendingPaymentId,
    transactionId: fallbackTxId,
    amount: finalAmount,
    message:
      "Kvitansiya qabul qilindi. AI rasm xiraligi sababli to'liq aniqlay olmadi va chek adminga yuborildi. 15-30 daqiqa ichida tekshirilib tasdiqlanadi.",
  });
}
