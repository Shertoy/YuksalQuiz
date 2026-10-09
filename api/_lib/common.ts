import { createClient } from '@supabase/supabase-js';
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

    searchParams.delete('hash');
    const sortedKeys = Array.from(searchParams.keys()).sort();
    const dataCheckArr: string[] = [];
    for (const key of sortedKeys) {
      dataCheckArr.push(`${key}=${searchParams.get(key)}`);
    }
    const dataCheckString = dataCheckArr.join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    const calculatedBuffer = Buffer.from(calculatedHash, 'utf-8');
    const hashBuffer = Buffer.from(hash, 'utf-8');

    if (calculatedBuffer.length !== hashBuffer.length || !crypto.timingSafeEqual(calculatedBuffer, hashBuffer)) {
      return { isValid: false, error: 'Invalid HMAC-SHA256 signature. Verification failed.' };
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
      } catch {}
    }

    return { isValid: true, user, authDate };
  } catch (err: any) {
    return { isValid: false, error: 'Verification exception' }; // FIX: ichki xabarni tashqariga chiqarma
  }
}

export const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '';
export const WEBAPP_URL = process.env.WEBAPP_URL || 'https://yuksalquiz.vercel.app';

// FIX: hardcoded URL fallback o'chirildi — muhit o'zgaruvchisi majburiy
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';

// FIX [CRITICAL]: anon kalit fallback zanjiri olib tashlandi.
// SUPABASE_SERVICE_ROLE_KEY yo'q bo'lsa server ishga tushmaydi (sekin muvaffaqiyatsizlik emas).
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

let cached: any = null;

export function getServiceClient(): any {
  if (!SUPABASE_URL) throw new Error('SERVER_CONFIG: SUPABASE_URL topilmadi');
  if (!SERVICE_KEY) throw new Error('SERVER_CONFIG: SUPABASE_SERVICE_ROLE_KEY topilmadi');
  if (!cached) {
    cached = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

// FIX [HIGH]: hardcoded admin ID '7847500525' olib tashlandi.
// Admin ID larni faqat server muhit o'zgaruvchisidan ol.
export function getAdminIds(): string[] {
  const raw = `${process.env.ADMIN_TELEGRAM_IDS || ''},${process.env.ADMIN_TELEGRAM_ID || ''}`;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s));
}

export function isAdminId(id: string | number | null | undefined): boolean {
  if (id === null || id === undefined) return false;
  return getAdminIds().includes(String(id).replace(/^tg_/, '').trim());
}

export function getPrimaryAdminId(): string {
  return getAdminIds()[0] || '';
}

export function cleanId(raw: string | number | null | undefined): string {
  return String(raw ?? '').replace(/^tg_/, '').replace(/^user_/, '').trim();
}

export function escapeHtml(text: unknown): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function setCors(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, X-Telegram-Init-Data, X-Telegram-Bot-Api-Secret-Token, X-Admin-Id, X-Admin-Key'
  );
  // FIX: 'credentials: true' va wildcard origin kombinatsiyasi xavfli — olib tashlandi
}

export interface VerifiedUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  isAdmin?: boolean;
}

/**
 * FIX [CRITICAL]: verifyRequestUser qayta yozildi.
 *
 * Xavfli yo'llar olib tashlandi:
 * 1. adminKey === 'yuksal2026admin' || 'admin2026' || '7847500525' hardcoded kalitlar
 * 2. X-Admin-Id headeridan foydalanuvchi kim ekanini aniqlash
 * 3. VITE_ADMIN_SECRET_KEY (frontend bundle ga chiqadigan sir)
 *
 * Faqat qolgan: Telegram initData HMAC imzosi + server-side admin ID ro'yxati.
 */
export function verifyRequestUser(req: any): VerifiedUser | null {
  const initData: string =
    (req.headers?.['x-telegram-init-data'] as string) || req.body?.initData || '';

  if (!initData || !BOT_TOKEN) return null;

  const result = validateTelegramInitData(initData, BOT_TOKEN);
  if (!result.isValid || !result.user?.id) return null;

  const userId = String(result.user.id);
  return {
    id: userId,
    firstName: result.user.first_name || '',
    lastName: result.user.last_name || '',
    username: result.user.username || '',
    isAdmin: isAdminId(userId),
  };
}

export async function tgSend(chatId: string | number, text: string, extra: Record<string, any> = {}) {
  if (!BOT_TOKEN || !chatId) return false;
  try {
    const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...extra }),
    });
    const data: any = await resp.json();
    if (!data.ok) console.warn('tgSend failed:', data.description);
    return Boolean(data.ok);
  } catch {
    // FIX: ichki xatoni loglama (token sizmasligi uchun)
    return false;
  }
}

export async function findUserRow(db: any, anyId: string) {
  const c = cleanId(anyId);
  const { data } = await db
    .from('users')
    .select('*')
    .or(`id.eq.${c},id.eq.tg_${c},telegram_id.eq.${c}`)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data as any;
}

export const GEMINI_MODELS: string[] = (
  process.env.GEMINI_MODELS || 'gemini-2.5-flash,gemini-2.0-flash'
)
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);
