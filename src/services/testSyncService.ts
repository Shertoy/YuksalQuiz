import { getSupabase, getSupabaseConfig } from './supabase';
import { TestPackage, LeaderboardUser, UserProfile, Announcement } from '../types';
import { useQuizStore, deduplicateUniversities, normalizeUniversityKey } from '../store/useQuizStore';
import { decodeHtmlEntities } from '../utils/security';
import { reconcilePackageWithProgress } from '../utils/progressUtils';
import { UserRatingStats } from '../utils/ratingUtils';

/**
 * Maps Supabase DB row to application TestPackage model
 */
function mapRowToTestPackage(row: any): TestPackage {
  const blocks = (Array.isArray(row.blocks) ? row.blocks : []).map((b: any, idx: number) => {
    const questions = (Array.isArray(b.questions) ? b.questions : []).map((q: any) => ({
      ...q,
      text: decodeHtmlEntities(q.text || ''),
      options: (Array.isArray(q.options) ? q.options : []).map((opt: string) => decodeHtmlEntities(opt || '')),
      explanation: q.explanation ? decodeHtmlEntities(q.explanation) : undefined,
    }));
    const passingScore = b.passingScore || Math.max(1, Math.ceil(questions.length * 0.7));

    return {
      ...b,
      id: b.id || `block-${idx + 1}`,
      blockNumber: b.blockNumber || idx + 1,
      passingScore,
      title: decodeHtmlEntities(b.title || `Test ${idx + 1}`),
      questions,
      semester: b.semester ? Number(b.semester) : undefined,
      academicYear: b.academicYear || b.academic_year || undefined,
    };
  });

  const firstBlock = Array.isArray(row.blocks) && row.blocks.length > 0 ? row.blocks[0] : null;
  const rawSemester = row.semester !== undefined ? row.semester : firstBlock?.semester;
  const rawAcademicYear = row.academic_year || row.academicYear || firstBlock?.academicYear || firstBlock?.academic_year;
  const parsedSemester = rawSemester ? Number(rawSemester) : undefined;
  const parsedAcademicYear = rawAcademicYear ? String(rawAcademicYear) : undefined;

  return {
    id: row.id,
    title: decodeHtmlEntities(row.title || ''),
    category: row.category,
    university: decodeHtmlEntities(row.university || ''),
    isCustomUniversity: Boolean(row.is_custom_university),
    isPendingReview: Boolean(row.is_pending_review),
    department: (decodeHtmlEntities(row.department || '') as any) || 'Axborot Texnologiyalari',
    isPublic: Boolean(row.is_public),
    password: row.password || undefined,
    totalQuestions: Number(row.total_questions) || 0,
    blocks,
    createdAt: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    authorId: row.author_id || 'community',
    authorName: decodeHtmlEntities(row.author_name || 'Muallif'),
    isCommunityCreated: Boolean(row.is_community_created ?? true),
    authorWalletBalance: Number(row.author_wallet_balance) || 0,
    semester: parsedSemester && !isNaN(parsedSemester) ? parsedSemester : undefined,
    academicYear: parsedAcademicYear || undefined,
  };
}

/**
 * Maps application TestPackage model to Supabase DB row
 */
function mapTestPackageToRow(pkg: TestPackage): Record<string, any> {
  const blocksWithMeta = (Array.isArray(pkg.blocks) ? pkg.blocks : []).map((b) => ({
    ...b,
    semester: pkg.semester,
    academicYear: pkg.academicYear,
  }));

  return {
    id: pkg.id,
    title: pkg.title,
    category: pkg.category,
    university: pkg.university,
    is_custom_university: Boolean(pkg.isCustomUniversity),
    is_pending_review: Boolean(pkg.isPendingReview),
    department: pkg.department,
    is_public: Boolean(pkg.isPublic),
    password: pkg.password || null,
    total_questions: Number(pkg.totalQuestions) || 0,
    blocks: blocksWithMeta,
    author_id: pkg.authorId,
    author_name: pkg.authorName,
    is_community_created: Boolean(pkg.isCommunityCreated ?? true),
    author_wallet_balance: Number(pkg.authorWalletBalance) || 0,
    created_at: pkg.createdAt ? new Date(pkg.createdAt).toISOString() : new Date().toISOString(),
  };
}

/**
 * Fetches all public test packages from Supabase cloud database
 * and merges them into the local store.
 */
