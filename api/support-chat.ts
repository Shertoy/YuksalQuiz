import {
  BOT_TOKEN,
  getServiceClient,
  getAdminIds,
  GEMINI_MODELS,
  verifyRequestUser,
  isAdminId,
  cleanId,
  rateLimit,
  setCors,
  findUserRow,
} from './_lib/common.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const MAX_MESSAGE_LENGTH = 2000;

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function sendTelegramMessage(chatId: string | number, text: string, replyMarkup?: any) {
  if (!BOT_TOKEN || !chatId) return false;
  try {
    const payload: Record<string, any> = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }
    const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    return Boolean(data.ok);
  } catch (err) {
    console.error('sendTelegramMessage error in support-chat:', err);
    return false;
  }
}

export default async function handler(req: any, res: any) {
  setCors(res);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Faqat Telegram imzosi tasdiqlangan foydalanuvchi: boshqa odam nomidan yozib/o'qib bo'lmaydi
  const caller = verifyRequestUser(req);
  if (!caller) {
    return res.status(401).json({ ok: false, reason: 'unauthorized', error: 'Ilovani Telegram ichida oching.' });
  }
  const supabase = getServiceClient();
  const callerClean = cleanId(caller.id);

  // 1. GET: faqat o'z yozishmalari (admin ?userId= bilan istalgan talabanikini ko'ra oladi)
  if (req.method === 'GET') {
    try {
      const asked = cleanId(String(req.query?.user_id || req.query?.userId || ''));
      const target = isAdminId(caller.id) && /^[A-Za-z0-9_-]{1,80}$/.test(asked) ? asked : callerClean;
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .in('user_id', [target, `tg_${target}`])
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('support-chat GET error:', error.message);
        return res.status(500).json({ ok: false, error: "Yozishmalarni yuklab bo'lmadi." });
      }
      return res.status(200).json({ ok: true, messages: data || [] });
    } catch (err: any) {
      console.error('support-chat GET error:', err?.message);
      return res.status(500).json({ ok: false, error: "Yozishmalarni yuklab bo'lmadi." });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Faqat POST va GET so\'rovlari qabul qilinadi.' });
  }

  try {
    const { message } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ ok: false, error: 'Savol matni kiritilmagan.' });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ ok: false, error: `Xabar ${MAX_MESSAGE_LENGTH} belgidan oshmasin.` });
    }

    const userRow = await findUserRow(supabase, caller.id);
    if (userRow?.is_blocked) {
      return res.status(403).json({ ok: false, reason: 'blocked', error: 'Hisobingiz bloklangan' });
    }

    // Spamdan himoya: 10 daqiqada 8 ta, sutkada 40 ta xabar
    const okShort = await rateLimit(supabase, `support:${callerClean}:10m`, 8, 600);
    const okDay = okShort && (await rateLimit(supabase, `support:${callerClean}:1d`, 40, 86400));
    if (!okShort || !okDay) {
      return res.status(429).json({ ok: false, error: "Juda ko'p xabar yuborildi. Birozdan so'ng qayta yozing." });
    }

    // Kim yozayotgani faqat tasdiqlangan Telegram ma'lumotidan olinadi
    const cleanUserId = callerClean;
    const cleanUserName = `${caller.firstName} ${caller.lastName}`.trim() || 'Talaba';
    const cleanUsername = String(caller.username || '').replace(/^@/, '').trim();
    const cleanMessage = String(message).trim();

    // 2. Prepare Gemini System Prompt
    const systemPrompt = `Sen 'Yuksal Quiz' ta'lim platformasining rasmiy aqlli maslahatchisisan.

YASHIL ZONA (O'zing to'liq va muloyim javob berasan):
- Ilova qanday ishlashi, test yechish, test yaratish (Word/PDF yuklash, matn tashlash), ballar hisobi, reyting, vaucherni balansga qo'shish, do'stlarni taklif qilish va interfeys bo'yicha savollar. O'zbek tilida aniq, qisqa va do'stona javob ber.

QIZIL ZONA (Hech qachon o'zing javob bermaysan va pulni tasdiqlamaysan):
- To'lovlar, o'tmay qolgan pullar, hamyon balansi, kartadan yechilgan pul, pulni qaytarish (refund), bloklangan hisoblar, shikoyatlar yoki ma'muriy masalalar.

JAVOB QOIDASI:
Agar savol QIZIL ZONAGA tegishli bo'lsa, FAQAT quyidagi JSON formatni qaytar:
{
  "is_red_zone": true,
  "reply": "Hurmatli foydalanuvchi, ushbu moliyaviy/ma'muriy masala administratorga yo'naltirildi. Tez orada administrator shaxsan siz bilan bog'lanadi."
}
Agar savol YASHIL ZONAGA tegishli bo'lsa:
{
  "is_red_zone": false,
  "reply": "... (savolga to'liq javobing) ..."
}

MUHIM: Javobing FAQAT va FAQAT yuqoridagi toza JSON formatida bo'lsin. Hech qanday markdown \`\`\`json bloklari yoki tashqi izohlar yozma.`;

    let isRedZone = false;
    let replyText = '';

    // Quick regex heuristic check for red zone keywords
    const redZoneKeywordsRegex = /(to['`ʼ]lov|pul|kartam?|yechildi|tushmadi|click|payme|uzum|chek|kvitansiya|balans|qaytari|refund|blok|qoidabuzarlik|shikoyat|hisob raqam)/i;
    const isKeywordRedZone = redZoneKeywordsRegex.test(cleanMessage);

    if (GEMINI_API_KEY) {
      const candidateModels = GEMINI_MODELS;

      for (const model of candidateModels) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
          const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    { text: systemPrompt },
                    { text: `Foydalanuvchi savoli:\n"${cleanMessage}"` },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.2,
                topP: 0.95,
                maxOutputTokens: 1000,
              },
            }),
          });

          if (!response.ok) {
            continue;
          }

          const geminiData = await response.json();
          const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (!rawText.trim()) continue;

          // Clean JSON string
          let cleanedJson = rawText.trim();
          if (cleanedJson.startsWith('```json')) {
            cleanedJson = cleanedJson.replace(/^```json/, '').replace(/```$/, '').trim();
          } else if (cleanedJson.startsWith('```')) {
            cleanedJson = cleanedJson.replace(/^```/, '').replace(/```$/, '').trim();
          }

          try {
            const parsed = JSON.parse(cleanedJson);
            if (typeof parsed.is_red_zone === 'boolean' && parsed.reply) {
              isRedZone = parsed.is_red_zone;
              replyText = parsed.reply;
              break;
            }
          } catch {
            // If Gemini output plain text
            if (isKeywordRedZone) {
              isRedZone = true;
              replyText = "Hurmatli foydalanuvchi, ushbu moliyaviy/ma'muriy masala administratorga yo'naltirildi. Tez orada administrator shaxsan siz bilan bog'lanadi.";
            } else {
              isRedZone = false;
              replyText = rawText.trim();
            }
            break;
          }
        } catch (mErr) {
          console.warn(`Gemini model ${model} error:`, mErr);
        }
      }
    }

    // Fallback if AI didn't answer or API key missing
    if (!replyText) {
      if (isKeywordRedZone) {
        isRedZone = true;
        replyText = "Hurmatli foydalanuvchi, ushbu moliyaviy/ma'muriy masala administratorga yo'naltirildi. Tez orada administrator shaxsan siz bilan bog'lanadi.";
      } else {
        isRedZone = false;
        replyText = "Assalomu alaykum! Savolingiz qabul qilindi. 'Yuksal Quiz' ilovasida testlarni yechish, test yaratish yoki reyting ballaringizni oshirish bo'yicha qo'shimcha yordam kerak bo'lsa, bemalol murojaat qiling.";
      }
    }

    const status = isRedZone ? 'forwarded_to_admin' : 'resolved_by_ai';
    const sender = isRedZone ? 'user' : 'ai';

    // 3. Save to Supabase support_messages
    let savedRow: any = null;
    try {
      const { data: inserted, error: insertErr } = await supabase
        .from('support_messages')
        .insert({
          user_id: cleanUserId,
          user_name: cleanUserName,
          user_username: cleanUsername,
          message: cleanMessage,
          reply: replyText,
          sender,
          status,
          created_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();

      if (insertErr) {
        console.warn('support_messages insert error:', insertErr);
      } else {
        savedRow = inserted;
      }
    } catch (dbErr) {
      console.warn('support_messages db exception:', dbErr);
    }

    // 4. Red Zone: Forward to Telegram Admin
    if (isRedZone) {
      const tashkentTime = new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' });
      const adminCaption =
        "📩 <b>Yangi murojaat (Adminga yo'naltirildi)</b>\n\n" +
        `👤 Talaba: ${escapeHtml(cleanUserName)} (@${escapeHtml(cleanUsername) || 'mavjud_emas'})\n` +
        `🆔 Telegram ID: <code>${escapeHtml(cleanUserId)}</code>\n` +
        `❓ Savol matni: ${escapeHtml(cleanMessage)}\n` +
        `⏰ Vaqt: ${tashkentTime}`;

      const replyMarkup = {
        inline_keyboard: [
          [
            { text: '💬 Javob yozish', callback_data: `reply_support:${cleanUserId}` },
            { text: '🚫 Bloklash', callback_data: `ban_user:${cleanUserId}` },
          ],
        ],
      };

      // Barcha adminlarga
      for (const adminId of Array.from(new Set(getAdminIds()))) {
        await sendTelegramMessage(adminId, adminCaption, replyMarkup);
      }
    }

    return res.status(200).json({
      ok: true,
      is_red_zone: isRedZone,
      reply: replyText,
      status,
      messageId: savedRow?.id || null,
      created_at: savedRow?.created_at || new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Unhandled support-chat error:', err?.message);
    return res.status(500).json({
      ok: false,
      error: 'Server xatosi',
      reply: "Hurmatli foydalanuvchi, xatolik yuz berdi. Tez orada administrator siz bilan bog'lanadi.",
    });
  }
}
