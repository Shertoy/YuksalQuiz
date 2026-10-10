import { DEPARTMENTS, type TestPackage } from '../types';
import { isFacultyInList } from '../services/facultyService';
import { decodeHtmlEntities } from './security';

const GENERIC_DEPARTMENT_KEYS = new Set<string>(DEPARTMENTS.map((d) => facultyKey(d)));

/** Yo'nalishi ko'rsatilmagan testlar shu nom ostida guruhlanadi */
export const OTHER_FACULTY = "Boshqa yo'nalish";

/**
 * Test paketining yo'nalishi (fakulteti).
 * Test yaratishda kiritilgan "Yo'nalish / Fakultet" maydoni (faculty) asosiy manba,
 * u bo'lmasa eski testlardagi department ishlatiladi.
 */
export function getPackageFaculty(pkg: TestPackage): string {
  const faculty = String((pkg as any).faculty || '').trim();
  let raw = faculty;
  if (!raw) {
    // Eski testlar: department ko'pincha umumiy toifa ("Menejment va Boshqaruv" kabi), haqiqiy yo'nalish emas.
    // Umumiy toifa shu OTM ro'yxatida bo'lmasa, yo'nalish sifatida ko'rsatilmaydi.
    const dep = String(pkg.department || '').trim();
    const isGeneric = GENERIC_DEPARTMENT_KEYS.has(facultyKey(dep));
    if (dep && (!isGeneric || isFacultyInList(pkg.university || '', dep))) raw = dep;
  }
  const clean = decodeHtmlEntities(raw).replace(/\s+/g, ' ').trim();
  if (!clean || clean.toLowerCase() === 'system') return OTHER_FACULTY;
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Bir xil yo'nalishni turlicha yozilishidan qat'i nazar bitta guruhga yig'ish uchun kalit:
 * "Tarix", "tarix ", "TARIX" -> "tarix"
 */
export function facultyKey(name: string): string {
  return String(name || '')
    .toLowerCase()
    .replace(/[ʻʼ‘’`']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export interface FacultyGroup {
  key: string;
  name: string;
  packages: TestPackage[];
  testCount: number;
}

/** Testlarni yo'nalish bo'yicha guruhlaydi (alifbo tartibida, "Boshqa" eng pastda) */
export function groupByFaculty(packages: TestPackage[]): FacultyGroup[] {
  const map = new Map<string, FacultyGroup>();
  for (const pkg of packages) {
    const name = getPackageFaculty(pkg);
    const key = facultyKey(name);
    const g = map.get(key);
    if (g) {
      g.packages.push(pkg);
      g.testCount += 1;
    } else {
      map.set(key, { key, name, packages: [pkg], testCount: 1 });
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.name === OTHER_FACULTY) return 1;
    if (b.name === OTHER_FACULTY) return -1;
    return a.name.localeCompare(b.name, 'uz');
  });
}