export async function fetchCloudTests(): Promise<{
  success: boolean;
  count: number;
  message: string;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      count: 0,
      message: 'Supabase sozlanmagan. Lokal xotiradan foydalanilmoqda.',
    };
  }

  try {
    const { data, error } = await supabase
      .from('test_packages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch error:', error.message);
      return { success: false, count: 0, message: error.message };
    }

    const { testPackages, universities, deletedPackageIds, deletedUniversities, profile, testAttempts } = useQuizStore.getState();
    const deletedSet = new Set(deletedPackageIds || []);
    const deletedUniSet = new Set((deletedUniversities || []).map((u) => normalizeUniversityKey(u)));
    const existingUnisSet = new Set((universities || []).map((u) => normalizeUniversityKey(u)));

    if (!data || data.length === 0) {
      // Cloud has 0 tests. The database is empty or all tests have been cleared.
      // Retain only un-synced offline drafts created by this user
      const localDrafts = (testPackages || []).filter(
        (p: any) =>
          !p.id?.startsWith('__system_') &&
          p.authorId === profile?.id &&
          p._isPendingSync === true &&
          !deletedSet.has(p.id)
      );
      useQuizStore.setState({ testPackages: localDrafts });
      return { success: true, count: 0, message: "Bulutli bazada hozircha testlar yo'q." };
    }

    const cloudPackages: TestPackage[] = data
      .filter(
        (row: any) =>
          !row.id?.startsWith('__system_') &&
          !row.id?.startsWith('lead_') &&
          row.category !== 'LeaderboardUser'
      )
      .map(mapRowToTestPackage);

    // Filter out any packages that have been deleted locally
    const validCloudPackages = cloudPackages.filter((cp) => !deletedSet.has(cp.id));

    // Cloud packages are the authoritative source of truth for questions.
    // However, student progress (unlocked blocks, best scores, passed state) must be reconciled with local progress!
    const localPkgMap = new Map((testPackages || []).map((p) => [p.id, p]));
    const reconciledValidCloudPackages = validCloudPackages.map((cp) =>
      reconcilePackageWithProgress(cp, localPkgMap.get(cp.id), testAttempts || [])
    );

    // Retain only local packages that were created by THIS user while offline and pending sync.
    const localDrafts = (testPackages || []).filter(
      (localPkg: any) =>
        localPkg.authorId === profile?.id &&
        localPkg._isPendingSync === true &&
        !deletedSet.has(localPkg.id) &&
        !validCloudPackages.some((cp) => cp.id === localPkg.id)
    );

    const mergedPackages: TestPackage[] = [...reconciledValidCloudPackages, ...localDrafts];

    // Also extract all universities from cloud test packages and merge into store
    const cloudPackageUnis = validCloudPackages.map((p) => p.university?.trim()).filter(Boolean);
    let updatedUnis = [...(universities || [])];
    let unisChanged = false;
    for (const u of cloudPackageUnis) {
      const key = normalizeUniversityKey(u);
      if (key && !existingUnisSet.has(key) && !deletedUniSet.has(key)) {
        existingUnisSet.add(key);
        updatedUnis.unshift(u);
        unisChanged = true;
      }
    }

    useQuizStore.setState({
      testPackages: mergedPackages,
      ...(unisChanged ? { universities: deduplicateUniversities(updatedUnis) } : {}),
    });

    // Also attempt to fetch universities directly from cloud table if available
    fetchCloudUniversities().catch(() => {});

    return {
      success: true,
      count: cloudPackages.length,
      message: `${cloudPackages.length} ta test bulutli bazadan yuklandi!`,
    };
  } catch (err: any) {
    console.error('Failed to fetch tests from Supabase:', err);
    return {
      success: false,
      count: 0,
      message: err?.message || 'Tarmoq xatosi',
    };
  }
}

/**
 * Uploads a newly created or updated test package to Supabase cloud.
 */
export async function publishTestToCloud(pkg: TestPackage): Promise<{
  success: boolean;
  message: string;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      message: "Supabase sozlanmagan. Test faqat lokal saqlandi.",
    };
  }

  try {
    const row = mapTestPackageToRow(pkg);
    const { error } = await supabase.from('test_packages').upsert(row, { onConflict: 'id' });

    if (error) {
      console.error('Supabase upload error:', error);
      return {
        success: false,
        message: `Bulutga yuklashda xatolik: ${error.message}`,
      };
    }

    return {
      success: true,
      message: "Test bulutli bazaga muvaffaqiyatli yuklandi va barcha foydalanuvchilarga ko'rinadi!",
    };
  } catch (err: any) {
    console.error('Failed to upload test to Supabase:', err);
    return {
      success: false,
      message: err?.message || "Bulutga yuklashda kutilmagan xatolik yuz berdi.",
    };
  }
}

/**
 * Deletes a test package from Supabase cloud database.
 */
