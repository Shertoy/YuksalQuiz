import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'yuksal_supabase_url';
const STORAGE_KEY_KEY = 'yuksal_supabase_anon_key';

let cachedClient: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
  source: 'env' | 'custom' | 'none';
}

export const DEFAULT_SUPABASE_URL = 'https://kupbaphqyyvmpqxmrtrn.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1cGJhcGhxeXl2bXBxeG1ydHJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5MDgwMDYsImV4cCI6MjEwNjQ4NDAwNn0.ieqSwohIUgfAwQ2EUF1CWSr-TT46SiLOSGDxYoFY2OE';

/**
 * Get active Supabase configuration from environment variables or custom localStorage.
 */
export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY).trim();

  let customUrl = '';
  let customKey = '';

  if (typeof window !== 'undefined') {
    customUrl = (localStorage.getItem(STORAGE_KEY_URL) || '').trim();
    customKey = (localStorage.getItem(STORAGE_KEY_KEY) || '').trim();
  }

  // Priority: Custom configured in Admin Panel -> Environment variables
  if (customUrl && customKey) {
    return {
      url: customUrl,
      anonKey: customKey,
      isConfigured: true,
      source: 'custom',
    };
  }

  if (envUrl && envKey) {
    return {
      url: envUrl,
      anonKey: envKey,
      isConfigured: true,
      source: 'env',
    };
  }

  return {
    url: '',
    anonKey: '',
    isConfigured: false,
    source: 'none',
  };
}

/**
 * Auto-detect and normalize Supabase Project URL.
 * If user accidentally pastes their JWT Anon Key into URL field,
 * extract the project ref from JWT payload automatically.
 */
export function normalizeSupabaseUrl(input: string): string {
  let val = (input || '').trim();
  if (!val) return '';

  // If user pasted a JWT token (starts with eyJ and has periods)
  if (val.startsWith('eyJ') && val.includes('.')) {
    try {
      const parts = val.split('.');
      if (parts[1]) {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const parsed = JSON.parse(jsonPayload);
        if (parsed.ref) {
          return `https://${parsed.ref}.supabase.co`;
        }
      }
    } catch {
      // ignore
    }
  }

  // Prepend https:// if user only typed "projectref.supabase.co"
  if (val && !val.startsWith('http://') && !val.startsWith('https://')) {
    val = 'https://' + val;
  }

  return val;
}

/**
 * Save custom Supabase credentials from Admin Panel.
 */
export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window === 'undefined') return;

  const cleanUrl = normalizeSupabaseUrl(url);
  const cleanKey = anonKey.trim();

  if (cleanUrl && cleanKey) {
    localStorage.setItem(STORAGE_KEY_URL, cleanUrl);
    localStorage.setItem(STORAGE_KEY_KEY, cleanKey);
  } else {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
  }

  // Reset cached client
  cachedClient = null;
  lastUsedUrl = '';
  lastUsedKey = '';
}

/**
 * Get initialized Supabase client instance, or null if not configured.
 */
export function getSupabase(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return null;
  }

  if (cachedClient && lastUsedUrl === config.url && lastUsedKey === config.anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    lastUsedUrl = config.url;
    lastUsedKey = config.anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Test connectivity with Supabase project.
 */
export async function testSupabaseConnection(
  testUrl?: string,
  testKey?: string
): Promise<{ success: boolean; message: string; tableReady?: boolean }> {
  try {
    const rawUrl = testUrl || getSupabaseConfig().url;
    const url = normalizeSupabaseUrl(rawUrl);
    const key = (testKey || getSupabaseConfig().anonKey || '').trim();

    if (!url || !key) {
      return { success: false, message: 'URL yoki Anon API Key kiritilmagan.' };
    }

    const testClient = createClient(url, key, {
      auth: { persistSession: false },
    });

    // Test ping by querying test_packages table
    const { data, error } = await testClient
      .from('test_packages')
      .select('id')
      .limit(1);

    if (error) {
      // Check if table does not exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return {
          success: true,
          tableReady: false,
          message: "Supabase loyihasiga ulandi, ammo 'test_packages' jadvali hali yaratilmagan. Iltimos, SQL skriptini ishga tushiring.",
        };
      }
      return {
        success: false,
        message: `Xatolik yuz berdi: ${error.message} (kod: ${error.code})`,
      };
    }

    return {
      success: true,
      tableReady: true,
      message: "Supabase loyihasiga muvaffaqiyatli ulandi! 'test_packages' jadvali faol va sinxronizatsiyaga tayyor.",
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Ulanishda xatolik: ${err?.message || 'Tarmoq xatosi'}`,
    };
  }
}
