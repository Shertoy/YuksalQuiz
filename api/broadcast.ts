import { BOT_TOKEN, WEBAPP_URL, verifyRequestUser, isAdminId } from './_lib/common';

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
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, X-Telegram-Init-Data'
  );

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
  if (link && link.trim()) {
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

  for (const rawId of chatIds) {
    const cleanId = String(rawId).replace(/^tg_/, '').replace(/^user_/, '').trim();
    if (!/^\d+$/.test(cleanId)) {
      results.failed++;
      results.errors.push(`Chat ${rawId}: Raqamli Telegram ID emas`);
      continue;
    }

    try {
      const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cleanId,
          text: textContent,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: inlineKeyboard,
          },
        }),
      });

      const data = await resp.json();
      if (data.ok) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push(`Chat ${cleanId}: ${data.description || 'Xatolik'}`);
      }
    } catch (err: any) {
      results.failed++;
      results.errors.push(`Chat ${cleanId}: ${err?.message || 'Tarmoq xatosi'}`);
    }
  }

  return res.status(200).json({
    ok: true,
    results,
  });
}
