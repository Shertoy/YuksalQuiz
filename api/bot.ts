const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '';
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://yuksalquiz.vercel.app';

const MESSAGES = {
  uz: {
    text: 'Kundan kunga test orqali ilmingizni rivojlantiring.',
    button: '🚀 Testlarni boshlash',
    menuButton: '📱 Ilovani ochish',
  },
  ru: {
    text: 'Развивайте свои знания день за днем с помощью тестов.',
    button: '🚀 Начать тестирование',
    menuButton: '📱 Открыть приложение',
  },
  en: {
    text: 'Develop your knowledge day by day with tests.',
    button: '🚀 Start Testing',
    menuButton: '📱 Open App',
  },
};

function getLanguage(code?: string) {
  if (!code || typeof code !== 'string') return 'uz';
  const lower = code.toLowerCase();
  if (lower.startsWith('ru')) return 'ru';
  if (lower.startsWith('en')) return 'en';
  return 'uz';
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(200).send('YuksalQuiz Telegram Bot Webhook Active');
  }

  const update = req.body;
  if (!update || !update.message) {
    return res.status(200).json({ ok: true });
  }

  const msg = update.message;
  const text = msg.text || '';
  const chatId = msg.chat?.id;
  const langCode = msg.from?.language_code;

  if (
    text.startsWith('/start') ||
    text === '📱 Ilovani ochish' ||
    text === '📱 Открыть приложение' ||
    text === '📱 Open App'
  ) {
    const lang = getLanguage(langCode);
    const content = MESSAGES[lang] || MESSAGES.uz;

    const payload = {
      chat_id: chatId,
      text: content.text,
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
              text: content.menuButton,
              web_app: { url: WEBAPP_URL },
            },
          ],
        ],
        resize_keyboard: true,
      },
    };

    if (BOT_TOKEN) {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
  }

  return res.status(200).json({ ok: true });
}
