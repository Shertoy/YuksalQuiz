import { Announcement, UserProfile } from '../types';

/**
 * Checks whether an announcement is meant for the given user profile based on target audience.
 */
export function isAnnouncementForUser(ann: Announcement, user: UserProfile): boolean {
  if (!ann.targetType || ann.targetType === 'all') {
    return true;
  }

  if (ann.targetType === 'region') {
    if (!user.region || !ann.targetValue) return false;
    return user.region.toLowerCase() === ann.targetValue.toLowerCase();
  }

  if (ann.targetType === 'university') {
    if (!user.university || !ann.targetValue) return false;
    return user.university.toLowerCase() === ann.targetValue.toLowerCase();
  }

  if (ann.targetType === 'user') {
    if (!ann.targetValue) return false;
    const val = ann.targetValue.trim().toLowerCase();
    const cleanTarget = val.replace(/^tg_/, '').replace(/^user_/, '').replace(/^user-/, '');
    const cleanUserId = user.id.toLowerCase().replace(/^tg_/, '').replace(/^user_/, '').replace(/^user-/, '');
    const userIdMatch = user.id.toLowerCase() === val || (cleanTarget.length > 0 && cleanTarget === cleanUserId);
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase();
    const nameMatch = fullName ? (fullName.includes(val) || val.includes(fullName)) : false;
    const firstMatch = user.firstName ? user.firstName.toLowerCase() === val : false;
    return userIdMatch || nameMatch || firstMatch;
  }

  return true;
}

/**
 * Formats date and time nicely (e.g., "27.09.2026 • 11:20")
 */
export function formatDateTime(dateStr: string, timeStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  const formattedDate = parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : dateStr;
  if (timeStr) {
    return `${formattedDate} • ${timeStr}`;
  }
  return formattedDate;
}
