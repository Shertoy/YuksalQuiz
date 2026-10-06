import React, { useEffect } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  UserProfile,
  TabType,
  TestPackage,
  TestAttempt,
  MistakeItem,
  LeaderboardUser,
  LeaderboardScope,
  TOP_UNIVERSITIES,
  WalletTransaction,
  Announcement,
  AnnouncementReply,
  SubscriptionPlanType,
  SubscriptionPrices,
  PaymentMethod,
  Promocode,
} from '../types';
import { INITIAL_TEST_PACKAGES } from '../data/mockTests';
import {
  generateIntegritySignature,
  verifyIntegritySignature,
  decodeHtmlEntities,
  validateAndSanitizeName,
  validateTestAttempt,
  isUserAdmin,
  cleanTelegramId,
} from '../utils/security';
import { soundFX, triggerHaptic, setVibrationEnabled, getInitialUserId } from '../utils/telegram';
import { reconcilePackageWithProgress } from '../utils/progressUtils';
import { calculateUserRatingStats } from '../utils/ratingUtils';

import { Language } from '../i18n/translations';
import { getSupabase } from '../services/supabase';

export { isUserAdmin };

export function useIsAdmin(): boolean {
  const profileId = useQuizStore((state) => state.profile?.id);
  return isUserAdmin(profileId);
}

export function useUserBalanceRealtime(): void {
  const subscribe = useQuizStore((state) => state.subscribeToUserBalanceRealtime);
  const profileId = useQuizStore((state) => state.profile?.id);

  useEffect(() => {
    const unsub = subscribe();
    return () => {
      unsub?.();
    };
  }, [subscribe, profileId]);
}

export function normalizeUniversityKey(name: string): string {
  return (name || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function deduplicateUniversities(list: string[]): string[] {
  const map = new Map<string, string>();
  for (const item of list || []) {
    const trimmed = (item || '').trim();
    if (!trimmed) continue;
    const lower = normalizeUniversityKey(trimmed);
    if (!map.has(lower)) {
      map.set(lower, trimmed);
    } else {
      const existing = map.get(lower)!;
      const existingUpper = (existing.match(/[A-Z]/g) || []).length;
      const newUpper = (trimmed.match(/[A-Z]/g) || []).length;
      if (newUpper > existingUpper) {
        map.set(lower, trimmed);
      }
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.localeCompare(b, 'uz', { sensitivity: 'base' })
  );
}

interface QuizState {
  theme: 'dark' | 'light';
  language: Language;
  profile: UserProfile;
  activeTab: TabType;
  testPackages: TestPackage[];
  testAttempts: TestAttempt[];
  mistakes: MistakeItem[];
  leaderboard: LeaderboardUser[];
  leaderboardScope: LeaderboardScope;
  customUniversities: string[];
  universities: string[];
  pendingUniversities: string[];
  deletedUniversities: string[];
  transactions: WalletTransaction[];
  announcements: Announcement[];
  readAnnouncementIds: string[];
  announcementReplies: AnnouncementReply[];
  subscriptionPrices: SubscriptionPrices;
  paymentMethods: PaymentMethod[];
  promocodes: Promocode[];
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  tamperDetected: boolean;
  deletedPackageIds: string[];

  // Actions
  setTheme: (theme: 'dark' | 'light') => void;
  setLanguage: (language: Language) => void;
  setActiveTab: (tab: TabType) => void;
  setLeaderboardScope: (scope: LeaderboardScope) => void;
  addTransaction: (tx: Omit<WalletTransaction, 'id' | 'date'>) => void;
  addAnnouncement: (item: Omit<Announcement, 'id' | 'date' | 'time'>) => void;
  deleteAnnouncement: (id: string) => void;
  markAnnouncementsAsRead: () => void;
  addAnnouncementReply: (announcementId: string, message: string) => void;
  replyToUserMessage: (replyId: string, adminMessage: string) => void;
  deleteAnnouncementReply: (replyId: string) => void;
  addUniversity: (name: string) => void;
  updateUniversity: (oldName: string, newName: string) => void;
  deleteUniversity: (name: string) => void;
  approvePendingUniversity: (name: string) => void;
  rejectPendingUniversity: (name: string) => void;
  updateSubscriptionPrices: (prices: SubscriptionPrices) => void;
  addPaymentMethod: (method: Omit<PaymentMethod, 'id'>) => void;
  updatePaymentMethod: (id: string, updates: Partial<PaymentMethod>) => void;
  deletePaymentMethod: (id: string) => void;
  togglePaymentMethod: (id: string) => void;
  createPromocode: (code: string, amount: number, plan?: SubscriptionPlanType) => void;
  deletePromocode: (code: string) => void;
  activatePromocode: (code: string) => { success: boolean; message: string; amount?: number; plan?: string };
  registerUser: (
    data: Omit<
      UserProfile,
      | 'id'
      | 'coins'
      | 'streak'
      | 'lastLoginDate'
      | 'completedTestsCount'
      | 'isRegistered'
      | 'walletBalance'
      | 'voucherBalance'
      | 'authorEarnings'
      | 'referralCount'
      | 'subscriptionPlan'
      | 'checksum'
    >
  ) => void;
  updateProfile: (data: Partial<UserProfile>) => void;
  toggleSound: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  toggleVibration: () => void;
  setVibrationEnabled: (enabled: boolean) => void;
  checkDailyStreak: () => { streakAwarded: boolean; streakCount: number };
  addCustomUniversity: (name: string) => void;
  createTestPackage: (pkg: TestPackage) => void;
  updateTestPackage: (pkg: TestPackage) => void;
  deleteTestPackage: (id: string) => void;
  recordTestAttempt: (attempt: TestAttempt) => { coinsEarned: number; bonusCoins: number; unlockedNext: boolean };
  solveMistake: (questionId: string) => void;
  creditAuthor: (authorId: string, amount?: number) => void;
  depositBalance: (amount: number, transactionId: string) => { newBalance: number };
  applySubscription: (plan: SubscriptionPlanType) => { success: boolean; message: string };
  applyReceiptPaymentApproval: (data: {
    plan: SubscriptionPlanType;
    amount: number;
    transactionId: string;
    paidUntil?: string;
  }) => void;
  addReferralBonus: () => { bonusAdded: number; newTotal: number };
  resetTamperWarning: () => void;
  clearAllTests: () => void;
  restoreBackupData: (data: any) => void;
  setUserBlocked: (blocked: boolean) => void;
  claimVoucherDirectly: () => Promise<boolean>;
  subscribeToUserBalanceRealtime: () => (() => void) | null;
}

export const DEFAULT_SUBSCRIPTION_PRICES: SubscriptionPrices = {
  '3_months': 35000,
  '6_months': 60000,
  '1_year': 100000,
};

export const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'pm-1',
    name: 'Humo / Uzcard (Karta)',
    details: '9860 0803 8232 0093 (Adminka Alijonova X...)',
    instructions: "Ushbu kartaga hamyonni to'ldirish summasini o'tkazing va Telegram botga 'Men to'lov qildim' deb chek rasmini yuboring",
    isActive: true,
  },
  {
    id: 'pm-2',
    name: 'Payme',
    details: '9860 0803 8232 0093 (Adminka Alijonova X...)',
    instructions: "Payme ilovasi orqali to'lov qiling va to'lov kvitansiyasini Telegram botga yuboring",
    isActive: true,
  },
  {
    id: 'pm-3',
    name: 'Click Up',
    details: '9860 0803 8232 0093 (Adminka Alijonova X...)',
    instructions: "Click orqali to'lovni bajaring va chek rasmini botga jo'nating",
    isActive: true,
  },
  {
    id: 'pm-4',
    name: 'Uzum Bank',
    details: '9860 0803 8232 0093 (Adminka Alijonova X...)',
    instructions: "Uzum ilovasida 0% komissiya bilan to'lang va chekni yuboring",
    isActive: true,
  },
];

export const DEFAULT_PROMOCODES: Promocode[] = [
  {
    code: 'YUK-15K-START',
    amount: 15000,
    plan: '3_months',
    isUsed: false,
    createdAt: '2026-09-28',
  },
  {
    code: 'YUK-30K-PREMIUM',
    amount: 30000,
    plan: '6_months',
    isUsed: false,
    createdAt: '2026-09-28',
  },
  {
    code: 'YUK-70K-ANNUAL',
    amount: 70000,
    plan: '1_year',
    isUsed: false,
    createdAt: '2026-09-28',
  },
];

const DEFAULT_PROFILE: UserProfile = {
  id: getInitialUserId(),
  firstName: '',
  lastName: '',
  region: 'Toshkent shahri',
  university: 'Toshkent Axborot Texnologiyalari Universiteti (TATU)',
  birthDate: '2004-01-01',
  gender: 'male',
  studyType: 'Kunduzgi',
  academicYear: 1,
  avatar: '/avatars/avatar_1.png',
  coins: 0, // Unearned coins strictly zeroed out at start!
  streak: 1,
  lastLoginDate: new Date().toISOString().split('T')[0],
  completedTestsCount: 0,
  isRegistered: false,
  acceptedOferta: false,
  walletBalance: 0,
  voucherBalance: 20000, // 20 000 UZS starting voucher!
  authorEarnings: 0,
  referralCount: 0,
  subscriptionPlan: 'none',
  has_paid: false,
  paid_until: undefined,
  registeredAt: new Date().toISOString().split('T')[0],
  is_blocked: false,
  isBlocked: false,
};

// Initial signature
DEFAULT_PROFILE.checksum = generateIntegritySignature({
  userId: DEFAULT_PROFILE.id,
  coins: DEFAULT_PROFILE.coins,
  completedTestsCount: DEFAULT_PROFILE.completedTestsCount,
  streak: DEFAULT_PROFILE.streak,
  lastLoginDate: DEFAULT_PROFILE.lastLoginDate,
  walletBalance: DEFAULT_PROFILE.walletBalance,
  voucherBalance: DEFAULT_PROFILE.voucherBalance,
});

const getInitialLanguage = (): Language => {
  try {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tgLang = (window as any).Telegram.WebApp.initDataUnsafe?.user?.language_code;
      if (tgLang && typeof tgLang === 'string') {
        const lower = tgLang.toLowerCase();
        if (lower.startsWith('ru')) return 'ru';
      }
    }
  } catch {
    // fallback
  }
  return 'uz';
};

