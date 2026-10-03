import crypto from 'crypto';

export interface TelegramValidationResult {
  isValid: boolean;
  user?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    photo_url?: string;
  };
  authDate?: number;
  error?: string;
}

/**
 * Validates Telegram WebApp initData according to official Telegram specification:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * 1. Data check string: alphabetical sort of all key=value pairs except 'hash', separated by '\n'.
 * 2. Secret key: HMAC-SHA256 of bot token with constant key "WebAppData".
 * 3. Hash: HMAC-SHA256 of data check string with secret key.
 * 4. Replay attack protection: auth_date checked against current timestamp (max 24 hours).
 */
export function validateTelegramInitData(initData: string, botToken: string): TelegramValidationResult {
  if (!initData || typeof initData !== 'string') {
    return { isValid: false, error: 'Missing or invalid initData' };
  }
  if (!botToken) {
    return { isValid: false, error: 'Server configuration error: TELEGRAM_BOT_TOKEN missing' };
  }

  try {
    const searchParams = new URLSearchParams(initData);
    const hash = searchParams.get('hash');
    if (!hash) {
      return { isValid: false, error: 'Missing hash parameter in initData' };
    }

    // Sort all key=value pairs except hash alphabetically
    searchParams.delete('hash');
    const sortedKeys = Array.from(searchParams.keys()).sort();
    const dataCheckArr: string[] = [];
    for (const key of sortedKeys) {
      dataCheckArr.push(`${key}=${searchParams.get(key)}`);
    }
    const dataCheckString = dataCheckArr.join('\n');

    // Secret key = HMAC_SHA256(botToken, "WebAppData")
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();

    // Calculated hash = HMAC_SHA256(dataCheckString, secretKey)
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    // Timing-safe comparison to prevent timing attack side-channels
    const calculatedBuffer = Buffer.from(calculatedHash, 'utf-8');
    const hashBuffer = Buffer.from(hash, 'utf-8');

    if (calculatedBuffer.length !== hashBuffer.length || !crypto.timingSafeEqual(calculatedBuffer, hashBuffer)) {
      return { isValid: false, error: 'Invalid HMAC-SHA256 signature. Verification failed.' };
    }

    // Replay attack check: auth_date should not be older than 24 hours (86400 seconds)
    const authDateStr = searchParams.get('auth_date');
    const authDate = authDateStr ? parseInt(authDateStr, 10) : 0;
    const now = Math.floor(Date.now() / 1000);
    if (!authDate || now - authDate > 86400) {
      return { isValid: false, error: 'initData has expired (max 24 hours allowed)' };
    }

    // Parse user object
    const userStr = searchParams.get('user');
    let user;
    if (userStr) {
      try {
        user = JSON.parse(userStr);
      } catch {
        // ignore parse error
      }
    }

    return {
      isValid: true,
      user,
      authDate,
    };
  } catch (err: any) {
    return { isValid: false, error: err?.message || 'Verification exception' };
  }
}

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

  const { initData } = req.body || {};
  if (!initData) {
    return res.status(400).json({ ok: false, error: 'Missing initData in request body' });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '';
  if (!botToken) {
    return res.status(503).json({
      ok: false,
      error: 'TELEGRAM_BOT_TOKEN is not configured on server',
    });
  }

  const result = validateTelegramInitData(initData, botToken);
  if (!result.isValid) {
    return res.status(401).json({ ok: false, error: result.error });
  }

  return res.status(200).json({
    ok: true,
    user: result.user,
    authDate: result.authDate,
  });
}
