import {
  getServiceClient,
  setCors,
  verifyRequestUser,
  isAdminId,
  cleanId,
  findUserRow,
} from './_lib/common.js';

/**
 * Testlar, OTMlar, e'lonlar va reyting qatorlarini saqlash uchun xavfsiz API.
 *
 * Brauzer test_packages / quizzes / questions / universities jadvallariga to'g'ridan-to'g'ri yozmaydi.
 * Har bir yozuv shu yerda tekshiriladi:
 *  - test faqat muallifi yoki admin tomonidan o'zgartiriladi / o'chiriladi
 *  - tizim qatorlari (__system_, lead_, ann_, adm_) ni oddiy foydalanuvchi o'zgartira olmaydi
 *  - OTM va e'lonlar faqat admin uchun
 *
 * POST /api/content { action, ... }
 *   save_test | delete_test | clear_all_tests
 *   upsert_universities | delete_universities
 *   save_announcement | delete_announcement
 *   sync_profile
 */

const RESERVED_PREFIXES = ['__system_', 'lead_', 'ann_', 'adm_'];
const RESERVED_CATEGORIES = new Set(['LeaderboardUser', 'System', 'AdminCredit', 'Announcement']);
const DELETED_REGISTRY_ID = '__system_deleted_tests__';
const MAX_QUESTIONS = 5000;
const MAX_BLOCKS_JSON = 3_500_000; // ~3.5 MB

