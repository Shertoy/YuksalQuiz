import { createClient } from '@supabase/supabase-js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '';
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '6219808382';
const OFFICIAL_CARD_NUMBER = (process.env.OFFICIAL_CARD_NUMBER || '9860080382320093').replace(/\D/g, '');
const OFFICIAL_CARD_SUFFIX = '0093';

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
  transaction_id: string | null;
  amount: number | null;
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
  // 1. Direct ISO / standard parse
  const direct = new Date(trimmed);
  if (!isNaN(direct.getTime()) && trimmed.includes('-')) {
    return direct;
  }

  // 2. Format: DD.MM.YYYY HH:mm(:ss)? or DD/MM/YYYY HH:mm(:ss)?
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
  status: 'approved' | 'pending' | 'rejected';
  paymentId?: string;
  reason?: string | null;
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
    text += `🕒 <b>Vaqt:</b> ${new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}\n`;

    if (payload.reason) {
      text += `\n📝 <b>Izoh:</b> ${payload.reason}\n`;
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
    plan = '3_months',
    expectedAmount = 35000,
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
  "is_successful": boolean, // O'tkazma muvaffaqiyatli bo'lganmi (masalan: Muvaffaqiyatli, O'tkazildi, Bajarildi, Успешно, Оплачено, Исполнен)
  "transaction_id": string | null, // Fiskal belgi, chek raqami, tranzaksiya kodi yoki IDsi (masalan: 12345678, CLK-123456, TX123456789). Faqat unikal ID. Topilmasa null
  "amount": number | null, // To'langan summa faqat toza butun son ko'rinishida (masalan: 35000, 50000, 90000). So'm, UZS so'zlari yoki nuqtalarsiz
  "recipient_card": string | null, // Pul o'tkazilgan karta raqami yoki oxirgi 4 raqami (masalan: "9860080382320093", "82320093", "0093"). Topilmasa null
  "recipient_name": string | null, // Qabul qiluvchi ismi/familiyasi (masalan: "ALIJONOVA X", "ALISHER A", "YUKSAK"). Topilmasa null
  "transaction_time": string | null, // O'tkazma vaqti va sanasi (masalan: "2026-10-03 21:40:00" yoki "03.10.2026 21:40")
  "payment_system": string, // "Click" | "Payme" | "Uzum" | "Bank" | "Unknown"
  "confidence": "high" | "medium" | "low", // Tahlil ishonchliligi
  "rejection_reason": string | null // Agar soxta, bekor qilingan, summa yo'q yoki noaniq bo'lsa sababi
}
`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
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
        }
      } else {
        const errText = await geminiResp.text();
        aiError = `Gemini API xatosi (${geminiResp.status}): ${errText.substring(0, 150)}`;
        console.warn('Gemini API call failed:', aiError);
      }
    } catch (err: any) {
      aiError = err?.message || 'Gemini tahlilida kutilmagan xatolik';
      console.warn('Gemini call exception:', err);
    }
  } else {
    aiError = 'Serverda GEMINI_API_KEY o\'rnatilmagan (Admin tekshiruviga yuboriladi)';
  }

  // Calculate subscription duration
  let planMonths = 3;
  if (plan === '6_months') planMonths = 6;
  if (plan === '1_year') planMonths = 12;

  const paidUntilDate = new Date();
  paidUntilDate.setMonth(paidUntilDate.getMonth() + planMonths);
  const paidUntilIso = paidUntilDate.toISOString();

  // =========================================================================
  // 3. STRICT ANTI-CHEAT VALIDATIONS
  // =========================================================================

  // If AI was able to extract structured data
  if (aiData) {
    // Check 0: Is this a legitimate receipt and was it completed successfully?
    if (aiData.is_receipt === false || aiData.is_successful === false) {
      const rejectReason =
        aiData.rejection_reason ||
        "Taqdim etilgan rasm to'lov cheki emas yoki to'lov muvaffaqiyatli yakunlanmagan.";

      // Record rejected payment in DB
      try {
        await supabase.from('payments').insert({
          user_id: userId,
          amount: aiData.amount || expectedAmount || 0,
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

    // Check 1: Duplicate Transaction ID check (Anti-Cheat 1)
    if (aiData.transaction_id) {
      const cleanTxId = String(aiData.transaction_id).trim();
      try {
        const { data: existingTx } = await supabase
          .from('payments')
          .select('id, user_id, status, created_at')
          .eq('transaction_id', cleanTxId)
          .maybeSingle();

        if (existingTx) {
          const duplicateReason = `Ushbu kvitansiya avval tizimda ishlatilgan (Tranzaksiya ID: ${cleanTxId}). Bir xil chekdan qayta foydalanish taqiqlanadi!`;

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
            message: "Ushbu kvitansiya avval ishlatilgan!",
          });
        }
      } catch (dbErr) {
        console.warn('DB check transaction_id error:', dbErr);
      }
    }

    // Check 2: Recipient Card check (Anti-Cheat 2)
    if (aiData.recipient_card) {
      const cardDigits = String(aiData.recipient_card).replace(/\D/g, '');
      const isOfficialMatch =
        cardDigits.endsWith(OFFICIAL_CARD_SUFFIX) ||
        cardDigits === OFFICIAL_CARD_NUMBER ||
        (OFFICIAL_CARD_NUMBER.length >= 8 && cardDigits.includes(OFFICIAL_CARD_NUMBER.slice(-8)));

      if (cardDigits.length >= 4 && !isOfficialMatch) {
        const wrongCardReason = `Qabul qiluvchi karta raqami (${aiData.recipient_card}) bizning rasmiy kartamizga (9860 **** **** ${OFFICIAL_CARD_SUFFIX}) mos kelmadi.`;

        try {
          await supabase.from('payments').insert({
            user_id: userId,
            amount: aiData.amount || expectedAmount || 0,
            status: 'rejected',
            notes: wrongCardReason,
            created_at: new Date().toISOString(),
          });
        } catch {}

        await notifyAdmin({
          title: "Boshqa kartaga to'lov cheki yuborildi (Anti-Cheat)",
          userId,
          userName,
          amount: aiData.amount,
          card: aiData.recipient_card,
          status: 'rejected',
          reason: wrongCardReason,
        });

        return res.status(200).json({
          ok: false,
          status: 'rejected',
          reason: wrongCardReason,
          message: "Kvitansiyadagi karta raqami bizning rasmiy kartamizga mos emas!",
        });
      }
    }

    // Check 3: Transaction Time freshness (Anti-Cheat 3 - Max 30 minutes old)
    if (aiData.transaction_time) {
      const parsedDate = parseReceiptDate(aiData.transaction_time);
      if (parsedDate) {
        const nowMs = Date.now();
        const diffMs = nowMs - parsedDate.getTime();
        const diffMinutes = Math.floor(diffMs / (60 * 1000));

        // If older than 30 minutes
        if (diffMinutes > 30) {
          const expiredReason = `Kvitansiya vaqti 30 daqiqadan eski (${diffMinutes} daqiqa oldin: ${aiData.transaction_time}). Iltimos, yangi to'lov chekini yuklang.`;

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

        // If future timestamp (> 10 minutes into the future)
        if (diffMinutes < -10) {
          const futureReason = `Kvitansiya vaqti noto'g'ri (kelajak vaqti ko'rsatilgan: ${aiData.transaction_time}).`;
          return res.status(200).json({
            ok: false,
            status: 'rejected',
            reason: futureReason,
            message: "To'lov vaqti haqiqiy emas!",
          });
        }
      }
    }

    // Check 4: Check if AI had high or medium confidence and valid transaction ID & amount
    const hasValidTxId = Boolean(aiData.transaction_id && aiData.transaction_id.length >= 4);
    const hasValidAmount = Boolean(aiData.amount && aiData.amount >= 10000);

    if (aiData.confidence !== 'low' && hasValidTxId && hasValidAmount) {
      // =========================================================================
      // SUCCESS: AI AUTOMATIC APPROVAL
      // =========================================================================
      const txId = aiData.transaction_id!;
      const paidAmount = Number(aiData.amount);

      let paymentRecordId = '';
      try {
        const { data: payRow } = await supabase
          .from('payments')
          .insert({
            user_id: userId,
            amount: paidAmount,
            transaction_id: txId,
            status: 'approved',
            notes: `Gemini AI avtomatik tasdiqladi (${aiData.payment_system || 'P2P'}, vaqt: ${aiData.transaction_time || 'N/A'})`,
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        paymentRecordId = payRow?.id || '';
      } catch (err) {
        console.warn('Payment insert error:', err);
      }

      // Update users table in Supabase
      try {
        await supabase.from('users').upsert({
          id: userId,
          has_paid: true,
          paid_until: paidUntilIso,
          updated_at: new Date().toISOString(),
        });
      } catch {}

      // Notify Telegram Admin of automatic success
      await notifyAdmin({
        title: "To'lov Gemini AI tomonidan avtomatik tasdiqlandi!",
        userId,
        userName,
        amount: paidAmount,
        transactionId: txId,
        card: aiData.recipient_card || `*${OFFICIAL_CARD_SUFFIX}`,
        status: 'approved',
        reason: `${aiData.payment_system} orqali to'lov muvaffaqiyatli aniqlandi va obuna berildi.`,
      });

      return res.status(200).json({
        ok: true,
        status: 'approved',
        transactionId: txId,
        amount: paidAmount,
        paidUntil: paidUntilIso,
        plan,
        paymentSystem: aiData.payment_system,
        message: "Kvitansiya muvaffaqiyatli tasdiqlandi! Obunangiz faollashtirildi.",
      });
    }
  }

  // =========================================================================
  // 4. FALLBACK: PENDING REVIEW BY TELEGRAM ADMIN
  // =========================================================================
  // Triggered when:
  // - AI had low confidence
  // - Transaction ID could not be cleanly extracted
  // - Receipt image is blurry or partial
  // - Gemini API was unavailable
  const fallbackTxId =
    aiData?.transaction_id ||
    `PENDING_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const finalAmount = aiData?.amount || expectedAmount || 35000;
  let pendingPaymentId = '';

  try {
    const { data: pendingRow } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        amount: finalAmount,
        transaction_id: fallbackTxId,
        status: 'pending',
        notes: aiError || aiData?.rejection_reason || 'AI to\'liq aniqlay olmadi, admin tekshiruviga yuborildi',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    pendingPaymentId = pendingRow?.id || '';
  } catch (err) {
    console.warn('Insert pending payment error:', err);
  }

  // Dispatch inline verification notification to Admin Telegram chat
  await notifyAdmin({
    title: "Yangi Kvitansiya (Admin Tasdiqlashi Kutilmoqda)",
    userId,
    userName,
    amount: finalAmount,
    transactionId: fallbackTxId,
    card: aiData?.recipient_card || 'Aniqlanmadi',
    status: 'pending',
    paymentId: pendingPaymentId,
    reason: aiData
      ? `AI ishonch darajasi past (${aiData.confidence}). Kvitansiyani ko'rib chiqib tasdiqlang.`
      : `AI javob bermadi (${aiError || 'Noma\'lum'}). Qo'lda tekshirish zarur.`,
  });

  return res.status(200).json({
    ok: true,
    status: 'pending',
    paymentId: pendingPaymentId,
    transactionId: fallbackTxId,
    amount: finalAmount,
    message:
      "Kvitansiya qabul qilindi. AI tasvirni to'liq taniy olmaganligi sababli chek adminga yuborildi. 15-30 daqiqa ichida tekshirilib tasdiqlanadi.",
  });
}
