import { createClient } from '@supabase/supabase-js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '';
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://yuksalquiz.vercel.app';
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '6219808382';

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

const MESSAGES = {
  uz: {
    welcome: "Assalomu alaykum! Yuksal Quiz platformasiga xush kelibsiz.\n\nKundan-kunga test orqali ilmingizni rivojlantiring.",
    button: '🚀 Testni boshlash',
    menuText: '🚀 Testni boshlash',
  },
  ru: {
    welcome: "Здравствуйте! Добро пожаловать в платформу Yuksal Quiz.\n\nРазвивайте свои знания день за днем с помощью тестов.",
    button: '🚀 Начать тест',
    menuText: '🚀 Начать тест',
  },
};

/**
 * Configure Telegram chat menu button (bottom-left corner) to open Mini App
 */
async function configureChatMenuButton(chatId?: number | string, buttonText: string = '🚀 Testni boshlash') {
  if (!BOT_TOKEN) return;
  try {
    const payload: Record<string, any> = {
      menu_button: {
        type: 'web_app',
        text: buttonText,
        web_app: { url: WEBAPP_URL },
      },
    };
    if (chatId) {
      payload.chat_id = chatId;
    }
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('configureChatMenuButton error:', err);
  }
}

/**
 * Answer Telegram callback query helper
 */
async function answerCallback(queryId: string, text: string, showAlert: boolean = false) {
  if (!BOT_TOKEN || !queryId) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: queryId,
        text,
        show_alert: showAlert,
      }),
    });
  } catch (err) {
    console.error('answerCallback error:', err);
  }
}

/**
 * Send message to chat helper
 */
async function sendMessage(chatId: number | string, text: string, parseMode: string = 'HTML') {
  if (!BOT_TOKEN || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      }),
    });
  } catch (err) {
    console.error('sendMessage error:', err);
  }
}