export async function deleteTestFromCloud(id: string): Promise<{
  success: boolean;
  message: string;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, message: 'Supabase ulanmagan' };
  }

  try {
    const { error } = await supabase.from('test_packages').delete().eq('id', id);
    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true, message: "Test bulutli bazadan o'chirildi." };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Xatolik' };
  }
}

/**
 * Deletes ALL test packages from Supabase cloud database.
 */
export async function clearAllTestsFromCloud(): Promise<{
  success: boolean;
  message: string;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, message: 'Supabase ulanmagan' };
  }

  try {
    const { error } = await supabase
      .from('test_packages')
      .delete()
      .neq('category', 'LeaderboardUser')
      .neq('category', 'System')
      .not('id', 'like', 'lead_%')
      .not('id', 'like', '__system_%');
    if (error) {
      console.warn('Supabase clear all error:', error.message);
      return { success: false, message: error.message };
    }
    return { success: true, message: "Barcha testlar bulutli bazadan tozalandi." };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Xatolik' };
  }
}

/**
 * Two-way sync: uploads any local tests not yet in cloud, and pulls down all cloud tests.
 */
export async function syncAllTestsWithCloud(): Promise<{
  success: boolean;
  uploadedCount: number;
  downloadedCount: number;
  message: string;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      uploadedCount: 0,
      downloadedCount: 0,
      message: 'Supabase ulanmagan. Iltimos, sozlamalarni tekshiring.',
    };
  }

  try {
    // 1. Fetch remote tests
    const { data: remoteData, error } = await supabase
      .from('test_packages')
      .select('*');

    if (error) {
      return {
        success: false,
        uploadedCount: 0,
        downloadedCount: 0,
        message: `Sinxronlashda xatolik: ${error.message}`,
      };
    }

    const remoteTests = (remoteData || [])
      .filter(
        (row: any) =>
          !row.id?.startsWith('__system_') &&
          !row.id?.startsWith('lead_') &&
          row.category !== 'LeaderboardUser'
      )
      .map(mapRowToTestPackage);
    const remoteIdSet = new Set(remoteTests.map((t) => t.id));

    // 2. Identify local tests authored by this user that are pending upload
    const { testPackages, universities, deletedPackageIds, deletedUniversities, profile, testAttempts } = useQuizStore.getState();
    const deletedSet = new Set(deletedPackageIds || []);
    const deletedUniSet = new Set((deletedUniversities || []).map((u) => normalizeUniversityKey(u)));
    const existingUniKeySet = new Set((universities || []).map((u) => normalizeUniversityKey(u)));

    // Only upload tests created by THIS user that are pending sync (never upload another user's deleted tests!)
    const testsToUpload = (testPackages || []).filter(
      (t: any) =>
        t.authorId === profile?.id &&
        t._isPendingSync === true &&
        !remoteIdSet.has(t.id) &&
        !deletedSet.has(t.id)
    );

    let uploadedCount = 0;
    if (testsToUpload.length > 0) {
      const rowsToInsert = testsToUpload.map(mapTestPackageToRow);
      const { error: insertError } = await supabase
        .from('test_packages')
        .upsert(rowsToInsert, { onConflict: 'id' });

      if (!insertError) {
        uploadedCount = testsToUpload.length;
        // Clear pending flag on uploaded tests
        const updatedPackages = (testPackages || []).map((t: any) => {
          if (testsToUpload.some((u) => u.id === t.id)) {
            const copy = { ...t };
            delete copy._isPendingSync;
            return copy;
          }
          return t;
        });
        useQuizStore.setState({ testPackages: updatedPackages });
      }
    }

    // 3. Extract and merge universities from all remote tests
    const allPackageUnis = remoteTests.map((t) => t.university?.trim()).filter(Boolean);
    let updatedUnis = [...(universities || [])];
    let unisChanged = false;
    for (const u of allPackageUnis) {
      const key = normalizeUniversityKey(u);
      if (key && !existingUniKeySet.has(key) && !deletedUniSet.has(key)) {
        existingUniKeySet.add(key);
        updatedUnis.unshift(u);
        unisChanged = true;
      }
    }

    // 4. Remote tests are the authoritative source of truth for questions.
    // Prune all deleted tests from local store, and reconcile student progress!
    const validRemoteTests = remoteTests.filter((t) => !deletedSet.has(t.id));
    const localPkgMap = new Map((testPackages || []).map((p) => [p.id, p]));
    const reconciledRemoteTests = validRemoteTests.map((rp) =>
      reconcilePackageWithProgress(rp, localPkgMap.get(rp.id), (testAttempts as any) || [])
    );

    const localDrafts = (testPackages || []).filter(
      (localT: any) =>
        localT.authorId === profile?.id &&
        localT._isPendingSync === true &&
        !deletedSet.has(localT.id) &&
        !validRemoteTests.some((m) => m.id === localT.id)
    );
    const allMerged = [...reconciledRemoteTests, ...localDrafts];

    useQuizStore.setState({
      testPackages: allMerged,
      ...(unisChanged ? { universities: deduplicateUniversities(updatedUnis) } : {}),
    });

    // Also sync universities table
    await syncAllUniversitiesWithCloud().catch(() => {});

    return {
      success: true,
      uploadedCount,
      downloadedCount: remoteTests.length,
      message: `Sinxronizatsiya muvaffaqiyatli! Yuklab olindi: ${remoteTests.length} ta test, Yuklandi: ${uploadedCount} ta.`,
    };
  } catch (err: any) {
    return {
      success: false,
      uploadedCount: 0,
      downloadedCount: 0,
      message: err?.message || 'Sinxronlashda xatolik',
    };
  }
}

