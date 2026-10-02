/**
 * YuksalQuiz Telegram Bot
 *
 * Talablar:
 * 1. Foydalanuvchining Telegram tiliga (language_code) qarab mos tilda xabar yuborish.
 * 2. Xabar matni:
 *    - O'zbekcha: "Kundan kunga test orqali ilmingizni rivojlantiring."
 *    - Ruscha: "Развивайте свои знания день за днем с помощью тестов."
 * 3. Mini App'ni ochuvchi WebApp tugmasi:
 *    - O'zbekcha: "🚀 Testlarni boshlash" (va "📱 Ilovani ochish")
 *    - Ruscha: "🚀 Начать тестирование" (va "📱 Открыть приложение")
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '';
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://yuksalquiz.vercel.app';

export const MESSAGES = {
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

export function getLanguage(code) {
  if (!code || typeof code !== 'string') return 'uz';
  const lower = code.toLowerCase();
  if (lower.startsWith('ru')) return 'ru';
  if (lower.startsWith('en')) return 'en';
  return 'uz';
}

export function createStartPayload(chatId, langCode) {
  const lang = getLanguage(langCode);
  const content = MESSAGES[lang] || MESSAGES.uz;

  return {
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
}

export async function sendMessage(payload) {
  if (!BOT_TOKEN) {
    console.error('Cannot send message: TELEGRAM_BOT_TOKEN is missing');
    return;
  }

  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return await response.json();
}

export async function handleUpdate(update) {
  if (!update || !update.message) return;
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
    const payload = createStartPayload(chatId, langCode);
    await sendMessage(payload);
  }
}

// Long polling runner for local dev and self-hosted environments
let offset = 0;
let isPolling = false;

async function pollUpdates() {
  if (!BOT_TOKEN) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${offset}&timeout=30`);
    if (!res.ok) {
      setTimeout(pollUpdates, 3000);
      return;
    }
    const data = await res.json();
    if (data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        offset = update.update_id + 1;
        await handleUpdate(update).catch((err) => console.error('Handle update error:', err));
      }
    }
  } catch (err) {
    console.error('Polling error:', err);
  }
  if (isPolling) {
    setTimeout(pollUpdates, 1000);
  }
}

export function startBot() {
  if (!BOT_TOKEN) {
    console.log("🤖 TELEGRAM_BOT_TOKEN o'rnatilmagan. Botni ishga tushirish uchun TELEGRAM_BOT_TOKEN ni .env ga yozing.");
    return;
  }
  console.log('🚀 YuksalQuiz Telegram Bot ishga tushdi...');
  console.log(`🔗 WebApp URL: ${WEBAPP_URL}`);
  isPolling = true;
  pollUpdates();
}

// Auto-run if executed directly via node
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('bot/index.js')) {
  startBot();
}
