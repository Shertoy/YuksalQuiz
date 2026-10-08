import { QuizQuestionInput } from '../services/testSyncService';

/**
 * Rasmiy HEMIS test shabloni namunaviy matni
 */
export const HEMIS_SAMPLE_TEMPLATE = `Akademik yozuvning asosiy xususiyati nimada?
====
Oddiy suhbat ohangida yozish
====
#Ilmiy uslub, mantiqiylik va neytrallikni saqlash
====
Shaxsiy fikrlarni hissiy tarzda ifodalash
====
Faqatgina badiiy uslubdan foydalanish
++++
Axborot xavfsizligida autentifikatsiya nima?
====
Ma'lumotlarni shifrlash usuli
====
#Foydalanuvchining shaxsini tasdiqlash jarayoni
====
Tarmoq tezligini oshirish mexanizmi
====
Fayllarni zaxira qilish uslubi
++++
Algoritmning diskretlik xossasi nimani anglatadi?
====
Har doim cheksiz davom etishi
====
Barcha foydalanuvchilarga tushunarli bo'lishi
====
#Ketma-ket aniq va alohida qadamlardan iborat bo'lishi
====
Faqat sonlar ustida bajarilishi
++++`;

/**
 * Standart A/B/C/D formatidagi namunaviy matn
 */
export const STANDARD_SAMPLE_TEMPLATE = `1. O'zbekiston Respublikasi Konstitutsiyasi qachon qabul qilingan?
A) 1991-yil 1-sentabr
B) 1992-yil 8-dekabr
C) 1993-yil 9-aprel
D) 1990-yil 24-mart
Javob: B

2. Kompyuterning asosiy xotira qurilmasi qaysi?
A) Videokarta
B) Monitor
*C) Tezkor xotira (RAM)
D) Printer
Javob: C

3. HTML qisqartmasining to'liq ma'nosi nima?
#A) HyperText Markup Language
B) HighTech Modern Language
C) Home Tool Markup Language
D) Hyperlinks Text Management List
Javob: A`;

/**
 * Berilgan matndan test savollari va javoblarini tahlil qiluvchi (parse) universal funksiya.
 * Quyidagi formatlarni avtomatik aniqlaydi:
 * 1. Rasmiy HEMIS formati (++++ va ====, to'g'ri javob oldida #)
 * 2. Variantlar bo'yicha ajratilgan ==== formati
 * 3. Standart A) B) C) D) formatlari (Javob: X yoki to'g'ri javob oldida *, #, +)
 * 4. Bo'sh qator bilan ajratilgan savollar bloki
 */
