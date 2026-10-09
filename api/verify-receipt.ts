import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * Chek (kvitansiya) tekshiruvi API (YuksalQuiz).
 * Vercel Serverless Function sifatida to'liq mustaqil (self-contained).
 *
 * Oqim:
 *  1. Foydalanuvchi Telegram initData yoki user profili orqali aniqlanadi.
 *  2. Gemini AI chekni o'qiydi (summa, karta, ism, tranzaksiya ID).
 *  3. To'g'ri va halol chek: pul avtomatik hamyonga tushiriladi va adminga xabarnoma/arxiv tugmasi yuboriladi.
 *  4. Shubhali yoki AI o'qiy olmagan chek: 'pending_manual' holatida adminga tasdiqlash/rad etish tugmalari bilan yuboriladi.
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '';
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://yuksalquiz.vercel.app';

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://kupbaphqyyvmpqxmrtrn.supabase.co';

const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  '';

let cachedDb: any = null;
function getServiceClient(): any {
  if (!cachedDb) {
    cachedDb = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedDb;
}

function getAdminIds(): string[] {
  const raw = `${process.env.ADMIN_TELEGRAM_IDS || ''},${process.env.ADMIN_TELEGRAM_ID || ''},${process.env.VITE_ADMIN_TELEGRAM_ID || ''}`;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s));
}

function cleanId(raw: string | number | null | undefined): string {
  return String(raw ?? '').replace(/^tg_/, '').replace(/^user_/, '').trim();
}

function escapeHtml(text: unknown): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function setCors(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, X-Telegram-Init-Data, X-Telegram-Bot-Api-Secret-Token, X-Admin-Id, X-Admin-Key'
  );
}

// Rasmiy to'lov kartasi rekvizitlari (Alijonova Xalimaxon / 9860080382320093)
const OFFICIAL_CARD_NUMBER = (
  process.env.OFFICIAL_CARD_NUMBER ||
  process.env.VITE_OFFICIAL_CARD_NUMBER ||
  '9860080382320093'
).replace(/\D/g, '');

const OFFICIAL_CARD_SUFFIX = OFFICIAL_CARD_NUMBER.slice(-4) || '0093';

const OFFICIAL_CARD_HOLDER = (
  process.env.OFFICIAL_CARD_HOLDER ||
  process.env.VITE_OFFICIAL_CARD_HOLDER ||
  'Alijonova Xalimaxon'
);

const HOLDER_KEYWORDS = [
  'alijonova',
  'xalimaxon',
  'xalima',
  'halima',
  'alijonov',
  ...((process.env.OFFICIAL_HOLDER_KEYWORDS || '')
    .toLowerCase()
    .split(/[,\s]+/)
    .filter((w) => w.length >= 3)),
];

const AUTO_APPROVE_MAX = Number(process.env.AUTO_APPROVE_MAX || 100000);
const MAX_RECEIPT_AGE_HOURS = Number(process.env.MAX_RECEIPT_AGE_HOURS || 48);

const GEMINI_MODELS = (
  process.env.GEMINI_MODELS ||
  'gemini-2.5-flash,gemini-2.0-flash'
)
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

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

function validateTelegramInitData(initData: string, botToken: string) {
  if (!initData || typeof initData !== 'string' || !botToken) {
    return { isValid: false };
  }
  try {
    const searchParams = new URLSearchParams(initData);
    const hash = searchParams.get('hash');
    if (!hash) return { isValid: false };

    searchParams.delete('hash');
    const sortedKeys = Array.from(searchParams.keys()).sort();
    const dataCheckArr: string[] = [];
    for (const key of sortedKeys) {
      dataCheckArr.push(`${key}=${searchParams.get(key)}`);
    }
    const dataCheckString = dataCheckArr.join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    const calculatedBuffer = Buffer.from(calculatedHash, 'utf-8');
    const hashBuffer = Buffer.from(hash, 'utf-8');

    if (calculatedBuffer.length !== hashBuffer.length || !crypto.timingSafeEqual(calculatedBuffer, hashBuffer)) {
      return { isValid: false };
    }

    const authDateStr = searchParams.get('auth_date');
    const authDate = authDateStr ? parseInt(authDateStr, 10) : 0;
    const now = Math.floor(Date.now() / 1000);
    if (!authDate || now - authDate > 86400) {
      return { isValid: false };
    }

    const userStr = searchParams.get('user');
    let user;
    if (userStr) {
      try {
        user = JSON.parse(userStr);
      } catch {}
    }

    return { isValid: true, user, authDate };
  } catch {
    return { isValid: false };
  }
}

