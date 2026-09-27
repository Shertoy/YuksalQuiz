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
} from '../types';
import { INITIAL_TEST_PACKAGES } from '../data/mockTests';
import { INITIAL_LEADERBOARD_USERS } from '../data/mockLeaderboard';
import { generateIntegritySignature, verifyIntegritySignature } from '../utils/security';
import { soundFX, triggerHaptic } from '../utils/telegram';

import { Language } from '../i18n/translations';

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
  transactions: WalletTransaction[];
  announcements: Announcement[];
  readAnnouncementIds: string[];
  announcementReplies: AnnouncementReply[];
  soundEnabled: boolean;
  tamperDetected: boolean;

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
  checkDailyStreak: () => { streakAwarded: boolean; streakCount: number };
  addCustomUniversity: (name: string) => void;
  createTestPackage: (pkg: TestPackage) => void;
  recordTestAttempt: (attempt: TestAttempt) => { coinsEarned: number; bonusCoins: number; unlockedNext: boolean };
  solveMistake: (questionId: string) => void;
  creditAuthor: (authorId: string, amount?: number) => void;
  applySubscription: (plan: '6_months' | '1_year') => { success: boolean; message: string };
  topUpWallet: (amount: number, method?: string) => void;
  addReferralBonus: () => { bonusAdded: number; newTotal: number };
  resetTamperWarning: () => void;
  clearAllTests: () => void;
  restoreBackupData: (data: any) => void;
}

