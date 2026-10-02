import { getSupabase, getSupabaseConfig } from './supabase';
import { TestPackage } from '../types';
import { useQuizStore, deduplicateUniversities, normalizeUniversityKey } from '../store/useQuizStore';
import { decodeHtmlEntities } from '../utils/security';
import { reconcilePackageWithProgress } from '../utils/progressUtils';

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
    };
  });

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
  };
}

/**
 * Maps application TestPackage model to Supabase DB row
 */
function mapTestPackageToRow(pkg: TestPackage): Record<string, any> {
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
    blocks: pkg.blocks,
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
        (p: any) => p.authorId === profile?.id && p._isPendingSync === true && !deletedSet.has(p.id)
      );
      useQuizStore.setState({ testPackages: localDrafts });
      return { success: true, count: 0, message: "Bulutli bazada hozircha testlar yo'q." };
    }

    const cloudPackages: TestPackage[] = data.map(mapRowToTestPackage);

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
    const { error } = await supabase.from('test_packages').delete().not('id', 'is', null);
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

    const remoteTests = (remoteData || []).map(mapRowToTestPackage);
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime subscription error:', err);
    return null;
  }
}