export function parseBulkQuizText(rawText: string): {
  questions: QuizQuestionInput[];
  format: 'hemis' | 'standard' | 'simple' | 'unknown';
  error?: string;
} {
  const text = (rawText || '').trim();
  if (!text) {
    return { questions: [], format: 'unknown', error: "Matn kiritilmadi." };
  }

  // --- 1. RASMIY HEMIS FORMATI: ++++ va ==== ---
  if (text.includes('++++')) {
    const rawBlocks = text.split(/\+{3,}/).map((b) => b.trim()).filter(Boolean);
    const parsed: QuizQuestionInput[] = [];

    for (const block of rawBlocks) {
      const parts = block.split(/={3,}/).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const questionText = parts[0].replace(/^\d+[\.\)]\s*/, '').trim();
        const rawOpts = parts.slice(1);
        let correctAnswer = '';
        const options: string[] = [];

        rawOpts.forEach((opt, idx) => {
          let clean = opt.trim();
          if (clean.startsWith('#') || clean.startsWith('+') || clean.startsWith('*')) {
            clean = clean.replace(/^[#+*]+/, '').trim();
            correctAnswer = clean;
          } else if (clean.startsWith('=')) {
            clean = clean.replace(/^=+/, '').trim();
          }
          // Remove A) / B) prefix if present inside option
          clean = clean.replace(/^[A-Da-dА-Яа-я][\.\)]\s*/, '').trim();
          options.push(clean || `Variant ${String.fromCharCode(65 + idx)}`);
        });

        // 4 ta variant bo'lishini ta'minlash
        while (options.length < 4) {
          options.push(`Variant ${String.fromCharCode(65 + options.length)}`);
        }

        if (!correctAnswer) {
          correctAnswer = options[0];
        }

        if (questionText) {
          parsed.push({
            question: questionText,
            options: options.slice(0, 4),
            correct_answer: correctAnswer,
          });
        }
      }
    }

    if (parsed.length > 0) {
      return { questions: parsed, format: 'hemis' };
    }
  }

  // --- 2. FAQAT ==== BILAN AJRATILGAN SAVOLLAR (bo'sh qatorlar bilan savollar) ---
  if (text.includes('====')) {
    const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter((b) => b.includes('===='));
    const parsed: QuizQuestionInput[] = [];

    for (const block of blocks) {
      const parts = block.split(/={3,}/).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const questionText = parts[0].replace(/^\d+[\.\)]\s*/, '').trim();
        const rawOpts = parts.slice(1);
        let correctAnswer = '';
        const options: string[] = [];

        rawOpts.forEach((opt, idx) => {
          let clean = opt.trim();
          if (clean.startsWith('#') || clean.startsWith('+') || clean.startsWith('*')) {
            clean = clean.replace(/^[#+*]+/, '').trim();
            correctAnswer = clean;
          }
          clean = clean.replace(/^[A-Da-dА-Яа-я][\.\)]\s*/, '').trim();
          options.push(clean || `Variant ${String.fromCharCode(65 + idx)}`);
        });

        while (options.length < 4) {
          options.push(`Variant ${String.fromCharCode(65 + options.length)}`);
        }

        if (!correctAnswer) {
          correctAnswer = options[0];
        }

        if (questionText) {
          parsed.push({
            question: questionText,
            options: options.slice(0, 4),
            correct_answer: correctAnswer,
          });
        }
      }
    }

    if (parsed.length > 0) {
      return { questions: parsed, format: 'hemis' };
    }
  }

  // --- 3. STANDART A) B) C) D) VA "Javob: X" FORMATI ---
  const numberedBlocks = text.split(/(?:^|\n)\s*(?=\d+[\.\)]\s+)/).map((b) => b.trim()).filter(Boolean);
  if (numberedBlocks.length >= 1) {
    const parsed: QuizQuestionInput[] = [];

    for (const block of numberedBlocks) {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) continue;

      // Extract Answer: X line if present
      let explicitAnswerLetter = '';
      const contentLines: string[] = [];

      for (const line of lines) {
        const answerMatch = line.match(/(?:Javob|To'g'ri javob|To`g`ri javob|Ответ|Answer)\s*[:=\-]?\s*([A-DА-Гa-dа-г])/i);
        if (answerMatch && answerMatch[1]) {
          explicitAnswerLetter = answerMatch[1].toUpperCase();
        } else {
          contentLines.push(line);
        }
      }

      if (contentLines.length < 2) continue;

      // First line is Question (strip 1. or 1) prefix)
      const qText = contentLines[0].replace(/^\d+[\.\)]\s*/, '').trim();
      const rawOptions: { letter?: string; text: string; isMarked: boolean }[] = [];

      for (let i = 1; i < contentLines.length; i++) {
        const line = contentLines[i];
        const optMatch = line.match(/^([#*+]?)\s*([A-DА-Гa-dа-г])[\.\)]\s*(.*)$/);
        if (optMatch) {
          const hasMark = Boolean(optMatch[1]);
          const letter = optMatch[2].toUpperCase();
          const optText = optMatch[3].trim();
          rawOptions.push({ letter, text: optText, isMarked: hasMark });
        } else if (line.startsWith('#') || line.startsWith('*') || line.startsWith('+')) {
          const clean = line.replace(/^[#*+]+/, '').trim();
          rawOptions.push({ text: clean, isMarked: true });
        } else {
          rawOptions.push({ text: line, isMarked: false });
        }
      }

      if (rawOptions.length >= 2) {
        let correctAns = '';
        const options: string[] = [];

        rawOptions.forEach((optObj, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const optText = optObj.text || `Variant ${letter}`;
          options.push(optText);

          if (optObj.isMarked) {
            correctAns = optText;
          } else if (
            explicitAnswerLetter &&
            (optObj.letter === explicitAnswerLetter || letter === explicitAnswerLetter)
          ) {
            correctAns = optText;
          }
        });

        while (options.length < 4) {
          options.push(`Variant ${String.fromCharCode(65 + options.length)}`);
        }

        if (!correctAns) {
          correctAns = options[0];
        }

        parsed.push({
          question: qText,
          options: options.slice(0, 4),
          correct_answer: correctAns,
        });
      }
    }

    if (parsed.length > 0) {
      return { questions: parsed, format: 'standard' };
    }
  }

  // --- 4. FALLBACK: Bo'sh qatorlar bilan ajratilgan savollar ---
  const simpleBlocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const parsed: QuizQuestionInput[] = [];

  for (const block of simpleBlocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length >= 2) {
      const qText = lines[0].replace(/^\d+[\.\)]\s*/, '').trim();
      const rawOpts = lines.slice(1);
      let correctAns = '';
      const options: string[] = [];

      rawOpts.forEach((opt, idx) => {
        let clean = opt.trim();
        if (clean.startsWith('#') || clean.startsWith('+') || clean.startsWith('*')) {
          clean = clean.replace(/^[#+*]+/, '').trim();
          correctAns = clean;
        }
        clean = clean.replace(/^[A-Da-dА-Яа-я][\.\)]\s*/, '').trim();
        options.push(clean || `Variant ${String.fromCharCode(65 + idx)}`);
      });

      while (options.length < 4) {
        options.push(`Variant ${String.fromCharCode(65 + options.length)}`);
      }

      if (!correctAns) {
        correctAns = options[0];
      }

      parsed.push({
        question: qText,
        options: options.slice(0, 4),
        correct_answer: correctAns,
      });
    }
  }

  if (parsed.length > 0) {
    return { questions: parsed, format: 'simple' };
  }

  return {
    questions: [],
    format: 'unknown',
    error: "Test formati aniqlanmadi. Iltimos, rasmiy HEMIS (==== va ++++) yoki A) B) C) D) formatida kiriting.",
  };
}

/**
 * Shablon faylini brauzerdan yuklab olish uchun helper (.txt)
 */
export function downloadSampleTemplateFile(format: 'hemis' | 'standard' = 'hemis') {
  const content = format === 'hemis' ? HEMIS_SAMPLE_TEMPLATE : STANDARD_SAMPLE_TEMPLATE;
  const fileName = format === 'hemis' ? 'hemis_test_shabloni.txt' : 'standart_test_shabloni.txt';
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
