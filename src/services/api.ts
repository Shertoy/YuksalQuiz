import { getStoredAdminBrowserKey } from '../utils/security';

/**
 * Server API bilan xavfsiz muloqot.
 * Har bir so'rovga Telegram initData qo'shiladi. Server uni imzo bo'yicha tekshiradi,
 * shuning uchun foydalanuvchi o'zini boshqa odam deb ko'rsata olmaydi.
 */
export function getTelegramInitData(): string {
  try {
    return (window as any).Telegram?.WebApp?.initData || '';
  } catch {
    return '';
  }
}

export interface ApiResult<T = any> {
  status: number;
  ok: boolean;
  data: T;
}

export async function apiPost<T = any>(path: string, body: Record<string, any> = {}): Promise<ApiResult<T>> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': getTelegramInitData(),
    };
    // Brauzer rejimidagi admin kaliti (faqat admin o'z qurilmasida kiritgan bo'lsa).
    // Server uni o'zidagi ADMIN_SECRET_KEY bilan solishtiradi.
    const adminKey = getStoredAdminBrowserKey();
    if (adminKey) headers['X-Admin-Key'] = adminKey;

    const payload: Record<string, any> = { ...body };

    const res = await fetch(path, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    let data: any = {};
    try {
      data = await res.json();
    } catch {
      data = { ok: false, error: `Server javobi tushunarsiz (${res.status})` };
    }
    return { status: res.status, ok: res.ok && data?.ok !== false, data };
  } catch (err: any) {
    return {
      status: 0,
      ok: false,
      data: { ok: false, reason: 'network', error: "Server bilan aloqa yo'q. Internetni tekshirib qayta urinib ko'ring." } as any,
    };
  }
}

/** Server xatosini foydalanuvchiga ko'rsatiladigan matnga aylantiradi */
export function apiErrorText(r: ApiResult, fallback = 'Xatolik yuz berdi'): string {
  const d: any = r.data || {};
  if (d.reason === 'unauthorized') return "Ilovani Telegram ichida oching.";
  if (d.reason === 'blocked') return 'Hisobingiz bloklangan.';
  if (d.reason === 'insufficient_balance') {
    const miss = Number(d.missing || 0);
    return `Hisobingizda mablag' yetarli emas. Yana ${miss.toLocaleString('uz-UZ')} so'm kerak.`;
  }
  if (d.reason === 'already_claimed') return 'Vaucher avval olingan.';
  return d.error || d.message || fallback;
}
