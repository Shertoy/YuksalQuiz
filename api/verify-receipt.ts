import {
  BOT_TOKEN,
  getServiceClient,
  getPrimaryAdminId,
  setCors,
  verifyRequestUser,
  findUserRow,
  escapeHtml,
  GEMINI_MODELS,
} from './_lib/common.ts';

/**
 * Chek (kvitansiya) tekshiruvi.
 *
 * Oqim:
 *  1. Foydalanuvchi Telegram imzosi orqali aniqlanadi (soxta userId o'tmaydi).
 *  2. Gemini chekni o'qiydi.
 *  3. Chek aniq o'qilsa: to'lov yozuvi AVVAL yaratiladi (tranzaksiya ID unikal),
 *     keyin approve_payment orqali pul bir marta qo'shiladi.
 *  4. Aniq bo'lmasa: 'pending_manual' holatida admin Telegramiga yuboriladi.
 */

const OFFICIAL_CARD_NUMBER = (process.env.OFFICIAL_CARD_NUMBER || '').replace(/\D/g, '');
const OFFICIAL_CARD_SUFFIX = OFFICIAL_CARD_NUMBER.slice(-4);
const OFFICIAL_CARD_HOLDER = process.env.OFFICIAL_CARD_HOLDER || '';
// Ism bo'yicha moslik uchun kalit so'zlar, vergul bilan: "alijonov,xalima,halima"
const HOLDER_KEYWORDS = (process.env.OFFICIAL_HOLDER_KEYWORDS || OFFICIAL_CARD_HOLDER)
  .toLowerCase()
  .split(/[,\s]+/)
  .filter((w) => w.length >= 4);

// AI avtomatik tasdiqlashi mumkin bo'lgan eng katta summa. Undan katta bo'lsa admin ko'radi.
const AUTO_APPROVE_MAX = Number(process.env.AUTO_APPROVE_MAX || 200000);
// Chek shu soatdan eski bo'lsa admin ko'radi
const MAX_RECEIPT_AGE_HOURS = Number(process.env.MAX_RECEIPT_AGE_HOURS || 48);

interface GeminiReceiptAnalysis {
  is_valid: boolean;
  detected_bank: string;
  amount: number | null;
  transaction_id: string | null;
  recipient_card: string | null;
  recipient_name: string | null;
  receipt_datetime: string | null;
  ai_reason: string;
}