function verifyRequestUser(req: any) {
  const initData: string =
    (req.headers?.['x-telegram-init-data'] as string) || req.body?.initData || '';
  if (initData && BOT_TOKEN) {
    const result = validateTelegramInitData(initData, BOT_TOKEN);
    if (result.isValid && result.user?.id) {
      return {
        id: String(result.user.id),
        firstName: result.user.first_name || '',
        lastName: result.user.last_name || '',
        username: result.user.username || '',
      };
    }
  }

  // Faqat Telegram imzosi bilan tasdiqlangan foydalanuvchi. Body/header dagi userId yoki admin kalitiga ishonilmaydi.
  return null;
}

async function findUserRow(db: any, anyId: string) {
  const c = cleanId(anyId);
  const { data } = await db
    .from('users')
    .select('*')
    .or(`id.eq.${c},id.eq.tg_${c},telegram_id.eq.${c}`)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data as any;
}

/**
 * Kvitansiyani barcha adminlarga Telegram orqali kafolatli yetkazish.
 * 1-usul: Supabase Storage URL orqali sendPhoto
 * 2-usul: Multipart FormData orqali sendPhoto
 * 3-usul: Matnli sendMessage
 */
async function sendReceiptToAdmin(opts: {
  base64Data: string;
  mime: string;
  receiptUrl?: string | null;
  caption: string;
  keyboard: any[][];
}) {
  if (!BOT_TOKEN) {
    console.error('sendReceiptToAdmin: BOT_TOKEN topilmadi');
    return false;
  }
  const adminIds = Array.from(new Set(getAdminIds()));
  if (!adminIds.length) {
    console.error('sendReceiptToAdmin: Hech qanday admin ID topilmadi');
    return false;
  }

  let anyDelivered = false;

  for (const adminId of adminIds) {
    let sent = false;

    // 1-USUL: Agar rasm Supabase Storage ga yuklangan bo'lsa, Telegram sendPhoto (JSON URL)
    if (opts.receiptUrl && opts.receiptUrl.startsWith('http')) {
      try {
        const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: adminId,
            photo: opts.receiptUrl,
            caption: opts.caption.slice(0, 1024),
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: opts.keyboard },
          }),
        });
        const data: any = await resp.json();
        if (data?.ok) {
          sent = true;
          anyDelivered = true;
          continue;
        }
      } catch (err) {
        console.warn(`sendPhoto via URL to ${adminId} error:`, err);
      }
    }

    // 2-USUL: Agar URL orqali o'tmasa, FormData multipart orqali rasm yuklash
    if (!sent && opts.base64Data) {
      try {
        const form = new FormData();
        form.append('chat_id', adminId);
        form.append('caption', opts.caption.slice(0, 1024));
        form.append('parse_mode', 'HTML');
        form.append('reply_markup', JSON.stringify({ inline_keyboard: opts.keyboard }));
        const ext = opts.mime.includes('png') ? 'png' : opts.mime.includes('webp') ? 'webp' : 'jpg';
        const buffer = Buffer.from(opts.base64Data, 'base64');
        const blob = new Blob([buffer], { type: opts.mime });
        form.append('photo', blob, `receipt_${Date.now()}.${ext}`);

        const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
          method: 'POST',
          body: form,
        });
        const data: any = await resp.json();
        if (data?.ok) {
          sent = true;
          anyDelivered = true;
          continue;
        }
      } catch (err) {
        console.warn(`sendPhoto via FormData to ${adminId} error:`, err);
      }
    }

    // 3-USUL: Rasm jo'natib bo'lmasa, har qanday holatda ham matnli xabarni tugmalar bilan yetkazish
    if (!sent) {
      try {
        const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: adminId,
            text: opts.caption,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: opts.keyboard },
          }),
        });
        const data: any = await resp.json();
        if (data?.ok) {
          anyDelivered = true;
        }
      } catch (err) {
        console.error(`sendMessage to ${adminId} error:`, err);
      }
    }
  }

  return anyDelivered;
}

