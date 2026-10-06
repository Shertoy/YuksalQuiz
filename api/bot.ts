import {
  BOT_TOKEN,
  WEBAPP_URL,
  getServiceClient,
  isAdminId,
  cleanId,
  escapeHtml,
  tgSend,
} from './_lib/common';

/**
 * Telegram bot webhook.
 *
 * Xavfsizlik:
 *  - Admin tugmalari va admin buyruqlari faqat TELEGRAM_WEBHOOK_SECRET sozlangan
 *    va so'rov Telegram'dan kelgani tasdiqlangan holatda ishlaydi.
 *    (Aks holda har kim "from.id = admin" deb soxta so'rov yuborishi mumkin.)
 *  - Admin ID lar faqat ADMIN_TELEGRAM_IDS env o'zgaruvchisidan olinadi.
 *  - Pul faqat bazadagi approve_payment funksiyasi orqali, bir marta qo'shiladi.
 */

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
  if (!BOT_TOKEN) return null;
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await r.json();
  } catch (err) {
    console.error(`${method} error:`, err);
    return null;
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
function parseAction(data: string): { kind: string; arg: string } {
  const uuid = data.match(UUID_RE)?.[0] || '';
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
  return { kind: 'unknown', arg: '' };
}

async function handleAdminCallback(cq: any) {
  const db = getServiceClient();
  const fromId = String(cq.from?.id || '');
  const chatId = cq.message?.chat?.id;
  const messageId = cq.message?.message_id;
  const { kind, arg } = parseAction(String(cq.data || ''));

  if (kind === 'archive') {
    await answerCallback(cq.id, "Tasdiqlandi (arxivlandi)");
    await markHandled(chatId, messageId, 'Tasdiqlangan (arxivda)');
    return;
  }

  if (kind === 'approve') {
    if (!arg) return void (await answerCallback(cq.id, "To'lov ID topilmadi", true));
    const { data, error } = await db.rpc('approve_payment', {
      p_payment_id: arg,
      p_actor: fromId,
      p_status: 'manual_approved',
    });
    if (error) {
      console.error('approve_payment error:', error.message);
      return void (await answerCallback(cq.id, `Xatolik: ${error.message}`, true));
    }
    if (!data?.ok) {
      const why =
        data?.reason === 'already_processed'
          ? `Bu to'lov allaqachon ko'rib chiqilgan (${data.status})`
          : data?.reason === 'user_not_found'
            ? 'Foydalanuvchi bazadan topilmadi'
            : `Bajarilmadi: ${data?.reason}`;
      return void (await answerCallback(cq.id, why, true));
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
    if (error) return void (await answerCallback(cq.id, `Xatolik: ${error.message}`, true));
    if (!data?.ok) {
      return void (await answerCallback(cq.id, `Allaqachon ko'rib chiqilgan (${data?.status || data?.reason})`, true));
    }
    await answerCallback(cq.id, 'Kvitansiya rad etildi', true);
    await markHandled(chatId, messageId, 'Rad etildi');
    await tgSend(data.user_id, "Siz yuborgan to'lov kvitansiyasi tasdiqlanmadi. Iltimos, haqiqiy chekni yuklang.");
    return;
  }

  if (kind === 'reverse') {
    if (!arg) return void (await answerCallback(cq.id, "To'lov ID topilmadi", true));
    const { data, error } = await db.rpc('reverse_payment', { p_payment_id: arg, p_actor: fromId });
    if (error) return void (await answerCallback(cq.id, `Xatolik: ${error.message}`, true));
    if (!data?.ok) {
      return void (await answerCallback(cq.id, `Bajarilmadi: ${data?.reason}`, true));
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

  if (data_isDone(cq.data)) return void (await answerCallback(cq.id, 'Bu allaqachon bajarilgan'));
  await answerCallback(cq.id, "Noma'lum amal");
}

function data_isDone(d: string) {
  return d === 'noop_done';
}

async function handleAdminMessage(msg: any): Promise<boolean> {
  const text = (msg.text || '').trim();
  const chatId = msg.chat?.id;
  if (!text) return false;

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

  const db = getServiceClient();
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
    return res.status(200).send('YuksalQuiz Telegram Bot Webhook Active');
  }

  try {
    const update = req.body;
    if (!update || typeof update !== 'object') return res.status(200).json({ ok: true });

    // Telegram'dan kelgani tasdiqlanganmi?
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET || '';
    const headerSecret = String(req.headers?.['x-telegram-bot-api-secret-token'] || '');
    const trusted = Boolean(secret) && headerSecret === secret;

    // 1. Admin tugmalari
    if (update.callback_query) {
      const cq = update.callback_query;
      if (!trusted) {
        console.error('TELEGRAM_WEBHOOK_SECRET sozlanmagan yoki noto\'g\'ri: admin tugmasi rad etildi');
        await answerCallback(cq.id, 'Server sozlamasi to\'liq emas (webhook secret)', true);
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

    // 2. Oddiy xabarlar
    if (update.message) {
      const msg = update.message;
      const text = (msg.text || '').trim();
      const chatId = msg.chat?.id;
      const fromId = msg.from?.id ? String(msg.from.id) : '';

      if (trusted && isAdminId(fromId) && (await handleAdminMessage(msg))) {
        return res.status(200).json({ ok: true });
      }

      const isStart =
        text.startsWith('/start') ||
        ['🚀 Testni boshlash', '🚀 Начать тест', '🚀 Start Quiz', '📱 Ilovani ochish'].includes(text);

      if (isStart && chatId) {
        let lang: 'uz' | 'ru' = 'uz';
        if (fromId) {
          try {
            const db = getServiceClient();
            const { data: row } = await db
              .from('users')
              .select('language')
              .or(`id.eq.${fromId},id.eq.tg_${fromId},telegram_id.eq.${fromId}`)
              .limit(1)
              .maybeSingle();
            if ((row as any)?.language === 'ru') lang = 'ru';
          } catch {
            /* til olinmasa o'zbekcha davom etadi */
          }
        }

        const startParam = text.split(/\s+/)[1] || '';
        const quizId = startParam.startsWith('quiz_') ? startParam.replace('quiz_', '').trim() : '';
        const c = MESSAGES[lang];
        const url = quizId ? `${WEBAPP_URL}?quiz_id=${encodeURIComponent(quizId)}` : WEBAPP_URL;

        await Promise.allSettled([
          tgCall('sendMessage', {
            chat_id: chatId,
            parse_mode: 'HTML',
            text: quizId ? c.deepText : c.welcome,
            reply_markup: {
              inline_keyboard: [[{ text: quizId ? c.deepLink : c.button, web_app: { url } }]],
            },
          }),
          setMenuButton(chatId, c.button),
        ]);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Unhandled Telegram webhook exception:', error);
    return res.status(200).json({ ok: true });
  }
}
