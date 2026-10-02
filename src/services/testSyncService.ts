import { getSupabase, getSupabaseConfig } from './supabase';
import { TestPackage } from '../types';
import { useQuizStore } from '../store/useQuizStore';

/**
 * Maps Supabase DB row to application TestPackage model
 */
function mapRowToTestPackage(row: any): TestPackage {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    university: row.university,
    isCustomUniversity: Boolean(row.is_custom_university),
    isPendingReview: Boolean(row.is_pending_review),
    department: row.department,
    isPublic: Boolean(row.is_public),
    password: row.password || undefined,
    totalQuestions: Number(row.total_questions) || 0,
    blocks: Array.isArray(row.blocks) ? row.blocks : [],
    createdAt: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    authorId: row.author_id || 'community',
    authorName: row.author_name || 'Muallif',
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

    const { testPackages, universities, deletedPackageIds } = useQuizStore.getState();
    const deletedSet = new Set(deletedPackageIds || []);

    if (!data || data.length === 0) {
      // Cloud has 0 tests. Keep only non-deleted local packages (not cloud packages)
      const cleanLocalPackages = (testPackages || []).filter(
        (p) => !deletedSet.has(p.id) && !p.id.startsWith('pkg-')
      );
      useQuizStore.setState({ testPackages: cleanLocalPackages });
      return { success: true, count: 0, message: "Bulutli bazada hozircha testlar yo'q." };
    }

    const cloudPackages: TestPackage[] = data.map(mapRowToTestPackage);

    // Filter out any packages that have been deleted locally
    const validCloudPackages = cloudPackages.filter((cp) => !deletedSet.has(cp.id));

    // Combine: valid cloud packages take priority.
    const mergedPackages: TestPackage[] = [...validCloudPackages];

    for (const localPkg of testPackages || []) {
      if (deletedSet.has(localPkg.id)) continue;
      if (mergedPackages.some((cp) => cp.id === localPkg.id)) continue;
      // If a package was a cloud package (starts with pkg-) but is missing from cloud, it was deleted!
      if (localPkg.id.startsWith('pkg-')) continue;
      mergedPackages.push(localPkg);
    }

    // Also extract all universities from cloud test packages and merge into store
    const cloudPackageUnis = validCloudPackages.map((p) => p.university?.trim()).filter(Boolean);
    const existingUnisSet = new Set(universities || []);
    let updatedUnis = [...(universities || [])];
    let unisChanged = false;
    for (const u of cloudPackageUnis) {
      if (u && !existingUnisSet.has(u)) {
        existingUnisSet.add(u);
        updatedUnis.unshift(u);
        unisChanged = true;
      }
    }

    useQuizStore.setState({
      testPackages: mergedPackages,
      ...(unisChanged ? { universities: updatedUnis } : {}),
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

    // 2. Identify local tests not yet in remote
    const { testPackages, universities, deletedPackageIds } = useQuizStore.getState();
    const deletedSet = new Set(deletedPackageIds || []);
    const testsToUpload = (testPackages || []).filter((t) => !remoteIdSet.has(t.id) && !deletedSet.has(t.id));

    let uploadedCount = 0;
    if (testsToUpload.length > 0) {
      const rowsToInsert = testsToUpload.map(mapTestPackageToRow);
      const { error: insertError } = await supabase
        .from('test_packages')
        .upsert(rowsToInsert, { onConflict: 'id' });

      if (!insertError) {
        uploadedCount = testsToUpload.length;
      }
    }

    // 3. Extract and merge universities from all remote tests
    const allPackageUnis = remoteTests.map((t) => t.university?.trim()).filter(Boolean);
    const existingUniSet = new Set(universities || []);
    let updatedUnis = [...(universities || [])];
    let unisChanged = false;
    for (const u of allPackageUnis) {
      if (u && !existingUniSet.has(u)) {
        existingUniSet.add(u);
        updatedUnis.unshift(u);
        unisChanged = true;
      }
    }

    // 4. Merge all remote tests into store
    const validRemoteTests = remoteTests.filter((t) => !deletedSet.has(t.id));
    const allMerged = [...validRemoteTests];
    for (const localT of testPackages || []) {
      if (deletedSet.has(localT.id)) continue;
      if (!allMerged.some((m) => m.id === localT.id)) {
        if (localT.id.startsWith('pkg-')) continue;
        allMerged.push(localT);
      }
    }

    useQuizStore.setState({
      testPackages: allMerged,
      ...(unisChanged ? { universities: updatedUnis } : {}),
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
    const { universities } = useQuizStore.getState();
    const existingSet = new Set(universities || []);
    const mergedUnis = [...(universities || [])];
    let addedCount = 0;

    for (const name of cloudUniNames) {
      if (!existingSet.has(name)) {
        existingSet.add(name);
        mergedUnis.unshift(name);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      useQuizStore.setState({ universities: mergedUnis });
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
    const { universities } = useQuizStore.getState();
    if (!universities || universities.length === 0) return;

    // Push local universities to cloud
    const rows = universities.map((name) => ({
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
