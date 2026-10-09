import { createClient } from '@supabase/supabase-js';

/**
 * Telegram Bot Webhook Handler (YuksalQuiz)
 *
 * Vazifasi:
 * 1. /start buyrug'i va "Testni boshlash" matnlariga javob berish.
 * 2. Eski va ortiqcha ReplyKeyboardMarkup (pastdagi ulkan tugma)ni remove_keyboard orqali yo'qotish.
 * 3. Chat Menu Button (pastki chap burchakdagi Mini App tugmasi)ni doimiy sozlash.
 * 4. Kvitansiya to'lovlarini tasdiqlash / rad etish / teskari qaytarish (Admin moderation).
 * 5. Talabalar bilan qo'llab-quvvatlash xabarlari (/reply) almashinuvi.
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

function isAdminId(id: string | number | null | undefined): boolean {
  if (id === null || id === undefined) return false;
  return getAdminIds().includes(String(id).replace(/^tg_/, '').replace(/^user_/, '').trim());
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

const MESSAGES = {
  uz: {
    welcome:
      "Assalomu alaykum! Yuksal Quiz platformasiga xush kelibsiz.\n\nKundan-kunga test orqali ilmingizni rivojlantiring.",
    button: '🚀 Testni boshlash',
    deepLink: '🎯 Testni boshlash',
    deepText:
      '📚 <b>Sizga maxsus test ulashildi!</b>\n\nTestni boshlash va bilimingizni sinash uchun quyidagi tugmani bosing:',
  },
  ru: {
    welcome:
      'Здравствуйте! Добро пожаловать в платформу Yuksal Quiz.\n\nРазвивайте свои знания день за днем с помощью тестов.',
    button: '🚀 Начать тест',
    deepLink: '🎯 Пройти тест',
    deepText: '📚 <b>Вам отправлен тест!</b>\n\nНажмите кнопку ниже, чтобы открыть и пройти тест:',
  },
};

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

async function tgCall(method: string, payload: Record<string, any>) {
  if (!BOT_TOKEN) {
    console.error(`Telegram API error: BOT_TOKEN is missing for ${method}`);
    return null;
  }
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (!data.ok) {
      console.warn(`Telegram API ${method} response:`, data.description);
    }
    return data;
  } catch (err) {
    console.error(`${method} network exception:`, err);
    return null;
  }
}

async function tgSend(chatId: string | number, text: string, extra: Record<string, any> = {}) {
  if (!BOT_TOKEN || !chatId) return false;
  try {
    const res = await tgCall('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...extra,
    });
    return Boolean(res?.ok);
  } catch (err) {
    console.error('tgSend error:', err);
    return false;
  }
}

const answerCallback = (id: string, text: string, alert = false) =>
  tgCall('answerCallbackQuery', { callback_query_id: id, text, show_alert: alert });

async function setMenuButton(chatId: number | string, text: string) {
  await tgCall('setChatMenuButton', {
    chat_id: chatId,
    menu_button: { type: 'web_app', text, web_app: { url: WEBAPP_URL } },
  });
}

/** Xabar tagidagi tugmalarni almashtiradi, shunda ikkinchi marta bosib bo'lmaydi */
async function markHandled(chatId: any, messageId: any, label: string) {
  if (!chatId || !messageId) return;
  await tgCall('editMessageReplyMarkup', {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: [[{ text: label, callback_data: 'noop_done' }]] },
  });
}

/** Eski xabarlardagi callback_data (manual_approve:USER:UUID) ham ishlashi uchun */
function parseAction(data: string): { kind: string; arg: string; customAmount?: number } {
  const uuid = data.match(UUID_RE)?.[0] || '';
  const mCustom = data.match(/^pa(\d+):/);
  if (mCustom) {
    return { kind: 'approve', arg: uuid, customAmount: parseInt(mCustom[1], 10) };
  }
  if (data.startsWith('pa:') || data.startsWith('manual_approve:') || data.startsWith('approve_pay_'))
    return { kind: 'approve', arg: uuid };
  if (data.startsWith('pr:') || data.startsWith('manual_reject:') || data.startsWith('reject_pay_'))
    return { kind: 'reject', arg: uuid };
  if (data.startsWith('pw:') || data.startsWith('warn_reset:') || data.startsWith('reset_balance:'))
    return { kind: 'reverse', arg: uuid };
  if (data.startsWith('ban:')) return { kind: 'ban', arg: cleanId(data.slice(4)) };
  if (data.startsWith('ban_user:')) return { kind: 'ban', arg: cleanId(data.slice(9)) };
  if (data.startsWith('reply_support:')) return { kind: 'reply', arg: cleanId(data.slice(14)) };
  if (data === 'noop_archive') return { kind: 'archive', arg: '' };
  if (data.startsWith('ask_amount:')) return { kind: 'ask_amount', arg: uuid };
  return { kind: 'unknown', arg: '' };
}

