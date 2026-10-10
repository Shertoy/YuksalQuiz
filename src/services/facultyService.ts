import { create } from 'zustand';
import { getSupabase } from './supabase';
import { apiPost, apiErrorText } from './api';
import { UNIVERSITY_FACULTIES } from '../data/universityFaculties';
import { normalizeUniversityKey } from '../store/useQuizStore';
import { facultyKey } from '../utils/faculty';

/**
 * OTM yo'nalishlari (fakultetlari) ro'yxati.
 *
 * Manba tartibi:
 *  1) Admin panelda tahrirlangan ro'yxat (app_settings: 'university_faculties') — hamma uchun bir xil
 *  2) Bo'lmasa, rasmiy saytlardan yig'ilgan ro'yxat (src/data/universityFaculties.ts)
 *
 * Ro'yxatda yo'q yo'nalishni foydalanuvchi qo'lda yozsa, so'rov adminga boradi
 * (app_settings: 'faculty_requests' + Telegram xabar). Admin uni ro'yxatga qo'shadi yoki rad etadi.
 */

export interface FacultyRequest {
  id: string;
  university: string;
  faculty: string;
  count: number;
  created_at: string;
}

interface FacultyState {
  /** Admin tahrirlagan ro'yxatlar: OTM nomi -> yo'nalishlar */
  overrides: Record<string, string[]>;
  requests: FacultyRequest[];
  loaded: boolean;
  loading: boolean;
}

export const useFacultyStore = create<FacultyState>(() => ({
  overrides: {},
  requests: [],
  loaded: false,
  loading: false,
}));

const OFFICIAL_BY_KEY: Record<string, string[]> = Object.fromEntries(
  Object.entries(UNIVERSITY_FACULTIES).map(([name, info]) => [normalizeUniversityKey(name), info.faculties])
);

function overridesByKey(overrides: Record<string, string[]>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [name, list] of Object.entries(overrides || {})) {
    if (Array.isArray(list)) out[normalizeUniversityKey(name)] = list;
  }
  return out;
}

/** OTMning amaldagi yo'nalishlar ro'yxati (admin tahriri ustun) */
export function getUniversityFaculties(university: string, overrides?: Record<string, string[]>): string[] {
  const key = normalizeUniversityKey(university || '');
  if (!key) return [];
  const ov = overridesByKey(overrides ?? useFacultyStore.getState().overrides);
  if (ov[key]) return ov[key];
  return OFFICIAL_BY_KEY[key] || [];
}

/** Yo'nalish shu OTM ro'yxatida bormi (katta-kichik harf va bo'shliqlarga e'tiborsiz) */
export function isFacultyInList(university: string, faculty: string): boolean {
  const k = facultyKey(faculty);
  if (!k) return false;
  return getUniversityFaculties(university).some((f) => facultyKey(f) === k);
}

/** Ro'yxatlarni bazadan yuklash (hamma o'qiy oladi) */
export async function loadFaculties(force = false): Promise<void> {
  const st = useFacultyStore.getState();
  if (st.loading || (st.loaded && !force)) return;
  useFacultyStore.setState({ loading: true });
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['university_faculties', 'faculty_requests']);
    let overrides: Record<string, string[]> = {};
    let requests: FacultyRequest[] = [];
    (data || []).forEach((row: any) => {
      if (row.key === 'university_faculties' && row.value && typeof row.value === 'object') overrides = row.value;
      if (row.key === 'faculty_requests' && Array.isArray(row.value)) requests = row.value;
    });
    useFacultyStore.setState({ overrides, requests, loaded: true });
  } catch (err) {
    console.warn('loadFaculties error:', err);
  } finally {
    useFacultyStore.setState({ loading: false });
  }
}

/** Foydalanuvchi ro'yxatda yo'q yo'nalishni yozdi: adminga so'rov yuboriladi */
export async function requestFaculty(university: string, faculty: string): Promise<void> {
  if (!university.trim() || !faculty.trim()) return;
  if (isFacultyInList(university, faculty)) return;
  try {
    await apiPost('/api/wallet', { action: 'faculty_request', university: university.trim(), faculty: faculty.trim() });
  } catch {
    /* so'rov yuborilmasa ham test saqlangan bo'ladi */
  }
}

/** Admin: OTM yo'nalishlar ro'yxatini to'liq saqlash */
export async function saveUniversityFaculties(
  university: string,
  faculties: string[]
): Promise<{ ok: boolean; message: string }> {
  const r = await apiPost('/api/admin', { action: 'set_faculties', university, faculties });
  if (r.ok && r.data?.ok) {
    useFacultyStore.setState({
      overrides: r.data.overrides || useFacultyStore.getState().overrides,
      requests: Array.isArray(r.data.requests) ? r.data.requests : useFacultyStore.getState().requests,
    });
    return { ok: true, message: 'Saqlandi' };
  }
  return { ok: false, message: apiErrorText(r, "Saqlab bo'lmadi") };
}

/** Admin: so'rovni ro'yxatdan olib tashlash (rad etish) */
export async function dismissFacultyRequest(id: string): Promise<{ ok: boolean; message: string }> {
  const r = await apiPost('/api/admin', { action: 'dismiss_faculty_request', id });
  if (r.ok && r.data?.ok) {
    useFacultyStore.setState({ requests: Array.isArray(r.data.requests) ? r.data.requests : [] });
    return { ok: true, message: "So'rov olib tashlandi" };
  }
  return { ok: false, message: apiErrorText(r, "Bajarib bo'lmadi") };
}