/**
 * Fetches all universities from Supabase cloud database if 'universities' table exists.
 */
export async function fetchCloudUniversities(): Promise<{
  success: boolean;
  count: number;
  message: string;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, count: 0, message: 'Supabase ulanmagan' };
  }

  try {
    const { data, error } = await supabase
      .from('universities')
      .select('name')
      .order('created_at', { ascending: false });

    if (error) {
      // Table may not exist yet, that's completely normal
      return { success: false, count: 0, message: error.message };
    }

    if (!data || data.length === 0) {
      return { success: true, count: 0, message: "Universitetlar bazasi bo'sh." };
    }

    const cloudUniNames: string[] = data.map((row: any) => String(row.name).trim()).filter(Boolean);
    const { universities, deletedUniversities } = useQuizStore.getState();
    const deletedUniSet = new Set((deletedUniversities || []).map((u) => normalizeUniversityKey(u)));
    const existingSet = new Set((universities || []).map((u) => normalizeUniversityKey(u)));
    const mergedUnis = [...(universities || [])];
    let addedCount = 0;

    for (const name of cloudUniNames) {
      const key = normalizeUniversityKey(name);
      if (key && !existingSet.has(key) && !deletedUniSet.has(key)) {
        existingSet.add(key);
        mergedUnis.unshift(name);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      useQuizStore.setState({ universities: deduplicateUniversities(mergedUnis) });
    }

    return {
      success: true,
      count: cloudUniNames.length,
      message: `${cloudUniNames.length} ta OTM bulutdan yuklandi!`,
    };
  } catch (err: any) {
    return { success: false, count: 0, message: err?.message || 'Tarmoq xatosi' };
  }
}

/**
 * Uploads a newly added university to Supabase cloud.
 */
export async function publishUniversityToCloud(name: string): Promise<{
  success: boolean;
  message: string;
}> {
  const trimmed = name.trim();
  if (!trimmed) return { success: false, message: 'OTM nomi bo\'sh' };

  const supabase = getSupabase();
  if (!supabase) return { success: false, message: 'Supabase sozlanmagan' };

  try {
    const { error } = await supabase
      .from('universities')
      .upsert({ name: trimmed, created_at: new Date().toISOString() }, { onConflict: 'name' });

    if (error) {
      console.warn('Could not push university to cloud table:', error.message);
      return { success: false, message: error.message };
    }

    return { success: true, message: `"${trimmed}" bulutli bazaga saqlandi!` };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Xatolik' };
  }
}

/**
 * Deletes a university from Supabase cloud.
 */
export async function deleteUniversityFromCloud(name: string): Promise<{
  success: boolean;
  message: string;
}> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, message: 'Supabase ulanmagan' };

  try {
    const { error } = await supabase.from('universities').delete().eq('name', name.trim());
    if (error) return { success: false, message: error.message };
    return { success: true, message: `"${name}" bulutdan o'chirildi.` };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Xatolik' };
  }
}

/**
 * Two-way sync for universities.
 */
export async function syncAllUniversitiesWithCloud(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { universities, deletedUniversities } = useQuizStore.getState();
    const deletedUniSet = new Set((deletedUniversities || []).map((u) => normalizeUniversityKey(u)));
    const validUnis = deduplicateUniversities(
      (universities || []).filter((u) => !deletedUniSet.has(normalizeUniversityKey(u)))
    );
    if (!validUnis || validUnis.length === 0) return;

    // Push local universities to cloud
    const rows = validUnis.map((name) => ({
      name: name.trim(),
      created_at: new Date().toISOString(),
    }));

    await supabase.from('universities').upsert(rows, { onConflict: 'name' });

    // Pull any cloud universities
    await fetchCloudUniversities();
  } catch (err) {
    // Non-critical if table not yet created
  }
}

/**
 * Setup Realtime Subscription so newly created tests & universities appear instantly.
 */
