import { createClient } from '@supabase/supabase-js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '';
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '7847500525';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://kupbaphqyyvmpqxmrtrn.supabase.co';

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1cGJhcGhxeXl2bXBxeG1ydHJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5MDgwMDYsImV4cCI6MjEwNjQ4NDAwNn0.ieqSwohIUgfAwQ2EUF1CWSr-TT46SiLOSGDxYoFY2OE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. GET: Fetch chat history for a specific user
  if (req.method === 'GET') {
    try {
      const userId = req.query.user_id || req.query.userId;
      if (!userId) {
        return res.status(400).json({ ok: false, error: 'user_id talab qilinadi' });
      }

      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('user_id', String(userId))
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        // Table may not have been created yet or RLS error
        return res.status(200).json({ ok: true, messages: [] });
      }

      return res.status(200).json({ ok: true, messages: data || [] });
    } catch (err: any) {
      console.error('support-chat GET error:', err);
      return res.status(200).json({ ok: true, messages: [] });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Faqat POST va GET so\'rovlari qabul qilinadi.' });
  }

  try {
    const { userId, userName, userUsername, message } = req.body || {};

    if (!message || !message.trim()) {
      return res.status(400).json({ ok: false, error: 'Savol matni kiritilmagan.' });
    }

    const cleanUserId = String(userId || 'guest').trim();
    const cleanUserName = String(userName || 'Talaba').trim();
    const cleanUsername = String(userUsername || '').replace(/^@/, '').trim();
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
      const candidateModels = [
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest',
        'gemini-2.0-flash',
        'gemini-1.5-pro',
      ];

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
        `🆔 Telegram ID: <code>${cleanUserId}</code>\n` +
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

      // Send to Admin
      await sendTelegramMessage(ADMIN_TELEGRAM_ID, adminCaption, replyMarkup);
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
    console.error('Unhandled support-chat error:', err);
    return res.status(500).json({
      ok: false,
      error: err?.message || 'Server xatosi',
      reply: "Hurmatli foydalanuvchi, xatolik yuz berdi. Tez orada administrator siz bilan bog'lanadi.",
    });
  }
}
