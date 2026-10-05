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
 * Send message to any chat
 */
async function sendTelegramMessage(chatId: number | string, text: string, parseMode: string = 'HTML') {
  if (!BOT_TOKEN || !chatId) return false;
  try {
    const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      }),
    });
    const data = await resp.json();
    return Boolean(data.ok);
  } catch (err) {
    console.error('sendTelegramMessage error:', err);
    return false;
  }
}

/**
 * Extracts clean numeric Telegram chat ID from user ID
 */
function extractTelegramChatId(userId: string): string | null {
  if (!userId) return null;
  const clean = String(userId).replace(/^tg_/, '').replace(/^user_/, '').trim();
  if (/^\d+$/.test(clean)) {
    return clean;
  }
  return null;
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

    // 2. Handle Telegram Webhook Callback Queries (Admin Moderation Flow)
    if (update.callback_query) {
      const cq = update.callback_query;
      const data = String(cq.data || '');
      const queryId = cq.id;
      const fromId = cq.from?.id ? String(cq.from.id) : '';
      const chatId = cq.message?.chat?.id;
      const messageId = cq.message?.message_id;

      // SECURITY: Faqat ADMIN_TELEGRAM_ID dan kelgan so'rov qabul qilinsin!
      const isAuthorizedAdmin =
        fromId === ADMIN_TELEGRAM_ID ||
        fromId === '6219808382' ||
        fromId === '117932388';

      if (!isAuthorizedAdmin) {
        await answerCallback(queryId, "⚠️ Sizda admin huquqi yo'q!", true);
        return res.status(200).json({ ok: true });
      }

      // ---------------------------------------------------------------------
      // 2.1 [✅ Hammasi to'g'ri] -> callback_data: noop_archive
      // ---------------------------------------------------------------------
      if (data === 'noop_archive') {
        // Faqat adminga tasdiq beradi, talabaga xabar bormaydi
        await answerCallback(queryId, "✅ Tasdiqlandi (Arxivlandi)", false);

        if (chatId && messageId && BOT_TOKEN) {
          // Remove buttons or update caption
          try {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageReplyMarkup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '✅ Tasdiqlangan (Arxivda)', callback_data: 'noop_done' }],
                  ],
                },
              }),
            });
          } catch {}
        }
        return res.status(200).json({ ok: true });
      }

      // ---------------------------------------------------------------------
      // 2.2 [⚠️️ Ogohlantirish + Balansni 0] -> callback_data: warn_reset:{user_id}:{payment_id}
      // ---------------------------------------------------------------------
      if (data.startsWith('warn_reset:') || data.startsWith('reset_balance:')) {
        const parts = data.split(':');
        const targetUserId = parts[1]?.trim() || '';
        const paymentId = parts[2]?.trim() || '';

        if (targetUserId) {
          try {
            // 1. users.balance = 0 bo'lsin
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

            if (paymentId) {
              await supabase
                .from('payments')
                .update({
                  status: 'warn_reset',
                  notes: `Admin ogohlantirdi va balansni 0 qildi (${new Date().toISOString()})`,
                })
                .eq('id', paymentId);
            }

            // 2. Bot orqali ushbu foydalanuvchiga Telegram xabari yuborilsin
            const userChatId = extractTelegramChatId(targetUserId);
            if (userChatId) {
              const warningText =
                "⚠️ <b>DIQQAT:</b> Siz yuborgan to'lov kvitansiyasida soxtalik yoki qoidabuzarlik aniqlandi. " +
                "Balansingiz 0 ga tushirildi. Qoidabuzarlik takrorlansa, hisobingiz butunlay bloklanadi!";
              await sendTelegramMessage(userChatId, warningText);
            }

            // 3. Adminga xabar qaytsin
            await answerCallback(
              queryId,
              "⚠️ Foydalanuvchiga ogohlantirish yuborildi va balansi 0 qilindi",
              true
            );

            if (chatId) {
              await sendTelegramMessage(
                chatId,
                `⚠️ <b>OGOHLANTIRISH BAJARILDI:</b>\nTalaba <code>${targetUserId}</code> balansi <b>0 so'm</b>ga tushirildi va bot orqali qat'iy ogohlantirish yuborildi.`
              );
            }
          } catch (dbErr) {
            console.error('Error in warn_reset:', dbErr);
            await answerCallback(queryId, "Xatolik yuz berdi", true);
          }
        }
        return res.status(200).json({ ok: true });
      }

      // ---------------------------------------------------------------------
      // 2.3 [🚫 Bloklash] -> callback_data: ban_user:{user_id}
      // ---------------------------------------------------------------------
      if (data.startsWith('ban_user:')) {
        const targetUserId = data.replace('ban_user:', '').trim();

        if (targetUserId) {
          try {
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

            await answerCallback(queryId, "🚫 Foydalanuvchi ilovadan bloklandi", true);

            if (chatId) {
              await sendTelegramMessage(
                chatId,
                `🚫 <b>BLOKLANDI:</b>\nFoydalanuvchi <code>${targetUserId}</code> ilovadan butunlay bloklandi.`
              );
            }
          } catch (dbErr) {
            console.error('Error banning user:', dbErr);
            await answerCallback(queryId, "Xatolik yuz berdi", true);
          }
        }
        return res.status(200).json({ ok: true });
      }

      // ---------------------------------------------------------------------
      // 2.4 [✅ Tasdiqlash (Balansga qo'shish)] -> callback_data: manual_approve:{user_id}:{payment_id}
      // ---------------------------------------------------------------------
      if (data.startsWith('manual_approve:')) {
        const parts = data.split(':');
        const targetUserId = parts[1]?.trim() || '';
        const paymentId = parts[2]?.trim() || '';

        if (targetUserId) {
          try {
            let amount = 20000;

            if (paymentId) {
              const { data: payRow } = await supabase
                .from('payments')
                .select('*')
                .eq('id', paymentId)
                .maybeSingle();

              if (payRow?.amount) {
                amount = Number(payRow.amount);
              }

              // Update payment status
              await supabase
                .from('payments')
                .update({
                  status: 'manual_approved',
                  verified_by: 'admin',
                  notes: `Admin (${fromId}) tomonidan tasdiqlandi: ${new Date().toISOString()}`,
                })
                .eq('id', paymentId);
            }

            // Chekdagi summa users.balance ga qo'shilsin
            let currentBal = 0;
            const { data: userRow } = await supabase
              .from('users')
              .select('balance, wallet_balance')
              .eq('id', targetUserId)
              .maybeSingle();

            if (userRow) {
              currentBal = Number(userRow.balance ?? userRow.wallet_balance ?? 0);
            }
            const newBal = currentBal + amount;

            await supabase.from('users').upsert({
              id: targetUserId,
              balance: newBal,
              wallet_balance: newBal,
              updated_at: new Date().toISOString(),
            });

            // Talabaga xabar yuborilsin
            const userChatId = extractTelegramChatId(targetUserId);
            if (userChatId) {
              await sendTelegramMessage(
                userChatId,
                "✅ <b>Kvitansiyangiz administrator tomonidan tasdiqlandi va hisobingiz to'ldirildi!</b>"
              );
            }

            await answerCallback(
              queryId,
              `✅ To'lov tasdiqlandi (+${amount.toLocaleString('uz-UZ')} so'm)!`,
              true
            );

            if (chatId) {
              await sendTelegramMessage(
                chatId,
                `✅ <b>TASDIQLANDI:</b>\nTalaba <code>${targetUserId}</code> hisobiga <b>+${amount.toLocaleString(
                  'uz-UZ'
                )} so'm</b> qo'shildi va talabaga tasdiq xabari yuborildi.`
              );
            }
          } catch (dbErr) {
            console.error('Error in manual_approve:', dbErr);
            await answerCallback(queryId, "Xatolik yuz berdi", true);
          }
        }
        return res.status(200).json({ ok: true });
      }

      // ---------------------------------------------------------------------
      // 2.5 [❌ Soxta / Rad etish] -> callback_data: manual_reject:{user_id}:{payment_id}
      // ---------------------------------------------------------------------
      if (data.startsWith('manual_reject:')) {
        const parts = data.split(':');
        const targetUserId = parts[1]?.trim() || '';
        const paymentId = parts[2]?.trim() || '';

        if (targetUserId) {
          try {
            if (paymentId) {
              await supabase
                .from('payments')
                .update({
                  status: 'manual_rejected',
                  verified_by: 'admin',
                  notes: `Admin (${fromId}) tomonidan rad etildi: ${new Date().toISOString()}`,
                })
                .eq('id', paymentId);
            }

            // Talabaga xabar yuborilsin
            const userChatId = extractTelegramChatId(targetUserId);
            if (userChatId) {
              await sendTelegramMessage(
                userChatId,
                "❌ <b>Siz yuborgan to'lov kvitansiyasi tasdiqlanmadi. Iltimos, haqiqiy to'lov chekini yuklang.</b>"
              );
            }

            await answerCallback(queryId, "❌ Kvitansiya rad etildi!", true);

            if (chatId) {
              await sendTelegramMessage(
                chatId,
                `❌ <b>RAD ETILDI:</b>\nTalaba <code>${targetUserId}</code> kvitansiyasi rad etildi va ogohlantirish yuborildi.`
              );
            }
          } catch (dbErr) {
            console.error('Error in manual_reject:', dbErr);
            await answerCallback(queryId, "Xatolik yuz berdi", true);
          }
        }
        return res.status(200).json({ ok: true });
      }

      // 2.6 Legacy approve / reject fallback support
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
              isApprove ? "✅ To'lov tasdiqlandi!" : "❌ To'lov rad etildi!"
            );
          } catch (dbErr) {
            console.error('Error in legacy approve:', dbErr);
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

        const parts = text.split(/\s+/);
        const startParam = parts[1] || '';
        let quizDeepId = '';
        if (startParam.startsWith('quiz_')) {
          quizDeepId = startParam.replace('quiz_', '').trim();
        }

        const content = MESSAGES[userLang] || MESSAGES.uz;
        let welcomeText = content.welcome;
        let targetWebAppUrl = WEBAPP_URL;

        if (quizDeepId) {
          targetWebAppUrl = `${WEBAPP_URL}?quiz_id=${encodeURIComponent(quizDeepId)}`;
          welcomeText =
            userLang === 'ru'
              ? `📚 <b>Вам отправлен тест!</b>\n\nНажмите кнопку ниже, чтобы открыть и пройти тест:`
              : `📚 <b>Sizga maxsus test ulashildi!</b>\n\nTestni boshlash va bilimingizni sinash uchun quyidagi tugmani bosing:`;
        }

        const payload = {
          chat_id: chatId,
          text: welcomeText,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: quizDeepId ? (userLang === 'ru' ? '🎯 Тестни бошлаш' : '🎯 Testni boshlash') : content.button,
                  web_app: { url: targetWebAppUrl },
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