// To'lov RPC sabablarini admin uchun tushunarli matnga aylantirish
function rpcReasonText(data: any): string {
  const r = String(data?.reason || '');
  if (r === 'already_processed') return `Bu to'lov allaqachon ko'rib chiqilgan (holati: ${data?.status || '-'})`;
  if (r === 'not_credited') return `Bu to'lov hisobga tushmagan (holati: ${data?.status || '-'}), qaytarish shart emas`;
  if (r === 'payment_not_found') return "To'lov bazadan topilmadi";
  if (r === 'user_not_found') return 'Talaba bazadan topilmadi';
  if (r === 'bad_amount') return "Summa noto'g'ri";
  return r || "noma'lum sabab";
}

// Summani o'rnatib to'lovni tasdiqlash (admin reply yoki /setamount orqali).
// Hammasi bitta atomar RPC ichida: holat tekshiriladi, summa yoziladi, pul bir marta qo'shiladi.
const MAX_REPLY_AMOUNT = Number(process.env.MAX_ADMIN_REPLY_AMOUNT || 1000000);

async function approveWithAmount(db: any, chatId: any, paymentId: string, amount: number, adminId?: any): Promise<boolean> {
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_REPLY_AMOUNT) {
    await tgSend(
      chatId,
      `⚠️ Summa ${Number(amount || 0).toLocaleString('uz-UZ')} so'm. Bu juda katta yoki noto'g'ri, tasdiqlanmadi. ` +
        `Raqamni tekshirib qayta yozing (chegara: ${MAX_REPLY_AMOUNT.toLocaleString('uz-UZ')} so'm).`
    );
    return true;
  }
  const { data, error } = await db.rpc('approve_payment_with_amount', {
    p_payment_id: paymentId,
    p_amount: amount,
    p_actor: String(adminId || 'admin'),
  });
  if (error) {
    console.error('approve_payment_with_amount error:', error.message);
    await tgSend(
      chatId,
      "❌ Tasdiqlab bo'lmadi. Supabase'da <code>20261010_security_lockdown.sql</code> migratsiyasi ishga tushirilganini tekshiring."
    );
    return true;
  }
  if (!data?.ok) {
    await tgSend(chatId, `ℹ️ Tasdiqlanmadi: ${escapeHtml(rpcReasonText(data))}`);
    return true;
  }
  const amtStr = Number(data.amount || amount).toLocaleString('uz-UZ');
  await tgSend(chatId, `✅ Tasdiqlandi: +${amtStr} so'm (To'lov ID: <code>${escapeHtml(paymentId)}</code>)`);
  await tgSend(data.user_id, `To'lovingiz tasdiqlandi. Hisobingizga ${amtStr} so'm qo'shildi.`);
  return true;
}

