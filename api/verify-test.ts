import crypto from 'crypto';

interface TelegramValidationResult {
  isValid: boolean;
  user?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  authDate?: number;
  error?: string;
}

function validateTelegramInitData(initData: string, botToken: string): TelegramValidationResult {
  if (!initData || typeof initData !== 'string') return { isValid: false, error: 'Missing initData' };
  if (!botToken) return { isValid: false, error: 'Missing bot token' };
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return { isValid: false, error: 'Missing hash' };
    params.delete('hash');
    const sorted = Array.from(params.keys()).sort();
    const dataCheck = sorted.map((k) => `${k}=${params.get(k)}`).join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calcHash = crypto.createHmac('sha256', secretKey).update(dataCheck).digest('hex');
    const calcBuf = Buffer.from(calcHash, 'utf-8');
    const hashBuf = Buffer.from(hash, 'utf-8');
    if (calcBuf.length !== hashBuf.length || !crypto.timingSafeEqual(calcBuf, hashBuf)) {
      return { isValid: false, error: 'Invalid HMAC signature' };
    }
    const userStr = params.get('user');
    let user;
    if (userStr) {
      try { user = JSON.parse(userStr); } catch {}
    }
    return { isValid: true, user };
  } catch (err: any) {
    return { isValid: false, error: err?.message || 'Verification exception' };
  }
}

// In-memory rate limiting map for serverless execution: userId/IP -> timestamp
const userLastAttemptMap = new Map<string, number>();

export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed. Use POST.' });
  }

  const { initData, testPackageId, blockId, totalQuestions, score, timeSpentSeconds } = req.body || {};

  // 1. Authenticate via Telegram initData if available
  const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '';
  let telegramUserId = 'anonymous';

  if (initData && botToken) {
    const authResult = validateTelegramInitData(initData, botToken);
    if (!authResult.isValid) {
      return res.status(401).json({ ok: false, error: `Authentication failed: ${authResult.error}` });
    }
    telegramUserId = authResult.user?.id ? String(authResult.user.id) : 'tg_user';
  } else {
    // Fallback to IP address for rate-limiting
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'ip_unknown';
    telegramUserId = String(ip);
  }

  // 2. Anti-flood rate limiting: reject attempts sent < 2.5 seconds apart
  const now = Date.now();
  const lastAttempt = userLastAttemptMap.get(telegramUserId) || 0;
  if (now - lastAttempt < 2500) {
    return res.status(429).json({
      ok: false,
      error: "Juda ko'p so'rov yuborildi. Iltimos, biroz kuting.",
    });
  }
  userLastAttemptMap.set(telegramUserId, now);

  // Clean old entries from rate limit map (older than 10 minutes)
  if (userLastAttemptMap.size > 2000) {
    for (const [key, ts] of userLastAttemptMap.entries()) {
      if (now - ts > 600000) {
        userLastAttemptMap.delete(key);
      }
    }
  }

  // 3. Speed verification: tests completed impossibly fast (e.g. < 0.5s per question) are flagged
  const qCount = Number(totalQuestions) || 25;
  const timeSeconds = Number(timeSpentSeconds) || 0;
  const minRealisticTime = Math.max(3, Math.ceil(qCount * 0.4)); // At least 0.4s per question

  if (timeSeconds < minRealisticTime && qCount > 3) {
    return res.status(400).json({
      ok: false,
      error: `Test topshirish vaqti shubhali darajada tez (${timeSeconds}s). Anti-cheat tekshiruvidan o'tmadi.`,
    });
  }

  // 4. Score sanity check
  const numScore = Number(score) || 0;
  if (numScore < 0 || numScore > qCount) {
    return res.status(400).json({
      ok: false,
      error: `Ball ko'rsatkichi noto'g'ri: 0 dan ${qCount} oralig'ida bo'lishi kerak.`,
    });
  }

  // 5. Coin calculation
  const percentage = Math.round((numScore / qCount) * 100);
  const isPassed = percentage >= 70;
  const verifiedCoins = isPassed ? 50 : 10;

  return res.status(200).json({
    ok: true,
    verified: true,
    score: numScore,
    percentage,
    isPassed,
    earnedCoins: verifiedCoins,
    userId: telegramUserId,
    timestamp: new Date().toISOString(),
  });
}
