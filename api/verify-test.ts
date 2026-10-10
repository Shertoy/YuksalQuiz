import { getServiceClient, setCors, verifyRequestUser, findUserRow } from './_lib/common.js';

/**
 * Blok javoblarini serverda tekshirish.
 *
 * Talaba blokni tugatgach, tanlagan variantlarini (asl tartibdagi indeks) yuboradi.
 * Server to'g'ri javoblarni o'zidan oladi va har bir savol uchun natijani qaytaradi.
 * To'g'ri javoblar test boshlanishidan oldin telefonga yuborilmaydi.
 *
 * POST /api/verify-test
 *   { testPackageId, blockId?, blockIndex?, answers: [{ questionId, selected }] }
 * -> { ok, score, total, results: [{ questionId, selected, correctOptionIndex, isCorrect, explanation }] }
 *
 * Bu endpoint pul yoki coin bermaydi.
 */

const ANSWERS_TABLE = 'test_answers';

type Key = { c: number; e?: string | null };

function parseBlocks(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** To'g'ri javoblar: avval maxfiy jadvaldan, bo'lmasa test bloklarining o'zidan (eski testlar) */
async function loadAnswerKey(db: any, packageId: string, blockQuestions: any[]): Promise<Record<string, Key>> {
  const key: Record<string, Key> = {};
  try {
    const { data, error } = await db.from(ANSWERS_TABLE).select('answers').eq('package_id', packageId).maybeSingle();
    if (!error && data?.answers && typeof data.answers === 'object') {
      for (const [qid, v] of Object.entries<any>(data.answers)) {
        if (v && Number.isInteger(Number(v.c))) key[qid] = { c: Number(v.c), e: v.e ?? null };
      }
    }
  } catch {
    /* jadval hali yaratilmagan bo'lishi mumkin */
  }
  for (const q of blockQuestions) {
    const qid = String(q?.id ?? '');
    if (!qid || key[qid]) continue;
    const c = Number(q?.correctOptionIndex);
    if (Number.isInteger(c) && c >= 0) key[qid] = { c, e: q?.explanation ?? null };
  }
  return key;
}

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST kerak' });

  const caller = verifyRequestUser(req);
  if (!caller) {
    return res.status(401).json({ ok: false, reason: 'unauthorized', error: 'Ilovani Telegram ichida oching.' });
  }

  const testPackageId = String(req.body?.testPackageId || '').slice(0, 160);
  const blockId = String(req.body?.blockId || '').slice(0, 160);
  const blockIndex = Number(req.body?.blockIndex);
  const answers = Array.isArray(req.body?.answers) ? req.body.answers.slice(0, 1000) : null;
  if (!testPackageId || !answers) {
    return res.status(400).json({ ok: false, error: "testPackageId va answers kerak" });
  }

  try {
    const db = getServiceClient();

    const userRow = await findUserRow(db, caller.id);
    if (userRow?.is_blocked) {
      return res.status(403).json({ ok: false, reason: 'blocked', error: 'Hisobingiz bloklangan' });
    }

    const { data: pkg, error: pkgErr } = await db
      .from('test_packages')
      .select('id, blocks')
      .eq('id', testPackageId)
      .maybeSingle();
    if (pkgErr) throw pkgErr;
    if (!pkg) return res.status(404).json({ ok: false, reason: 'not_found', error: 'Test topilmadi' });

    const blocks = parseBlocks(pkg.blocks);
    const block =
      (blockId && blocks.find((b: any) => String(b?.id) === blockId)) ||
      (Number.isInteger(blockIndex) ? blocks[blockIndex] : undefined);
    if (!block) return res.status(404).json({ ok: false, reason: 'block_not_found', error: 'Blok topilmadi' });

    const questions: any[] = Array.isArray(block.questions) ? block.questions : [];
    const byId = new Map(questions.map((q: any) => [String(q?.id ?? ''), q]));
    const key = await loadAnswerKey(db, testPackageId, questions);

    const chosen = new Map<string, number>();
    for (const a of answers) {
      const qid = String(a?.questionId ?? '');
      const sel = Number(a?.selected);
      if (qid && byId.has(qid)) chosen.set(qid, Number.isInteger(sel) ? sel : -1);
    }

    let score = 0;
    const results = questions.map((q: any) => {
      const qid = String(q?.id ?? '');
      const k = key[qid];
      const selected = chosen.has(qid) ? (chosen.get(qid) as number) : -1;
      const correct = k ? k.c : -1;
      const isCorrect = correct >= 0 && selected === correct;
      if (isCorrect) score += 1;
      return {
        questionId: qid,
        selected,
        correctOptionIndex: correct,
        isCorrect,
        explanation: k?.e || null,
      };
    });

    return res.status(200).json({ ok: true, score, total: questions.length, results });
  } catch (err: any) {
    console.error('verify-test error:', err?.message);
    return res.status(500).json({ ok: false, error: "Natijani tekshirib bo'lmadi. Qayta urinib ko'ring." });
  }
}
