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
    welcome: `<b>Assalomu alaykum! YuksalQuiz ta'lim platformasiga xush kelibsiz! 🎓</b>

HEMIS, xalqaro sertifikatlar (IELTS, TOPIK, SAT) va maktab fanlariga tayyorlanish uchun yagona test platformasi!

✨ <b>Platforma imkoniyatlari:</b>
• Real vaqtli HEMIS va fan testlari (100% bepul)
• Respublika va OTMlar bo'yicha talabalar reytingi
• Xatolar ustida ishlash va batafsil tahlillar
• Kunlik bonuslar va qiziqarli musobaqalar

👇 Test topshirishni boshlash uchun quyidagi tugmani bosing:`,
    button: '🚀 Testni boshlash',
    menuText: '🚀 Testni boshlash',
  },
  ru: {
    welcome: `<b>Здравствуйте! Добро пожаловать в YuksalQuiz! 🎓</b>

Единая тестовая платформа для подготовки к вузам (HEMIS), международным сертификатам (IELTS, TOPIK, SAT) и школьным предметам!

✨ <b>Возможности платформы:</b>
• Тесты по предметам и стандартам HEMIS (100% бесплатно)
• Рейтинг студентов по вузам и Узбекистану
• Анализ результатов и работа над ошибками
• Ежедневные бонусы и онлайн-соревнования

👇 Нажмите кнопку ниже, чтобы начать тестирование:`,
    button: '🚀 Начать тест',
    menuText: '🚀 Начать тест',
  },
  en: {
    welcome: `<b>Welcome to YuksalQuiz! 🎓</b>

All-in-one test prep platform for universities (HEMIS), global certificates (IELTS, TOPIK, SAT), and academic subjects!

✨ <b>Features:</b>
• Real-time exams and subject tests (100% free)
• University and national student leaderboards
• Mistake practice and performance analytics
• Daily streak bonuses and interactive quizzes

👇 Click the button below to start:`,
    button: '🚀 Start Quiz',
    menuText: '🚀 Start Quiz',
  },
};

function getLanguage(code?: string): 'uz' | 'ru' | 'en' {
  if (!code || typeof code !== 'string') return 'uz';
  const lower = code.toLowerCase();
  if (lower.startsWith('ru')) return 'ru';
  if (lower.startsWith('en')) return 'en';
  return 'uz';
}

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
    console.debug('configureChatMenuButton error:', err);
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(200).send('YuksalQuiz Telegram Bot Webhook Active');
  }

  const update = req.body;
  if (!update) {
    return res.status(200).json({ ok: true });
  }

  // Handle direct Admin Broadcast requests
  if (update.action === 'send_broadcast' || update.action === 'broadcast') {
    const { chatIds, title, message, link } = update;
    if (!BOT_TOKEN) {
      return res.status(400).json({ ok: false, error: 'TELEGRAM_BOT_TOKEN missing on server' });
    }
    if (!Array.isArray(chatIds) || chatIds.length === 0) {
      return res.status(400).json({ ok: false, error: 'chatIds array required' });
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
      } catch {
        results.failed++;
      }
    }
    return res.status(200).json({ ok: true, results });
  }

  // Handle Admin Inline Keyboard Callbacks (Payment approval & rejection)
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
      const adminIds = ['6219808382', ADMIN_TELEGRAM_ID].filter(Boolean);
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
          });
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

          // If approved, update user subscription access in Supabase
          if (isApprove && targetUserId) {
            const months = targetAmount >= 80000 ? 12 : targetAmount >= 45000 ? 6 : 3;
            const paidUntil = new Date();
            paidUntil.setMonth(paidUntil.getMonth() + months);

            await supabase.from('users').upsert({
              id: targetUserId,
              has_paid: true,
              paid_until: paidUntil.toISOString(),
              updated_at: new Date().toISOString(),
            });

            // Also try user_profiles table if present
            try {
              await supabase.from('user_profiles').upsert({
                id: targetUserId,
                has_paid: true,
                paid_until: paidUntil.toISOString(),
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
        }).catch(() => {});
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
        }).catch(() => {});
      }

      // Send congratulations message directly to student if Telegram chat_id
      if (isApprove && targetUserId && BOT_TOKEN) {
        const cleanUserChatId = String(targetUserId).replace(/^tg_/, '').replace(/^user_/, '').trim();
        if (/^\d+$/.test(cleanUserChatId)) {
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: cleanUserChatId,
              text: `🎉 <b>Tabriklaymiz! To'lovingiz admin tomonidan tasdiqlandi!</b>\n\nYuksalQuiz platformasidagi obunangiz faollashtirildi. Barcha testlar va imkoniyatlar endi siz uchun to'liq ochiq!`,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🚀 Testlarni boshlash', web_app: { url: WEBAPP_URL } }],
                ],
              },
            }),
          }).catch(() => {});
        }
      }

      return res.status(200).json({ ok: true });
    }
  }

  if (!update.message) {
    return res.status(200).json({ ok: true });
  }

  const msg = update.message;
  const text = msg.text || '';
  const chatId = msg.chat?.id;
  const langCode = msg.from?.language_code;

  if (
    text.startsWith('/start') ||
    text === '🚀 Testni boshlash' ||
    text === '🚀 Начать тест' ||
    text === '🚀 Start Quiz' ||
    text === '📱 Ilovani ochish' ||
    text === '📱 Открыть приложение' ||
    text === '📱 Open App'
  ) {
    const lang = getLanguage(langCode);
    const content = MESSAGES[lang] || MESSAGES.uz;

    // Send Welcome Message with Inline WebApp Button
    const payload = {
      chat_id: chatId,
      text: content.welcome,
      parse_mode: 'HTML',
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
      await Promise.allSettled([
        fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
        configureChatMenuButton(chatId, content.menuText),
      ]);
    }
  }

  return res.status(200).json({ ok: true });
}