// Module-level anti-flood rate limiter for test attempt submissions
let lastAttemptTimestamp = 0;

export const useQuizStore = create<QuizState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      language: getInitialLanguage(),
      profile: DEFAULT_PROFILE,
      activeTab: 'home',
      testPackages: INITIAL_TEST_PACKAGES,
      testAttempts: [],
      mistakes: [],
      leaderboard: [],
      leaderboardScope: 'uzbekistan',
      customUniversities: [],
      universities: deduplicateUniversities(TOP_UNIVERSITIES),
      pendingUniversities: [],
      deletedUniversities: [],
      transactions: [],
      announcements: [
        {
          id: 'ann-1',
          title: 'YuksalQuiz v1.0 ga xush kelibsiz!',
          message: 'HEMIS va fan testlariga tayyorlaning! Barcha testlar va imtihon mashqlari platformada to\'liq bepul va ochiq taqdim etiladi.',
          date: '2026-09-27',
          time: '10:00',
          tag: 'yangilik',
          targetType: 'all',
          targetLabel: 'Barchaga',
          isRead: false,
        },
      ],
      readAnnouncementIds: [],
      announcementReplies: [],
      subscriptionPrices: DEFAULT_SUBSCRIPTION_PRICES,
      paymentMethods: DEFAULT_PAYMENT_METHODS,
      promocodes: DEFAULT_PROMOCODES,
      soundEnabled: true,
      vibrationEnabled: true,
      tamperDetected: false,
      deletedPackageIds: [],

      addTransaction: (tx) => {
        const newTx: WalletTransaction = {
          ...tx,
          id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        };
        set({ transactions: [newTx, ...(get().transactions || [])] });
      },

      addAnnouncement: (item) => {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
        const newAnn: Announcement = {
          ...item,
          id: 'ann-' + Date.now(),
          date: dateStr,
          time: timeStr,
          targetType: item.targetType || 'all',
          targetValue: item.targetValue || '',
          targetLabel: item.targetLabel || 'Barchaga',
          isRead: false,
        };
        set({ announcements: [newAnn, ...(get().announcements || [])] });
      },

      deleteAnnouncement: (id: string) => {
        set({
          announcements: get().announcements.filter((a) => a.id !== id),
          announcementReplies: (get().announcementReplies || []).filter((r) => r.announcementId !== id),
        });
      },

      markAnnouncementsAsRead: () => {
        const allIds = (get().announcements || []).map((a) => a.id);
        set({ readAnnouncementIds: allIds });
      },

      addAnnouncementReply: (announcementId: string, message: string) => {
        const { profile, announcements } = get();
        const ann = (announcements || []).find((a) => a.id === announcementId);
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

        const newReply: AnnouncementReply = {
          id: 'reply-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          announcementId,
          announcementTitle: ann?.title || 'Bildirishnoma',
          userId: profile.id,
          userName: `${profile.firstName} ${profile.lastName}`.trim() || 'Talaba',
          userAvatar: profile.avatar,
          userUniversity: profile.university || 'OTM belgilanmagan',
          userRegion: profile.region,
          message: message.trim(),
          date: dateStr,
          time: timeStr,
        };

        triggerHaptic('success');
        set({
          announcementReplies: [newReply, ...(get().announcementReplies || [])],
        });
      },

      replyToUserMessage: (replyId: string, adminMessage: string) => {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

        const updatedReplies = (get().announcementReplies || []).map((r) => {
          if (r.id === replyId) {
            return {
              ...r,
              adminReply: {
                message: adminMessage.trim(),
                date: dateStr,
                time: timeStr,
                adminName: 'Admin',
              },
            };
          }
          return r;
        });

        triggerHaptic('success');
        set({ announcementReplies: updatedReplies });
      },

      deleteAnnouncementReply: (replyId: string) => {
        set({
          announcementReplies: (get().announcementReplies || []).filter((r) => r.id !== replyId),
        });
      },

      clearAllTests: () => {
        const current = get().testPackages || [];
        const currentIds = current.map((p) => p.id);
        const currentDeleted = get().deletedPackageIds || [];
        const allDeletedIds = Array.from(new Set([...currentDeleted, ...currentIds]));

        triggerHaptic('warning');
        set({
          testPackages: [],
          deletedPackageIds: allDeletedIds,
          testAttempts: [],
          mistakes: [],
        });
      },

      restoreBackupData: (data: any) => {
        if (!data) return;
        set({
          profile: data.profile || get().profile,
          universities: data.universities || get().universities,
          customUniversities: data.customUniversities || get().customUniversities,
          testPackages: data.testPackages || [],
          transactions: data.transactions || get().transactions,
          announcements: data.announcements || get().announcements,
          announcementReplies: data.announcementReplies || get().announcementReplies || [],
        });
      },

      setUserBlocked: (blocked: boolean) => {
        set((state) => ({
          profile: {
            ...state.profile,
            is_blocked: blocked,
            isBlocked: blocked,
          },
        }));
      },

      subscribeToUserBalanceRealtime: () => {
        const supabase = getSupabase();
        if (!supabase) return null;
        const currentProfile = get().profile;
        const rawId = currentProfile?.id || '';
        const cleanId = cleanTelegramId(rawId);
        if (!cleanId && !rawId) return null;

        const targetTgId = currentProfile.telegram_id || cleanId;

        const channel = supabase
          .channel(`user-balance-${targetTgId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'users',
              filter: `telegram_id=eq.${targetTgId}`,
            },
            (payload: any) => {
              const newBal = payload.new?.balance ?? payload.new?.wallet_balance;
              if (typeof newBal !== 'undefined' && newBal !== null) {
                const numBal = Number(newBal);
                set((state) => ({
                  profile: {
                    ...state.profile,
                    balance: numBal,
                    walletBalance: numBal,
                    telegram_id: targetTgId,
                  },
                }));
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'users',
              filter: `id=eq.${rawId}`,
            },
            (payload: any) => {
              const newBal = payload.new?.balance ?? payload.new?.wallet_balance;
              if (typeof newBal !== 'undefined' && newBal !== null) {
                const numBal = Number(newBal);
                set((state) => ({
                  profile: {
                    ...state.profile,
                    balance: numBal,
                    walletBalance: numBal,
                    telegram_id: targetTgId,
                  },
                }));
              }
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      },

      addUniversity: (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const normKey = normalizeUniversityKey(trimmed);
        const list = get().universities;
        const deleted = (get().deletedUniversities || []).filter(
          (d) => normalizeUniversityKey(d) !== normKey
        );
        if (!list.some((u) => normalizeUniversityKey(u) === normKey)) {
          const nextList = deduplicateUniversities([...list, trimmed]);
          set({ universities: nextList, deletedUniversities: deleted });
        } else {
          set({ deletedUniversities: deleted });
        }
      },

      updateUniversity: (oldName: string, newName: string) => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        const oldKey = normalizeUniversityKey(oldName);
        const newKey = normalizeUniversityKey(trimmed);
        const updated = get().universities.map((u) =>
          normalizeUniversityKey(u) === oldKey ? trimmed : u
        );
        set({
          universities: deduplicateUniversities(updated),
          customUniversities: (get().customUniversities || []).map((u) =>
            normalizeUniversityKey(u) === oldKey ? trimmed : u
          ),
          deletedUniversities: (get().deletedUniversities || []).filter(
            (d) => normalizeUniversityKey(d) !== newKey
          ),
        });
      },

      deleteUniversity: (name: string) => {
        const trimmed = name.trim();
        const normKey = normalizeUniversityKey(trimmed);
        const currentDeleted = get().deletedUniversities || [];
        const updatedDeleted = currentDeleted.some((d) => normalizeUniversityKey(d) === normKey)
          ? currentDeleted
          : [...currentDeleted, trimmed];

        const remainingUnis = get().universities.filter(
          (u) => normalizeUniversityKey(u) !== normKey
        );

        set({
          universities: deduplicateUniversities(remainingUnis),
          customUniversities: (get().customUniversities || []).filter(
            (u) => normalizeUniversityKey(u) !== normKey
          ),
          pendingUniversities: (get().pendingUniversities || []).filter(
            (u) => normalizeUniversityKey(u) !== normKey
          ),
          deletedUniversities: updatedDeleted,
        });
      },

      approvePendingUniversity: (name: string) => {
        get().addUniversity(name);
        set({
          pendingUniversities: get().pendingUniversities.filter((p) => p !== name),
        });
      },

      rejectPendingUniversity: (name: string) => {
        set({
          pendingUniversities: get().pendingUniversities.filter((p) => p !== name),
        });
      },

      updateSubscriptionPrices: (prices: SubscriptionPrices) => {
        set({ subscriptionPrices: prices });
        triggerHaptic('success');
      },

      addPaymentMethod: (method: Omit<PaymentMethod, 'id'>) => {
        const id = 'pm-' + Date.now();
        const current = get().paymentMethods || [];
        set({ paymentMethods: [...current, { ...method, id }] });
        triggerHaptic('success');
      },

      updatePaymentMethod: (id: string, updates: Partial<PaymentMethod>) => {
        const current = get().paymentMethods || [];
        set({
          paymentMethods: current.map((pm) => (pm.id === id ? { ...pm, ...updates } : pm)),
        });
        triggerHaptic('success');
      },

      deletePaymentMethod: (id: string) => {
        const current = get().paymentMethods || [];
        set({ paymentMethods: current.filter((pm) => pm.id !== id) });
        triggerHaptic('light');
      },

      togglePaymentMethod: (id: string) => {
        const current = get().paymentMethods || [];
        set({
          paymentMethods: current.map((pm) => (pm.id === id ? { ...pm, isActive: !pm.isActive } : pm)),
        });
        triggerHaptic('selection');
      },

      createPromocode: (code: string, amount: number, plan?: SubscriptionPlanType) => {
        const cleanCode = code.trim().toUpperCase();
        if (!cleanCode) return;
        const current = get().promocodes || [];
        if (current.some((p) => p.code.toUpperCase() === cleanCode)) return;
        const newPromo: Promocode = {
          code: cleanCode,
          amount: Math.max(1000, Number(amount) || 15000),
          plan,
          isUsed: false,
          createdAt: new Date().toISOString().split('T')[0],
        };
        set({ promocodes: [newPromo, ...current] });
        triggerHaptic('success');
      },

      deletePromocode: (code: string) => {
        const current = get().promocodes || [];
        set({ promocodes: current.filter((p) => p.code.toUpperCase() !== code.toUpperCase()) });
        triggerHaptic('light');
      },

      activatePromocode: (rawCode: string) => {
        const code = rawCode.trim().toUpperCase();
        const { promocodes, profile, subscriptionPrices } = get();
        const promo = (promocodes || []).find((p) => p.code.toUpperCase() === code);

        if (!promo) {
          triggerHaptic('error');
          return { success: false, message: "Bunday promokod mavjud emas yoki xato kiritildi!" };
        }

        if (promo.isUsed) {
          triggerHaptic('error');
          return { success: false, message: "Ushbu promokod allaqachon ishlatilgan!" };
        }

        // Promocode credits funds directly to the user's wallet
        const amountToCredit = promo.amount || (promo.plan ? ((subscriptionPrices && subscriptionPrices[promo.plan]) || 30000) : 30000);
        const newWalletBalance = (profile.walletBalance || 0) + amountToCredit;

        const updatedProfile: UserProfile = {
          ...profile,
          walletBalance: newWalletBalance,
        };

        updatedProfile.checksum = generateIntegritySignature({
          userId: updatedProfile.id,
          coins: updatedProfile.coins,
          completedTestsCount: updatedProfile.completedTestsCount,
          streak: updatedProfile.streak,
          lastLoginDate: updatedProfile.lastLoginDate,
          walletBalance: updatedProfile.walletBalance,
          voucherBalance: updatedProfile.voucherBalance,
        });

        const updatedPromos = (promocodes || []).map((p) =>
          p.code.toUpperCase() === code
            ? { ...p, isUsed: true, usedBy: `${profile.firstName} ${profile.lastName}`.trim() || profile.id }
            : p
        );

        triggerHaptic('success');
        soundFX.playCoin();

        set({
          profile: updatedProfile,
          promocodes: updatedPromos,
        });

        get().addTransaction({
          type: 'deposit',
          title: `Promokod orqali hisob to'ldirildi (${code})`,
          amount: amountToCredit,
          unit: "so'm",
          isPositive: true,
        });

        return {
          success: true,
          message: `Promokod muvaffaqiyatli faollashtirildi! Balansingizga +${amountToCredit.toLocaleString('uz-UZ')} so'm qo'shildi. Endi o'zingiz istagan obuna tarifini faollashtirishingiz mumkin!`,
          amount: amountToCredit,
          plan: promo.plan,
        };
      },

      setTheme: (theme) => {
        set({ theme });
        if (typeof document !== 'undefined') {
          if (theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      },

      setLanguage: (language: Language) => {
        triggerHaptic('light');
        set({ language });
        const { profile } = get();
        if (profile?.id) {
          import('../services/supabase')
            .then(async ({ getSupabase }) => {
              const supabase = getSupabase();
              if (supabase) {
                try {
                  await supabase
                    .from('users')
                    .upsert({ id: profile.id, language, updated_at: new Date().toISOString() });
                } catch {}
              }
            })
            .catch(() => {});
        }
      },

      setActiveTab: (activeTab) => {
        triggerHaptic('selection');
        set({ activeTab });
      },

      setLeaderboardScope: (leaderboardScope) => {
        set({ leaderboardScope });
      },

      toggleSound: () => {
        const next = !get().soundEnabled;
        soundFX.soundEnabled = next;
        set({ soundEnabled: next });
        if (next) soundFX.playClick();
      },

      setSoundEnabled: (enabled: boolean) => {
        soundFX.soundEnabled = enabled;
        set({ soundEnabled: enabled });
      },

      toggleVibration: () => {
        const next = !get().vibrationEnabled;
        setVibrationEnabled(next);
        set({ vibrationEnabled: next });
        if (next) triggerHaptic('selection');
      },

      setVibrationEnabled: (enabled: boolean) => {
        setVibrationEnabled(enabled);
        set({ vibrationEnabled: enabled });
      },

      registerUser: (data) => {
        const current = get().profile;
        const today = new Date().toISOString().split('T')[0];
        const vFirst = validateAndSanitizeName(data.firstName || '');
        const vLast = validateAndSanitizeName(data.lastName || '');

        let resolvedId = current.id;
        if (!resolvedId || resolvedId === 'guest_12345') {
          resolvedId = getInitialUserId();
        }

        const newProfile: UserProfile = {
          ...current,
          ...data,
          id: resolvedId,
          firstName: vFirst.sanitized || current.firstName,
          lastName: vLast.sanitized || current.lastName,
          isRegistered: true,
          acceptedOferta: true,
          coins: current.coins || 0,
          streak: current.streak || 1,
          lastLoginDate: today,
          registeredAt: current.registeredAt || today,
          voucherBalance: 20000, // 20 000 UZS starting voucher guaranteed
        };

        newProfile.checksum = generateIntegritySignature({
          userId: newProfile.id,
          coins: newProfile.coins,
          completedTestsCount: newProfile.completedTestsCount,
          streak: newProfile.streak,
          lastLoginDate: newProfile.lastLoginDate,
          walletBalance: newProfile.walletBalance,
          voucherBalance: newProfile.voucherBalance,
        });

        triggerHaptic('success');
        soundFX.playCoin();

        const stats = calculateUserRatingStats(get().testAttempts || []);
        const currentUserEntry: LeaderboardUser = {
          id: newProfile.id,
          name: `${newProfile.firstName || 'Talaba'} ${newProfile.lastName || ''}`.trim() || 'Talaba',
          region: newProfile.region,
          university: newProfile.university || 'TATU',
          avatar: newProfile.avatar || '/avatars/avatar_1.png',
          academicYear: newProfile.academicYear,
          coins: newProfile.coins,
          testsCompleted: Math.max(newProfile.completedTestsCount, stats.uniqueBlocksCount),
          correctAnswersCount: stats.totalCorrectAnswers,
          scorePoints: stats.scorePoints,
          totalQuestionsAttempted: stats.totalQuestionsAttempted,
          accuracyPercentage: stats.accuracyPercentage,
          bestTime: stats.bestTimeFormatted,
          bestTimeSeconds: stats.bestTimeSeconds,
          totalTimeSpentSeconds: stats.totalTimeSpentSeconds,
          totalTimeSpentFormatted: stats.totalTimeSpentFormatted,
          weeklyActiveHours: 12.0,
          isCurrentUser: true,
        };

        const existingOthers = (get().leaderboard || []).filter((u) => u.id !== newProfile.id);

        set({
          profile: newProfile,
          leaderboard: [currentUserEntry, ...existingOthers],
        });

        get().addTransaction({
          type: 'voucher',
          title: "Boshlang'ich talaba vaucheri",
          amount: 20000,
          unit: "so'm",
          isPositive: true,
        });

        import('../services/testSyncService')
          .then(({ syncUserProfileToCloud }) => {
            syncUserProfileToCloud(newProfile, stats).catch(() => {});
          })
          .catch(() => {});
      },

      checkDailyStreak: () => {
        const { profile } = get();
        const today = new Date().toISOString().split('T')[0];
        const lastClaimed = profile.lastClaimedDailyDate;

        if (lastClaimed === today) {
          return { streakAwarded: false, streakCount: profile.streak || 1 };
        }

        let newStreak = 1;
        if (lastClaimed) {
          const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
          if (lastClaimed === yesterday) {
            newStreak = (profile.streak || 0) + 1;
          }
        }

        const updatedProfile: UserProfile = {
          ...profile,
          coins: (profile.coins || 0) + 1,
          streak: newStreak,
          lastLoginDate: today,
          lastClaimedDailyDate: today,
        };

        updatedProfile.checksum = generateIntegritySignature({
          userId: updatedProfile.id,
          coins: updatedProfile.coins,
          completedTestsCount: updatedProfile.completedTestsCount,
          streak: updatedProfile.streak,
          lastLoginDate: updatedProfile.lastLoginDate,
          walletBalance: updatedProfile.walletBalance,
          voucherBalance: updatedProfile.voucherBalance,
        });

        triggerHaptic('success');
        soundFX.playCoin();
        set({ profile: updatedProfile });

        get().addTransaction({
          type: 'coin',
          title: 'Kunlik seriya bonusi (+1 tanga)',
          amount: 1,
          unit: 'tanga',
          isPositive: true,
        });

        return { streakAwarded: true, streakCount: newStreak };
      },

      updateProfile: (data) => {
        const current = get().profile;
        const cleanFirstName =
          data.firstName !== undefined
            ? validateAndSanitizeName(data.firstName).sanitized || current.firstName
            : current.firstName;
        const cleanLastName =
          data.lastName !== undefined
            ? validateAndSanitizeName(data.lastName).sanitized || current.lastName
            : current.lastName;

        const updated: UserProfile = {
          ...current,
          ...data,
          firstName: cleanFirstName,
          lastName: cleanLastName,
        };

        updated.checksum = generateIntegritySignature({
          userId: updated.id,
          coins: updated.coins,
          completedTestsCount: updated.completedTestsCount,
          streak: updated.streak,
          lastLoginDate: updated.lastLoginDate,
          walletBalance: updated.walletBalance,
          voucherBalance: updated.voucherBalance,
        });

        // Recalculate stats & update the current user entry in leaderboard
        const stats = calculateUserRatingStats(get().testAttempts || []);
        const fullName = `${updated.firstName || 'Talaba'} ${updated.lastName || ''}`.trim() || 'Talaba';
        const currentLeaderboard = get().leaderboard || [];

        const existingCurrentUserEntry = currentLeaderboard.find((u) => u.id === updated.id);
        const updatedCurrentUserEntry: LeaderboardUser = {
          ...(existingCurrentUserEntry || {
            coins: updated.coins,
            testsCompleted: Math.max(updated.completedTestsCount, stats.uniqueBlocksCount),
            correctAnswersCount: stats.totalCorrectAnswers,
            scorePoints: stats.scorePoints,
            totalQuestionsAttempted: stats.totalQuestionsAttempted,
            accuracyPercentage: stats.accuracyPercentage,
            bestTime: stats.bestTimeFormatted,
            bestTimeSeconds: stats.bestTimeSeconds,
            totalTimeSpentSeconds: stats.totalTimeSpentSeconds,
            totalTimeSpentFormatted: stats.totalTimeSpentFormatted,
            weeklyActiveHours: 12.0,
          }),
          id: updated.id,
          name: fullName,
          region: updated.region,
          university: updated.university || 'TATU',
          avatar: updated.avatar || '/avatars/avatar_1.png',
          academicYear: updated.academicYear,
          isCurrentUser: true,
        };

        const otherUsers = currentLeaderboard.filter((u) => u.id !== updated.id);
        const newLeaderboard = [updatedCurrentUserEntry, ...otherUsers];

        set({
          profile: updated,
          leaderboard: newLeaderboard,
        });

        // Background sync to backend cloud
        import('../services/testSyncService')
          .then(({ syncUserProfileToCloud }) => {
            syncUserProfileToCloud(updated, stats).catch(() => {});
          })
          .catch(() => {});
      },

      addCustomUniversity: (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const list = get().customUniversities;
        const pending = get().pendingUniversities;
        set({
          customUniversities: list.includes(trimmed) ? list : [...list, trimmed],
          pendingUniversities: pending.includes(trimmed) ? pending : [trimmed, ...pending],
        });
      },

      createTestPackage: (pkg: TestPackage) => {
        const current = get().testPackages;
        const currentDeleted = get().deletedPackageIds || [];
        triggerHaptic('success');
        set({
          testPackages: [pkg, ...current.filter((p) => p.id !== pkg.id)],
          deletedPackageIds: currentDeleted.filter((id) => id !== pkg.id),
        });
      },

      updateTestPackage: (pkg: TestPackage) => {
        const current = get().testPackages;
        triggerHaptic('success');
        set({
          testPackages: current.map((p) => (p.id === pkg.id ? pkg : p)),
        });
      },

      deleteTestPackage: (id: string) => {
        const current = get().testPackages;
        const currentDeleted = get().deletedPackageIds || [];
        triggerHaptic('warning');
        set({
          testPackages: current.filter((p) => p.id !== id),
          deletedPackageIds: currentDeleted.includes(id) ? currentDeleted : [...currentDeleted, id],
          testAttempts: (get().testAttempts || []).filter((a) => a.testPackageId !== id),
          mistakes: (get().mistakes || []).filter((m) => m.testPackageId !== id),
        });
      },

      // Credit Author background state update (+100 UZS)
      creditAuthor: (authorId: string, amount: number = 100) => {
        const { testPackages, profile } = get();

        // 1. Update test packages author balance
        const updatedPackages = testPackages.map((pkg) => {
          if (pkg.authorId === authorId) {
            return {
              ...pkg,
              authorWalletBalance: (pkg.authorWalletBalance || 0) + amount,
            };
          }
          return pkg;
        });

        // 2. If author is current user, update their profile wallet
        let updatedProfile = profile;
        if (profile.id === authorId) {
          updatedProfile = {
            ...profile,
            authorEarnings: (profile.authorEarnings || 0) + amount,
            walletBalance: (profile.walletBalance || 0) + amount,
          };
          updatedProfile.checksum = generateIntegritySignature({
            userId: updatedProfile.id,
            coins: updatedProfile.coins,
            completedTestsCount: updatedProfile.completedTestsCount,
            streak: updatedProfile.streak,
            lastLoginDate: updatedProfile.lastLoginDate,
            walletBalance: updatedProfile.walletBalance,
            voucherBalance: updatedProfile.voucherBalance,
          });

          get().addTransaction({
            type: 'author_reward',
            title: "Test mualliflik rag'bati",
            amount,
            unit: "so'm",
            isPositive: true,
          });
        }

        set({
          testPackages: updatedPackages,
          profile: updatedProfile,
        });
      },

      recordTestAttempt: (attempt: TestAttempt) => {
        const { testPackages, profile, testAttempts, mistakes } = get();
        let coinsEarned = 0;
        let bonusCoins = 0;
        let unlockedNext = false;

        // Anti-Cheat 1: Anti-flood submission rate limiting & deduplication
        const isDuplicateAttempt = testAttempts.some((att) => att.id === attempt.id);
        if (isDuplicateAttempt) {
          console.warn('YuksalQuiz Anti-Cheat: Duplicate test attempt ignored.');
          return { coinsEarned: 0, bonusCoins: 0, unlockedNext: false };
        }

        const now = Date.now();
        const isRapidSubmission = now - lastAttemptTimestamp < 1500;
        lastAttemptTimestamp = now;

        // Anti-Cheat 2: Re-verify questions and answers against official package data
        let currentTargetPkg = testPackages.find((p) => p.id === attempt.testPackageId);
        const blockIndex = currentTargetPkg
          ? currentTargetPkg.blocks.findIndex(
              (b) => b.id === attempt.blockId || b.title === attempt.blockTitle
            )
          : -1;

        const currentBlock =
          currentTargetPkg && blockIndex !== -1 ? currentTargetPkg.blocks[blockIndex] : undefined;

        let verifiedScore = 0;
        let verifiedAnswers = attempt.userAnswers || [];

        if (currentBlock && currentBlock.questions && currentBlock.questions.length > 0) {
          verifiedAnswers = (attempt.userAnswers || []).map((ans, idx) => {
            const q =
              currentBlock.questions.find((item) => item.id === ans.questionId) ||
              currentBlock.questions[idx];
            if (q) {
              const userSelected = ans.selectedOption !== undefined ? ans.selectedOption : (ans as any).selectedOptionIndex;
              let isCorrect = false;
              if (
                ans.options &&
                userSelected >= 0 &&
                userSelected < ans.options.length &&
                q.options &&
                q.correctOptionIndex >= 0 &&
                q.correctOptionIndex < q.options.length
              ) {
                isCorrect = ans.options[userSelected].trim() === q.options[q.correctOptionIndex].trim();
              } else if (ans.isCorrect !== undefined) {
                isCorrect = ans.isCorrect;
              } else {
                isCorrect = userSelected === q.correctOptionIndex;
              }

              if (isCorrect) verifiedScore++;
              return {
                ...ans,
                isCorrect,
                correctOptionIndex: q.correctOptionIndex,
              };
            }
            if (ans.isCorrect) verifiedScore++;
            return ans;
          });
        } else {
          verifiedScore = attempt.score;
        }

        // Anti-Cheat 3: Check realistic completion time
        const isRealisticSpeed = validateTestAttempt(attempt.totalQuestions, attempt.timeSpentSeconds);
        if (!isRealisticSpeed) {
          console.warn('YuksalQuiz Anti-Cheat: Superhuman speed detected. Score recorded without coin rewards.');
        }

        const safeAttempt: TestAttempt = {
          ...attempt,
          score: verifiedScore,
          userAnswers: verifiedAnswers,
          percentage:
            attempt.totalQuestions > 0
              ? Math.round((verifiedScore / attempt.totalQuestions) * 100)
              : 0,
        };

        // 1. Perfect score reward (+1 coin for 25/25 or 100% score) only if human speed verified
        if (
          safeAttempt.score === safeAttempt.totalQuestions &&
          safeAttempt.totalQuestions >= 20 &&
          isRealisticSpeed
        ) {
          coinsEarned += 1;
        }

        // 2. Process package block update and sequential unlock
        const updatedPackages = testPackages.map((pkg) => {
          if (pkg.id !== attempt.testPackageId) return pkg;

          if (blockIndex === -1 || !currentBlock) return pkg;

          const passingScore =
            currentBlock.passingScore ||
            Math.max(1, Math.ceil((currentBlock.questions?.length || 25) * 0.7));
          const isPassed = safeAttempt.score >= passingScore || attempt.isPassed;
          const bestScore = Math.max(currentBlock.bestScore || 0, safeAttempt.score);

          const updatedBlocks = [...pkg.blocks];
          updatedBlocks[blockIndex] = {
            ...currentBlock,
            passingScore,
            bestScore,
            isPassed: currentBlock.isPassed || isPassed,
          };

          // If passed, unlock the immediate next block!
          if (isPassed && blockIndex + 1 < updatedBlocks.length) {
            if (updatedBlocks[blockIndex + 1].isLocked) {
              unlockedNext = true;
            }
            updatedBlocks[blockIndex + 1] = {
              ...updatedBlocks[blockIndex + 1],
              isLocked: false,
            };
          }

          // 3. Check for Part 4-6 completion bonus (+5 bonus coins)
          if (
            isPassed &&
            currentBlock.blockNumber >= 4 &&
            currentBlock.blockNumber <= 6 &&
            !currentBlock.isPassed &&
            isRealisticSpeed
          ) {
            bonusCoins += 5;
          }

          // Author credit for community test: +100 UZS
          const newAuthorBal = (pkg.authorWalletBalance || 0) + (pkg.isCommunityCreated ? 100 : 0);

          return {
            ...pkg,
            blocks: updatedBlocks,
            authorWalletBalance: newAuthorBal,
          };
        });

        // 4. Trigger author credit if community test completed
        let authorCredited = false;
        let updatedProfile = profile;
        if (currentTargetPkg && currentTargetPkg.isCommunityCreated && currentTargetPkg.authorId) {
          authorCredited = true;
          if (currentTargetPkg.authorId === profile.id) {
            updatedProfile = {
              ...updatedProfile,
              authorEarnings: (updatedProfile.authorEarnings || 0) + 100,
              walletBalance: (updatedProfile.walletBalance || 0) + 100,
            };
          }
        }

        // 5. Track mistakes for "Mening Xatolarim"
        const newMistakes = [...mistakes];
        attempt.userAnswers.forEach((ans) => {
          if (!ans.isCorrect) {
            const existingIdx = newMistakes.findIndex((m) => m.question.id === ans.questionId);
            if (existingIdx >= 0) {
              newMistakes[existingIdx].failCount += 1;
              newMistakes[existingIdx].lastFailedAt = new Date().toISOString();
            } else {
              newMistakes.unshift({
                id: 'mistake-' + Math.random().toString(36).substring(2, 9),
                question: {
                  id: ans.questionId,
                  text: ans.questionText,
                  options: ans.options,
                  correctOptionIndex: ans.correctOptionIndex,
                  explanation: ans.explanation,
                },
                testPackageId: attempt.testPackageId,
                testPackageTitle: attempt.testPackageTitle,
                blockTitle: attempt.blockTitle,
                university: attempt.university,
                department: attempt.department,
                lastFailedAt: new Date().toISOString(),
                failCount: 1,
              });
            }
          }
        });

        // 6. Update profile stats and secure anti-tamper signature
        const totalCoinsEarned = coinsEarned + bonusCoins;
        const newCompletedCount = updatedProfile.completedTestsCount + 1;
        const newCoins = updatedProfile.coins + totalCoinsEarned;

        updatedProfile = {
          ...updatedProfile,
          coins: newCoins,
          completedTestsCount: newCompletedCount,
        };

        updatedProfile.checksum = generateIntegritySignature({
          userId: updatedProfile.id,
          coins: updatedProfile.coins,
          completedTestsCount: updatedProfile.completedTestsCount,
          streak: updatedProfile.streak,
          lastLoginDate: updatedProfile.lastLoginDate,
          walletBalance: updatedProfile.walletBalance,
          voucherBalance: updatedProfile.voucherBalance,
        });

        if (totalCoinsEarned > 0) {
          soundFX.playCoin();
        }

        const updatedAttempts = [safeAttempt, ...testAttempts];
        const updatedStats = calculateUserRatingStats(updatedAttempts);

        const currentUserEntry: LeaderboardUser = {
          id: updatedProfile.id,
          name: `${updatedProfile.firstName || 'Talaba'} ${updatedProfile.lastName || ''}`.trim() || 'Talaba',
          region: updatedProfile.region,
          university: updatedProfile.university || 'TATU',
          avatar: updatedProfile.avatar || '/avatars/avatar_1.png',
          academicYear: updatedProfile.academicYear,
          coins: updatedProfile.coins,
          testsCompleted: Math.max(updatedProfile.completedTestsCount, updatedStats.uniqueBlocksCount),
          correctAnswersCount: updatedStats.totalCorrectAnswers,
          scorePoints: updatedStats.scorePoints,
          totalQuestionsAttempted: updatedStats.totalQuestionsAttempted,
          accuracyPercentage: updatedStats.accuracyPercentage,
          bestTime: updatedStats.bestTimeFormatted,
          bestTimeSeconds: updatedStats.bestTimeSeconds,
          totalTimeSpentSeconds: updatedStats.totalTimeSpentSeconds,
          totalTimeSpentFormatted: updatedStats.totalTimeSpentFormatted,
          weeklyActiveHours: 12.0,
          isCurrentUser: true,
        };

        const existingOthers = (get().leaderboard || []).filter((u) => u.id !== updatedProfile.id);
        const updatedLeaderboard = [currentUserEntry, ...existingOthers];

        set({
          testPackages: updatedPackages,
          testAttempts: updatedAttempts,
          mistakes: newMistakes,
          profile: updatedProfile,
          leaderboard: updatedLeaderboard,
        });

        // Trigger background cloud rating and test_results sync for real user
        import('../services/testSyncService')
          .then(({ syncTestAttemptToCloud }) => {
            syncTestAttemptToCloud(updatedProfile, updatedStats, safeAttempt).catch(() => {});
          })
          .catch(() => {});

        return { coinsEarned, bonusCoins, unlockedNext };
      },

      solveMistake: (questionId: string) => {
        const current = get().mistakes;
        const filtered = current.filter((m) => m.question.id !== questionId);
        soundFX.playCorrect();
        triggerHaptic('success');
        set({ mistakes: filtered });
      },

      // Apply subscription for 3_months, 6_months, or 1_year
      applySubscription: (plan: SubscriptionPlanType) => {
        const { profile, subscriptionPrices } = get();
        const prices = subscriptionPrices || DEFAULT_SUBSCRIPTION_PRICES;
        const originalPrice = prices[plan] || (plan === '3_months' ? 35000 : plan === '6_months' ? 60000 : 100000);

        // 20 000 voucher discount applies to ANY subscription plan (3_months, 6_months, or 1_year)
        const voucherUsed = Math.min(profile.voucherBalance || 0, 20000, originalPrice);
        const remainingToPay = Math.max(0, originalPrice - voucherUsed);
        const currentBalance = profile.walletBalance || 0;

        // Strict Balance Verification: User CANNOT subscribe if wallet balance is insufficient!
        if (currentBalance < remainingToPay) {
          const missingAmount = remainingToPay - currentBalance;
          triggerHaptic('error');
          return {
            success: false,
            message: `Hisobingizda mablag' yetarli emas! Sizga yana ${missingAmount.toLocaleString('uz-UZ')} so'm kerak. Iltimos, hisobingizni to'ldiring.`,
          };
        }

        // Deduct payment and voucher
        const newWalletBalance = currentBalance - remainingToPay;
        const newVoucherBalance = Math.max(0, (profile.voucherBalance || 0) - voucherUsed);

        // Calculate subscription expiry (extend if already active)
        let expiryDate = new Date();
        if (profile.subscriptionExpiry && new Date(profile.subscriptionExpiry) > expiryDate) {
          expiryDate = new Date(profile.subscriptionExpiry);
        }
        if (plan === '3_months') {
          expiryDate.setMonth(expiryDate.getMonth() + 3);
        } else if (plan === '6_months') {
          expiryDate.setMonth(expiryDate.getMonth() + 6);
        } else {
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        }

        const planLabel = plan === '3_months' ? '3 oylik' : plan === '6_months' ? '6 oylik' : '1 yillik';

        const updatedProfile: UserProfile = {
          ...profile,
          walletBalance: newWalletBalance,
          voucherBalance: newVoucherBalance,
          subscriptionPlan: plan,
          subscriptionExpiry: expiryDate.toISOString().split('T')[0],
          has_paid: true,
          paid_until: expiryDate.toISOString(),
        };

        updatedProfile.checksum = generateIntegritySignature({
          userId: updatedProfile.id,
          coins: updatedProfile.coins,
          completedTestsCount: updatedProfile.completedTestsCount,
          streak: updatedProfile.streak,
          lastLoginDate: updatedProfile.lastLoginDate,
          walletBalance: updatedProfile.walletBalance,
          voucherBalance: updatedProfile.voucherBalance,
        });

        triggerHaptic('success');
        soundFX.playCoin();

        set({ profile: updatedProfile });

        get().addTransaction({
          type: 'deposit',
          title: `${planLabel} Premium obuna to'lovi`,
          amount: remainingToPay,
          unit: "so'm",
          isPositive: false,
        });

        if (voucherUsed > 0) {
          get().addTransaction({
            type: 'voucher',
            title: "20 000 so'm vaucher chegirmasi qo'llandi",
            amount: voucherUsed,
            unit: "so'm",
            isPositive: false,
          });
        }

        return {
          success: true,
          message: voucherUsed > 0
            ? `20 000 so'm vaucher chegirmasi qo'llandi va hisobingizdan ${remainingToPay.toLocaleString('uz-UZ')} so'm yechildi. ${planLabel} Premium obuna muvaffaqiyatli faollashtirildi!`
            : `Hisobingizdan ${remainingToPay.toLocaleString('uz-UZ')} so'm yechildi. ${planLabel} Premium obuna muvaffaqiyatli faollashtirildi!`,
        };
      },

      // Deposit wallet balance upon AI verified or admin approved payment
      depositBalance: (amount: number, transactionId: string) => {
        const { profile } = get();
        const newBalance = (profile.walletBalance || 0) + amount;
        const updatedProfile: UserProfile = {
          ...profile,
          walletBalance: newBalance,
        };

        updatedProfile.checksum = generateIntegritySignature({
          userId: updatedProfile.id,
          coins: updatedProfile.coins,
          completedTestsCount: updatedProfile.completedTestsCount,
          streak: updatedProfile.streak,
          lastLoginDate: updatedProfile.lastLoginDate,
          walletBalance: updatedProfile.walletBalance,
          voucherBalance: updatedProfile.voucherBalance,
        });

        set({ profile: updatedProfile });

        get().addTransaction({
          type: 'deposit',
          title: `Hisob to'ldirildi (P2P chek) - #${transactionId.slice(-8)}`,
          amount,
          unit: "so'm",
          isPositive: true,
        });

        triggerHaptic('success');
        soundFX.playCoin();
        return { newBalance };
      },

      // Directly claim 20 000 UZS starting voucher into wallet balance
      claimVoucherDirectly: async () => {
        const { profile } = get();
        if (profile.voucher_claimed || profile.voucherClaimed) return false;

        const bonus = 20000;
        const newBalance = (profile.walletBalance || 0) + bonus;
        const updatedProfile: UserProfile = {
          ...profile,
          walletBalance: newBalance,
          voucherBalance: 0,
          voucher_claimed: true,
          voucherClaimed: true,
        };

        updatedProfile.checksum = generateIntegritySignature({
          userId: updatedProfile.id,
          coins: updatedProfile.coins,
          completedTestsCount: updatedProfile.completedTestsCount,
          streak: updatedProfile.streak,
          lastLoginDate: updatedProfile.lastLoginDate,
          walletBalance: updatedProfile.walletBalance,
          voucherBalance: updatedProfile.voucherBalance,
        });

        set({ profile: updatedProfile });

        get().addTransaction({
          type: 'voucher',
          title: "20 000 so'm boshlang'ich vaucher faollashtirildi",
          amount: bonus,
          unit: "so'm",
          isPositive: true,
        });

        triggerHaptic('success');
        soundFX.playCoin();

        const supabase = getSupabase();
        if (supabase && profile.id) {
          try {
            await supabase.from('users').upsert(
              {
                id: profile.id,
                balance: newBalance,
                wallet_balance: newBalance,
                voucher_claimed: true,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'id' }
            );
          } catch (err) {
            console.warn('claimVoucherDirectly supabase sync error:', err);
          }
        }

        return true;
      },

      // Apply direct P2P Payment approval verified by Gemini AI or Telegram Admin
      applyReceiptPaymentApproval: (data: {
        plan: SubscriptionPlanType;
        amount: number;
        transactionId: string;
        paidUntil?: string;
      }) => {
        const { profile } = get();
        let expiryDate = new Date();
        if (data.paidUntil) {
          expiryDate = new Date(data.paidUntil);
        } else {
          if (profile.subscriptionExpiry && new Date(profile.subscriptionExpiry) > expiryDate) {
            expiryDate = new Date(profile.subscriptionExpiry);
          }
          const months = data.plan === '1_year' ? 12 : data.plan === '6_months' ? 6 : 3;
          expiryDate.setMonth(expiryDate.getMonth() + months);
        }

        const planLabel =
          data.plan === '3_months'
            ? '3 oylik'
            : data.plan === '6_months'
            ? '6 oylik'
            : '1 yillik';

        const updatedProfile: UserProfile = {
          ...profile,
          has_paid: true,
          paid_until: expiryDate.toISOString(),
          subscriptionPlan: data.plan,
          subscriptionExpiry: expiryDate.toISOString().split('T')[0],
        };

        updatedProfile.checksum = generateIntegritySignature({
          userId: updatedProfile.id,
          coins: updatedProfile.coins,
          completedTestsCount: updatedProfile.completedTestsCount,
          streak: updatedProfile.streak,
          lastLoginDate: updatedProfile.lastLoginDate,
          walletBalance: updatedProfile.walletBalance,
          voucherBalance: updatedProfile.voucherBalance,
        });

        set({ profile: updatedProfile });

        get().addTransaction({
          type: 'deposit',
          title: `P2P To'lov (${planLabel}) - Tranzaksiya #${data.transactionId.slice(-8)}`,
          amount: data.amount,
          unit: "so'm",
          isPositive: true,
        });

        triggerHaptic('success');
        soundFX.playSuccess();
      },


      // Referral invitation bonus (+1 000 UZS)
      addReferralBonus: () => {
        const { profile } = get();
        const bonus = 1000;
        const updated: UserProfile = {
          ...profile,
          walletBalance: (profile.walletBalance || 0) + bonus,
          referralCount: (profile.referralCount || 0) + 1,
        };

        updated.checksum = generateIntegritySignature({
          userId: updated.id,
          coins: updated.coins,
          completedTestsCount: updated.completedTestsCount,
          streak: updated.streak,
          lastLoginDate: updated.lastLoginDate,
          walletBalance: updated.walletBalance,
          voucherBalance: updated.voucherBalance,
        });

        triggerHaptic('success');
        soundFX.playCoin();
        set({ profile: updated });

        get().addTransaction({
          type: 'referral',
          title: "Do'stni taklif qilish bonusi",
          amount: bonus,
          unit: "so'm",
          isPositive: true,
        });

        return { bonusAdded: bonus, newTotal: updated.walletBalance };
      },

      resetTamperWarning: () => {
        set({ tamperDetected: false });
      },
    }),
    {
      name: 'yuksalquiz_storage_v1',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        if (!state.deletedPackageIds) {
          state.deletedPackageIds = [];
        }

        // Clear out any old pre-seeded mock tests and locally deleted tests
        const deletedSet = new Set(state.deletedPackageIds || []);
        state.testPackages = (state.testPackages || []).filter(
          (pkg) => !pkg.id.startsWith('mock-') && !pkg.id.startsWith('demo-') && !deletedSet.has(pkg.id)
        );

        if (!state.deletedUniversities) {
          state.deletedUniversities = [];
        }
        const deletedUnisSet = new Set(
          (state.deletedUniversities || []).map((u) => normalizeUniversityKey(u))
        );

        // Deduplicate universities case-insensitively and filter out deleted ones
        const uniMap = new Map<string, string>();
        for (const u of state.universities || []) {
          const key = normalizeUniversityKey(u);
          if (!key || deletedUnisSet.has(key)) continue;
          if (!uniMap.has(key)) {
            uniMap.set(key, u.trim());
          } else {
            const existing = uniMap.get(key)!;
            const existingUpper = (existing.match(/[A-Z]/g) || []).length;
            const newUpper = (u.match(/[A-Z]/g) || []).length;
            if (newUpper > existingUpper) {
              uniMap.set(key, u.trim());
            }
          }
        }

        // Add TOP_UNIVERSITIES if not deleted and not already present case-insensitively
        for (const topU of TOP_UNIVERSITIES) {
          const key = normalizeUniversityKey(topU);
          if (!deletedUnisSet.has(key) && !uniMap.has(key)) {
            uniMap.set(key, topU.trim());
          }
        }

        state.universities = Array.from(uniMap.values()).sort((a, b) =>
          a.localeCompare(b, 'uz', { sensitivity: 'base' })
        );
        state.customUniversities = (state.customUniversities || []).filter(
          (u) => !deletedUnisSet.has(normalizeUniversityKey(u))
        );
        state.pendingUniversities = (state.pendingUniversities || []).filter(
          (u) => !deletedUnisSet.has(normalizeUniversityKey(u))
        );
        if (!state.transactions) {
          state.transactions = [];
        }
        if (!state.announcements || state.announcements.length === 0) {
          state.announcements = [
            {
              id: 'ann-1',
              title: 'YuksalQuiz v1.0 ga xush kelibsiz!',
              message: 'HEMIS va fan testlariga tayyorlaning, do\'stlaringizni taklif qilib har biridan 1 500 so\'m bonus oling hamda 20 000 so\'mlik vaucherdan foydalaning!',
              date: '2026-09-27',
              tag: 'yangilik',
              isRead: false,
            },
          ];
        } else {
          // Sanitize any stale announcement title containing v2.0
          state.announcements = state.announcements.map((a: any) => ({
            ...a,
            title: a.title ? a.title.replace('v2.0', 'v1.0') : a.title,
            message: a.message ? a.message.replace('35 000', '20 000') : a.message,
          }));
        }

        // Initialize transaction history if empty for registered users
        if (state.profile && state.profile.isRegistered && state.transactions.length === 0) {
          state.transactions = [
            {
              id: 'tx-init-voucher',
              type: 'voucher',
              title: "Boshlang'ich talaba vaucheri",
              amount: 20000,
              unit: "so'm",
              isPositive: true,
              date: state.profile.lastLoginDate || new Date().toISOString().split('T')[0],
            },
          ];
          if (state.profile.coins > 0) {
            state.transactions.push({
              id: 'tx-init-coins',
              type: 'coin',
              title: 'Kunlik seriya bonusi',
              amount: state.profile.coins,
              unit: 'tanga',
              isPositive: true,
              date: state.profile.lastLoginDate || new Date().toISOString().split('T')[0],
            });
          }
          if ((state.profile.referralCount || 0) > 0) {
            state.transactions.push({
              id: 'tx-init-ref',
              type: 'referral',
              title: "Do'stlarni taklif qilish bonusi",
              amount: state.profile.referralCount * 1000,
              unit: "so'm",
              isPositive: true,
              date: state.profile.lastLoginDate || new Date().toISOString().split('T')[0],
            });
          }
        }

        // Clean unearned simulated referral bonuses, fake deposit simulator entries, and unauthorized subscriptions
        if (state.profile) {
          if (state.transactions) {
            state.transactions = state.transactions.filter(
              (tx: any) =>
                !(tx.type === 'referral' && (tx.title?.includes("Do'st") || tx.amount === 1000)) &&
                !(tx.type === 'deposit' && tx.title?.includes("Hisob to'ldirildi"))
            );
          }
          const hasActivePromocodeActivation = (state.transactions || []).some(
            (tx: any) => tx.type === 'deposit' && tx.title?.includes('Promokod')
          );
          if (!hasActivePromocodeActivation && (state.profile.authorEarnings || 0) === 0) {
            state.profile.walletBalance = 0;
            state.profile.referralCount = 0;
            state.profile.subscriptionPlan = 'none';
            state.profile.subscriptionExpiry = undefined;
          }

          // Migrate voucher balance to 20 000
          if (state.profile.voucherBalance === 35000 || state.profile.voucherBalance === undefined) {
            state.profile.voucherBalance = 20000;
          } else {
            state.profile.voucherBalance = Math.min(Math.max(state.profile.voucherBalance ?? 0, 0), 20000);
          }

          // Ensure unique, persistent user ID (never guest_12345)
          if (!state.profile.id || state.profile.id === 'guest_12345') {
            state.profile.id = getInitialUserId();
          }
        }

        if (state) {
          // Strictly clear any preloaded mock leaderboard and default to nationwide scope
          state.leaderboard = [];
          state.leaderboardScope = 'uzbekistan';
          if (!state.testPackages) {
            state.testPackages = [];
          } else if (Array.isArray(state.testPackages)) {
            // Clean up any previously stored HTML entities (&#x27;, &quot;, etc.)
            state.testPackages = state.testPackages.map((pkg) => ({
              ...pkg,
              title: decodeHtmlEntities(pkg.title || ''),
              department: (decodeHtmlEntities(pkg.department || '') as any) || 'Axborot Texnologiyalari',
              university: decodeHtmlEntities(pkg.university || ''),
              authorName: decodeHtmlEntities(pkg.authorName || ''),
              blocks: (pkg.blocks || []).map((b) => ({
                ...b,
                title: decodeHtmlEntities(b.title || ''),
                questions: (b.questions || []).map((q) => ({
                  ...q,
                  text: decodeHtmlEntities(q.text || ''),
                  options: (q.options || []).map((opt) => decodeHtmlEntities(opt || '')),
                  explanation: q.explanation ? decodeHtmlEntities(q.explanation) : undefined,
                })),
              })),
            }));

            // Reconcile blocks with student's test attempts to restore unlocked blocks and best scores
            state.testPackages = state.testPackages.map((pkg) =>
              reconcilePackageWithProgress(pkg, pkg, state.testAttempts || [])
            );
          }

          if (state.mistakes && Array.isArray(state.mistakes)) {
            state.mistakes = state.mistakes.map((m) => ({
              ...m,
              testPackageTitle: decodeHtmlEntities(m.testPackageTitle || ''),
              blockTitle: decodeHtmlEntities(m.blockTitle || ''),
              question: {
                ...m.question,
                text: decodeHtmlEntities(m.question.text || ''),
                options: (m.question.options || []).map((opt) => decodeHtmlEntities(opt || '')),
                explanation: m.question.explanation ? decodeHtmlEntities(m.question.explanation) : undefined,
              },
            }));
          }

          if (state.testAttempts && Array.isArray(state.testAttempts)) {
            state.testAttempts = state.testAttempts.map((att) => ({
              ...att,
              testPackageTitle: decodeHtmlEntities(att.testPackageTitle || ''),
              blockTitle: decodeHtmlEntities(att.blockTitle || ''),
              userAnswers: (att.userAnswers || []).map((ans) => ({
                ...ans,
                questionText: decodeHtmlEntities(ans.questionText || ''),
                options: (ans.options || []).map((opt) => decodeHtmlEntities(opt || '')),
                explanation: ans.explanation ? decodeHtmlEntities(ans.explanation) : undefined,
              })),
            }));
          }

          if (!state.readAnnouncementIds) {
            state.readAnnouncementIds = [];
          }
          if (!state.announcementReplies) {
            state.announcementReplies = [];
          }
          if (!state.subscriptionPrices) {
            state.subscriptionPrices = DEFAULT_SUBSCRIPTION_PRICES;
          }
          // Ensure payment methods have the Adminka Alijonova X... card
          const hasCurrentCard = (state.paymentMethods || []).some((pm: any) => pm.details?.includes('9860 0803 8232 0093'));
          if (!state.paymentMethods || state.paymentMethods.length === 0 || !hasCurrentCard) {
            state.paymentMethods = DEFAULT_PAYMENT_METHODS;
          }
          if (!state.promocodes) {
            state.promocodes = DEFAULT_PROMOCODES;
          }
          if (typeof state.soundEnabled === 'boolean') {
            soundFX.soundEnabled = state.soundEnabled;
          }
          if (typeof state.vibrationEnabled === 'boolean') {
            setVibrationEnabled(state.vibrationEnabled);
          } else {
            state.vibrationEnabled = true;
            setVibrationEnabled(true);
          }
        }

        const p = state.profile;
        if (p && p.isRegistered) {
          const isValid = verifyIntegritySignature(
            {
              userId: p.id,
              coins: p.coins,
              completedTestsCount: p.completedTestsCount,
              streak: p.streak,
              lastLoginDate: p.lastLoginDate,
              walletBalance: p.walletBalance,
              voucherBalance: p.voucherBalance,
            },
            p.checksum
          );

          if (!isValid) {
            console.warn('YuksalQuiz Security Alert: State tampering detected! Re-sanitizing profile.');
            state.tamperDetected = true;
            state.profile.coins = Math.min(Math.max(p.coins, 0), 10);
            state.profile.walletBalance = Math.min(Math.max(p.walletBalance || 0, 0), 50000);
            state.profile.voucherBalance = Math.min(Math.max(p.voucherBalance ?? 0, 0), 20000);
            state.profile.checksum = generateIntegritySignature({
              userId: p.id,
              coins: state.profile.coins,
              completedTestsCount: p.completedTestsCount,
              streak: p.streak,
              lastLoginDate: p.lastLoginDate,
              walletBalance: state.profile.walletBalance,
              voucherBalance: state.profile.voucherBalance,
            });
          }
        }
      },
    }
  )
);