export default async function handler(req: any, res: any) {
  // CORS Configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(200).send('YuksalQuiz Telegram Bot Webhook Active');
  }

  try {
    const update = req.body;
    if (!update || typeof update !== 'object') {
      return res.status(200).json({ ok: true });
    }

    // 1. Direct Admin Broadcast requests
    if (update.action === 'send_broadcast' || update.action === 'broadcast') {
      const { chatIds, title, message, link } = update;
      if (!BOT_TOKEN) {
        return res.status(200).json({ ok: false, error: 'TELEGRAM_BOT_TOKEN missing on server' });
      }
      if (!Array.isArray(chatIds) || chatIds.length === 0) {
        return res.status(200).json({ ok: false, error: 'chatIds array required' });
      }

      const header = title ? `📢 <b>${title}</b>\n\n` : '';
      const body = `${header}${message || ''}`;
      const inline_keyboard: any[] = [];
      if (link) {
        inline_keyboard.push([{ text: '🔗 Havolani ochish', url: link }]);
      }
      inline_keyboard.push([{ text: '🚀 Testni boshlash (Mini App)', web_app: { url: WEBAPP_URL } }]);

      const results = { sent: 0, failed: 0 };
      for (const id of chatIds) {
        const clean = String(id).replace(/^tg_/, '').replace(/^user_/, '').trim();
        if (!/^\d+$/.test(clean)) {
          results.failed++;
          continue;
        }
        try {
          const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: clean,
              text: body,
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard },
            }),
          });
          const d = await resp.json();
          if (d.ok) results.sent++;
          else results.failed++;
        } catch (e) {
          results.failed++;
        }
      }
      return res.status(200).json({ ok: true, results });
    }

    // 2. Handle Telegram Webhook Callback Queries (Admin moderation buttons)
    if (update.callback_query) {
      const cq = update.callback_query;
      const data = String(cq.data || '');
      const queryId = cq.id;
      const fromId = cq.from?.id ? String(cq.from.id) : '';
      const chatId = cq.message?.chat?.id;

      // SECURITY: Faqat ADMIN_TELEGRAM_ID dan kelgan so'rov qabul qilinsin!
      const isAuthorizedAdmin =
        fromId === ADMIN_TELEGRAM_ID ||
        fromId === '6219808382' ||
        fromId === '117932388';

      if (!isAuthorizedAdmin) {
        await answerCallback(queryId, "⚠️ Sizda admin huquqi yo'q!", true);
        return res.status(200).json({ ok: true });
      }

      // Action 1: [⚠️ Balansni 0 qilish] -> callback_data: reset_balance:{user_id}
      if (data.startsWith('reset_balance:')) {
        const targetUserId = data.replace('reset_balance:', '').trim();

        if (targetUserId) {
          try {
            // Supabase'da users.balance = 0 va wallet_balance = 0 qilinsin
            await supabase
              .from('users')
              .update({
                balance: 0,
                wallet_balance: 0,
                updated_at: new Date().toISOString(),
              })
              .eq('id', targetUserId);

            try {
              await supabase
                .from('user_profiles')
                .update({ balance: 0, wallet_balance: 0 })
                .eq('id', targetUserId);
            } catch {}

            // Adminga javob qaytarish
            await answerCallback(queryId, "✅ Balans 0 ga tushirildi", true);

            if (chatId) {
              await sendMessage(
                chatId,
                `⚠️ <b>Harakat bajarildi:</b>\nFoydalanuvchi <code>${targetUserId}</code> balansi <b>0 so'm</b>ga tushirildi!`
              );
            }
          } catch (dbErr) {
            console.error('Error resetting balance:', dbErr);
            await answerCallback(queryId, "Xatolik yuz berdi", true);
          }
        }
        return res.status(200).json({ ok: true });
      }

      // Action 2: [🚫 Foydalanuvchini bloklash] -> callback_data: ban_user:{user_id}
      if (data.startsWith('ban_user:')) {
        const targetUserId = data.replace('ban_user:', '').trim();

        if (targetUserId) {
          try {
            // Supabase'da users.is_blocked = true qilinsin
            await supabase
              .from('users')
              .update({
                is_blocked: true,
                updated_at: new Date().toISOString(),
              })
              .eq('id', targetUserId);

            try {
              await supabase
                .from('user_profiles')
                .update({ is_blocked: true })
                .eq('id', targetUserId);
            } catch {}

            // Adminga "🚫 Foydalanuvchi ilovadan bloklandi" deb javob qaytarish
            await answerCallback(queryId, "🚫 Foydalanuvchi ilovadan bloklandi", true);

            if (chatId) {
              await sendMessage(
                chatId,
                `🚫 <b>Harakat bajarildi:</b>\nFoydalanuvchi <code>${targetUserId}</code> ilovadan to'liq bloklandi!`
              );
            }
          } catch (dbErr) {
            console.error('Error banning user:', dbErr);
            await answerCallback(queryId, "Xatolik yuz berdi", true);
          }
        }
        return res.status(200).json({ ok: true });
      }

      // Action 3: Legacy Pending Payment Approve / Reject
      if (data.startsWith('approve_pay_') || data.startsWith('reject_pay_')) {
        const isApprove = data.startsWith('approve_pay_');
        const paymentId = data.replace(isApprove ? 'approve_pay_' : 'reject_pay_', '');

        if (paymentId) {
          try {
            const { data: payRow } = await supabase
              .from('payments')
              .select('*')
              .eq('id', paymentId)
              .maybeSingle();

            const targetUserId = payRow?.user_id || '';
            const targetAmount = Number(payRow?.amount) || 0;

            await supabase
              .from('payments')
              .update({
                status: isApprove ? 'approved' : 'rejected',
                notes: `Admin (${fromId}) tomonidan: ${new Date().toISOString()}`,
              })
              .eq('id', paymentId);

            if (isApprove && targetUserId && targetAmount > 0) {
              const { data: userRow } = await supabase
                .from('users')
                .select('balance, wallet_balance')
                .eq('id', targetUserId)
                .maybeSingle();

              const currentBal = Number(userRow?.balance ?? userRow?.wallet_balance ?? 0);
              const newBal = currentBal + targetAmount;

              await supabase.from('users').upsert({
                id: targetUserId,
                balance: newBal,
                wallet_balance: newBal,
                updated_at: new Date().toISOString(),
              });
            }

            await answerCallback(
              queryId,
              isApprove ? "✅ To'lov muvaffaqiyatli tasdiqlandi!" : "❌ To'lov rad etildi!"
            );
          } catch (dbErr) {
            console.error('Error approving payment:', dbErr);
          }
        }
        return res.status(200).json({ ok: true });
      }
    }

    // 3. Handle /start and User Text Messages
    if (update.message) {
      const msg = update.message;
      const text = (msg.text || '').trim();
      const chatId = msg.chat?.id;
      const fromId = msg.from?.id ? String(msg.from.id) : '';

      if (
        text.startsWith('/start') ||
        text === '🚀 Testni boshlash' ||
        text === '🚀 Начать тест' ||
        text === '🚀 Start Quiz' ||
        text === '📱 Ilovani ochish'
      ) {
        let userLang: 'uz' | 'ru' = 'uz';

        if (fromId) {
          try {
            const { data: userRow } = await supabase
              .from('users')
              .select('language')
              .or(`id.eq.${fromId},id.eq.tg_${fromId},id.eq.user_${fromId}`)
              .maybeSingle();

            if (userRow?.language === 'ru') {
              userLang = 'ru';
            }
          } catch (dbErr) {
            console.error('Supabase user language fetch error:', dbErr);
          }
        }

        const content = MESSAGES[userLang] || MESSAGES.uz;

        const payload = {
          chat_id: chatId,
          text: content.welcome,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: content.button,
                  web_app: { url: WEBAPP_URL },
                },
              ],
            ],
            keyboard: [
              [
                {
                  text: content.button,
                  web_app: { url: WEBAPP_URL },
                },
              ],
            ],
            resize_keyboard: true,
          },
        };

        if (BOT_TOKEN) {
          try {
            await Promise.allSettled([
              fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              }),
              configureChatMenuButton(chatId, content.menuText),
            ]);
          } catch (sendErr) {
            console.error('Failed to send Telegram message:', sendErr);
          }
        }
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Unhandled Telegram webhook exception:', error);
    return res.status(200).json({ ok: true });
  }
}
