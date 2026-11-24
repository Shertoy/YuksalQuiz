import crypto from 'crypto';
import { cleanId, findUserRow } from './common.js';

/**
 * Reyting va profilni SERVERDA hisoblash.
 *
 * Avval reyting ballarini telefon o'zi hisoblab yuborardi va server ularga ishonardi —
 * istalgan odam o'ziga 1 000 000 ball yozib qo'yishi mumkin edi.
 * Endi har bir blok natijasi serverda test_packages dagi to'g'ri javoblar bilan tekshiriladi
 * va test_results jadvaliga "srv_" qatori sifatida yoziladi. Reyting faqat shu qatorlardan
 * hisoblanadi.
 *
 * Eski foydalanuvchilarning shu kungacha yig'ilgan bali "legacy" sifatida bir marta saqlanadi
 * va o'zgarmaydi: ko'rsatiladigan ball = max(eski ball, server hisoblagan ball).
 */

const str = (v: unknown, max: number) => String(v ?? '').replace(/\u0000/g, '').trim().slice(0, max);
const num = (v: unknown, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

export function parseBlocks(raw: any): any[] {
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

// Telefondagi decodeHtmlEntities bilan bir xil dekodlash, keyin bo'shliq va registr tenglashtiriladi
const norm = (s: unknown) =>
  String(s ?? '')
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/&#47;/gi, '/')
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export interface Aggregate {
  correct: number;
  attempted: number;
  blocks: number;
  bestTime: number;
  totalTime: number;
}

/** Foydalanuvchining reyting identifikatori: Telegram foydalanuvchisi uchun tg_<id> */
export function ratingId(callerId: string): string {
  const c = cleanId(callerId);
  return /^\d+$/.test(c) ? `tg_${c}` : c;
}

function fmtTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const p = (x: number) => String(x).padStart(2, '0');
  return h > 0 ? `${p(h)}:${p(m)}:${p(r)}` : `${p(m)}:${p(r)}`;
}

/**
 * Blok natijasini serverda baholaydi va saqlaydi.
 * answers: [{ questionId, selectedText }] — tanlangan variant MATNI (variantlar telefonda aralashtiriladi).
 */
export async function gradeAndRecordAttempt(
  db: any,
  callerId: string,
  input: { testPackageId: string; blockId?: string; blockIndex?: number; answers: any[]; timeSpentSeconds?: number }
): Promise<{ ok: boolean; score?: number; total?: number; reason?: string }> {
  const c = cleanId(callerId);
  const pkgId = str(input.testPackageId, 160);
  if (!c || !pkgId) return { ok: false, reason: 'bad_input' };

  const { data: pkg, error } = await db.from('test_packages').select('id, title, blocks, category').eq('id', pkgId).maybeSingle();
  if (error) throw error;
  if (!pkg) return { ok: false, reason: 'not_found' };
  if (['LeaderboardUser', 'System', 'AdminCredit', 'Announcement'].includes(String(pkg.category || ''))) {
    return { ok: false, reason: 'not_found' };
  }

  const blocks = parseBlocks(pkg.blocks);
  const blockId = str(input.blockId, 160);
  const bi = Number(input.blockIndex);
  const block =
    (blockId && blocks.find((b: any) => String(b?.id) === blockId)) ||
    (Number.isInteger(bi) && bi >= 0 ? blocks[bi] : undefined);
  if (!block) return { ok: false, reason: 'block_not_found' };

  const questions: any[] = Array.isArray(block.questions) ? block.questions : [];
  if (!questions.length) return { ok: false, reason: 'empty_block' };

  const chosen = new Map<string, string>();
  for (const a of (Array.isArray(input.answers) ? input.answers : []).slice(0, 2000)) {
    const qid = str(a?.questionId, 160);
    if (qid) chosen.set(qid, norm(a?.selectedText));
  }

  let score = 0;
  for (const q of questions) {
    const qid = String(q?.id ?? '');
    const sel = chosen.get(qid);
    const ci = Number(q?.correctOptionIndex);
    const opts: any[] = Array.isArray(q?.options) ? q.options : [];
    if (!sel || !Number.isInteger(ci) || ci < 0 || ci >= opts.length) continue;
    if (norm(opts[ci]) === sel) score += 1;
  }

  const total = questions.length;
  // Haqiqiy bo'lmagan tezlik (savolga 1 soniyadan kam) — vaqt hisobga olinmaydi
  let time = Math.max(0, Math.min(6 * 3600, Math.round(num(input.timeSpentSeconds))));
  if (time < total) time = 0;

  const blockKey = String(block.id ?? `idx_${blocks.indexOf(block)}`);
  const rowId = `srv_${c}_${crypto.createHash('sha1').update(`${pkgId}|${blockKey}`).digest('hex').slice(0, 20)}`;

  const { data: prev } = await db.from('test_results').select('total_time').eq('id', rowId).maybeSingle();
  const cumulative = num(prev?.total_time) + time;

  const row = {
    id: rowId,
    user_id: c,
    test_package_id: pkgId,
    test_title: str(pkg.title, 300),
    block_id: blockKey,
    block_title: str(block.title, 200),
    score,
    total_questions: total,
    percentage: total > 0 ? Math.round((score / total) * 100) : 0,
    time_spent_seconds: time,
    total_time: cumulative,
    is_passed: score >= num(block.passingScore, 0),
    created_at: new Date().toISOString(),
  };
  const { error: upErr } = await db.from('test_results').upsert(row, { onConflict: 'id' });
  if (upErr) throw upErr;

  return { ok: true, score, total };
}

export async function computeAggregate(db: any, callerId: string): Promise<Aggregate> {
  const c = cleanId(callerId);
  const { data } = await db
    .from('test_results')
    .select('score, total_questions, time_spent_seconds, total_time')
    .eq('user_id', c)
    .like('id', `srv_${c}_%`)
    .limit(5000);
  const rows: any[] = Array.isArray(data) ? data : [];
  const agg: Aggregate = { correct: 0, attempted: 0, blocks: rows.length, bestTime: 0, totalTime: 0 };
  for (const r of rows) {
    agg.correct += num(r.score);
    agg.attempted += num(r.total_questions);
    agg.totalTime += num(r.total_time);
    const t = num(r.time_spent_seconds);
    if (t > 0 && (agg.bestTime === 0 || t < agg.bestTime)) agg.bestTime = t;
  }
  return agg;
}

export interface ProfileInput {
  firstName?: string;
  lastName?: string;
  gender?: string;
  region?: string;
  university?: string;
  avatar?: string;
  academicYear?: number;
  language?: string;
  coins?: number;
  registeredAt?: string;
}

export function cleanProfileInput(p: any): ProfileInput {
  const out: ProfileInput = {};
  if (!p || typeof p !== 'object') return out;
  if (p.firstName !== undefined) out.firstName = str(p.firstName, 60);
  if (p.lastName !== undefined) out.lastName = str(p.lastName, 60);
  if (p.gender !== undefined) out.gender = p.gender === 'female' ? 'female' : 'male';
  if (p.region !== undefined) out.region = str(p.region, 120);
  if (p.university !== undefined) out.university = str(p.university, 300);
  if (p.avatar !== undefined) {
    const a = str(p.avatar, 300);
    // Faqat ilovadagi avatarlar yoki rasm ma'lumoti (data:image) — tashqi havolalar emas
    out.avatar = /^\/avatars\/[A-Za-z0-9_.-]+$/.test(a) || /^data:image\/(png|jpe?g|webp);base64,/.test(String(p.avatar || ''))
      ? String(p.avatar).slice(0, 400_000)
      : '/avatars/avatar_7.png';
  }
  if (p.academicYear !== undefined) out.academicYear = Math.min(6, Math.max(1, Math.round(num(p.academicYear, 1))));
  if (p.language !== undefined) out.language = ['uz', 'ru', 'en'].includes(String(p.language)) ? String(p.language) : 'uz';
  if (p.coins !== undefined) out.coins = Math.min(1_000_000, Math.max(0, Math.round(num(p.coins))));
  if (p.registeredAt !== undefined) out.registeredAt = str(p.registeredAt, 40);
  return out;
}

/**
 * Profil maydonlarini users jadvaliga yozadi (faqat xavfsiz maydonlar; pul/obuna/blok emas).
 * Qator bo'lmasa tg_<id> qatori yaratiladi.
 */
export async function writeUserProfile(
  db: any,
  caller: { id: string; username?: string; firstName?: string; lastName?: string },
  p: ProfileInput,
  agg?: { tests: number; correct: number; score: number; time: number }
): Promise<any> {
  const c = cleanId(caller.id);
  let userRow = await findUserRow(db, c);

  const fields: Record<string, any> = { updated_at: new Date().toISOString() };
  if (p.firstName !== undefined || p.lastName !== undefined) {
    const fn = p.firstName ?? '';
    const ln = p.lastName ?? '';
    const full = `${fn} ${ln}`.trim();
    if (full) {
      fields.full_name = full;
      fields.first_name = fn;
      fields.last_name = ln;
      fields.name = full;
    }
  }
  if (p.gender !== undefined) fields.gender = p.gender;
  if (p.region !== undefined) fields.region = p.region;
  if (p.university !== undefined) fields.university = p.university;
  if (p.avatar !== undefined && p.avatar.length < 2000) {
    fields.avatar = p.avatar;
    fields.avatar_url = p.avatar;
  }
  if (p.academicYear !== undefined) fields.academic_year = p.academicYear;
  if (p.language !== undefined) fields.language = p.language;
  if (caller.username) fields.username = String(caller.username).slice(0, 64);
  if (agg) {
    fields.total_tests = agg.tests;
    fields.tests_completed = agg.tests;
    fields.correct_answers = agg.correct;
    fields.correct_answers_count = agg.correct;
    fields.total_score = agg.score;
    fields.score_points = agg.score;
    fields.total_time = agg.time;
    fields.total_time_spent_seconds = agg.time;
  }

  // Bazada bo'lmagan ustun xato bersa, shu ustunlarsiz qayta yoziladi
  const optional = ['avatar_url', 'language', 'username', 'total_tests', 'first_name', 'last_name', 'name', 'full_name', 'academic_year', 'tests_completed', 'correct_answers_count', 'score_points', 'total_time_spent_seconds'];
  const tryWrite = async (write: (f: Record<string, any>) => Promise<any>) => {
    let f = { ...fields };
    for (let i = 0; i < 6; i++) {
      const { error } = await write(f);
      if (!error) return true;
      const m = String(error.message || '').match(/'([a-z_]+)' column|column "?([a-z_]+)"? (of relation|does not exist)/i);
      const col = m?.[1] || m?.[2];
      if (col && col in f && optional.includes(col)) {
        delete f[col];
        continue;
      }
      console.warn('users profile write:', error.message);
      return false;
    }
    return false;
  };

  if (userRow) {
    await tryWrite((f) => db.from('users').update(f).in('id', userRow._rowIds || [userRow.id]));
  } else {
    const isNum = /^\d+$/.test(c);
    await tryWrite((f) =>
      db.from('users').insert({
        id: isNum ? `tg_${c}` : c,
        telegram_id: isNum ? c : null,
        ...f,
      })
    );
    userRow = await findUserRow(db, c);
  }
  return userRow;
}

/**
 * Reyting qatorlarini (lead_, leaderboard_users, umumiy ro'yxat) server hisoblagan qiymatlar bilan yozadi.
 */
export async function writeRating(db: any, caller: { id: string }, p: ProfileInput, agg: Aggregate) {
  const rid = ratingId(caller.id);

  const { data: cur } = await db.from('test_packages').select('blocks').eq('id', `lead_${rid}`).maybeSingle();
  const prev = parseBlocks(cur?.blocks)[0] || {};

  // Eski ball bir marta "legacy" sifatida qotiriladi (server hisoblashidan oldingi qiymat)
  const legacy =
    prev.srv && prev.legacy
      ? prev.legacy
      : {
          score_points: Math.max(0, num(prev.score_points)),
          correct_answers_count: Math.max(0, num(prev.correct_answers_count)),
          tests_completed: Math.max(0, num(prev.tests_completed)),
          total_questions_attempted: Math.max(0, num(prev.total_questions_attempted)),
          total_time_spent_seconds: Math.max(0, num(prev.total_time_spent_seconds)),
        };

  const srvScore = agg.correct * 4;
  const useLegacy = num(legacy.score_points) > srvScore;
  const correct = useLegacy ? num(legacy.correct_answers_count) : agg.correct;
  const attempted = useLegacy ? num(legacy.total_questions_attempted) : agg.attempted;
  const score = useLegacy ? num(legacy.score_points) : srvScore;
  const tests = Math.max(agg.blocks, useLegacy ? num(legacy.tests_completed) : 0);
  const totalTime = Math.max(agg.totalTime, useLegacy ? num(legacy.total_time_spent_seconds) : 0);
  const bestTime = agg.bestTime || num(prev.best_time_seconds) || 0;

  const name =
    `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || str(prev.name, 120) || 'Talaba';

  const rating = {
    id: rid,
    name,
    gender: p.gender ?? (prev.gender === 'female' ? 'female' : 'male'),
    region: p.region ?? str(prev.region, 120),
    university: p.university ?? str(prev.university, 300),
    avatar: p.avatar !== undefined && p.avatar.length < 2000 ? p.avatar : str(prev.avatar, 300),
    academic_year: p.academicYear ?? (num(prev.academic_year, 1) || 1),
    coins: p.coins ?? Math.max(0, num(prev.coins)),
    tests_completed: tests,
    correct_answers_count: correct,
    score_points: score,
    total_questions_attempted: attempted,
    accuracy_percentage: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
    best_time: bestTime ? fmtTime(bestTime) : str(prev.best_time, 20),
    best_time_seconds: bestTime,
    total_time_spent_seconds: totalTime,
    total_time_spent_formatted: fmtTime(totalTime),
    registered_at: p.registeredAt || str(prev.registered_at, 40) || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await db.from('test_packages').upsert(
    {
      id: `lead_${rid}`,
      title: rating.name,
      category: 'LeaderboardUser',
      university: rating.university,
      department: rating.region,
      author_id: rid,
      author_name: rating.name,
      total_questions: rating.score_points,
      blocks: [{ ...rating, srv: true, legacy }],
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
    const { data: store } = await db
      .from('test_packages')
      .select('blocks')
      .eq('id', '__system_leaderboard_sync__')
      .maybeSingle();
    let list: any[] = parseBlocks(store?.blocks);
    const idx = list.findIndex((u: any) => cleanId(u?.id) === cleanId(rid));
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

  return rating;
}