const str = (v: unknown, max: number) => String(v ?? '').replace(/\u0000/g, '').trim().slice(0, max);
const num = (v: unknown, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

function isValidTestId(id: string): boolean {
  if (!id || id.length > 160 || /[\s"'<>\\]/.test(id)) return false;
  return !RESERVED_PREFIXES.some((p) => id.startsWith(p));
}

function sameUser(a: unknown, b: unknown): boolean {
  const x = cleanId(a as any);
  const y = cleanId(b as any);
  return Boolean(x) && x === y;
}

async function readDeletedRegistry(db: any): Promise<string[]> {
  const { data } = await db.from('test_packages').select('blocks').eq('id', DELETED_REGISTRY_ID).maybeSingle();
  let raw: any = data?.blocks;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = [];
    }
  }
  return Array.isArray(raw) ? raw.map(String) : [];
}

async function addToDeletedRegistry(db: any, ids: string[]) {
  if (!ids.length) return;
  const current = await readDeletedRegistry(db);
  const merged = Array.from(new Set([...current, ...ids]));
  if (merged.length === current.length) return;
  await db.from('test_packages').upsert(
    {
      id: DELETED_REGISTRY_ID,
      title: 'Deleted Tests Registry',
      category: 'System',
      university: 'System',
      department: 'System',
      blocks: merged,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
}

function countQuestions(blocks: any[]): number {
  return blocks.reduce((sum, b) => sum + (Array.isArray(b?.questions) ? b.questions.length : 0), 0);
}

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST kerak' });

  const caller = verifyRequestUser(req);
  if (!caller) {
    return res.status(401).json({ ok: false, reason: 'unauthorized', error: 'Ilovani Telegram ichida oching.' });
  }
  const admin = isAdminId(caller.id);
  const action = String(req.body?.action || '');

  const adminOnly = () =>
    res.status(403).json({ ok: false, reason: 'forbidden', error: 'Bu amal faqat admin uchun.' });

  try {
    const db = getServiceClient();

    if (!admin) {
      const userRow = await findUserRow(db, caller.id);
      if (userRow?.is_blocked) {
        return res.status(403).json({ ok: false, reason: 'blocked', error: 'Hisobingiz bloklangan' });
      }
    }

    // ------------------------------------------------------------
    // save_test — yangi test yoki tahrir
    // ------------------------------------------------------------
    if (action === 'save_test') {
      const input = req.body?.row || {};
      const id = str(input.id, 160);
      if (!isValidTestId(id)) {
        return res.status(400).json({ ok: false, error: "Test ID noto'g'ri." });
      }
      const category = str(input.category, 100) || "Oliy Ta'lim (HEMIS)";
      if (RESERVED_CATEGORIES.has(category)) {
        return res.status(400).json({ ok: false, error: "Bu toifa testlar uchun emas." });
      }
      const blocks = Array.isArray(input.blocks) ? input.blocks : [];
      const qCount = countQuestions(blocks);
      if (!blocks.length || qCount === 0) {
        return res.status(400).json({ ok: false, error: "Testda savol yo'q." });
      }
      if (qCount > MAX_QUESTIONS) {
        return res.status(400).json({ ok: false, error: `Bitta testda ${MAX_QUESTIONS} tadan ko'p savol bo'lmasin.` });
      }
      if (JSON.stringify(blocks).length > MAX_BLOCKS_JSON) {
        return res.status(413).json({ ok: false, error: 'Test hajmi juda katta.' });
      }

      const { data: existing, error: exErr } = await db
        .from('test_packages')
        .select('id, author_id, author_name, author_wallet_balance, created_at, category')
        .eq('id', id)
        .maybeSingle();
      if (exErr) throw exErr;

      if (existing) {
        if (RESERVED_CATEGORIES.has(String(existing.category || ''))) {
          return res.status(403).json({ ok: false, reason: 'forbidden', error: "Bu qatorni o'zgartirib bo'lmaydi." });
        }
        if (!admin && !sameUser(existing.author_id, caller.id)) {
          return res.status(403).json({
            ok: false,
            reason: 'forbidden',
            error: "Bu test sizniki emas. Faqat muallif yoki admin tahrirlay oladi.",
          });
        }
      } else if (!admin) {
        const deleted = await readDeletedRegistry(db);
        if (deleted.includes(id)) {
          return res.status(410).json({ ok: false, reason: 'deleted', error: "Ushbu test tizimdan o'chirilgan." });
        }
      }

      // Muallif: mavjud testda o'zgarmaydi; yangi testda — so'rov yuborgan foydalanuvchi
      let authorId: string;
      if (existing) {
        authorId = String(existing.author_id || '');
      } else {
        const given = str(input.author_id, 80);
        authorId = admin ? given || caller.id : sameUser(given, caller.id) ? given : caller.id;
      }
      const authorName =
        str(input.author_name, 120) ||
        str(existing?.author_name, 120) ||
        `${caller.firstName} ${caller.lastName}`.trim() ||
        'Muallif';

      const createdAt = existing?.created_at
        ? existing.created_at
        : (() => {
            const d = new Date(input.created_at || Date.now());
            return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
          })();

      const row = {
        id,
        title: str(input.title, 300) || 'Test',
        category,
        university: str(input.university, 300),
        is_custom_university: Boolean(input.is_custom_university),
        is_pending_review: Boolean(input.is_pending_review),
        department: str(input.department, 200),
        is_public: Boolean(input.is_public),
        password: input.password ? str(input.password, 100) : null,
        total_questions: qCount,
        blocks,
        author_id: authorId,
        author_name: authorName,
        is_community_created: input.is_community_created === undefined ? true : Boolean(input.is_community_created),
        author_wallet_balance: num(existing?.author_wallet_balance, 0),
        created_at: createdAt,
      };

      const { error } = await db.from('test_packages').upsert(row, { onConflict: 'id' });
      if (error) throw error;

      // Qo'shimcha nusxa: quizzes + questions jadvallari (tahrirlash oynasi shulardan o'qiydi)
      const mirror = req.body?.mirror;
      if (mirror && Array.isArray(mirror.questions)) {
        try {
          const quiz = mirror.quiz || {};
          const isPublic = Boolean(row.is_public);
          const { error: quizErr } = await db.from('quizzes').upsert(
            {
              id,
              title: row.title,
              university: row.university || null,
              faculty: str(quiz.faculty, 200) || null,
              course_year: num(quiz.course_year, 1) || 1,
              semester: num(quiz.semester, 1) || 1,
              creator_id: authorId,
              creator_name: authorName,
              is_public: isPublic,
              visibility: isPublic ? 'public' : 'unlisted',
              category,
              total_questions: mirror.questions.length,
              updated_at: new Date().toISOString(),
              study_type: str(quiz.study_type, 40) || 'Kunduzgi',
            },
            { onConflict: 'id' }
          );
          if (!quizErr) {
            await db.from('questions').delete().eq('quiz_id', id);
            const rows = mirror.questions.slice(0, MAX_QUESTIONS).map((q: any, idx: number) => ({
              ...(q?.id ? { id: str(q.id, 160) } : {}),
              quiz_id: id,
              question: str(q?.question, 5000),
              options: (Array.isArray(q?.options) ? q.options : []).slice(0, 10).map((o: any) => str(o, 2000)),
              correct_answer: str(q?.correct_answer, 2000),
              explanation: q?.explanation ? str(q.explanation, 5000) : null,
              order_index: idx,
              created_at: new Date().toISOString(),
            }));
            for (let i = 0; i < rows.length; i += 500) {
              const { error: qErr } = await db.from('questions').insert(rows.slice(i, i + 500));
              if (qErr) {
                console.warn('questions mirror insert:', qErr.message);
                break;
              }
            }
          } else {
            console.warn('quizzes mirror upsert:', quizErr.message);
          }
        } catch (e: any) {
          console.warn('mirror write failed:', e?.message);
        }
      }

      return res.status(200).json({ ok: true, id, author_id: authorId });
    }

    // ------------------------------------------------------------
    // delete_test
    // ------------------------------------------------------------
    if (action === 'delete_test') {
      const id = str(req.body?.id, 160);
      if (!isValidTestId(id)) {
        return res.status(400).json({ ok: false, error: "Test ID noto'g'ri." });
      }
      const { data: existing } = await db
        .from('test_packages')
        .select('id, author_id, category')
        .eq('id', id)
        .maybeSingle();

      if (existing && RESERVED_CATEGORIES.has(String(existing.category || ''))) {
        return res.status(403).json({ ok: false, reason: 'forbidden', error: "Bu qatorni o'chirib bo'lmaydi." });
      }
      if (!admin) {
        if (!existing) return res.status(200).json({ ok: true, alreadyGone: true });
        if (!sameUser(existing.author_id, caller.id)) {
          return res.status(403).json({
            ok: false,
            reason: 'forbidden',
            error: "Bu test sizniki emas. Faqat muallif yoki admin o'chira oladi.",
          });
        }
      }

      const { error } = await db.from('test_packages').delete().eq('id', id);
      if (error) throw error;
      await db.from('questions').delete().eq('quiz_id', id);
      await db.from('quizzes').delete().eq('id', id);
      await addToDeletedRegistry(db, [id]);
      return res.status(200).json({ ok: true });
    }

    // ------------------------------------------------------------
    // clear_all_tests — faqat admin
    // ------------------------------------------------------------
    if (action === 'clear_all_tests') {
      if (!admin) return adminOnly();
      const { data: rows, error: selErr } = await db.from('test_packages').select('id, category');
      if (selErr) throw selErr;
      const ids = (rows || [])
        .filter((r: any) => isValidTestId(String(r.id)) && !RESERVED_CATEGORIES.has(String(r.category || '')))
        .map((r: any) => String(r.id));
      for (let i = 0; i < ids.length; i += 200) {
        const chunk = ids.slice(i, i + 200);
        const { error } = await db.from('test_packages').delete().in('id', chunk);
        if (error) throw error;
        await db.from('questions').delete().in('quiz_id', chunk);
        await db.from('quizzes').delete().in('id', chunk);
      }
      await addToDeletedRegistry(db, ids);
      return res.status(200).json({ ok: true, deleted: ids.length });
    }

    // ------------------------------------------------------------
    // OTMlar — faqat admin
    // ------------------------------------------------------------
    if (action === 'upsert_universities') {
      if (!admin) return adminOnly();
      const names: string[] = Array.from(
        new Set(
          (Array.isArray(req.body?.names) ? req.body.names : [])
            .map((n: any) => str(n, 300))
            .filter((n: string) => n.length > 0)
        )
      ).slice(0, 1000) as string[];
      if (!names.length) return res.status(200).json({ ok: true, count: 0 });
      const now = new Date().toISOString();
      const { error } = await db
        .from('universities')
        .upsert(names.map((name) => ({ name, created_at: now })), { onConflict: 'name' });
      if (error) return res.status(200).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true, count: names.length });
    }

    if (action === 'delete_universities') {
      if (!admin) return adminOnly();
      const names: string[] = (Array.isArray(req.body?.names) ? req.body.names : [])
        .map((n: any) => str(n, 300))
        .filter(Boolean)
        .slice(0, 50);
      if (!names.length) return res.status(200).json({ ok: true });
      const { error } = await db.from('universities').delete().in('name', names);
      if (error) return res.status(200).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true });
    }

    // ------------------------------------------------------------
    // E'lonlar — faqat admin
    // ------------------------------------------------------------
    if (action === 'save_announcement') {
      if (!admin) return adminOnly();
      const ann = req.body?.announcement || {};
      // Eski format bilan mos: qator ID = "ann_" + e'lon ID (e'lon ID o'zi ham "ann_" bilan boshlanadi)
      const annId = str(ann.id, 120);
      if (!/^[A-Za-z0-9_\-]{1,120}$/.test(annId)) {
        return res.status(400).json({ ok: false, error: "E'lon ID noto'g'ri." });
      }
      const clean = {
        id: annId,
        title: str(ann.title, 300),
        message: str(ann.message, 5000),
        link: ann.link ? str(ann.link, 1000) : undefined,
        date: str(ann.date, 40),
        time: ann.time ? str(ann.time, 40) : undefined,
        tag: str(ann.tag, 40) || 'yangilik',
        targetType: str(ann.targetType, 40) || 'all',
        targetValue: str(ann.targetValue, 300),
        targetLabel: str(ann.targetLabel, 300) || 'Barchaga',
      };
      const { error } = await db.from('test_packages').upsert(
        {
          id: `ann_${annId}`,
          title: clean.title,
          category: 'Announcement',
          university: clean.targetValue,
          department: clean.targetType,
          author_id: 'admin',
          author_name: 'Admin',
          total_questions: 0,
          blocks: [clean],
          is_public: true,
          is_community_created: false,
        },
        { onConflict: 'id' }
      );
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (action === 'delete_announcement') {
      if (!admin) return adminOnly();
      const annId = str(req.body?.id, 130);
      if (!annId) return res.status(400).json({ ok: false, error: "E'lon ID kerak." });
      const rowIds = Array.from(new Set([`ann_${annId}`, annId.startsWith('ann_') ? annId : `ann_${annId}`]));
      const { error } = await db.from('test_packages').delete().in('id', rowIds).eq('category', 'Announcement');
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    // ------------------------------------------------------------
    // sync_profile — reyting qatori (faqat o'zi uchun)
    // ------------------------------------------------------------
    if (action === 'sync_profile') {
      const r = req.body?.rating || {};
      const profileId = str(r.id, 80);
      // Brauzerdagi admin kaliti bilan kirgan admin boshqa qurilmadagi profilni yozmasin
      if (!sameUser(profileId, caller.id)) {
        return res.status(403).json({ ok: false, reason: 'forbidden', error: "Faqat o'z profilingizni yangilay olasiz." });
      }

      // Faqat reyting maydonlari: balans va obuna bu yerda yozilmaydi
      const rating = {
        id: profileId,
        name: str(r.name, 120) || 'Talaba',
        gender: r.gender === 'female' ? 'female' : 'male',
        region: str(r.region, 120),
        university: str(r.university, 300),
        avatar: str(r.avatar, 300),
        academic_year: num(r.academic_year, 1),
        coins: Math.max(0, num(r.coins)),
        tests_completed: Math.max(0, num(r.tests_completed)),
        correct_answers_count: Math.max(0, num(r.correct_answers_count)),
        score_points: Math.max(0, num(r.score_points)),
        total_questions_attempted: Math.max(0, num(r.total_questions_attempted)),
        accuracy_percentage: Math.min(100, Math.max(0, num(r.accuracy_percentage))),
        best_time: str(r.best_time, 20),
        best_time_seconds: Math.max(0, num(r.best_time_seconds)),
        total_time_spent_seconds: Math.max(0, num(r.total_time_spent_seconds)),
        total_time_spent_formatted: str(r.total_time_spent_formatted, 30),
        registered_at: str(r.registered_at, 40),
        updated_at: new Date().toISOString(),
      };

      const { error } = await db.from('test_packages').upsert(
        {
          id: `lead_${profileId}`,
          title: rating.name,
          category: 'LeaderboardUser',
          university: rating.university,
          department: rating.region,
          author_id: profileId,
          author_name: rating.name,
          total_questions: rating.score_points,
          blocks: [rating],
          is_public: false,
          is_community_created: false,
        },
        { onConflict: 'id' }
      );
      if (error) console.warn('lead row upsert:', error.message);

      try {
        await db.from('leaderboard_users').upsert(rating, { onConflict: 'id' });
      } catch {
        /* jadval bo'lmasligi mumkin */
      }

      // Eski umumiy ro'yxat (zaxira manba)
      try {
        const { data: cur } = await db
          .from('test_packages')
          .select('blocks')
          .eq('id', '__system_leaderboard_sync__')
          .maybeSingle();
        let list: any[] = Array.isArray(cur?.blocks) ? [...cur.blocks] : [];
        const idx = list.findIndex((u: any) => sameUser(u?.id, profileId));
        if (idx >= 0) list[idx] = rating;
        else list.push(rating);
        list.sort((a: any, b: any) => {
          const d = (b.score_points || 0) - (a.score_points || 0);
          if (d !== 0) return d;
          return (a.total_time_spent_seconds || 180) - (b.total_time_spent_seconds || 180);
        });
        list = list.slice(0, 100);
        await db.from('test_packages').upsert(
          {
            id: '__system_leaderboard_sync__',
            title: 'Leaderboard Sync Store',
            category: 'System',
            university: 'YuksalQuiz System',
            department: 'Leaderboard',
            is_public: false,
            blocks: list,
            author_id: 'system',
          },
          { onConflict: 'id' }
        );
      } catch {
        /* zaxira — muhim emas */
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ ok: false, error: "Noma'lum action" });
  } catch (err: any) {
    console.error('content api error:', err?.message);
    return res.status(500).json({ ok: false, error: 'Server xatosi. Keyinroq qayta urinib ko\'ring.' });
  }
}