async function sendReceiptToAdmin(opts: {
  adminId: string;
  base64Data: string;
  mime: string;
  caption: string;
  keyboard: any[][];
}) {
  if (!BOT_TOKEN || !opts.adminId) return false;
  const tg = (method: string) => `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;

  // 1. Rasm bilan (multipart)
  try {
    const form = new FormData();
    form.append('chat_id', opts.adminId);
    form.append('caption', opts.caption.slice(0, 1000));
    form.append('parse_mode', 'HTML');
    form.append('reply_markup', JSON.stringify({ inline_keyboard: opts.keyboard }));
    const ext = opts.mime.includes('png') ? 'png' : opts.mime.includes('webp') ? 'webp' : 'jpg';
    form.append('photo', new Blob([Buffer.from(opts.base64Data, 'base64')], { type: opts.mime }), `receipt.${ext}`);
    const r = await fetch(tg('sendPhoto'), { method: 'POST', body: form });
    const d: any = await r.json();
    if (d.ok) return true;
    console.warn('sendPhoto failed:', d.description);
  } catch (err) {
    console.warn('sendPhoto exception:', err);
  }

  // 2. Rasm yuborilmasa, hech bo'lmasa matn
  try {
    const r = await fetch(tg('sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: opts.adminId,
        text: opts.caption,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: opts.keyboard },
      }),
    });
    const d: any = await r.json();
    if (!d.ok) console.error('Admin xabari yuborilmadi:', d.description);
    return Boolean(d.ok);
  } catch (err) {
    console.error('sendMessage exception:', err);
    return false;
  }
}

async function analyzeWithGemini(base64Data: string, mime: string): Promise<{ data: GeminiReceiptAnalysis | null; error: string | null }> {
  const key = process.env.GEMINI_API_KEY || '';
  if (!key) return { data: null, error: "Serverda GEMINI_API_KEY o'rnatilmagan" };

  const prompt = `
Siz O'zbekiston to'lov kvitansiyalarini (Click, Payme, Uzum, Apelsin, Anorbank, Milliy bank, Ipak Yo'li, TBC va boshqalar) tekshiruvchi inspektorsiz.

Kutilgan qabul qiluvchi:
- Karta egasi: "${OFFICIAL_CARD_HOLDER}"
- Karta raqami oxiri: "${OFFICIAL_CARD_SUFFIX}"

is_valid = true faqat shunda:
- rasm haqiqiy to'lov cheki va to'lov muvaffaqiyatli yakunlangan (Bajarildi, O'tkazildi, Успешно)
- aniq summa va unikal tranzaksiya raqami ko'rinib turibdi
- qabul qiluvchi karta yoki ism yuqoridagiga mos

Boshqa hollarda is_valid = false (xira, kesilgan, bekor qilingan, boshqa qabul qiluvchi).
Summa faqat so'mda, butun son bo'lsin. Chekdagi sana va vaqtni ISO ko'rinishida ber (topilmasa null).

Faqat JSON qaytar:
{"is_valid":boolean,"detected_bank":string,"amount":number|null,"transaction_id":string|null,"recipient_card":string|null,"recipient_name":string|null,"receipt_datetime":string|null,"ai_reason":string}`;

  let lastError = 'Gemini javob bermadi';
  for (const model of GEMINI_MODELS) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: base64Data } }] }],
            generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
          }),
        }
      );
      if (!resp.ok) {
        const t = await resp.text();
        lastError = `Gemini (${model}) ${resp.status}: ${t.slice(0, 120)}`;
        console.warn(lastError);
        continue;
      }
      const json: any = await resp.json();
      const text: string | undefined = json?.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text;
      if (!text) {
        lastError = `Gemini (${model}) bo'sh javob qaytardi`;
        continue;
      }
      const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return { data: JSON.parse(clean) as GeminiReceiptAnalysis, error: null };
    } catch (err: any) {
      lastError = err?.message || 'Gemini aloqa xatosi';
    }
  }
  return { data: null, error: lastError };
}

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST kerak' });

  const user = verifyRequestUser(req);
  if (!user) {
    return res.status(401).json({
      ok: false,
      reason: 'unauthorized',
      error: "Ilovani Telegram ichida oching. Brauzerda chek yuborib bo'lmaydi.",
    });
  }

  const { image, mimeType = 'image/jpeg', expectedAmount = 0 } = req.body || {};
  if (!image || typeof image !== 'string') {
    return res.status(400).json({ ok: false, error: 'Kvitansiya rasmi yuborilmadi.' });
  }

  let base64Data = image.trim();
  let mime: string = mimeType;
  if (base64Data.startsWith('data:')) {
    const comma = base64Data.indexOf(',');
    const m = base64Data.slice(0, comma).match(/data:([^;]+);/);
    if (m?.[1]) mime = m[1];
    base64Data = base64Data.slice(comma + 1);
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
    return res.status(400).json({ ok: false, error: 'Faqat JPG, PNG yoki WEBP rasm yuboring.' });
  }
  if (base64Data.length > 6_000_000) {
    return res.status(413).json({ ok: false, error: 'Rasm juda katta. Kichikroq rasm yuboring.' });
  }

  try {
    const db = getServiceClient();

    // Foydalanuvchi qatori
    let row = await findUserRow(db, user.id);
    if (row?.is_blocked) {
      return res.status(403).json({ ok: false, reason: 'blocked', error: 'Hisobingiz bloklangan' });
    }
    const userKey: string = row?.id || `tg_${user.id}`;
    const fullName = `${user.firstName} ${user.lastName}`.trim() || 'Talaba';
    if (!row) {
      await db.from('users').insert({
        id: userKey,
        telegram_id: user.id,
        first_name: user.firstName || 'Talaba',
        last_name: user.lastName || '',
        name: fullName,
        telegram_username: user.username || null,
      });
    }

    // Tezlik cheklovi: soatiga 5 ta chek
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await db
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .in('user_id', [user.id, `tg_${user.id}`])
      .gte('created_at', since);
    if ((count || 0) >= 5) {
      return res.status(429).json({ ok: false, error: "Juda ko'p urinish. Bir soatdan keyin qayta urinib ko'ring." });
    }

    // Rasmni saqlash
    let receiptUrl: string | null = null;
    try {
      const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
      const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await db.storage.from('receipts').upload(path, Buffer.from(base64Data, 'base64'), {
        contentType: mime,
        upsert: false,
      });
      if (!upErr) receiptUrl = db.storage.from('receipts').getPublicUrl(path).data?.publicUrl || path;
    } catch (err) {
      console.warn('Storage upload error:', err);
    }

    // Gemini tahlili
    const { data: ai, error: aiError } = await analyzeWithGemini(base64Data, mime);

    const paid = Number(ai?.amount || 0);
    const cardDigits = String(ai?.recipient_card || '').replace(/\D/g, '');
    const cardOk =
      OFFICIAL_CARD_NUMBER.length > 0 &&
      (cardDigits === OFFICIAL_CARD_NUMBER || (cardDigits.length >= 4 && cardDigits.endsWith(OFFICIAL_CARD_SUFFIX)));
    const holder = String(ai?.recipient_name || '').toLowerCase();
    const nameOk = HOLDER_KEYWORDS.length > 0 && HOLDER_KEYWORDS.some((w) => holder.includes(w));

    let tooOld = false;
    if (ai?.receipt_datetime) {
      const t = new Date(ai.receipt_datetime).getTime();
      if (!Number.isNaN(t) && Date.now() - t > MAX_RECEIPT_AGE_HOURS * 3600_000) tooOld = true;
    }

    const txFromAi = ai?.transaction_id ? String(ai.transaction_id).trim() : '';
    const autoOk = Boolean(
      ai?.is_valid && paid > 0 && paid <= AUTO_APPROVE_MAX && txFromAi && (cardOk || nameOk) && !tooOld
    );

    const adminId = getPrimaryAdminId();
    const safeName = escapeHtml(fullName);
    const safeUser = escapeHtml(user.username || 'mavjud_emas');

    // ---------------- A: AI ishonch bilan tasdiqladi ----------------
    if (autoOk) {
      const { data: inserted, error: insErr } = await db
        .from('payments')
        .insert({
          user_id: userKey,
          amount: paid,
          transaction_id: txFromAi,
          receipt_image_url: receiptUrl,
          sender_card: ai?.recipient_card || null,
          status: 'pending',
          notes: `AI: ${ai?.detected_bank || ''} ${ai?.ai_reason || ''}`.trim(),
        })
        .select('id')
        .single();

      if (insErr) {
        // 23505 = unique_violation: bu chek oldin ishlatilgan
        if ((insErr as any).code === '23505') {
          return res.status(200).json({
            ok: false,
            status: 'rejected',
            reason: 'duplicate',
            message: "Bu to'lov cheki allaqachon tizimda ro'yxatdan o'tgan.",
          });
        }
        throw insErr;
      }

      const { data: appr, error: apprErr } = await db.rpc('approve_payment', {
        p_payment_id: inserted.id,
        p_actor: 'ai',
        p_status: 'auto_approved',
      });
      if (apprErr || !appr?.ok) {
        console.error('auto approve failed:', apprErr?.message || appr);
        return res.status(500).json({ ok: false, error: "Hisobni to'ldirishda xatolik. Administrator bilan bog'laning." });
      }

      await sendReceiptToAdmin({
        adminId,
        base64Data,
        mime,
        caption:
          `<b>To'lov AI tomonidan tasdiqlandi</b>\n\n` +
          `Talaba: ${safeName} (@${safeUser})\nID: <code>${user.id}</code>\n` +
          `Summa: ${paid.toLocaleString('uz-UZ')} so'm\nTranzaksiya: <code>${escapeHtml(txFromAi)}</code>\n` +
          `Tizim: ${escapeHtml(ai?.detected_bank || '-')}`,
        keyboard: [
          [{ text: "Hammasi to'g'ri", callback_data: 'noop_archive' }],
          [
            { text: 'Soxta: summani qaytarish', callback_data: `pw:${inserted.id}` },
            { text: 'Bloklash', callback_data: `ban:${user.id}` },
          ],
        ],
      });

      return res.status(200).json({
        ok: true,
        status: 'approved',
        paymentId: inserted.id,
        transactionId: txFromAi,
        amount: paid,
        newBalance: Number(appr.new_balance),
        paymentSystem: ai?.detected_bank || '',
        message: `Kvitansiya tasdiqlandi. Hisobingizga +${paid.toLocaleString('uz-UZ')} so'm qo'shildi.`,
      });
    }

    // ---------------- B: admin qo'lda tekshiradi ----------------
    const pendingAmount = paid > 0 ? paid : Number(expectedAmount) || 0;
    const reasons: string[] = [];
    if (!ai) reasons.push(aiError || 'AI ishlamadi');
    else {
      if (!ai.is_valid) reasons.push(ai.ai_reason || "AI chekni aniq o'qiy olmadi");
      if (paid > AUTO_APPROVE_MAX) reasons.push(`Summa ${AUTO_APPROVE_MAX.toLocaleString('uz-UZ')} dan katta`);
      if (!txFromAi) reasons.push('Tranzaksiya raqami topilmadi');
      if (!cardOk && !nameOk) reasons.push('Qabul qiluvchi rekvizitga mos emas');
      if (tooOld) reasons.push(`Chek ${MAX_RECEIPT_AGE_HOURS} soatdan eski`);
    }
    const reasonText = reasons.join('. ') || "Qo'lda tekshirish kerak";

    const txId = txFromAi || `PENDING_${Date.now()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    let { data: pend, error: pendErr } = await db
      .from('payments')
      .insert({
        user_id: userKey,
        amount: pendingAmount,
        transaction_id: txId,
        receipt_image_url: receiptUrl,
        sender_card: ai?.recipient_card || null,
        status: 'pending_manual',
        notes: `Qo'lda tekshirish: ${reasonText}`,
      })
      .select('id')
      .single();

    if (pendErr && (pendErr as any).code === '23505') {
      // Bir xil tranzaksiya ID ikkinchi marta: yangi ID bilan yozamiz, admin ko'rib chiqadi
      const retry = await db
        .from('payments')
        .insert({
          user_id: userKey,
          amount: pendingAmount,
          transaction_id: `DUP_${txId}_${Date.now()}`,
          receipt_image_url: receiptUrl,
          status: 'pending_manual',
          notes: `Takroriy tranzaksiya ID. ${reasonText}`,
        })
        .select('id')
        .single();
      pend = retry.data;
      pendErr = retry.error;
    }
    if (pendErr || !pend) throw pendErr || new Error("To'lov yozilmadi");

    const delivered = await sendReceiptToAdmin({
      adminId,
      base64Data,
      mime,
      caption:
        `<b>Chekni qo'lda tekshirish kerak</b>\n\n` +
        `Talaba: ${safeName} (@${safeUser})\nID: <code>${user.id}</code>\n` +
        `Summa: ${pendingAmount.toLocaleString('uz-UZ')} so'm\n` +
        `Sabab: ${escapeHtml(reasonText)}`,
      keyboard: [
        [
          { text: "Tasdiqlash (balansga)", callback_data: `pa:${pend.id}` },
          { text: 'Rad etish', callback_data: `pr:${pend.id}` },
        ],
        [{ text: 'Bloklash', callback_data: `ban:${user.id}` }],
      ],
    });
    if (!delivered) console.error('Admin ga chek yetkazilmadi. ADMIN_TELEGRAM_IDS va TELEGRAM_BOT_TOKEN ni tekshiring.');

    return res.status(200).json({
      ok: true,
      status: 'pending',
      paymentId: pend.id,
      transactionId: txId,
      amount: pendingAmount,
      message: "Kvitansiya qabul qilindi. Administrator tekshirgach balansingizga qo'shiladi.",
    });
  } catch (err: any) {
    console.error('verify-receipt error:', err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server xatosi' });
  }
}
