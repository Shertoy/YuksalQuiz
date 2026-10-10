// "Testlar" bo'limini boshidan (OTM tanlash sahifasidan) ochish.
// Menyudagi "Testlar" tugmasi bosilganda chaqiriladi. Test tugagach ro'yxatga
// qaytishda esa oxirgi tanlov saqlanib qoladi.
export const TESTS_ROOT_EVENT = 'yuksal:tests-root';

export function resetTestsNavigation(): void {
  try {
    localStorage.removeItem('yuksal_last_university');
    localStorage.removeItem('yuksal_last_faculty');
  } catch {}
  try {
    window.dispatchEvent(new Event(TESTS_ROOT_EVENT));
  } catch {}
}