export function setupRealtimeTestSubscription(
  onUpdate?: () => void
): (() => void) | null {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const channel = supabase
      .channel('realtime:yuksal_quiz')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'test_packages' },
        async (payload: any) => {
          if (payload?.eventType === 'DELETE' && payload?.old?.id) {
            useQuizStore.getState().deleteTestPackage(payload.old.id);
          }
          if (
            payload?.new?.category === 'Announcement' ||
            payload?.old?.category === 'Announcement' ||
            payload?.new?.id?.startsWith('ann_') ||
            payload?.old?.id?.startsWith('ann_')
          ) {
            await fetchCloudAnnouncements();
            onUpdate?.();
            return;
          }
          if (
            payload?.new?.category === 'LeaderboardUser' ||
            payload?.old?.category === 'LeaderboardUser' ||
            payload?.new?.id?.startsWith('lead_') ||
            payload?.old?.id?.startsWith('lead_') ||
            payload?.new?.id === '__system_leaderboard_sync__' ||
            payload?.old?.id === '__system_leaderboard_sync__'
          ) {
            const fresh = await fetchCloudLeaderboard();
            if (fresh && fresh.length > 0) {
              useQuizStore.setState((state) => {
                const remoteOthers = fresh.filter((u) => u.id !== state.profile.id);
                const remoteMap = new Map<string, LeaderboardUser>();
                for (const u of remoteOthers) {
                  remoteMap.set(u.id, u);
                }
                for (const u of state.leaderboard) {
                  if (u.id !== state.profile.id && !remoteMap.has(u.id)) {
                    remoteMap.set(u.id, u);
                  }
                }
                return { leaderboard: Array.from(remoteMap.values()) };
              });
            }
            onUpdate?.();
            return;
          }
          await fetchCloudTests();
          onUpdate?.();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'universities' },
        async () => {
          // Refresh universities list from cloud
          await fetchCloudUniversities();
          onUpdate?.();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leaderboard_users' },
        async () => {
          const fresh = await fetchCloudLeaderboard();
          if (fresh && fresh.length > 0) {
            useQuizStore.setState((state) => {
              const remoteOthers = fresh.filter((u) => u.id !== state.profile.id);
              const remoteMap = new Map<string, LeaderboardUser>();
              for (const u of remoteOthers) {
                remoteMap.set(u.id, u);
              }
              for (const u of state.leaderboard) {
                if (u.id !== state.profile.id && !remoteMap.has(u.id)) {
                  remoteMap.set(u.id, u);
                }
              }
              return { leaderboard: Array.from(remoteMap.values()) };
            });
          }
          onUpdate?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime subscription error:', err);
    return null;
  }
}

/**
 * Maps DB row / sync object to LeaderboardUser
 */
function mapRowToLeaderboardUser(row: any): LeaderboardUser {
  if (!row) return {} as LeaderboardUser;
  const cleanId = String(row.id || '').replace(/^lead_/, '');
  const score = Number(
    row.total_score ??
    row.score_points ??
    row.scorePoints ??
    (row.total_questions !== undefined ? row.total_questions : undefined) ??
    (row.correct_answers !== undefined ? row.correct_answers * 4 : undefined) ??
    (row.correct_answers_count ? row.correct_answers_count * 4 : 0)
  ) || 0;

  const corrects = Number(
    row.correct_answers ??
    row.correct_answers_count ??
    row.correctAnswersCount ??
    (score > 0 ? Math.floor(score / 4) : 0)
  ) || 0;

  const displayName = row.name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.title || 'Talaba';
  const totalSeconds = Number(
    row.total_time ??
    row.total_time_spent_seconds ??
    row.totalTimeSpentSeconds ??
    row.best_time_seconds ??
    row.bestTimeSeconds ??
    165
  );

  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const formattedTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return {
    id: cleanId,
    name: decodeHtmlEntities(displayName),
    region: row.region || row.department || 'Toshkent shahri',
    university: decodeHtmlEntities(row.university || ''),
    avatar: row.avatar || '/avatars/avatar_1.png',
    gender: row.gender || (row.avatar === '/avatars/avatar_1.png' || row.avatar === '/avatars/avatar_2.png' ? 'female' : 'male'),
    registeredAt: row.registered_at || row.registeredAt || '2026-10-03',
    academicYear: (Math.min(Math.max(Number(row.academic_year ?? row.academicYear) || 1, 1), 6) as 1 | 2 | 3 | 4 | 5 | 6),
    coins: Number(row.coins) || 0,
    testsCompleted: Number(row.tests_completed ?? row.testsCompleted) || (score > 0 ? Math.max(1, Math.ceil(score / 100)) : 0),
    correctAnswersCount: corrects,
    scorePoints: score,
    totalQuestionsAttempted: Number(row.total_questions_attempted ?? row.totalQuestionsAttempted) || Math.max(corrects, 25),
    accuracyPercentage: Number(row.accuracy_percentage ?? row.accuracyPercentage) || 85,
    bestTime: row.best_time || row.bestTime || formattedTime,
    bestTimeSeconds: Number(row.best_time_seconds ?? row.bestTimeSeconds) || Math.min(totalSeconds, 165),
    totalTimeSpentSeconds: totalSeconds,
    totalTimeSpentFormatted: row.total_time_spent_formatted || row.totalTimeSpentFormatted || formattedTime,
    weeklyActiveHours: 12.0,
    isCurrentUser: false,
  };
}

