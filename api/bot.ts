import { createClient } from '@supabase/supabase-js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '';
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://yuksalquiz.vercel.app';
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '7847500525';

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
        fromId === '7847500525' ||
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

        try {
          let amount = 20000;
          let paymentUserId = targetUserId;

          // 1. To'lov yozuvidan user_id (telegram_id) va amount ni aniq raqam (Number) ko'rinishida oling
          if (paymentId) {
            const { data: payRow, error: payErr } = await supabase
              .from('payments')
              .select('id, user_id, amount, status')
              .eq('id', paymentId)
              .maybeSingle();

            if (payErr) {
              console.warn('[manual_approve] Error fetching payment:', payErr.message);
            }

            if (payRow) {
              if (payRow.amount !== undefined && payRow.amount !== null) {
                amount = Number(payRow.amount) || 20000;
              }
              if (payRow.user_id) {
                paymentUserId = String(payRow.user_id).trim();
              }
            }
          }

          const cleanId = String(paymentUserId || targetUserId)
            .replace(/^tg_/, '')
            .replace(/^user_/, '')
            .trim();
          const rawId = String(paymentUserId || targetUserId).trim();
          const tgPrefixedId = `tg_${cleanId}`;

          // 2. Foydalanuvchini users jadvalida telegram_id = $user_id OR id = $user_id sharti bilan topish
          let { data: foundUsers, error: userFetchErr } = await supabase
            .from('users')
            .select('id, telegram_id, balance, wallet_balance, full_name, name')
            .or(`id.eq.${rawId},id.eq.${cleanId},id.eq.${tgPrefixedId},telegram_id.eq.${cleanId},telegram_id.eq.${rawId}`);

          if (userFetchErr) {
            console.warn('[manual_approve] Error searching users with OR clause:', userFetchErr.message);
          }

          if (!foundUsers || foundUsers.length === 0) {
            const { data: directById } = await supabase
              .from('users')
              .select('id, telegram_id, balance, wallet_balance, full_name, name')
              .eq('id', rawId);
            if (directById && directById.length > 0) {
              foundUsers = directById;
            }
          }

          // 3. Agar yangilangan qatorlar soni 0 bo'lsa (foydalanuvchi topilmasa)
          if (!foundUsers || foundUsers.length === 0) {
            console.error(`[manual_approve] Xatolik: Foydalanuvchi bazadan topilmadi! user_id: ${targetUserId}, paymentId: ${paymentId}`);
            await answerCallback(queryId, "⚠️ Foydalanuvchi bazadan topilmadi", true);
            if (chatId) {
              await sendTelegramMessage(
                chatId,
                `⚠️ <b>XATOLIK:</b> Foydalanuvchi bazadan topilmadi!\n` +
                `🆔 Telegram ID: <code>${targetUserId}</code>\n` +
                `🧾 To'lov ID: <code>${paymentId}</code>`
              );
            }
            return res.status(200).json({ ok: true });
          }

          // 4. Balansni yangilash: SET balance = COALESCE(balance, 0) + $amount
          let updatedCount = 0;
          for (const userRow of foundUsers) {
            const curBal = Number(userRow.balance ?? userRow.wallet_balance ?? 0);
            const newBal = curBal + amount;

            const { error: updateErr } = await supabase
              .from('users')
              .update({
                balance: newBal,
                wallet_balance: newBal,
                telegram_id: userRow.telegram_id || cleanId,
                updated_at: new Date().toISOString(),
              })
              .eq('id', userRow.id);

            if (updateErr) {
              console.error(`[manual_approve] User update error for id ${userRow.id}:`, updateErr.message);
            } else {
              updatedCount++;
            }
          }

          if (updatedCount === 0) {
            console.error(`[manual_approve] Qatorlar soni 0: Yangilash amalga oshmadi (${targetUserId})`);
            await answerCallback(queryId, "⚠️ Foydalanuvchi balansi yangilanmadi", true);
            return res.status(200).json({ ok: true });
          }

          // 5. payments jadvalidagi statusni 'approved' ga o'zgartirish va user_id aniq Telegram ID bo'lishini ta'minlash
          if (paymentId) {
            const { error: payUpdateErr } = await supabase
              .from('payments')
              .update({
                user_id: cleanId,
                status: 'approved',
                verified_by: 'admin',
                notes: `Admin (${fromId}) tomonidan tasdiqlandi: ${new Date().toISOString()}`,
              })
              .eq('id', paymentId);

            if (payUpdateErr) {
              console.warn('[manual_approve] Payment status update warning:', payUpdateErr.message);
            }
          }

          // 6. Talabaning shaxsiy Telegramiga xabar yuborilsin
          const userChatId = extractTelegramChatId(targetUserId) || cleanId;
          if (userChatId) {
            await sendTelegramMessage(
              userChatId,
              `✅ To'lovingiz tasdiqlandi! Hisobingizga ${amount.toLocaleString('uz-UZ')} so'm muvaffaqiyatli o'tkazildi.`
            );
          }

          // 7. Adminga tasdiq
          await answerCallback(
            queryId,
            `✅ To'lov tasdiqlandi (+${amount.toLocaleString('uz-UZ')} so'm)!`,
            true
          );

          if (chatId) {
            await sendTelegramMessage(
              chatId,
              `✅ <b>TASDIQLANDI:</b>\nTalaba <code>${cleanId}</code> hisobiga <b>+${amount.toLocaleString(
                'uz-UZ'
              )} so'm</b> qo'shildi va to'lov statusi 'approved' ga o'tkazildi.`
            );
          }

        } catch (dbErr) {
          console.error('Error in manual_approve:', dbErr);
          await answerCallback(queryId, "Xatolik yuz berdi", true);
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

      // ---------------------------------------------------------------------
      // 2.7 [💬 Javob yozish] -> callback_data: reply_support:{user_id}
      // ---------------------------------------------------------------------
      if (data.startsWith('reply_support:')) {
        const targetUserId = data.replace('reply_support:', '').trim();
        await answerCallback(queryId, "Talabaga javob yozish ochildi", false);

        if (chatId && BOT_TOKEN) {
          try {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `✏️ <b>Talabaga javob yozish</b>\n\nTalaba Telegram ID: <code>${targetUserId}</code>\n\nIltimos, ushbu xabarga <b>Reply</b> (javob) qilib yoki <code>/reply ${targetUserId} &lt;matn&gt;</code> ko'rinishida yuboring:`,
                parse_mode: 'HTML',
                reply_markup: {
                  force_reply: true,
                  selective: true,
                },
              }),
            });
          } catch (replyPromptErr) {
            console.error('Error sending force_reply prompt:', replyPromptErr);
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

      // 3.0 Check if Authorized Admin is sending a support reply
      const isAdminSender =
        fromId === ADMIN_TELEGRAM_ID ||
        fromId === '7847500525' ||
        fromId === '6219808382' ||
        fromId === '117932388';

      if (isAdminSender && text) {
        let targetUserId = '';
        let replyBody = '';

        if (text.startsWith('/reply ')) {
          const parts = text.split(/\s+/);
          targetUserId = parts[1]?.trim() || '';
          replyBody = text.substring(text.indexOf(targetUserId) + targetUserId.length).trim();
        } else if (msg.reply_to_message) {
          const replyToText = msg.reply_to_message.text || msg.reply_to_message.caption || '';
          const idMatch = replyToText.match(/(?:Telegram\s+ID|ID):\s*(?:<code>|`|)?([a-zA-Z0-9_\-]+)(?:<\/code>|`|)?/i);
          if (idMatch && idMatch[1]) {
            targetUserId = idMatch[1].trim();
            replyBody = text.trim();
          }
        }

        if (targetUserId && replyBody) {
          try {
            await supabase.from('support_messages').insert({
              user_id: targetUserId,
              user_name: 'Administrator',
              message: 'Admin bevosita javobi',
              reply: replyBody,
              sender: 'admin',
              status: 'replied_by_admin',
              created_at: new Date().toISOString(),
            });

            await supabase
              .from('support_messages')
              .update({
                reply: replyBody,
                status: 'replied_by_admin',
              })
              .eq('user_id', targetUserId)
              .eq('status', 'forwarded_to_admin');
          } catch (dbErr) {
            console.error('Error saving admin reply to support_messages:', dbErr);
          }

          const userChatId = extractTelegramChatId(targetUserId);
          let sentToStudent = false;
          if (userChatId) {
            sentToStudent = await sendTelegramMessage(
              userChatId,
              `👨‍💻 <b>Administrator javobi:</b>\n\n${replyBody}`
            );
          }

          if (chatId) {
            await sendTelegramMessage(
              chatId,
              sentToStudent
                ? `✅ <b>Javobingiz talabaga (ID: <code>${targetUserId}</code>) yetkazildi.</b>`
                : `✅ <b>Javobingiz bazaga saqlandi.</b> (Talaba botni bloklagan yoki chat topilmadi)`
            );
          }
          return res.status(200).json({ ok: true });
        }
      }

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
