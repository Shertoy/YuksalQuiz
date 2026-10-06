import { GEMINI_MODELS } from './_lib/common';
// @ts-ignore
import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

interface ParsedQuizQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
}

export default async function handler(req: any, res: any) {
  // CORS setup
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

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Faqat POST so\'rovlari qabul qilinadi.' });
  }

  try {
    const { fileBase64, mimeType = '', fileName = '', rawText = '' } = req.body || {};

    let extractedText = (rawText || '').trim();
    let pdfBase64: string | null = null;

    // 1. Process uploaded file if provided
    if (fileBase64 && typeof fileBase64 === 'string') {
      let cleanBase64 = fileBase64.trim();
      let detectedMime = mimeType;

      if (cleanBase64.startsWith('data:')) {
        const commaIndex = cleanBase64.indexOf(',');
        if (commaIndex !== -1) {
          const header = cleanBase64.substring(0, commaIndex);
          const mimeMatch = header.match(/data:([^;]+);/);
          if (mimeMatch && mimeMatch[1]) {
            detectedMime = mimeMatch[1];
          }
          cleanBase64 = cleanBase64.substring(commaIndex + 1);
        }
      }

      const fileBuffer = Buffer.from(cleanBase64, 'base64');

      // Maximum 5 MB check
      if (fileBuffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({
          ok: false,
          error: "Fayl hajmi 5 MB dan oshmasligi kerak (Maksimal ruxsat: 5 MB).",
        });
      }

      const lowerName = (fileName || '').toLowerCase();
      const isWord =
        lowerName.endsWith('.docx') ||
        detectedMime.includes('word') ||
        detectedMime.includes('officedocument.wordprocessingml');
      const isPdf = lowerName.endsWith('.pdf') || detectedMime.includes('pdf');
      const isTxt = lowerName.endsWith('.txt') || detectedMime.includes('text/plain');

      if (isWord) {
        try {
          // Extract text from DOCX using mammoth
          const mammoth = await import('mammoth');
          const docxResult = await mammoth.extractRawText({ buffer: fileBuffer });
          extractedText = (docxResult.value || '').trim();
          if (!extractedText) {
            return res.status(400).json({
              ok: false,
              error: "Word (.docx) faylidan matn o'qib bo'lmadi yoki fayl bo'sh.",
            });
          }
        } catch (docxErr: any) {
          console.error('Word extraction error:', docxErr);
          return res.status(400).json({
            ok: false,
            error: "Word (.docx) faylini o'qishda xatolik yuz berdi: " + (docxErr?.message || ''),
          });
        }
      } else if (isPdf) {
        // PDF will be passed directly to Gemini 1.5 Flash via inline_data
        pdfBase64 = cleanBase64;
      } else if (isTxt) {
        extractedText = fileBuffer.toString('utf-8').trim();
      } else {
        // Fallback: try UTF-8 decoding if not binary
        extractedText = fileBuffer.toString('utf-8').trim();
      }
    }

    if (!extractedText && !pdfBase64) {
      return res.status(400).json({
        ok: false,
        error: "Test matni yoki fayl taqdim etilmadi. Iltimos, fayl yuklang yoki matn kiriting.",
      });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        ok: false,
        error: "Serverda GEMINI_API_KEY o'rnatilmagan.",
      });
    }

    // 2. Prepare Gemini Prompt
    const systemPrompt = `
Siz ta'lim va test savollarini tahlil qiluvchi yuqori intellektual tizimsiz.
Vazifangiz: Berilgan hujjat yoki matndagi test savollarini aniqlash va strukturalash.

TALABLAR:
1. Har bir savol uchun quyidagilarni aniqlang:
   - "question": Savol matni (savol raqamlari yoki ortiqcha belgilarsiz toza matn).
   - "options": 4 ta javob varianti massivi (A, B, C, D variantlar). Variant prefikslari (A), B), 1), a.) olib tashlanib, toza variant matni bo'lsin.
   - "correct_answer": To'g'ri javob matni (variantlardagi matn bilan BIR XIL bo'lsin).
2. MUHIM: Agar to'g'ri javob faylda belgilanmagan bo'lsa (yoki belgi topilmasa), o'z bilimlaringiz asosida qaysi variant to'g'ri ekanligini mustaqil aniqlang va "correct_answer" ga o'sha to'g'ri variant matnini yozing.
3. Agar variantlar 4 tadan kam bo'lsa (masalan 3 ta), ma'noli mantiqiy 4-variant qo'shing. Agar ko'p bo'lsa, eng mos 4 tasini qoldiring.
4. Javobingiz FAQAT va FAQAT quyidagi JSON massiv formatida bo'lsin:
[
  {
    "question": "O'zbekiston poytaxti qaysi shahar?",
    "options": ["Toshkent", "Samarqand", "Buxoro", "Xiva"],
    "correct_answer": "Toshkent"
  }
]
Hech qanday izoh, markdown kodi yoki qo'shimcha matn yozmang. Faqat toza JSON qaytaring.
`;

    const parts: any[] = [{ text: systemPrompt }];

    if (pdfBase64) {
      parts.push({
        inline_data: {
          mime_type: 'application/pdf',
          data: pdfBase64,
        },
      });
      parts.push({
        text: "Iltimos, ushbu PDF hujjatidagi barcha test savollarini aniqlab, yuqoridagi formatda JSON massiv sifatida qaytaring.",
      });
    } else {
      parts.push({
        text: `Quyidagi hujjat matnidan test savollarini aniqlang:\n\n${extractedText}`,
      });
    }

    // 3. Call Gemini Model with fallback cascade
    const candidateModels = GEMINI_MODELS;

    let rawAiResult = '';
    let lastError = '';

    for (const model of candidateModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          }),
        });

        if (response.ok) {
          const json = await response.json();
          const textCandidate = json?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textCandidate) {
            rawAiResult = textCandidate;
            break;
          }
        } else {
          const errDetail = await response.text();
          lastError = `Gemini (${model}) ${response.status}: ${errDetail.substring(0, 150)}`;
          console.warn('Gemini model attempt error:', lastError);
        }
      } catch (callErr: any) {
        lastError = callErr?.message || 'Aloqa xatosi';
        console.warn(`Model ${model} fetch exception:`, lastError);
      }
    }

    if (!rawAiResult) {
      return res.status(500).json({
        ok: false,
        error: `Gemini AI orqali testlarni tahlil qilib bo'lmadi. ${lastError || ''}`,
      });
    }

    // 4. Clean and parse JSON response
    let cleanJson = rawAiResult.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }

    let parsedQuestions: any[] = [];
    try {
      parsedQuestions = JSON.parse(cleanJson);
    } catch (parseErr) {
      // Try to extract bracketed array [ ... ]
      const startBracket = cleanJson.indexOf('[');
      const endBracket = cleanJson.lastIndexOf(']');
      if (startBracket !== -1 && endBracket !== -1) {
        parsedQuestions = JSON.parse(cleanJson.substring(startBracket, endBracket + 1));
      } else {
        throw new Error('JSON formatida o\'qib bo\'lmadi');
      }
    }

    if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Hujjatdan birorta ham test savoli aniqlanmadi. Iltimos, fayl tarkibini tekshiring.",
      });
    }

    // 5. Sanitize and validate questions
    const sanitized: ParsedQuizQuestion[] = parsedQuestions
      .map((item: any, idx: number) => {
        const questionText = String(item.question || item.savol || '').trim();
        let rawOpts = Array.isArray(item.options) ? item.options : Array.isArray(item.variantlar) ? item.variantlar : [];
        let options: string[] = rawOpts.map((opt: any) => String(opt || '').trim()).filter(Boolean);

        // Ensure at least 4 options
        while (options.length < 4) {
          options.push(`Variant ${String.fromCharCode(65 + options.length)}`);
        }
        if (options.length > 4) {
          options = options.slice(0, 4);
        }

        let correctAnswer = String(item.correct_answer || item.togri_javob || item.answer || '').trim();

        // If correct answer matches an option prefix like "A", "B", "C", "D"
        if (/^[A-D]$/i.test(correctAnswer)) {
          const letterIdx = correctAnswer.toUpperCase().charCodeAt(0) - 65;
          if (options[letterIdx]) {
            correctAnswer = options[letterIdx];
          }
        }

        // If correct answer doesn't match any option, find the best match or default to first
        const exactMatch = options.find((opt) => opt.toLowerCase() === correctAnswer.toLowerCase());
        if (exactMatch) {
          correctAnswer = exactMatch;
        } else if (!options.includes(correctAnswer)) {
          // If not in options, default to option 0
          correctAnswer = options[0];
        }

        return {
          question: questionText || `Savol #${idx + 1}`,
          options,
          correct_answer: correctAnswer,
          explanation: item.explanation ? String(item.explanation) : undefined,
        };
      })
      .filter((q) => q.question.length > 2);

    return res.status(200).json({
      ok: true,
      count: sanitized.length,
      questions: sanitized,
    });
  } catch (error: any) {
    console.error('parse-quiz-file handler error:', error);
    return res.status(500).json({
      ok: false,
      error: error?.message || 'Kutilmagan server xatoligi yuz berdi.',
    });
  }
}