async function handleAdminCallback(cq: any) {
  const db = getServiceClient();
  const fromId = String(cq.from?.id || '');
  const chatId = cq.message?.chat?.id;
  const messageId = cq.message?.message_id;
  const { kind, arg, customAmount } = parseAction(String(cq.data || ''));

  if (kind === 'archive') {
    await answerCallback(cq.id, "Tasdiqlandi (arxivlandi)");
    await markHandled(chatId, messageId, 'Tasdiqlangan (arxivda)');
    return;
  }

  // Pul amallari faqat atomar RPC orqali bajariladi (fallback yo'q):
  // holat RPC ichida qulf bilan tekshiriladi, shuning uchun ikki marta bosilsa
  // yoki ikki admin bir vaqtda bossa ham pul faqat bir marta qo'shiladi/ayiriladi.
  if (kind === 'approve') {
    if (!arg) return void (await answerCallback(cq.id, "To'lov ID topilmadi", true));

    const { data, error } =
      customAmount && customAmount > 0
        ? await db.rpc('approve_payment_with_amount', {
            p_payment_id: arg,
            p_amount: customAmount,
            p_actor: fromId,
          })
        : await db.rpc('approve_payment', {
            p_payment_id: arg,
            p_actor: fromId,
            p_status: 'manual_approved',
          });

    if (error) {
      console.error('approve RPC error:', error.message);
      return void (await answerCallback(cq.id, "Server xatosi: tasdiqlanmadi. Qayta urinib ko'ring.", true));
    }
    if (!data?.ok) {
      if (data?.reason === 'already_processed') await markHandled(chatId, messageId, `Avval ko'rib chiqilgan (${data?.status || '-'})`);
      return void (await answerCallback(cq.id, rpcReasonText(data), true));
    }

    const amount = Number(data.amount).toLocaleString('uz-UZ');
    await answerCallback(cq.id, `Tasdiqlandi: +${amount} so'm`, true);
    await markHandled(chatId, messageId, `Tasdiqlandi (+${amount} so'm)`);
    await tgSend(data.user_id, `To'lovingiz tasdiqlandi. Hisobingizga ${amount} so'm qo'shildi.`);
    return;
  }

  if (kind === 'reject') {
    if (!arg) return void (await answerCallback(cq.id, "To'lov ID topilmadi", true));

    const { data, error } = await db.rpc('reject_payment', { p_payment_id: arg, p_actor: fromId });
    if (error) {
      console.error('reject_payment RPC error:', error.message);
      return void (await answerCallback(cq.id, "Server xatosi: rad etilmadi. Qayta urinib ko'ring.", true));
    }
    if (!data?.ok) {
      if (data?.reason === 'already_processed') await markHandled(chatId, messageId, `Avval ko'rib chiqilgan (${data?.status || '-'})`);
      return void (await answerCallback(cq.id, rpcReasonText(data), true));
    }

    await answerCallback(cq.id, 'Kvitansiya rad etildi', true);
    await markHandled(chatId, messageId, 'Rad etildi');
    await tgSend(data.user_id, "Siz yuborgan to'lov kvitansiyasi tasdiqlanmadi. Iltimos, haqiqiy chekni yuklang.");
    return;
  }

  if (kind === 'reverse') {
    if (!arg) return void (await answerCallback(cq.id, "To'lov ID topilmadi", true));

    const { data, error } = await db.rpc('reverse_payment', { p_payment_id: arg, p_actor: fromId });
    if (error) {
      console.error('reverse_payment RPC error:', error.message);
      return void (await answerCallback(cq.id, "Server xatosi: qaytarilmadi. Qayta urinib ko'ring.", true));
    }
    if (!data?.ok) {
      if (data?.reason === 'not_credited') await markHandled(chatId, messageId, `Avval ko'rib chiqilgan (${data?.status || '-'})`);
      return void (await answerCallback(cq.id, rpcReasonText(data), true));
    }

    const back = Number(data.reversed).toLocaleString('uz-UZ');
    await answerCallback(cq.id, `Ogohlantirildi, ${back} so'm qaytarildi`, true);
    await markHandled(chatId, messageId, `Ogohlantirildi (-${back} so'm)`);
    await tgSend(
      data.user_id,
      "Diqqat: yuborgan chekingizda qoidabuzarlik aniqlandi va summa hisobingizdan qaytarildi. Takrorlansa hisobingiz bloklanadi."
    );
    return;
  }

  if (kind === 'ban') {
    if (!arg) return void (await answerCallback(cq.id, 'Foydalanuvchi ID topilmadi', true));
    const { error } = await db
      .from('users')
      .update({ is_blocked: true, updated_at: new Date().toISOString() })
      .or(`id.eq.${arg},id.eq.tg_${arg},telegram_id.eq.${arg}`);
    if (error) return void (await answerCallback(cq.id, `Xatolik: ${error.message}`, true));
    await answerCallback(cq.id, 'Foydalanuvchi bloklandi', true);
    await markHandled(chatId, messageId, 'Bloklandi');
    return;
  }

  if (kind === 'ask_amount') {
    await answerCallback(cq.id, "Shu xabarga Reply bosib faqat summani yozing (masalan: 32400)");
    await tgCall('sendMessage', {
      chat_id: chatId,
      parse_mode: 'HTML',
      reply_to_message_id: messageId,
      text:
        `✏️ <b>Summa kiritish</b>\n\n` +
        `To'lov ID: <code>${escapeHtml(arg)}</code>\n\n` +
        `Shu xabarga <b>Reply</b> bosing va faqat <b>raqam</b> yozing:\n` +
        `Masalan: <code>32400</code>\n\n` +
        `Yoki: <code>/setamount ${escapeHtml(arg)} 32400</code>`,
      reply_markup: { force_reply: true, selective: true },
    });
    return;
  }

  if (kind === 'reply') {
    await answerCallback(cq.id, 'Javob yozish ochildi');
    await tgCall('sendMessage', {
      chat_id: chatId,
      parse_mode: 'HTML',
      text:
        `<b>Talabaga javob yozish</b>\n\nTalaba Telegram ID: <code>${escapeHtml(arg)}</code>\n\n` +
        `Shu xabarga Reply qiling yoki <code>/reply ${escapeHtml(arg)} matn</code> deb yuboring.`,
      reply_markup: { force_reply: true, selective: true },
    });
    return;
  }

  if (cq.data === 'noop_done') return void (await answerCallback(cq.id, 'Bu allaqachon bajarilgan'));
  await answerCallback(cq.id, "Noma'lum amal");
}

