import { createClient } from '@supabase/supabase-js';
import { validateTelegramInitData } from '../validate-telegram';

/**
 * Server tomoni uchun umumiy yordamchilar.
 * Muhim: kalitlar faqat Vercel Environment Variables ichidan olinadi.
 * Kod ichida hech qanday kalit yoki admin ID yozilmaydi.
 */

export const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '';
export const WEBAPP_URL = process.env.WEBAPP_URL || 'https://yuksalquiz.vercel.app';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Tiplar yaratilmagan baza uchun 'any' ishlatiladi (rpc argumentlari 'never' bo'lib qolmasligi uchun)
let cached: any = null;

/** service_role mijozi. Kalit yo'q bo'lsa aniq xato beradi (jimgina anon'ga tushmaydi). */
export function getServiceClient(): any {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('SERVER_CONFIG: SUPABASE_URL yoki SUPABASE_SERVICE_ROLE_KEY o\'rnatilmagan');
  }
  if (!cached) {
    cached = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

/** Adminlar ro'yxati: ADMIN_TELEGRAM_IDS="111,222" (yoki bitta ADMIN_TELEGRAM_ID) */
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

/** Receipt va xabarlar yuboriladigan asosiy admin (birinchi ID) */
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
    'Content-Type, X-Telegram-Init-Data, X-Telegram-Bot-Api-Secret-Token'
  );
}

export interface VerifiedUser {
  id: string; // sof Telegram raqami
  firstName: string;
  lastName: string;
  username: string;
}

/**
 * Telegram initData imzosini tekshiradi va foydalanuvchini qaytaradi.
 * Mijoz yuborgan userId ga ishonilmaydi.
 */
export function verifyRequestUser(req: any): VerifiedUser | null {
  const initData: string =
    (req.headers?.['x-telegram-init-data'] as string) || req.body?.initData || '';
  if (!initData || !BOT_TOKEN) return null;
  const result = validateTelegramInitData(initData, BOT_TOKEN);
  if (!result.isValid || !result.user?.id) return null;
  return {
    id: String(result.user.id),
    firstName: result.user.first_name || '',
    lastName: result.user.last_name || '',
    username: result.user.username || '',
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
  } catch (err) {
    console.error('tgSend error:', err);
    return false;
  }
}

/** Foydalanuvchi qatorini (telegram_id, id) bo'yicha topadi */
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

/**
 * Gemini modellari (muhim: 1.5 va 2.0 modellari Google tomonidan o'chirilgan).
 * Vercel env orqali o'zgartiriladi: GEMINI_MODELS="gemini-3.8-flash,gemini-3.5-flash-lite"
 * Joriy ro'yxat: https://ai.google.dev/gemini-api/docs/deprecations
 */
export const GEMINI_MODELS: string[] = (
  process.env.GEMINI_MODELS || 'gemini-3.8-flash,gemini-3.5-flash-lite,gemini-2.5-flash'
)
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);
