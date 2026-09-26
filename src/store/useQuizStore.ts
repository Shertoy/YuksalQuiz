import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  UserProfile,
  TabType,
  TestPackage,
  TestAttempt,
  MistakeItem,
  LeaderboardUser,
} from '../types';
import { INITIAL_TEST_PACKAGES } from '../data/mockTests';
import { INITIAL_LEADERBOARD_USERS } from '../data/mockLeaderboard';
import { generateIntegritySignature, verifyIntegritySignature } from '../utils/security';
import { soundFX, triggerHaptic } from '../utils/telegram';

interface QuizState {
  theme: 'dark' | 'light';
  profile: UserProfile;
  activeTab: TabType;
  testPackages: TestPackage[];
  testAttempts: TestAttempt[];
  mistakes: MistakeItem[];
  leaderboard: LeaderboardUser[];
  customUniversities: string[];
  soundEnabled: boolean;
  tamperDetected: boolean;

  // Actions
  setTheme: (theme: 'dark' | 'light') => void;
  setActiveTab: (tab: TabType) => void;
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
  addReferralBonus: () => { bonusAdded: number; newTotal: number };
  resetTamperWarning: () => void;
}

const DEFAULT_PROFILE: UserProfile = {
  id: 'user-' + Math.random().toString(36).substring(2, 9),
  firstName: '',
  lastName: '',
  region: 'Toshkent shahri',
  birthDate: '2004-01-01',
  gender: 'male',
  studyType: 'Kunduzgi',
  academicYear: 1,
  avatar: '/avatars/avatar_1.png',
  coins: 5, // 5 welcome bonus coins for new students!
  streak: 1,
  lastLoginDate: new Date().toISOString().split('T')[0],
  completedTestsCount: 0,
  isRegistered: false,
  acceptedOferta: false,
  walletBalance: 0,
  voucherBalance: 35000, // 35 000 UZS starting voucher for every student!
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
      profile: DEFAULT_PROFILE,
      activeTab: 'home',
      testPackages: INITIAL_TEST_PACKAGES,
      testAttempts: [],
      mistakes: [],
      leaderboard: INITIAL_LEADERBOARD_USERS,
      customUniversities: [],
      soundEnabled: true,
      tamperDetected: false,

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

      setActiveTab: (activeTab) => {
        triggerHaptic('selection');
        set({ activeTab });
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
          coins: current.coins || 5,
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

      checkDailyStreak: () => {
        const profile = get().profile;
        if (!profile.isRegistered) return { streakAwarded: false, streakCount: profile.streak };

        const today = new Date().toISOString().split('T')[0];
        const lastLogin = profile.lastLoginDate;

        if (today === lastLogin) {
          return { streakAwarded: false, streakCount: profile.streak };
        }

        const lastDate = new Date(lastLogin);
        const currentDate = new Date(today);
        const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let newStreak = profile.streak;
        if (diffDays === 1) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }

        // Daily login bonus: +1 coin!
        const newCoins = profile.coins + 1;
        const updatedProfile: UserProfile = {
          ...profile,
          streak: newStreak,
          coins: newCoins,
          lastLoginDate: today,
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

        soundFX.playCoin();
        triggerHaptic('success');

        set({ profile: updatedProfile });
        return { streakAwarded: true, streakCount: newStreak };
      },

      addCustomUniversity: (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const list = get().customUniversities;
        if (!list.includes(trimmed)) {
          set({ customUniversities: [...list, trimmed] });
        }
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

      // Auto-apply 35 000 UZS voucher toward subscription
      applySubscription: (plan: '6_months' | '1_year') => {
        const { profile } = get();
        const voucherUsed = Math.min(profile.voucherBalance, 35000);
        const originalPrice = plan === '6_months' ? 50000 : 90000;
        const remainingToPay = originalPrice - voucherUsed;

        // Calculate subscription expiry
        const expiryDate = new Date();
        if (plan === '6_months') {
          expiryDate.setMonth(expiryDate.getMonth() + 6);
        } else {
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        }

        const updatedProfile: UserProfile = {
          ...profile,
          voucherBalance: Math.max(0, profile.voucherBalance - voucherUsed),
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
        return {
          success: true,
          message: `35 000 so'm vaucher chegirmasi qo'llandi! ${plan === '6_months' ? '6 oylik' : '1 yillik'} obuna muvaffaqiyatli faollashtirildi (to'lov: ${remainingToPay.toLocaleString('uz-UZ')} so'm).`,
        };
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
            state.profile.voucherBalance = 35000;
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
