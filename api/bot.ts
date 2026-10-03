const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '';
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://yuksalquiz.vercel.app';

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
