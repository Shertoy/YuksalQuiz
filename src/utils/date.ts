/**
 * Foydalanuvchining mahalliy sanasi (YYYY-MM-DD).
 * toISOString() UTC beradi: Toshkentda (UTC+5) kun 05:00 da almashardi.
 * Kunlik limit, streak va bildirishnomalar shu funksiya orqali hisoblanadi.
 */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