const DEFAULT_PROFILE: UserProfile = {
  id: 'user-' + Math.random().toString(36).substring(2, 9),
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
  voucherBalance: 35000, // 35 000 UZS starting voucher only!
  authorEarnings: 0,
  referralCount: 0,
  subscriptionPlan: 'none',
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

export const useQuizStore = create<QuizState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      language: 'uz',
      profile: DEFAULT_PROFILE,
      activeTab: 'home',
      testPackages: INITIAL_TEST_PACKAGES,
      testAttempts: [],
      mistakes: [],
      leaderboard: INITIAL_LEADERBOARD_USERS,
      leaderboardScope: 'uzbekistan',
      customUniversities: [],
      universities: TOP_UNIVERSITIES,
      pendingUniversities: [],
      transactions: [],
      announcements: [
        {
          id: 'ann-1',
          title: 'YuksalQuiz v1.0 ga xush kelibsiz! 🚀',
          message: 'HEMIS va fan testlariga tayyorlaning, do\'stlaringizni taklif qilib har biridan 1 500 so\'m bonus oling hamda 35 000 so\'mlik vaucherdan foydalaning!',
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
      soundEnabled: true,
      tamperDetected: false,

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
        set({ testPackages: [] });
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

      addUniversity: (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const list = get().universities;
        if (!list.includes(trimmed)) {
          set({ universities: [trimmed, ...list] });
        }
      },

      updateUniversity: (oldName: string, newName: string) => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        set({
          universities: get().universities.map((u) => (u === oldName ? trimmed : u)),
        });
      },

      deleteUniversity: (name: string) => {
        set({
          universities: get().universities.filter((u) => u !== name),
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
      },

      registerUser: (data) => {
        const current = get().profile;
        const today = new Date().toISOString().split('T')[0];
        const newProfile: UserProfile = {
          ...current,
          ...data,
          isRegistered: true,
          acceptedOferta: true,
          coins: current.coins || 0,
          streak: current.streak || 1,
          lastLoginDate: today,
          voucherBalance: 35000, // 35 000 UZS starting voucher guaranteed
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

        set({ profile: newProfile });

        get().addTransaction({
          type: 'voucher',
          title: "Boshlang'ich talaba vaucheri",
          amount: 35000,
          unit: "so'm",
          isPositive: true,
        });
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
        const updated: UserProfile = {
          ...current,
          ...data,
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

        set({ profile: updated });
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
        triggerHaptic('success');
        set({ testPackages: [pkg, ...current] });
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

        // 1. Check for Perfect Score reward (+1 coin for 25/25 or 100% score)
        if (attempt.score === attempt.totalQuestions && attempt.totalQuestions >= 20) {
          coinsEarned += 1;
        }

        // 2. Process package block update and sequential unlock
        let currentTargetPkg: TestPackage | undefined;
        const updatedPackages = testPackages.map((pkg) => {
          if (pkg.id !== attempt.testPackageId) return pkg;
          currentTargetPkg = pkg;

          const blockIndex = pkg.blocks.findIndex((b) => b.id === attempt.blockId);
          if (blockIndex === -1) return pkg;

          const currentBlock = pkg.blocks[blockIndex];
          const isPassed = attempt.score >= currentBlock.passingScore;
          const bestScore = Math.max(currentBlock.bestScore || 0, attempt.score);

          const updatedBlocks = [...pkg.blocks];
          updatedBlocks[blockIndex] = {
            ...currentBlock,
            bestScore,
            isPassed: currentBlock.isPassed || isPassed,
          };

          // If passed, unlock the immediate next block!
          if (isPassed && blockIndex + 1 < updatedBlocks.length) {
            if (updatedBlocks[blockIndex + 1].isLocked) {
              updatedBlocks[blockIndex + 1] = {
                ...updatedBlocks[blockIndex + 1],
                isLocked: false,
              };
              unlockedNext = true;
            }
          }

          // 3. Check for Part 4-6 completion bonus (+5 bonus coins)
          if (isPassed && currentBlock.blockNumber >= 4 && currentBlock.blockNumber <= 6 && !currentBlock.isPassed) {
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

        set({
          testPackages: updatedPackages,
          testAttempts: [attempt, ...testAttempts],
          mistakes: newMistakes,
          profile: updatedProfile,
        });

        return { coinsEarned, bonusCoins, unlockedNext };
      },

      solveMistake: (questionId: string) => {
        const current = get().mistakes;
        const filtered = current.filter((m) => m.question.id !== questionId);
        soundFX.playCorrect();
        triggerHaptic('success');
        set({ mistakes: filtered });
      },

      // Auto-apply 35 000 UZS voucher toward 6-month subscription; 1-year is 90 000 UZS without voucher
      applySubscription: (plan: '6_months' | '1_year') => {
        const { profile } = get();
        const voucherUsed = plan === '6_months' ? Math.min(profile.voucherBalance || 0, 35000) : 0;
        const originalPrice = plan === '6_months' ? 50000 : 90000;
        const remainingToPay = originalPrice - voucherUsed;
        const currentBalance = profile.walletBalance || 0;

        // Strict Balance Verification: User CANNOT subscribe if wallet balance is insufficient!
        if (currentBalance < remainingToPay) {
          const missingAmount = remainingToPay - currentBalance;
          triggerHaptic('error');
          return {
            success: false,
            message: `Hisobingizda mablag' yetarli emas! Sizga yana ${missingAmount.toLocaleString('uz-UZ')} so'm kerak. Balansni to'ldiring yoki do'stlaringizni taklif qiling (+1 500 so'm).`,
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
        if (plan === '6_months') {
          expiryDate.setMonth(expiryDate.getMonth() + 6);
        } else {
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        }

        const updatedProfile: UserProfile = {
          ...profile,
          walletBalance: newWalletBalance,
          voucherBalance: newVoucherBalance,
          subscriptionPlan: plan,
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

        triggerHaptic('success');
        soundFX.playCoin();

        set({ profile: updatedProfile });

        get().addTransaction({
          type: 'deposit',
          title: `${plan === '6_months' ? '6 oylik' : '1 yillik'} Premium obuna to'lovi`,
          amount: remainingToPay,
          unit: "so'm",
          isPositive: false,
        });

        if (voucherUsed > 0) {
          get().addTransaction({
            type: 'voucher',
            title: "35 000 so'm vaucher chegirmasi qo'llandi",
            amount: voucherUsed,
            unit: "so'm",
            isPositive: false,
          });
        }

        return {
          success: true,
          message: voucherUsed > 0
            ? `35 000 so'm vaucher chegirmasi qo'llandi va hisobingizdan ${remainingToPay.toLocaleString('uz-UZ')} so'm yechildi. 6 oylik Premium obuna muvaffaqiyatli faollashtirildi!`
            : `Hisobingizdan ${remainingToPay.toLocaleString('uz-UZ')} so'm yechildi. 1 yillik Premium obuna muvaffaqiyatli faollashtirildi!`,
        };
      },

      // Interactive top-up method (Payme, Click, Uzum, etc.)
      topUpWallet: (amount: number, method: string = 'Payme') => {
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

        triggerHaptic('success');
        soundFX.playCoin();

        set({ profile: updatedProfile });

        get().addTransaction({
          type: 'deposit',
          title: `Hisob to'ldirildi (${method})`,
          amount,
          unit: "so'm",
          isPositive: true,
        });
      },

      // Referral invitation bonus (+1 500 UZS)
      addReferralBonus: () => {
        const { profile } = get();
        const bonus = 1500;
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

        // Clear out any old pre-seeded mock tests so tests are strictly created by users
        state.testPackages = (state.testPackages || []).filter(
          (pkg) => !pkg.id.startsWith('mock-') && !pkg.id.startsWith('demo-') && pkg.isCommunityCreated
        );

        if (!state.universities || state.universities.length === 0) {
          state.universities = TOP_UNIVERSITIES;
        }
        if (!state.pendingUniversities) {
          state.pendingUniversities = [];
        }
        if (!state.transactions) {
          state.transactions = [];
        }
        if (!state.announcements || state.announcements.length === 0) {
          state.announcements = [
            {
              id: 'ann-1',
              title: 'YuksalQuiz v2.0 ga xush kelibsiz! 🚀',
              message: 'HEMIS va fan testlariga tayyorlaning, do\'stlaringizni taklif qilib har biridan 1 500 so\'m bonus oling hamda 35 000 so\'mlik vaucherdan foydalaning!',
              date: '2026-09-27',
              tag: 'yangilik',
              isRead: false,
            },
          ];
        }

        // Initialize transaction history if empty for registered users
        if (state.profile && state.profile.isRegistered && state.transactions.length === 0) {
          state.transactions = [
            {
              id: 'tx-init-voucher',
              type: 'voucher',
              title: "Boshlang'ich talaba vaucheri",
              amount: 35000,
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
              amount: state.profile.referralCount * 1500,
              unit: "so'm",
              isPositive: true,
              date: state.profile.lastLoginDate || new Date().toISOString().split('T')[0],
            });
          }
        }

        if (state) {
          // Ensure no preloaded mock tests exist in user storage
          state.testPackages = [];
          if (!state.readAnnouncementIds) {
            state.readAnnouncementIds = [];
          }
          if (!state.announcementReplies) {
            state.announcementReplies = [];
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
            state.profile.voucherBalance = Math.min(Math.max(p.voucherBalance ?? 0, 0), 35000);
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
