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

import crypto from 'crypto';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '';
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://yuksalquiz.vercel.app';

/**
 * Validates Telegram WebApp initData with HMAC-SHA256 and replay protection
 */
export function validateTelegramInitData(initData, botToken = BOT_TOKEN) {
  if (!initData || typeof initData !== 'string') {
    return { isValid: false, error: 'Missing or invalid initData' };
  }
  if (!botToken) {
    return { isValid: false, error: 'TELEGRAM_BOT_TOKEN missing' };
  }

  try {
    const searchParams = new URLSearchParams(initData);
    const hash = searchParams.get('hash');
    if (!hash) {
      return { isValid: false, error: 'Missing hash parameter' };
    }

    searchParams.delete('hash');
    const sortedKeys = Array.from(searchParams.keys()).sort();
    const dataCheckArr = [];
    for (const key of sortedKeys) {
      dataCheckArr.push(`${key}=${searchParams.get(key)}`);
    }
    const dataCheckString = dataCheckArr.join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    const calculatedBuffer = Buffer.from(calculatedHash, 'utf-8');
    const hashBuffer = Buffer.from(hash, 'utf-8');

    if (calculatedBuffer.length !== hashBuffer.length || !crypto.timingSafeEqual(calculatedBuffer, hashBuffer)) {
      return { isValid: false, error: 'Invalid HMAC-SHA256 signature' };
    }

    const authDateStr = searchParams.get('auth_date');
    const authDate = authDateStr ? parseInt(authDateStr, 10) : 0;
    const now = Math.floor(Date.now() / 1000);
    if (!authDate || now - authDate > 86400) {
      return { isValid: false, error: 'initData has expired (max 24 hours allowed)' };
    }

    const userStr = searchParams.get('user');
    let user;
    if (userStr) {
      try {
        user = JSON.parse(userStr);
      } catch {
        // ignore
      }
    }

    return {
      isValid: true,
      user,
      authDate,
    };
  } catch (err) {
    return { isValid: false, error: err?.message || 'Verification exception' };
  }
}

export const MESSAGES = {
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

export function getLanguage(code) {
  if (!code || typeof code !== 'string') return 'uz';
  const lower = code.toLowerCase();
  if (lower.startsWith('ru')) return 'ru';
  if (lower.startsWith('en')) return 'en';
  return 'uz';
}

/**
 * Configure Telegram chat menu button (bottom-left corner) to open Mini App
 */
export async function setChatMenuButton(chatId, buttonText = '🚀 Testni boshlash') {
  if (!BOT_TOKEN) return;
  try {
    const payload = {
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
    console.debug('setChatMenuButton error:', err);
  }
}

export function createStartPayload(chatId, langCode) {
  const lang = getLanguage(langCode);
  const content = MESSAGES[lang] || MESSAGES.uz;

  return {
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
    text === '🚀 Testni boshlash' ||
    text === '🚀 Начать тест' ||
    text === '🚀 Start Quiz' ||
    text === '📱 Ilovani ochish' ||
    text === '📱 Открыть приложение' ||
    text === '📱 Open App'
  ) {
    const lang = getLanguage(langCode);
    const content = MESSAGES[lang] || MESSAGES.uz;

    // 1. Foydalanuvchi ekranidagi eski pastki ulkan tugmani (ReplyKeyboardMarkup) to'liq yo'qotish
    try {
      const clean = await sendMessage({
        chat_id: chatId,
        text: 'Yuksal Quiz 🚀',
        reply_markup: { remove_keyboard: true },
      });
      if (clean?.result?.message_id && BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, message_id: clean.result.message_id }),
        }).catch(() => {});
      }
    } catch (err) {
      console.debug('remove_keyboard cleanup notice:', err);
    }

    // 2. Inline WebApp tugmali xabar
    const payload = createStartPayload(chatId, langCode);

    await Promise.allSettled([
      sendMessage(payload),
      setChatMenuButton(chatId, content.menuText),
    ]);
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

  // Register default WebApp Menu Button globally
  setChatMenuButton(undefined, '🚀 Testni boshlash').catch(() => {});

  isPolling = true;
  pollUpdates();
}

// Auto-run if executed directly via node
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('bot/index.js')) {
  startBot();
}
