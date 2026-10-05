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

    // 1. Handle direct Admin Broadcast requests
    if (update.action === 'send_broadcast' || update.action === 'broadcast') {
      const { chatIds, title, message, link } = update;
      if (!BOT_TOKEN) {
        console.error('Admin broadcast failed: TELEGRAM_BOT_TOKEN missing on server');
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
          console.error(`Error sending broadcast to ${clean}:`, e);
          results.failed++;
        }
      }
      return res.status(200).json({ ok: true, results });
    }

    // 2. Handle Admin Inline Keyboard Callbacks (Payment approval & rejection)
    if (update.callback_query) {
      const cq = update.callback_query;
      const data = cq.data || '';
      const queryId = cq.id;
      const fromId = cq.from?.id ? String(cq.from.id) : '';
      const messageId = cq.message?.message_id;
      const chatId = cq.message?.chat?.id;

      if (data.startsWith('approve_pay_') || data.startsWith('reject_pay_')) {
        const isApprove = data.startsWith('approve_pay_');
        const paymentId = data.replace(isApprove ? 'approve_pay_' : 'reject_pay_', '');

        // Verify Admin permissions
        const adminIds = ['6219808382', '117932388', ADMIN_TELEGRAM_ID].filter(Boolean);
        if (!adminIds.includes(fromId)) {
          if (BOT_TOKEN && queryId) {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: queryId,
                text: "⚠️ Sizda to'lovni tasdiqlash huquqi yo'q!",
                show_alert: true,
              }),
            }).catch((e) => console.error('answerCallbackQuery error:', e));
          }
          return res.status(200).json({ ok: true });
        }

        let targetUserId = '';
        let targetAmount = 35000;

        if (paymentId) {
          try {
            const { data: payRow } = await supabase
              .from('payments')
              .select('*')
              .eq('id', paymentId)
              .maybeSingle();

            if (payRow) {
              targetUserId = payRow.user_id || '';
              targetAmount = Number(payRow.amount) || 35000;
            }

            // Update payment record in Supabase
            await supabase
              .from('payments')
              .update({
                status: isApprove ? 'approved' : 'rejected',
                notes: isApprove
                  ? `Admin (${fromId}) tomonidan tasdiqlandi: ${new Date().toISOString()}`
                  : `Admin (${fromId}) tomonidan rad etildi: ${new Date().toISOString()}`,
              })
              .eq('id', paymentId);

            // If approved, update user balance in Supabase (balance = balance + amount)
            if (isApprove && targetUserId) {
              let currentBal = 0;
              const { data: userRow } = await supabase
                .from('users')
                .select('balance, wallet_balance')
                .eq('id', targetUserId)
                .maybeSingle();

              if (userRow) {
                currentBal = Number(userRow.balance ?? userRow.wallet_balance ?? 0);
              }
              const newBal = currentBal + targetAmount;

              await supabase.from('users').upsert({
                id: targetUserId,
                balance: newBal,
                wallet_balance: newBal,
                updated_at: new Date().toISOString(),
              });

              try {
                await supabase.from('user_profiles').upsert({
                  id: targetUserId,
                  balance: newBal,
                  wallet_balance: newBal,
                });
              } catch {}
            }
          } catch (dbErr) {
            console.error('Error updating payment approval in Supabase:', dbErr);
          }
        }

        // Answer Telegram Callback Query
        if (BOT_TOKEN && queryId) {
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: queryId,
              text: isApprove ? "✅ To'lov muvaffaqiyatli tasdiqlandi!" : "❌ To'lov rad etildi!",
            }),
          }).catch((e) => console.error('answerCallbackQuery error:', e));
        }

        // Edit Telegram original message to remove buttons and append status
        if (BOT_TOKEN && chatId && messageId) {
          const originalText = cq.message?.text || '';
          const statusBadge = isApprove
            ? `\n\n✅ <b>ADMIN TOMONIDAN TASDIQLANDI</b> (${new Date().toLocaleTimeString('uz-UZ')})`
            : `\n\n❌ <b>ADMIN TOMONIDAN RAD ETILDI</b> (${new Date().toLocaleTimeString('uz-UZ')})`;

          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: `${originalText}${statusBadge}`,
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: [] },
            }),
          }).catch((e) => console.error('editMessageText error:', e));
        }

        // Send congratulations message directly to student if valid Telegram chat_id
        if (isApprove && targetUserId && BOT_TOKEN) {
          const cleanUserChatId = String(targetUserId).replace(/^tg_/, '').replace(/^user_/, '').trim();
          if (/^\d+$/.test(cleanUserChatId)) {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: cleanUserChatId,
                text: `🎉 <b>Tabriklaymiz! To'lovingiz admin tomonidan tasdiqlandi!</b>\n\nHisobingizga <b>+${targetAmount.toLocaleString('uz-UZ')} so'm</b> qo'shildi. Endi istalgan test va tariflarni hisobingizdan bemalol faollashtirishingiz mumkin!`,
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '🚀 Testlarni boshlash', web_app: { url: WEBAPP_URL } }],
                  ],
                },
              }),
            }).catch((e) => console.error('sendMessage to user error:', e));
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
        text === '📱 Ilovani ochish' ||
        text === '📱 Открыть приложение' ||
        text === '📱 Open App'
      ) {
        // Birlamchi standart til (default language) qat'iy ravishda O'ZBEK TILI
        let userLang: 'uz' | 'ru' = 'uz';

        // Supabase users jadvalidan foydalanuvchining tanlangan tilini tekshirish
        if (fromId) {
          try {
            const { data: userRow, error: userErr } = await supabase
              .from('users')
              .select('language')
              .or(`id.eq.${fromId},id.eq.tg_${fromId},id.eq.user_${fromId}`)
              .maybeSingle();

            if (!userErr && userRow?.language === 'ru') {
              userLang = 'ru';
            }
          } catch (dbErr) {
            console.error('Supabase user language fetch error:', dbErr);
          }
        }

        const content = MESSAGES[userLang] || MESSAGES.uz;

        // Send Welcome Message with Inline WebApp Button
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
    // Always return 200 OK so Telegram does not get stuck in a retry loop
    return res.status(200).json({ ok: true });
  }
}
