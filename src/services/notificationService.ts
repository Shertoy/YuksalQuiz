import { apiPost } from './api';
import { Announcement, AnnouncementTargetType, Region, LeaderboardUser } from '../types';
import { useQuizStore } from '../store/useQuizStore';
import { publishAnnouncementToCloud } from './testSyncService';
import { cleanTelegramId } from '../utils/security';

export interface BroadcastPayload {
  title: string;
  message: string;
  link?: string;
  tag: 'yangilik' | 'eslatma' | 'muhim';
  targetType: AnnouncementTargetType;
  targetValue?: string;
  targetLabel?: string;
  sendViaTelegramBot: boolean;
  registeredUsers?: LeaderboardUser[];
}

export interface BroadcastResult {
  success: boolean;
  inAppSaved: boolean;
  telegramBroadcast?: {
    totalTargeted: number;
    sent: number;
    failed: number;
    errors: string[];
  };
  message: string;
}

/**
 * Filter registered users by the selected audience to get their Telegram IDs
 */
export function getTargetTelegramIds(
  targetType: AnnouncementTargetType,
  targetValue?: string,
  users: LeaderboardUser[] = []
): string[] {
  const ids: string[] = [];

  for (const user of users) {
    const rawId = user.id;
    const clean = cleanTelegramId(rawId);
    // Valid Telegram IDs are purely digits (e.g. 123456789)
    if (!clean || !/^\d+$/.test(clean)) continue;

    if (targetType === 'all') {
      ids.push(clean);
    } else if (targetType === 'university') {
      if (
        user.university &&
        targetValue &&
        user.university.toLowerCase().includes(targetValue.toLowerCase())
      ) {
        ids.push(clean);
      }
    } else if (targetType === 'region') {
      if (
        user.region &&
        targetValue &&
        user.region.toLowerCase() === targetValue.toLowerCase()
      ) {
        ids.push(clean);
      }
    } else if (targetType === 'user') {
      if (targetValue) {
        const cleanTarget = cleanTelegramId(targetValue);
        if (clean === cleanTarget || user.name.toLowerCase().includes(targetValue.toLowerCase())) {
          ids.push(clean);
        }
      }
    }
  }

  // If specific user target was provided directly as numeric Telegram ID and not found in list:
  if (targetType === 'user' && targetValue) {
    const directClean = cleanTelegramId(targetValue);
    if (/^\d+$/.test(directClean) && !ids.includes(directClean)) {
      ids.push(directClean);
    }
  }

  return Array.from(new Set(ids));
}

/**
 * Sends a targeted announcement:
 * 1. Always saves to in-app store + Supabase cloud for real-time notification badge
 * 2. If `sendViaTelegramBot` is true, broadcasts to target students via Telegram Bot API
 */
export async function sendTargetedAnnouncement(
  payload: BroadcastPayload
): Promise<BroadcastResult> {
  const { addAnnouncement } = useQuizStore.getState();

  // 1. Prepare Announcement object
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

  const announcementData: Omit<Announcement, 'id'> = {
    title: payload.title.trim(),
    message: payload.message.trim(),
    link: payload.link?.trim() || undefined,
    date: dateStr,
    time: timeStr,
    tag: payload.tag,
    targetType: payload.targetType,
    targetValue: payload.targetValue,
    targetLabel: payload.targetLabel || 'Barchaga',
  };

  // Add to local Zustand store
  addAnnouncement(announcementData);

  // Sync to Supabase so all students receive it
  const createdAnn: Announcement = {
    ...announcementData,
    id: `ann_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  };

  await publishAnnouncementToCloud(createdAnn).catch((err) => {
    console.warn('Cloud announcement sync notice:', err);
  });

  // 2. Telegram Bot Broadcast if selected
  if (!payload.sendViaTelegramBot) {
    return {
      success: true,
      inAppSaved: true,
      message: "Xabarnoma muvaffaqiyatli saqlandi! Barcha talabalar ilovaga kirganda qizil bildirishnoma ko'rinadi.",
    };
  }

  // Find target Telegram IDs
  const targetIds = getTargetTelegramIds(
    payload.targetType,
    payload.targetValue,
    payload.registeredUsers || useQuizStore.getState().leaderboard || []
  );

  if (targetIds.length === 0) {
    return {
      success: true,
      inAppSaved: true,
      telegramBroadcast: {
        totalTargeted: 0,
        sent: 0,
        failed: 0,
        errors: ["Belgilangan mezon bo'yicha raqamli Telegram ID'ga ega talaba topilmadi"],
      },
      message: "Bildirishnoma ilovaga qo'shildi, ammo Telegram orqali yuborish uchun talabalarning Telegram ID raqami topilmadi.",
    };
  }

  // /api/broadcast ga 150 tadan bo'lib yuboriladi (bitta so'rov vaqt chegarasidan oshmasligi uchun).
  // apiPost Telegram imzosi va (brauzerda) admin kalitini qo'shadi.
  const CHUNK = 150;
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  for (let i = 0; i < targetIds.length; i += CHUNK) {
    const chunk = targetIds.slice(i, i + CHUNK);
    const r = await apiPost('/api/broadcast', {
      chatIds: chunk,
      title: payload.title,
      message: payload.message,
      link: payload.link,
    });
    const d: any = r.data || {};
    if (r.ok && d.results) {
      sent += Number(d.results.sent || 0);
      failed += Number(d.results.failed || 0);
      errors.push(...(Array.isArray(d.results.errors) ? d.results.errors : []));
    } else {
      failed += chunk.length;
      errors.push(d.error || `Server xatosi: ${r.status}`);
      if (r.status === 401 || r.status === 403) break;
    }
  }

  return {
    success: true,
    inAppSaved: true,
    telegramBroadcast: {
      totalTargeted: targetIds.length,
      sent,
      failed: Math.max(failed, targetIds.length - sent),
      errors: errors.slice(0, 50),
    },
    message:
      sent > 0
        ? `Xabarnoma yuborildi! Mini App'ga joylandi va Telegram orqali ${sent} ta talabaga yetkazildi.`
        : `Bildirishnoma ilovada saqlandi, ammo Telegram orqali yuborilmadi (${errors[0] || 'xatolik'}).`,
  };
}