async function handleAdminMessage(msg: any): Promise<boolean> {
  const text = (msg.text || '').trim();
  const chatId = msg.chat?.id;
  if (!text) return false;

  const db = getServiceClient();

  // /setamount PAYMENT_UUID SUMMA — AI o'qiy olmagan chekga summa kiritish
  if (text.startsWith('/setamount ')) {
    const parts = text.split(/\s+/);
    const paymentId = parts[1] || '';
    const amount = parseInt(parts[2] || '', 10);
    if (!paymentId || !amount || amount <= 0) {
      await tgSend(chatId, "❌ Format: <code>/setamount PAYMENT_ID SUMMA</code>\nMasalan: <code>/setamount abc-123 32400</code>");
      return true;
    }
    return await approveWithAmount(db, chatId, paymentId, amount, msg.from?.id);
  }

  // Reply orqali faqat raqam yozilgan holat (summa kiritish xabariga reply)
  if (msg.reply_to_message) {
    // Summa kiritish xabariga yoki chek rasmining izohiga (caption) reply qilinishi mumkin
    const replyText = msg.reply_to_message.text || msg.reply_to_message.caption || '';
    const uuidMatch = replyText.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    // "32 400", "32.400", "32,400 so'm", "35 000.00" -> 32400 / 35000 (tiyinlar olib tashlanadi)
    const normalized = text
      .replace(/\s*(so'?m|сум|sum|uzs)\s*$/i, '')
      .trim()
      .replace(/[.,]\d{1,2}$/, '')
      .replace(/[\s,.']/g, '');
    const isAmountReply = uuidMatch && /^\d+$/.test(normalized);
    if (isAmountReply) {
      const paymentId = uuidMatch[1];
      const amount = parseInt(normalized, 10);
      if (amount > 0) {
        return await approveWithAmount(db, chatId, paymentId, amount, msg.from?.id);
      }
    }
  }

  let targetUserId = '';
  let replyBody = '';

  if (text.startsWith('/reply ')) {
    const parts = text.split(/\s+/);
    targetUserId = cleanId(parts[1]);
    replyBody = parts.slice(2).join(' ').trim();
  } else if (msg.reply_to_message) {
    const src = msg.reply_to_message.text || msg.reply_to_message.caption || '';
    const m = src.match(/(?:Telegram\s+ID|ID):\s*([0-9]{5,15})/i);
    if (m) {
      targetUserId = m[1];
      replyBody = text;
    }
  }
  if (!targetUserId || !replyBody) return false;

  try {
    await db.from('support_messages').insert({
      user_id: targetUserId,
      user_name: 'Administrator',
      message: 'Admin bevosita javobi',
      reply: replyBody,
      sender: 'admin',
      status: 'replied_by_admin',
      created_at: new Date().toISOString(),
    });
    await db
      .from('support_messages')
      .update({ reply: replyBody, status: 'replied_by_admin' })
      .eq('user_id', targetUserId)
      .eq('status', 'forwarded_to_admin');
  } catch (err) {
    console.error('support reply save error:', err);
  }

  const sent = await tgSend(targetUserId, `<b>Administrator javobi:</b>\n\n${escapeHtml(replyBody)}`);
  await tgSend(
    chatId,
    sent
      ? `Javobingiz talabaga (ID: <code>${targetUserId}</code>) yetkazildi.`
      : 'Javob bazaga saqlandi, lekin talabaga yetkazilmadi (bot bloklangan bo\'lishi mumkin).'
  );
  return true;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    const me = await tgCall('getMe', {});
    return res.status(200).json({
      status: 'active',
      bot_username: me?.result?.username || 'YuksalQuiz_bot',
      bot_name: me?.result?.first_name || 'Yuksal Quiz',
    });
  }

  try {
    let update = req.body;
    if (typeof update === 'string') {
      try {
        update = JSON.parse(update);
      } catch (e) {
        console.error('Failed to parse req.body string as JSON:', e);
        return res.status(200).json({ ok: true });
      }
    } else if (update && Buffer.isBuffer(update)) {
      try {
        update = JSON.parse(update.toString('utf8'));
      } catch (e) {
        console.error('Failed to parse req.body Buffer as JSON:', e);
        return res.status(200).json({ ok: true });
      }
    }

    if (!update || typeof update !== 'object') {
      return res.status(200).json({ ok: true });
    }

    // Telegram'dan kelgani tasdiqlanganmi?
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET || '';
    const headerSecret = String(req.headers?.['x-telegram-bot-api-secret-token'] || '');
    // Pulga tegadigan admin amallari FAQAT Telegram imzolagan so'rovda bajariladi.
    // Secret o'rnatilmagan bo'lsa admin amallari yopiq (soxta so'rov bilan pul qo'shib bo'lmasin).
    // /start kabi oddiy javoblar secretsiz ham ishlayveradi.
    const trusted = Boolean(secret) && headerSecret === secret;

    // 1. Admin tugmalari (Callback queries)
    if (update.callback_query) {
      const cq = update.callback_query;
      if (!trusted) {
        console.error('TELEGRAM_WEBHOOK_SECRET sozlanmagan yoki mos emas: admin callback rad etildi');
        await answerCallback(
          cq.id,
          secret
            ? "Xavfsizlik tekshiruvidan o'tmadi"
            : "Admin tugmalari o'chiq: Vercel'da TELEGRAM_WEBHOOK_SECRET sozlang va webhookni qayta ulang",
          true
        );
        return res.status(200).json({ ok: true });
      }
      if (!isAdminId(cq.from?.id)) {
        await answerCallback(cq.id, "Sizda admin huquqi yo'q", true);
        return res.status(200).json({ ok: true });
      }
      try {
        await handleAdminCallback(cq);
      } catch (err: any) {
        console.error('admin callback error:', err);
        await answerCallback(cq.id, `Xatolik: ${err?.message || 'noma\'lum'}`, true);
      }
      return res.status(200).json({ ok: true });
    }

    // 2. Oddiy xabarlar (Messages)
    if (update.message) {
      const msg = update.message;
      const text = (msg.text || '').trim();
      const chatId = msg.chat?.id;
      const fromId = msg.from?.id ? String(msg.from.id) : '';

      if (trusted && isAdminId(fromId) && (await handleAdminMessage(msg))) {
        return res.status(200).json({ ok: true });
      }

      const lowerText = text.toLowerCase();
      const isStart =
        lowerText.startsWith('/start') ||
        lowerText === '🚀 testni boshlash' ||
        lowerText === '🚀 начать тест' ||
        lowerText === '🚀 start quiz' ||
        lowerText === '📱 ilovani ochish' ||
        text === '🚀 Testni boshlash' ||
        text === '🚀 Начать тест' ||
        text === '🚀 Start Quiz' ||
        text === '📱 Ilovani ochish';

      if (isStart && chatId) {
        let lang: 'uz' | 'ru' = 'uz';

        // Foydalanuvchining bazadagi til sozlamasini aniqlash (1 soniya timeout bilan)
        if (fromId) {
          try {
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), 1000)
            );
            const dbPromise = (async () => {
              const db = getServiceClient();
              return await db
                .from('users')
                .select('language')
                .or(`id.eq.${fromId},id.eq.tg_${fromId},telegram_id.eq.${fromId}`)
                .limit(1)
                .maybeSingle();
            })();
            const resData = (await Promise.race([dbPromise, timeoutPromise])) as any;
            if (resData?.data?.language === 'ru') lang = 'ru';
          } catch {
            /* timeout bo'lsa yoki xato bersa standart o'zbek tilida davom etadi */
          }
        }

        const startParam = text.split(/\s+/)[1] || '';
        const quizId = startParam.startsWith('quiz_') ? startParam.replace('quiz_', '').trim() : '';
        const refId = startParam.startsWith('ref_') ? startParam.replace('ref_', '').trim() : '';
        const c = MESSAGES[lang] || MESSAGES.uz;

        let url = WEBAPP_URL;
        if (quizId) {
          url = `${WEBAPP_URL}?quiz_id=${encodeURIComponent(quizId)}`;
        } else if (refId) {
          url = `${WEBAPP_URL}?ref=${encodeURIComponent(refId)}`;
        }

        let welcomeText = c.welcome;
        if (quizId) {
          welcomeText = c.deepText;
        } else if (refId) {
          welcomeText =
            lang === 'ru'
              ? 'Здравствуйте! Добро пожаловать в платформу Yuksal Quiz по приглашению друга! 🎁\n\nРазвивайте свои знания день за днем с помощью тестов.'
              : "Assalomu alaykum! Do'stingiz taklifi bilan Yuksal Quiz platformasiga xush kelibsiz! 🎁\n\nKundan-kunga test orqali ilmingizni rivojlantiring.";
        }

        // 1-QADAM: Foydalanuvchi ekranidagi eski pastki ulkan tugmani (ReplyKeyboardMarkup) to'liq yo'qotish
        try {
          const cleanMsg = await tgCall('sendMessage', {
            chat_id: chatId,
            text: 'Yuksal Quiz 🚀',
            reply_markup: { remove_keyboard: true },
          });
          if (cleanMsg?.result?.message_id) {
            // Ushbu oraliq xabarni darhol o'chiramiz, chat toza qoladi
            await tgCall('deleteMessage', {
              chat_id: chatId,
              message_id: cleanMsg.result.message_id,
            });
          }
        } catch (cleanErr) {
          console.warn('remove_keyboard cleanup notice:', cleanErr);
        }

        // 2-QADAM: Asosiy chiroyli xush kelibsiz xabari (Inline WebApp tugmasi bilan)
        const sendPayload = {
          chat_id: chatId,
          parse_mode: 'HTML',
          text: welcomeText,
          reply_markup: {
            inline_keyboard: [[{ text: quizId ? c.deepLink : c.button, web_app: { url } }]],
          },
        };

        let sendRes = await tgCall('sendMessage', sendPayload);

        // Agar HTML parse xatosi yuz bersa, oddiy matn rejimida qayta jo'natamiz
        if (!sendRes?.ok) {
          console.warn('HTML sendMessage failed, trying plain text fallback:', sendRes?.description);
          await tgCall('sendMessage', {
            chat_id: chatId,
            text: welcomeText.replace(/<[^>]*>/g, ''),
            reply_markup: {
              inline_keyboard: [[{ text: quizId ? c.deepLink : c.button, web_app: { url } }]],
            },
          });
        }

        // 3-QADAM: Telegram pastki chap burchagidagi doimiy Menu Button ni sozlash
        await setMenuButton(chatId, c.button);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Unhandled Telegram webhook exception:', error);
    return res.status(200).json({ ok: true });
  }
}