/**
 * Pushes real registered user rating progress to Supabase leaderboard.
 * Direct write into public.users, with multi-layer fallback.
 */
export async function syncUserProfileToCloud(
  profile: UserProfile,
  stats: UserRatingStats
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !profile || !profile.id) return;

  const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Talaba';
  const university = profile.university || 'Toshkent Axborot Texnologiyalari Universiteti (TATU)';
  const region = profile.region || 'Toshkent shahri';

  const userRatingObject = {
    id: profile.id,
    name: fullName,
    gender: profile.gender || 'male',
    region,
    university,
    avatar: profile.avatar || '/avatars/avatar_1.png',
    academic_year: profile.academicYear || 1,
    coins: profile.coins || 0,
    tests_completed: Math.max(profile.completedTestsCount, stats.uniqueBlocksCount),
    correct_answers_count: stats.totalCorrectAnswers,
    score_points: stats.scorePoints,
    total_questions_attempted: stats.totalQuestionsAttempted,
    accuracy_percentage: stats.accuracyPercentage,
    best_time: stats.bestTimeFormatted,
    best_time_seconds: stats.bestTimeSeconds,
    total_time_spent_seconds: stats.totalTimeSpentSeconds,
    total_time_spent_formatted: stats.totalTimeSpentFormatted,
    registered_at: profile.registeredAt || profile.lastLoginDate || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 1. Primary: Direct upsert to public.users table!
  const userRowForUsersTable = {
    id: profile.id,
    first_name: profile.firstName || '',
    last_name: profile.lastName || '',
    name: fullName,
    avatar: profile.avatar || '/avatars/avatar_1.png',
    university,
    region,
    gender: profile.gender || 'male',
    academic_year: profile.academicYear || 1,
    coins: profile.coins || 0,
    balance: profile.walletBalance || 0,
    wallet_balance: profile.walletBalance || 0,
    has_paid: Boolean(profile.has_paid),
    paid_until: profile.paid_until || null,
    tests_completed: Math.max(profile.completedTestsCount, stats.uniqueBlocksCount),
    correct_answers: stats.totalCorrectAnswers,
    correct_answers_count: stats.totalCorrectAnswers,
    total_score: stats.scorePoints,
    score_points: stats.scorePoints,
    total_time: stats.totalTimeSpentSeconds,
    total_time_spent_seconds: stats.totalTimeSpentSeconds,
    accuracy_percentage: stats.accuracyPercentage,
    updated_at: new Date().toISOString(),
  };

  try {
    await supabase.from('users').upsert(userRowForUsersTable, { onConflict: 'id' });
  } catch (err) {
    console.warn('users table upsert warning:', err);
  }

  // 2. Dedicated row in test_packages to prevent race conditions
  const userRow = {
    id: `lead_${profile.id}`,
    title: fullName,
    category: 'LeaderboardUser',
    university,
    department: region,
    author_id: profile.id,
    author_name: fullName,
    total_questions: Number(stats.scorePoints) || 0,
    blocks: [userRatingObject],
    is_public: false,
    is_community_created: false,
  };

  try {
    await supabase.from('test_packages').upsert(userRow, { onConflict: 'id' });
  } catch (err) {
    console.warn('Dedicated leaderboard user row upsert warning:', err);
  }

  // 3. Fallback: leaderboard_users table if available
  try {
    await supabase.from('leaderboard_users').upsert(userRatingObject, { onConflict: 'id' });
  } catch {}

  // 4. Legacy __system_leaderboard_sync__
  try {
    const { data: cur } = await supabase
      .from('test_packages')
      .select('blocks')
      .eq('id', '__system_leaderboard_sync__')
      .maybeSingle();

    let list = Array.isArray(cur?.blocks) ? [...cur.blocks] : [];
    const existingIdx = list.findIndex((u: any) => u.id === userRatingObject.id);
    if (existingIdx >= 0) {
      list[existingIdx] = userRatingObject;
    } else {
      list.push(userRatingObject);
    }

    list.sort((a: any, b: any) => {
      const pDiff = (b.score_points || 0) - (a.score_points || 0);
      if (pDiff !== 0) return pDiff;
      return (a.total_time_spent_seconds || 180) - (b.total_time_spent_seconds || 180);
    });
    list = list.slice(0, 100);

    await supabase.from('test_packages').upsert(
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
  } catch {}
}

/**
 * Pushes test completion results directly to Supabase's `users` and `test_results` tables.
 */
export async function syncTestAttemptToCloud(
  profile: UserProfile,
  stats: UserRatingStats,
  attempt: any
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !profile || !profile.id) return;

  // 1. Upsert users rating and progress into `users` table
  await syncUserProfileToCloud(profile, stats);

  // 2. Direct insert into `test_results` table
  try {
    const testResultRow = {
      id: attempt.id || `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: profile.id,
      test_package_id: attempt.testPackageId || '',
      test_title: attempt.testPackageTitle || '',
      block_id: attempt.blockId || '',
      block_title: attempt.blockTitle || '',
      score: Number(attempt.score) || 0,
      total_questions: Number(attempt.totalQuestions) || 0,
      percentage: Number(attempt.percentage) || 0,
      time_spent_seconds: Number(attempt.timeSpentSeconds) || 0,
      total_time: Number(attempt.timeSpentSeconds) || 0,
      is_passed: Boolean(attempt.isPassed),
      user_answers: attempt.userAnswers || [],
      created_at: attempt.completedAt || new Date().toISOString(),
    };

    await supabase.from('test_results').upsert(testResultRow, { onConflict: 'id' });
  } catch (err) {
    console.warn('test_results table upsert error:', err);
  }
}

/**
 * Fetches real active users from Supabase cloud leaderboard.
 * Directly reads TOP 20 from public.users table sorted by correct_answers, total_score, and total_time.
 */
export async function fetchCloudLeaderboard(): Promise<LeaderboardUser[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const userMap = new Map<string, LeaderboardUser>();

  // 1. Primary: Fetch users from public.users table (Zero mock data!)
  try {
    const { data: usersData, error: usersErr } = await supabase
      .from('users')
      .select('*')
      .limit(100);

    if (!usersErr && usersData && Array.isArray(usersData) && usersData.length > 0) {
      for (const row of usersData) {
        const u = mapRowToLeaderboardUser(row);
        if (u && u.id) {
          userMap.set(u.id, u);
        }
      }
    }
  } catch (err) {
    console.warn('fetchCloudLeaderboard users table error:', err);
  }

  // 2. Multi-layer fallback: leaderboard_users table if available
  try {
    const { data, error } = await supabase
      .from('leaderboard_users')
      .select('*')
      .limit(100);

    if (!error && data && Array.isArray(data)) {
      for (const row of data) {
        const u = mapRowToLeaderboardUser(row);
        if (u && u.id && !userMap.has(u.id)) {
          userMap.set(u.id, u);
        }
      }
    }
  } catch {}

  // 3. Multi-layer fallback: individual LeaderboardUser rows from test_packages
  try {
    const { data: leadRows, error: leadErr } = await supabase
      .from('test_packages')
      .select('*')
      .eq('category', 'LeaderboardUser')
      .limit(100);

    if (!leadErr && leadRows && Array.isArray(leadRows)) {
      for (const row of leadRows) {
        let rawBlocks = row.blocks;
        if (typeof rawBlocks === 'string') {
          try {
            rawBlocks = JSON.parse(rawBlocks);
          } catch {}
        }
        const blockUser = Array.isArray(rawBlocks) && rawBlocks[0]
          ? rawBlocks[0]
          : rawBlocks && typeof rawBlocks === 'object' && !Array.isArray(rawBlocks)
          ? rawBlocks
          : null;

        const mapped = mapRowToLeaderboardUser(blockUser || {
          id: row.author_id || row.id.replace(/^lead_/, ''),
          name: row.title,
          university: row.university,
          region: row.department,
          score_points: row.total_questions,
        });

        if (mapped && mapped.id) {
          const cleanId = mapped.id.replace(/^lead_/, '');
          mapped.id = cleanId;
          const existing = userMap.get(cleanId);
          if (!existing || (mapped.scorePoints || 0) >= (existing.scorePoints || 0)) {
            userMap.set(cleanId, mapped);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Error fetching LeaderboardUser rows from test_packages:', err);
  }

  // 4. Legacy __system_leaderboard_sync__
  try {
    const { data: sysPkg } = await supabase
      .from('test_packages')
      .select('blocks')
      .eq('id', '__system_leaderboard_sync__')
      .maybeSingle();

    if (sysPkg) {
      let sysBlocks = sysPkg.blocks;
      if (typeof sysBlocks === 'string') {
        try {
          sysBlocks = JSON.parse(sysBlocks);
        } catch {}
      }
      if (Array.isArray(sysBlocks) && sysBlocks.length > 0) {
        for (const row of sysBlocks) {
          const mapped = mapRowToLeaderboardUser(row);
          if (mapped && mapped.id) {
            const cleanId = mapped.id.replace(/^lead_/, '');
            mapped.id = cleanId;
            if (!userMap.has(cleanId)) {
              userMap.set(cleanId, mapped);
            }
          }
        }
      }
    }
  } catch {}

  const allList = Array.from(userMap.values());

  // Sort descending by correct_answers and total_score, tie-breaker: ascending by total_time
  allList.sort((a, b) => {
    // 1. Primary: Score points / correct answers
    const aScore = a.scorePoints ?? ((a.correctAnswersCount || 0) * 4);
    const bScore = b.scorePoints ?? ((b.correctAnswersCount || 0) * 4);
    if (bScore !== aScore) return bScore - aScore;

    const aCorrect = a.correctAnswersCount || 0;
    const bCorrect = b.correctAnswersCount || 0;
    if (bCorrect !== aCorrect) return bCorrect - aCorrect;

    // 2. Tie-breaker: Lower total time spent ranks higher
    const aTime = a.totalTimeSpentSeconds || a.bestTimeSeconds || 180;
    const bTime = b.totalTimeSpentSeconds || b.bestTimeSeconds || 180;
    if (aTime !== bTime) return aTime - bTime;

    return (a.id || '').localeCompare(b.id || '');
  });

  // Strictly TOP 20
  return allList.slice(0, 20);
}

/**
 * -------------------------------------------------------------
 * Cloud Announcements Sync Services
 * -------------------------------------------------------------
 */

/**
 * Fetches all announcements stored in Supabase cloud database
 */
export async function fetchCloudAnnouncements(): Promise<Announcement[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('test_packages')
      .select('*')
      .eq('category', 'Announcement')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    const cloudAnnouncements: Announcement[] = [];
    for (const row of data) {
      const annBlock = Array.isArray(row.blocks) ? row.blocks[0] : null;
      if (annBlock && (annBlock.title || annBlock.message)) {
        cloudAnnouncements.push({
          id: String(row.id).replace(/^ann_/, ''),
          title: decodeHtmlEntities(annBlock.title || row.title || 'Bildirishnoma'),
          message: decodeHtmlEntities(annBlock.message || ''),
          link: annBlock.link || undefined,
          date: annBlock.date || row.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          time: annBlock.time || undefined,
          tag: annBlock.tag || 'yangilik',
          targetType: annBlock.targetType || (row.department as any) || 'all',
          targetValue: annBlock.targetValue || row.university || '',
          targetLabel: annBlock.targetLabel || 'Barchaga',
        });
      }
    }

    if (cloudAnnouncements.length > 0) {
      useQuizStore.setState((state) => {
        const existingMap = new Map<string, Announcement>();
        // Keep existing
        for (const a of state.announcements || []) {
          existingMap.set(a.id, a);
        }
        // Merge cloud ones
        for (const a of cloudAnnouncements) {
          existingMap.set(a.id, a);
        }
        return { announcements: Array.from(existingMap.values()) };
      });
    }

    return cloudAnnouncements;
  } catch (err) {
    console.warn('Error fetching cloud announcements:', err);
    return [];
  }
}

/**
 * Uploads an announcement to Supabase cloud
 */
export async function publishAnnouncementToCloud(ann: Announcement): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !ann || !ann.id) return;

  const annRow = {
    id: `ann_${ann.id}`,
    title: ann.title,
    category: 'Announcement',
    university: ann.targetValue || '',
    department: ann.targetType || 'all',
    author_id: 'admin',
    author_name: 'Admin',
    total_questions: 0,
    blocks: [ann],
    is_public: true,
    is_community_created: false,
  };

  try {
    await supabase.from('test_packages').upsert(annRow, { onConflict: 'id' });
  } catch (err) {
    console.warn('publishAnnouncementToCloud error:', err);
  }
}

/**
 * Deletes an announcement from Supabase cloud
 */
export async function deleteAnnouncementFromCloud(annId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !annId) return;

  try {
    const cleanId = annId.startsWith('ann_') ? annId : `ann_${annId}`;
    await supabase.from('test_packages').delete().eq('id', cleanId);
  } catch (err) {
    console.warn('deleteAnnouncementFromCloud error:', err);
  }
}


