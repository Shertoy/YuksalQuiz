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
    if (!authDate || now - authDate > 7 * 86400) {
      return { isValid: false, error: 'initData has expired (max 7 days allowed)' };
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

// Admin ID lar faqat server muhit o'zgaruvchisidan olinadi (kodda saqlanmaydi).
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
 * Faqat ikki yo'l: Telegram initData HMAC imzosi + serverdagi admin ID ro'yxati,
 * yoki brauzerdagi admin uchun serverdagi ADMIN_SECRET_KEY.
 * Hardcoded kalitlar, X-Admin-Id va VITE_ADMIN_SECRET_KEY qabul qilinmaydi.
 */
// Brauzer orqali admin kirishi: faqat serverdagi ADMIN_SECRET_KEY (VITE_ emas, frontendga chiqmaydi).
// Kalit kamida 16 belgi bo'lishi shart.
function verifyAdminBrowserKey(req: any): VerifiedUser | null {
  const serverKey = String(process.env.ADMIN_SECRET_KEY || '');
  const given = String(req.headers?.['x-admin-key'] || '');
  if (serverKey.length < 16 || !given) return null;
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(serverKey).digest();
  if (!crypto.timingSafeEqual(a, b)) return null;
  const adminId = getPrimaryAdminId();
  if (!adminId) return null;
  return { id: adminId, firstName: 'Admin', lastName: '', username: 'admin', isAdmin: true };
}

export function verifyRequestUser(req: any): VerifiedUser | null {
  const initData: string =
    (req.headers?.['x-telegram-init-data'] as string) || req.body?.initData || '';

  let tgUser: VerifiedUser | null = null;
  if (initData && BOT_TOKEN) {
    const result = validateTelegramInitData(initData, BOT_TOKEN);
    if (result.isValid && result.user?.id) {
      const userId = String(result.user.id);
      tgUser = {
        id: userId,
        firstName: result.user.first_name || '',
        lastName: result.user.last_name || '',
        username: result.user.username || '',
        isAdmin: isAdminId(userId),
      };
    }
  }

  // Telegram foydalanuvchisi admin bo'lsa yoki kalit yuborilmagan bo'lsa — Telegram identifikatsiyasi
  if (tgUser && (tgUser.isAdmin || !req.headers?.['x-admin-key'])) return tgUser;

  // Admin maxfiy kalit bilan kirgan bo'lsa (brauzerda yoki Telegram ichida parol bilan)
  const byKey = verifyAdminBrowserKey(req);
  if (byKey) return byKey;

  return tgUser;
}

/**
 * Admin kirishi nima uchun muvaffaqiyatsiz bo'lganini tushunarli tilda qaytaradi.
 * Maxfiy qiymatlarning o'zi hech qachon qaytarilmaydi.
 */
export function adminAccessProblem(req: any, caller: VerifiedUser | null): string {
  const given = String(req.headers?.['x-admin-key'] || '');
  const serverKey = String(process.env.ADMIN_SECRET_KEY || '');
  if (!getAdminIds().length) {
    return "Serverda ADMIN_TELEGRAM_IDS sozlanmagan. Vercel'da qo'shing va Redeploy qiling.";
  }
  if (given) {
    if (!serverKey) return "Serverda ADMIN_SECRET_KEY sozlanmagan. Vercel'da qo'shing va Redeploy qiling.";
    if (serverKey.length < 16) {
      return "Vercel'dagi ADMIN_SECRET_KEY 16 belgidan qisqa. Uzunroq kalit qo'ying va Redeploy qiling.";
    }
    return "Maxfiy kalit noto'g'ri. Vercel'dagi ADMIN_SECRET_KEY qiymatini aynan kiriting.";
  }
  if (caller) {
    return `Telegram ID ingiz (${caller.id}) adminlar ro'yxatida yo'q. Vercel'dagi ADMIN_TELEGRAM_IDS ga qo'shing.`;
  }
  return "Telegram orqali kiring yoki admin maxfiy kalitini kiriting.";
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

export function normalizeSubscriptionPlan(plan: unknown, isActive = true): string | null {
  const p = String(plan || '').trim();
  if (p === '3_months' || p === '6_months' || p === '1_year') return p;
  return isActive ? '3_months' : null;
}

export async function findUserRow(db: any, anyId: string, extraId?: string) {
  const c = cleanId(anyId);
  const raw = String(anyId || '').trim();
  const extraRaw = String(extraId || '').trim();
  const extraClean = cleanId(extraRaw);

  const safeId = (s: string) => /^[a-zA-Z0-9_-]{1,80}$/.test(s);
  const conds = new Set<string>();
  for (const val of [c, raw, extraRaw, extraClean]) {
    if (!val || !safeId(val)) continue;
    conds.add(`id.eq.${val}`);
    conds.add(`id.eq.tg_${val}`);
    conds.add(`telegram_id.eq.${val}`);
  }
  if (!conds.size) return null;

  const { data: rows } = await db
    .from('users')
    .select('*')
    .or(Array.from(conds).join(','))
    .order('created_at', { ascending: true });

  const list: any[] = Array.isArray(rows) ? rows : rows ? [rows] : [];
  if (!list.length) return null;

  // Agar topilgan qatorlarda telegram_id bo'lsa va u orqali yana boshqa dublikat qatorlar bo'lsa, ularni ham qo'shamiz
  const tgIds = Array.from(
    new Set(
      list
        .map((r) => cleanId(r.telegram_id))
        .filter((t) => t && safeId(t) && t !== c && t !== extraClean)
    )
  );
  if (tgIds.length > 0) {
    const extraConds = tgIds.flatMap((t) => [`id.eq.${t}`, `id.eq.tg_${t}`, `telegram_id.eq.${t}`]);
    const { data: moreRows } = await db.from('users').select('*').or(extraConds.join(','));
    if (Array.isArray(moreRows)) {
      const seen = new Set(list.map((r) => r.id));
      for (const mr of moreRows) {
        if (mr?.id && !seen.has(mr.id)) {
          seen.add(mr.id);
          list.push(mr);
        }
      }
    }
  }

  const nowMs = Date.now();
  let bestEndMs = 0;
  let bestEndIso: string | null = null;
  let bestPlan: string | null = null;

  for (const r of list) {
    const endCandidate = r.subscription_end || r.paid_until || null;
    if (endCandidate) {
      const t = new Date(endCandidate).getTime();
      if (!Number.isNaN(t) && t > bestEndMs) {
        bestEndMs = t;
        bestEndIso = new Date(t).toISOString();
        bestPlan = normalizeSubscriptionPlan(r.subscription_tier, t > nowMs);
      }
    }
  }

  const allIds = Array.from(
    new Set(
      list
        .flatMap((r) => [r.id, cleanId(r.id), `tg_${cleanId(r.id)}`, r.telegram_id, cleanId(r.telegram_id)])
        .concat([c, raw, extraRaw, extraClean])
        .filter((x): x is string => Boolean(x) && safeId(String(x)))
    )
  );

  // Agar users qatorlarida faol obuna topilmagan bo'lsa, subscriptions va AdminCredit jadvallarini ham tekshiramiz
  if (bestEndMs <= nowMs && allIds.length > 0) {
    try {
      const { data: subRows } = await db
        .from('subscriptions')
        .select('user_id, plan, plan_name, expires_at, status')
        .in('user_id', allIds)
        .order('expires_at', { ascending: false })
        .limit(5);
      if (Array.isArray(subRows)) {
        for (const s of subRows) {
          const t = s?.expires_at ? new Date(s.expires_at).getTime() : 0;
          if (!Number.isNaN(t) && t > bestEndMs && s.status !== 'expired') {
            bestEndMs = t;
            bestEndIso = new Date(t).toISOString();
            bestPlan = normalizeSubscriptionPlan(s.plan || s.plan_name, t > nowMs);
          }
        }
      }
    } catch {}

    try {
      const { data: admRows } = await db
        .from('test_packages')
        .select('author_id, blocks, created_at')
        .eq('category', 'AdminCredit')
        .order('created_at', { ascending: false })
        .limit(50);
      if (Array.isArray(admRows)) {
        const idSet = new Set(allIds.map((x) => x.toLowerCase()));
        for (const a of admRows) {
          const b0 = Array.isArray(a?.blocks) && a.blocks[0] ? a.blocks[0] : null;
          const candidates = [a?.author_id, b0?.user_id, b0?.clean_id]
            .filter(Boolean)
            .flatMap((x) => [String(x), cleanId(String(x))])
            .map((x) => x.toLowerCase());
          if (candidates.some((cand) => idSet.has(cand))) {
            const exp = b0?.expiry || b0?.subscription_end || b0?.paid_until;
            const t = exp ? new Date(exp).getTime() : 0;
            if (!Number.isNaN(t) && t > bestEndMs) {
              bestEndMs = t;
              bestEndIso = new Date(t).toISOString();
              bestPlan = normalizeSubscriptionPlan(b0?.plan, t > nowMs);
            }
          }
        }
      }
    } catch {}
  }

  const hasActiveSub = bestEndMs > nowMs && Boolean(bestEndIso);

  // Asosiy qatorni tanlash: extraRaw mos kelsa, yoki faol obunasi bor qator, yoki eng ko'p balansli qator
  const primary =
    (extraRaw && list.find((r) => r.id === extraRaw)) ||
    list.find((r) => {
      const e = r.subscription_end || r.paid_until;
      return e && new Date(e).getTime() > nowMs;
    }) ||
    list.reduce((best, cur) => {
      const bBal = Number(best?.balance ?? best?.wallet_balance ?? 0);
      const cBal = Number(cur?.balance ?? cur?.wallet_balance ?? 0);
      return cBal > bBal ? cur : best;
    }, list[0]);

  const maxBalance = list.reduce((acc, r) => {
    const b = Number(r.balance ?? r.wallet_balance ?? 0);
    return b > acc ? b : acc;
  }, Number(primary.balance ?? primary.wallet_balance ?? 0));

  const primaryBalance = Number(primary.balance ?? primary.wallet_balance ?? 0);
  const resolvedBalance = primaryBalance > 0 ? primaryBalance : maxBalance;
  const resolvedTgId =
    list.map((r) => r.telegram_id).find((t) => t && /^\d+$/.test(String(t))) ||
    (/^\d+$/.test(c) ? c : primary.telegram_id || null);

  // Agar haqiqiy raqamli Telegram ID aniqlangan bo'lsa, user-xxx kabi qatorlarga ham shu telegram_id ni bog'lab qo'yamiz
  if (resolvedTgId && /^\d+$/.test(String(resolvedTgId))) {
    const rowsMissingTg = list.filter((r) => String(r.telegram_id || '') !== String(resolvedTgId));
    if (rowsMissingTg.length > 0) {
      await db
        .from('users')
        .update({ telegram_id: String(resolvedTgId) })
        .in(
          'id',
          rowsMissingTg.map((r) => r.id)
        );
    }
  }

  // Agar faol obuna topilgan bo'lsa va ba'zi dublikat qatorlarda u yo'q bo'lsa yoki subscription_tier='free' bo'lsa,
  // barcha tegishli qatorlarni avtomatik ravishda sinxronlab qo'yamiz
  if (hasActiveSub && bestEndIso) {
    const normTier = normalizeSubscriptionPlan(bestPlan, true) || '3_months';
    const rowsNeedingHeal = list.filter((r) => {
      const rEnd = r.subscription_end ? new Date(r.subscription_end).getTime() : 0;
      const rPaid = r.paid_until ? new Date(r.paid_until).getTime() : 0;
      return (
        !r.has_paid ||
        !r.is_subscribed ||
        r.subscription_tier !== normTier ||
        Math.abs(rEnd - bestEndMs) > 1000 ||
        Math.abs(rPaid - bestEndMs) > 1000
      );
    });
    if (rowsNeedingHeal.length > 0) {
      const healIds = rowsNeedingHeal.map((r) => r.id);
      await db
        .from('users')
        .update({
          has_paid: true,
          is_subscribed: true,
          subscription_end: bestEndIso,
          paid_until: bestEndIso,
          subscription_tier: normTier,
          ...(resolvedTgId ? { telegram_id: resolvedTgId } : {}),
        })
        .in('id', healIds);
    }
  }

  return {
    ...primary,
    telegram_id: resolvedTgId,
    balance: resolvedBalance,
    wallet_balance: resolvedBalance,
    has_paid: hasActiveSub ? true : Boolean(primary.has_paid),
    is_subscribed: hasActiveSub ? true : Boolean(primary.is_subscribed),
    subscription_end: hasActiveSub ? bestEndIso : primary.subscription_end || primary.paid_until || null,
    paid_until: hasActiveSub ? bestEndIso : primary.paid_until || primary.subscription_end || null,
    subscription_tier: hasActiveSub
      ? normalizeSubscriptionPlan(bestPlan || primary.subscription_tier, true)
      : primary.subscription_tier || null,
    is_blocked: list.some((r) => Boolean(r.is_blocked)),
    voucher_claimed: list.some((r) => Boolean(r.voucher_claimed)),
    referral_count: Math.max(...list.map((r) => Number(r.referral_count || 0)), 0),
    referred_by: list.map((r) => r.referred_by).find(Boolean) || null,
    _matchedIds: allIds,
    _rowIds: list.map((r) => r.id),
  };
}

export const GEMINI_MODELS: string[] = (
  process.env.GEMINI_MODELS || 'gemini-2.5-flash,gemini-2.0-flash'
)
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);