async function analyzeWithGemini(
  base64Data: string,
  mime: string
): Promise<{ data: GeminiReceiptAnalysis | null; error: string | null }> {
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
            contents: [
              {
                role: 'user',
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: mime, data: base64Data } },
                ],
              },
            ],
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

  const { image, mimeType = 'image/jpeg' } = req.body || {};
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
      try {
        await db.from('users').insert({
          id: userKey,
          telegram_id: user.id,
          full_name: fullName,
          username: user.username || null,
        });
      } catch {}
    }

    // Tezlik cheklovi: soatiga 10 ta chek
    const since = new Date(Date.now() - 3600_000).toISOString();
    try {
      const { count } = await db
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .in('user_id', [user.id, `tg_${user.id}`, userKey])
        .gte('created_at', since);
      if ((count || 0) >= 10) {
        return res.status(429).json({ ok: false, error: "Juda ko'p urinish. Bir soatdan keyin qayta urinib ko'ring." });
      }
    } catch {}

    // Bir xil rasm qayta yuborilganini aniqlash (AI ga pul sarflamasdan)
    const receiptHash = crypto.createHash('sha256').update(base64Data).digest('hex');
    try {
      const { data: sameImg, error: hashErr } = await db
        .from('payments')
        .select('id,status')
        .eq('receipt_hash', receiptHash)
        .not('status', 'in', '("rejected","manual_rejected")')
        .limit(1)
        .maybeSingle();
      if (!hashErr && sameImg) {
        return res.status(200).json({
          ok: false,
          status: 'rejected',
          reason: 'duplicate',
          message: "Bu chek avval yuborilgan. Natijasini hamyon bo'limida ko'ring.",
        });
      }
    } catch {
      /* receipt_hash ustuni hali yo'q bo'lsa tekshiruv o'tkazib yuboriladi */
    }

    // Rasmni Supabase Storage ga yuklash
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
      console.warn('Storage upload notice:', err);
    }

    // To'lov qatorini yozish. receipt_hash ustuni hali qo'shilmagan bo'lsa, usiz qayta yoziladi.
    async function insertPayment(fields: Record<string, any>) {
      let r = await db.from('payments').insert({ ...fields, receipt_hash: receiptHash }).select('id').single();
      if (r.error && /receipt_hash/i.test(String(r.error.message || ''))) {
        r = await db.from('payments').insert(fields).select('id').single();
      }
      return r as { data: any; error: any };
    }

    // Gemini tahlili
    const { data: ai, error: aiError } = await analyzeWithGemini(base64Data, mime);

    const paid = Math.round(Number(ai?.amount || 0));
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
    let autoOk = Boolean(
      ai?.is_valid && paid > 0 && paid <= AUTO_APPROVE_MAX && txFromAi && (cardOk || nameOk) && !tooOld
    );
    // Avval rad etilgan chek qayta yuborilsa (masalan, aniqroq rasm bilan) admin qo'lda ko'radi
    let resubmittedAfterReject = false;

    const safeName = escapeHtml(fullName);
    const safeUser = escapeHtml(user.username || 'mavjud_emas');
    const tgUserId = user.id;
    const senderCard = ai?.recipient_card || (ai?.detected_bank ? `Bank: ${ai.detected_bank}` : null);

    // Tranzaksiya raqami avval ishlatilganmi (har ikki yo'l uchun)
    if (txFromAi) {
      // Shu tranzaksiya bo'yicha barcha yozuvlar: bittasi ham rad etilmagan bo'lsa — takroriy chek
      // Raqam rasmdan olinadi (talaba nazoratida), shuning uchun filtr satriga qo'shilmaydi
      const [{ data: exactRows }, { data: resubRows }] = await Promise.all([
        db.from('payments').select('id,status').eq('transaction_id', txFromAi).limit(20),
        db
          .from('payments')
          .select('id,status')
          .like('transaction_id', `RESUBMIT_${txFromAi.replace(/[%_\\]/g, (c) => '\\' + c)}_%`)
          .limit(20),
      ]);
      const rows: any[] = [...(exactRows || []), ...(resubRows || [])];
      const isRejected = (st: any) => ['rejected', 'manual_rejected'].includes(String(st));
      const activeTx = rows.find((r) => !isRejected(r.status));
      const sameTx = activeTx || rows[0] || null;
      if (sameTx && !activeTx) {
        resubmittedAfterReject = true;
        autoOk = false;
      } else if (sameTx) {
        await sendReceiptToAdmin({
          base64Data,
          mime,
          receiptUrl,
          caption:
            `👮‍♂️ <b>[ADMIN NAZORAT PANELI]</b>\n\n` +
            `🔁 <b>Takroriy chek rad etildi (pul qo'shilmadi)</b>\n\n` +
            `👤 Talaba: ${safeName} (@${safeUser})\n` +
            `🆔 Telegram ID: <code>${user.id}</code>\n` +
            `🧾 Tranzaksiya: <code>${escapeHtml(txFromAi)}</code>\n` +
            `ℹ️ Bu tranzaksiya avval yuborilgan (holati: ${escapeHtml(sameTx.status)}).`,
          keyboard: [
            [
              { text: '💬 Talabaga yozish', callback_data: `reply_support:${user.id}` },
              { text: '🚫 Bloklash', callback_data: `ban:${user.id}` },
            ],
          ],
        });
        return res.status(200).json({
          ok: false,
          status: 'rejected',
          reason: 'duplicate',
          message: "Bu to'lov cheki allaqachon tizimda ro'yxatdan o'tgan.",
        });
      }
    }

    // ---------------- A: AI ishonch bilan tasdiqladi (Halol to'g'ri chek) ----------------
    if (autoOk) {
      const { data: inserted, error: insErr } = await insertPayment({
        user_id: userKey,
        amount: paid,
        transaction_id: txFromAi,
        receipt_image_url: receiptUrl,
        sender_card: senderCard,
        status: 'pending',
        verified_by: null,
      });

      if (insErr) {
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

      if (!apprErr && appr?.ok) {
        const newBal = Number(appr.new_balance || 0);

        // Admin xabarnomasi: hammasi joyida bo'lsa arxivlaydi, soxta bo'lsa pulni qaytaradi
        await sendReceiptToAdmin({
          base64Data,
          mime,
          receiptUrl,
          caption:
            `👮‍♂️ <b>[ADMIN NAZORAT PANELI]</b>\n` +
            `<i>⚠️ Faqat bot administratori uchun xabar (boshqa talabalarga yuborilmaydi)</i>\n\n` +
            `✅ <b>To'lov AI tomonidan tasdiqlandi (+${paid.toLocaleString('uz-UZ')} so'm)</b>\n\n` +
            `👤 Talaba: ${safeName} (@${safeUser})\n` +
            `🆔 Telegram ID: <code>${user.id}</code>\n` +
            `💰 Summa: <b>${paid.toLocaleString('uz-UZ')} so'm</b>\n` +
            `🧾 Tranzaksiya: <code>${escapeHtml(txFromAi)}</code>\n` +
            `🏦 To'lov tizimi: ${escapeHtml(ai?.detected_bank || '-')}\n` +
            `🕒 Sana: ${escapeHtml(ai?.receipt_datetime || 'Bugun')}\n` +
            `ℹ️ AI xulosasi: ${escapeHtml(ai?.ai_reason || "Barcha rekvizitlar to'g'ri")}\n` +
            `🔑 To'lov ID: <code>${inserted.id}</code>`,
          keyboard: [
            [{ text: "✅ Hammasi to'g'ri (Arxivlash)", callback_data: 'noop_archive' }],
            [
              { text: '⚠️ Soxta: Pulni qaytarish (-summa)', callback_data: `pw:${inserted.id}` },
              { text: '🚫 Bloklash', callback_data: `ban:${user.id}` },
            ],
          ],
        });

        return res.status(200).json({
          ok: true,
          status: 'approved',
          paymentId: inserted.id,
          transactionId: txFromAi,
          amount: paid,
          newBalance: newBal,
          paymentSystem: ai?.detected_bank || '',
          message: `Kvitansiya tasdiqlandi. Hisobingizga +${paid.toLocaleString('uz-UZ')} so'm qo'shildi.`,
        });
      }

      // RPC ishlamasa pul qo'lda yozilmaydi: to'lov admin tekshiruviga o'tadi
      console.error('approve_payment (auto) failed:', apprErr?.message || appr?.reason);
      await db.from('payments').update({ status: 'pending_manual' }).eq('id', inserted.id).eq('status', 'pending');
      await sendManualReview(inserted.id, txFromAi, "AI tasdiqladi, lekin avtomatik qo'shishda server xatosi");
      return res.status(200).json({
        ok: true,
        status: 'pending',
        paymentId: inserted.id,
        transactionId: txFromAi,
        amount: paid,
        message: "Kvitansiya qabul qilindi va adminga yuborildi. Administrator tekshirgach balansingizga qo'shiladi.",
      });
    }

    // ---------------- B: Chek xato, ishonchsiz yoki AI to'liq o'qiy olmagan (Admin ko'rib chiqadi) ----------------
    // Summa faqat AI o'qigan qiymat. Talaba yuborgan summa tugmaga qo'yilmaydi.
    const reasons: string[] = [];
    if (!ai) reasons.push(aiError || 'AI javob bermadi');
    else {
      if (!ai.is_valid) reasons.push(ai.ai_reason || "AI chekni aniq o'qiy olmadi");
      if (!paid) reasons.push("Summa o'qilmadi");
      if (paid > AUTO_APPROVE_MAX) reasons.push(`Summa ${AUTO_APPROVE_MAX.toLocaleString('uz-UZ')} dan katta`);
      if (!txFromAi) reasons.push('Tranzaksiya raqami topilmadi');
      if (!cardOk && !nameOk) reasons.push('Qabul qiluvchi rekvizitga mos emas');
      if (tooOld) reasons.push(`Chek ${MAX_RECEIPT_AGE_HOURS} soatdan eski`);
    }
    const reasonText = reasons.join('. ') || "Qo'lda tekshirish kerak";

    if (resubmittedAfterReject) reasons.unshift('Bu tranzaksiya avval rad etilgan edi, talaba qayta yubordi');
    const txId = resubmittedAfterReject
      ? `RESUBMIT_${txFromAi}_${Date.now()}`
      : txFromAi || `PENDING_${Date.now()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const { data: pend, error: pendErr } = await insertPayment({
      user_id: userKey,
      amount: paid,
      transaction_id: txId,
      receipt_image_url: receiptUrl,
      sender_card: senderCard,
      status: 'pending_manual',
      verified_by: null,
    });

    if (pendErr && (pendErr as any).code === '23505') {
      return res.status(200).json({
        ok: false,
        status: 'rejected',
        reason: 'duplicate',
        message: "Bu to'lov cheki allaqachon tizimda ro'yxatdan o'tgan.",
      });
    }
    if (pendErr || !pend) throw pendErr || new Error("To'lov yozilmadi");

    await sendManualReview(pend.id, txId, reasonText);

    return res.status(200).json({
      ok: true,
      status: 'pending',
      paymentId: pend.id,
      transactionId: txId,
      amount: paid,
      message: "Kvitansiya qabul qilindi va adminga yuborildi. Administrator tekshirgach balansingizga qo'shiladi.",
    });

    // Adminga qo'lda tekshirish uchun chek yuborish
    async function sendManualReview(paymentId: string, txLabel: string, reason: string) {
      const amountLabel = paid > 0 ? `${paid.toLocaleString('uz-UZ')} so'm` : "AI o'qiy olmadi";
      const amountRow =
        paid > 0
          ? [
              { text: `✅ Tasdiqlash (${amountLabel})`, callback_data: `pa:${paymentId}` },
              { text: '✏️ Boshqa summa', callback_data: `ask_amount:${paymentId}` },
            ]
          : [{ text: '✏️ Summani kiritish', callback_data: `ask_amount:${paymentId}` }];
      await sendReceiptToAdmin({
        base64Data,
        mime,
        receiptUrl,
        caption:
          `👮‍♂️ <b>[ADMIN NAZORAT PANELI]</b>\n` +
          `<i>⚠️ Faqat bot administratori uchun xabar (boshqa talabalarga yuborilmaydi)</i>\n\n` +
          `⏳ <b>Kvitansiyani ko'rib chiqish kerak (Qo'lda tekshirish)</b>\n\n` +
          `👤 Talaba: ${safeName} (@${safeUser})\n` +
          `🆔 Telegram ID: <code>${tgUserId}</code>\n` +
          `💰 Summa: <b>${amountLabel}</b>\n` +
          `🧾 Tranzaksiya: <code>${escapeHtml(txLabel)}</code>\n` +
          `🏦 Tizim: ${escapeHtml(ai?.detected_bank || "Noma'lum")}\n` +
          `⚠️ Sabab / AI xulosasi: ${escapeHtml(reason)}\n` +
          `🔑 To'lov ID: <code>${paymentId}</code>\n\n` +
          `💡 <i>Boshqa summa bilan tasdiqlash: shu xabarga Reply qilib faqat raqam yozing (masalan: <code>32400</code>)</i>`,
        keyboard: [
          amountRow,
          [
            { text: '❌ Rad etish', callback_data: `pr:${paymentId}` },
            { text: '💬 Talabaga yozish', callback_data: `reply_support:${tgUserId}` },
          ],
          [{ text: '🚫 Bloklash', callback_data: `ban:${tgUserId}` }],
        ],
      });
    }
  } catch (err: any) {
    console.error('verify-receipt error:', err?.message || err);
    return res.status(500).json({ ok: false, error: "Server xatosi. Birozdan so'ng qayta urinib ko'ring." });
  }
}
