import { BOT_TOKEN, WEBAPP_URL, verifyRequestUser, isAdminId, setCors } from './_lib/common.js';

const MAX_IDS_PER_REQUEST = 150;
const CONCURRENCY = 20;

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default async function handler(req: any, res: any) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Faqat Telegram imzosi tasdiqlangan admin ommaviy xabar yubora oladi
  const caller = verifyRequestUser(req);
  if (!caller || !isAdminId(caller.id)) {
    return res.status(403).json({ ok: false, error: "Faqat admin xabar yubora oladi" });
  }

  const { chatIds, title, message, link } = req.body || {};
  const token = BOT_TOKEN;

  if (!token) {
    return res.status(400).json({
      ok: false,
      error: 'TELEGRAM_BOT_TOKEN serverda sozlanmagan',
    });
  }

  if (Array.isArray(chatIds) && chatIds.length > MAX_IDS_PER_REQUEST) {
    return res.status(400).json({ ok: false, error: `Bir so'rovda ${MAX_IDS_PER_REQUEST} tadan ko'p ID yubormang` });
  }
  if (!Array.isArray(chatIds) || chatIds.length === 0) {
    return res.status(400).json({
      ok: false,
      error: "Yuborish uchun kamida bitta chat_id (Telegram ID) ko'rsatilishi kerak",
    });
  }

  const results = {
    total: chatIds.length,
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  const headerTitle = title ? `📢 <b>${escapeHtml(title)}</b>\n\n` : '';
  const bodyText = escapeHtml(message || '');
  const textContent = `${headerTitle}${bodyText}`;

  const inlineKeyboard: any[] = [];
  if (typeof link === 'string' && /^https?:\/\/\S+$/i.test(link.trim())) {
    inlineKeyboard.push([
      {
        text: '🔗 Havolani ochish',
        url: link.trim(),
      },
    ]);
  }
  inlineKeyboard.push([
    {
      text: '🚀 Testni boshlash (Mini App)',
      web_app: { url: WEBAPP_URL },
    },
  ]);

  const sendOne = async (rawId: any) => {
    const cleanId = String(rawId).replace(/^tg_/, '').replace(/^user_/, '').trim();
    if (!/^\d+$/.test(cleanId)) {
      results.failed++;
      results.errors.push(`Chat ${String(rawId).slice(0, 40)}: Raqamli Telegram ID emas`);
      return;
    }
    try {
      const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cleanId,
          text: textContent,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: inlineKeyboard },
        }),
      });
      const data: any = await resp.json();
      if (data.ok) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push(`Chat ${cleanId}: ${data.description || 'Xatolik'}`);
      }
    } catch {
      results.failed++;
      results.errors.push(`Chat ${cleanId}: Tarmoq xatosi`);
    }
  };

  // Telegram cheklovi ~30 xabar/soniya: 20 tadan parallel guruhlab, guruhlar orasida 1 soniya
  const unique = Array.from(new Set(chatIds.map((x: any) => String(x))));
  for (let i = 0; i < unique.length; i += CONCURRENCY) {
    await Promise.all(unique.slice(i, i + CONCURRENCY).map(sendOne));
    if (i + CONCURRENCY < unique.length) await new Promise((r) => setTimeout(r, 1000));
  }
  results.total = unique.length;
  results.errors = results.errors.slice(0, 50);

  return res.status(200).json({
    ok: true,
    results,
  });
}
