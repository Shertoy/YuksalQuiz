import { createClient } from '@supabase/supabase-js';
import { validateTelegramInitData, getServiceClient, cleanId, findUserRow } from './_lib/common.ts';

/**
 * Test natijasini tekshirish va coin berish.
 *
 * FIX [CRITICAL]: Client yuborgan score/earnedCoins qiymatlari ishlatilmaydi.
 * Ball server tomonida test paketidagi to'g'ri javoblar asosida hisoblanadi.
 *
 * FIX [HIGH]: In-memory rate limit o'chirildi (serverless instancelar orasida umumiy emas).
 * Rate limitni DB darajasida tekshirish taklif etilgan (quyida izoh).
 */

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Init-Data');
  // FIX: 'Access-Control-Allow-Credentials: true' + wildcard origin olib tashlandi

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '';
  const { initData, testPackageId, blockIndex, answers, timeSpentSeconds } = req.body || {};

  // 1. Autentifikatsiya
  if (!initData || !botToken) {
    return res.status(401).json({ ok: false, error: 'Telegram orqali kiring' });
  }
  const authResult = validateTelegramInitData(initData, botToken);
  if (!authResult.isValid || !authResult.user?.id) {
    return res.status(401).json({ ok: false, error: 'Autentifikatsiya muvaffaqiyatsiz' });
  }
  const telegramUserId = String(authResult.user.id);

  // 2. Input validatsiya
  if (!testPackageId || typeof blockIndex !== 'number') {
    return res.status(400).json({ ok: false, error: "testPackageId va blockIndex talab qilinadi" });
  }
  if (!Array.isArray(answers)) {
    return res.status(400).json({ ok: false, error: 'answers massivi talab qilinadi' });
  }

  const db = getServiceClient();

  // 3. Foydalanuvchini bazadan topish
  const userRow = await findUserRow(db, telegramUserId);
  if (!userRow) {
    return res.status(404).json({ ok: false, error: "Foydalanuvchi topilmadi. Avval ro'yxatdan o'ting." });
  }
  if (userRow.is_blocked) {
    return res.status(403).json({ ok: false, error: 'Hisobingiz bloklangan' });
  }

  // 4. Test paketini va blokni serverdan olish
  const { data: pkg, error: pkgErr } = await db
    .from('test_packages')
    .select('id, blocks, is_public')
    .eq('id', testPackageId)
    .maybeSingle();

  if (pkgErr || !pkg) {
    return res.status(404).json({ ok: false, error: 'Test paketi topilmadi' });
  }

  // FIX: foydalanuvchi yopiq testga kira olmasligi tekshiriladi
  const isSubscribed =
    userRow.is_subscribed ||
    (userRow.paid_until && new Date(userRow.paid_until) > new Date()) ||
    (userRow.subscription_end && new Date(userRow.subscription_end) > new Date());

  if (!pkg.is_public && !isSubscribed) {
    return res.status(403).json({ ok: false, error: 'Bu test uchun obuna kerak' });
  }

  // 5. Blokni topish
  const blocks: any[] = Array.isArray(pkg.blocks) ? pkg.blocks : [];
  const block = blocks[blockIndex];
  if (!block) {
    return res.status(400).json({ ok: false, error: 'Blok topilmadi' });
  }

  const questions: any[] = Array.isArray(block.questions) ? block.questions : [];
  const qCount = questions.length;

  if (qCount === 0) {
    return res.status(400).json({ ok: false, error: 'Blokda savollar yo\'q' });
  }

  // 6. Vaqt tekshiruvi (minimal 0.4s/savol)
  const timeSeconds = Number(timeSpentSeconds) || 0;
  const minRealisticTime = Math.max(3, Math.ceil(qCount * 0.4));
  if (timeSeconds < minRealisticTime) {
    return res.status(400).json({
      ok: false,
      error: `Test topshirish vaqti shubhali (${timeSeconds}s). Anti-cheat tekshiruvidan o'tmadi.`,
    });
  }

  // 7. FIX [CRITICAL]: Ball serverda hisoblanadi — clientdan score qabul qilinmaydi
  let correctCount = 0;
  const answerMap: Record<number, any> = {};
  if (Array.isArray(answers)) {
    answers.forEach((a: any) => {
      if (typeof a?.questionIndex === 'number') {
        answerMap[a.questionIndex] = a.selectedAnswer;
      }
    });
  }

  for (let i = 0; i < qCount; i++) {
    const q = questions[i];
    const userAnswer = answerMap[i];
    const correctAnswer = q?.correct_answer ?? q?.correctAnswer ?? q?.answer;
    if (userAnswer !== undefined && userAnswer !== null && String(userAnswer) === String(correctAnswer)) {
      correctCount++;
    }
  }

  const percentage = Math.round((correctCount / qCount) * 100);
  const isPassed = percentage >= 70;
  // FIX: coinlar serverda hisoblanadi, clientdan earnedCoins qabul qilinmaydi
  const earnedCoins = isPassed ? 50 : 10;

  // 8. Natijani bazaga yozish va coinlarni berish (RPC orqali atomic)
  try {
    // test_results jadvaliga yozish
    await db.from('test_results').insert({
      user_id: userRow.id,
      test_package_id: testPackageId,
      block_index: blockIndex,
      score: correctCount,
      percentage,
      time_spent_seconds: timeSeconds,
      created_at: new Date().toISOString(),
    });

    // Coin berish
    await db.rpc('_wallet_change', {
      p_user: userRow.id,
      p_amount: earnedCoins,
      p_type: 'coin_reward',
      p_ref: `test_${testPackageId}_block_${blockIndex}`,
      p_note: `Test mukofoti: ${earnedCoins} coin`,
    });
  } catch (dbErr: any) {
    // Natija saqlanmasa ham javobni qaytarish (eng muhim qismi ball)
    console.error('DB write error:', dbErr?.message);
  }

  return res.status(200).json({
    ok: true,
    verified: true,
    score: correctCount,
    totalQuestions: qCount,
    percentage,
    isPassed,
    earnedCoins,
    userId: telegramUserId,
    timestamp: new Date().toISOString(),
  });
}
