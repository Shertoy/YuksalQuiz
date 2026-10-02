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

    if (!data || data.length === 0) {
      return { success: true, count: 0, message: "Bulutli bazada hozircha testlar yo'q." };
    }

    const cloudPackages: TestPackage[] = data.map(mapRowToTestPackage);

    // Merge with current store test packages
    const { testPackages } = useQuizStore.getState();
    const existingIds = new Set(testPackages.map((p) => p.id));

    // Combine: cloud packages take priority, preserve any local unpushed packages
    const mergedPackages: TestPackage[] = [...cloudPackages];

    for (const localPkg of testPackages) {
      if (!mergedPackages.some((cp) => cp.id === localPkg.id)) {
        mergedPackages.push(localPkg);
      }
    }

    useQuizStore.setState({ testPackages: mergedPackages });

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
    const { testPackages } = useQuizStore.getState();
    const testsToUpload = testPackages.filter((t) => !remoteIdSet.has(t.id));

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

    // 3. Merge all remote tests into store
    const allMerged = [...remoteTests];
    for (const localT of testPackages) {
      if (!allMerged.some((m) => m.id === localT.id)) {
        allMerged.push(localT);
      }
    }

    useQuizStore.setState({ testPackages: allMerged });

    return {
      success: true,
      uploadedCount,
      downloadedCount: remoteTests.length,
      message: `Sinxronizatsiya muvaffaqiyatli! Yuklab olindi: ${remoteTests.length} ta, Yuklandi: ${uploadedCount} ta.`,
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
 * Setup Realtime Subscription so newly created tests appear instantly.
 */
export function setupRealtimeTestSubscription(
  onUpdate?: () => void
): (() => void) | null {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const channel = supabase
      .channel('realtime:test_packages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'test_packages' },
        async (payload) => {
          // Refresh list from cloud
          await fetchCloudTests();
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
