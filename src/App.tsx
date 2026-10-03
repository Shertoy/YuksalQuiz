import React, { useState, useEffect } from 'react';
import { useQuizStore } from './store/useQuizStore';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { OnboardingModal } from './components/OnboardingModal';
import { HomeDashboard } from './components/HomeDashboard';
import { TestList } from './components/TestList';
import { TestRunner } from './components/TestRunner';
import { PostTestReview } from './components/PostTestReview';
import { ResultsAndMistakes } from './components/ResultsAndMistakes';
import { Leaderboard } from './components/Leaderboard';
import { CreateTestModal } from './components/CreateTestModal';
import { ProfileView } from './components/ProfileView';
import { WalletView } from './components/WalletView';
import { AdminPanelModal } from './components/AdminPanelModal';
import { NotificationsModal } from './components/NotificationsModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { OfflineStatusBanner } from './components/OfflineStatusBanner';
import { TestPackage, TestAttempt } from './types';
import { initTelegramApp, getTelegramWebApp, syncTelegramTheme, triggerHaptic } from './utils/telegram';
import {
  fetchCloudTests,
  fetchCloudUniversities,
  fetchCloudLeaderboard,
  fetchCloudAnnouncements,
  setupRealtimeTestSubscription,
} from './services/testSyncService';
import { LeaderboardUser } from './types';
import { ParticleBackground } from './components/ParticleBackground';
import { AppLoader } from './components/AppLoader';
import { EditProfileModal } from './components/EditProfileModal';
import { ReceiptVerifyModal } from './components/ReceiptVerifyModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { PaywallModal } from './components/PaywallModal';
import {
  canUserStartTest,
  recordTestStartAttempt,
  isPaidUser,
} from './services/paywallService';

export const App: React.FC = () => {
  const { theme, setTheme, activeTab, setActiveTab, checkDailyStreak, profile, testAttempts } = useQuizStore();

  // App loading state with smooth quote-rotation loader
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isLoaderFading, setIsLoaderFading] = useState(false);

  // Active running test session state
  const [activeTestPkg, setActiveTestPkg] = useState<TestPackage | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string>('');

  // Post-test review state
  const [reviewState, setReviewState] = useState<{
    attempt: TestAttempt;
    pkg: TestPackage;
    unlockedNext: boolean;
    nextBlockTitle?: string;
  } | null>(null);

  // Create / Edit test modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTestPkg, setEditingTestPkg] = useState<TestPackage | null>(null);

  // Edit Profile modal (rendered at root level)
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Notifications modal
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Admin login and panel modal
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // P2P Receipt AI Verification Modal
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [depositSuggestedAmount, setDepositSuggestedAmount] = useState<number | undefined>(undefined);

  // Subscription / Tariff Modal State
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [pendingTestStart, setPendingTestStart] = useState<{
    pkg: TestPackage;
    blockId: string;
  } | null>(null);

  // Paywall Limit Exceeded Modal State
  const [isPaywallModalOpen, setIsPaywallModalOpen] = useState(false);
  const [paywallTargetTest, setPaywallTargetTest] = useState<{
    pkg: TestPackage;
    blockId: string;
    title: string;
    blockTitle?: string;
  } | null>(null);

  // Initialize Telegram WebApp and Theme Synchronization
  useEffect(() => {
    initTelegramApp();

    const tg = getTelegramWebApp();
    if (tg?.colorScheme) {
      setTheme(tg.colorScheme);
    }

    // Listen for Telegram live theme switch (Light / Dark)
    if (tg && typeof (tg as any).onEvent === 'function') {
      const handleThemeChange = () => {
        if (tg.colorScheme) {
          setTheme(tg.colorScheme);
        }
      };
      (tg as any).onEvent('themeChanged', handleThemeChange);
    }

    if (profile.isRegistered) {
      checkDailyStreak();
    }

    // Direct browser admin access check: ?admin=true or #admin or /admin
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const isAdminQuery = urlParams.get('admin') === 'true' || urlParams.has('admin');
      const isAdminHash = window.location.hash.toLowerCase() === '#admin';
      const isAdminPath = window.location.pathname.toLowerCase().endsWith('/admin');
      if (isAdminQuery || isAdminHash || isAdminPath) {
        setIsAdminLoginOpen(true);
      }
    }

    // Automatically sync public tests, universities, leaderboard and announcements from Supabase cloud
    fetchCloudTests();
    fetchCloudUniversities();
    fetchCloudAnnouncements();
    fetchCloudLeaderboard()
      .then((remoteUsers) => {
        if (remoteUsers) {
          useQuizStore.setState((state) => {
            const cleanProfId = (state.profile.id || '').replace(/^lead_/, '');
            const remoteOthers = remoteUsers.filter((u) => (u.id || '').replace(/^lead_/, '') !== cleanProfId);
            const remoteMap = new Map<string, LeaderboardUser>();
            for (const u of remoteOthers) {
              const cleanId = (u.id || '').replace(/^lead_/, '');
              remoteMap.set(cleanId, { ...u, id: cleanId });
            }
            return { leaderboard: Array.from(remoteMap.values()) };
          });
        }
      })
      .catch(() => {});

    const unsubRealtime = setupRealtimeTestSubscription();

    // Smooth quote-loader transition: display quotes then fade out into dashboard
    const loaderTimer = setTimeout(() => {
      setIsLoaderFading(true);
      setTimeout(() => {
        setIsAppLoading(false);
      }, 500);
    }, 2200);

    return () => {
      clearTimeout(loaderTimer);
      unsubRealtime?.();
    };
  }, []);

  // Update HTML root class whenever theme changes
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    syncTelegramTheme(theme);
  }, [theme]);

  // Sync cloud tests and leaderboard whenever user navigates tabs
  useEffect(() => {
    if (activeTab === 'tests' || activeTab === 'home' || activeTab === 'leaderboard') {
      fetchCloudTests().catch(() => {});
      fetchCloudLeaderboard()
        .then((remoteUsers) => {
          if (remoteUsers) {
            useQuizStore.setState((state) => {
              const cleanProfId = (state.profile.id || '').replace(/^lead_/, '');
              const remoteOthers = remoteUsers.filter((u) => (u.id || '').replace(/^lead_/, '') !== cleanProfId);
              const remoteMap = new Map<string, LeaderboardUser>();
              for (const u of remoteOthers) {
                const cleanId = (u.id || '').replace(/^lead_/, '');
                remoteMap.set(cleanId, { ...u, id: cleanId });
              }
              return { leaderboard: Array.from(remoteMap.values()) };
            });
          }
        })
        .catch(() => {});
    }

    if (reviewState) {
      setReviewState(null);
    }
  }, [activeTab]);

  // Handlers for test flow
  const handleStartTest = (pkg: TestPackage, blockId: string) => {
    // 1. Agar foydalanuvchi to'lov qilgan bo'lsa (user.has_paid === true yoki obuna faol) -> cheklovsiz testga kiritsin
    if (isPaidUser(profile)) {
      setReviewState(null);
      setActiveTestPkg(pkg);
      setActiveBlockId(blockId);
      return;
    }

    // 2. Bepul foydalanuvchi: bugungi kunda ushbu test necha marta topshirilganini hisoblang
    const check = canUserStartTest(profile, pkg.id, blockId, testAttempts);

    // Agar foydalanuvchi 3-marta boshlamoqchi bo'lsa (bugun 2 martadan kam bo'lmasa) -> test ochilmasin va ogohlantirish modali chiqsin
    if (!check.allowed) {
      triggerHaptic('warning');
      const block = pkg.blocks.find((b) => b.id === blockId) || pkg.blocks[0];
      setPaywallTargetTest({
        pkg,
        blockId,
        title: pkg.title,
        blockTitle: block?.title,
      });
      setIsPaywallModalOpen(true);
      return;
    }

    // Agar ushbu test bugun 2 martadan kam ishlangan bo'lsa -> testga ruxsat berilsin va urinish soni oshirilsin
    triggerHaptic('light');
    recordTestStartAttempt(pkg.id, blockId, testAttempts);
    setReviewState(null);
    setActiveTestPkg(pkg);
    setActiveBlockId(blockId);
  };

  const handleFinishTest = (attempt: TestAttempt, unlockedNext: boolean, nextBlockTitle?: string) => {
    if (!activeTestPkg) return;
    const currentPkg = activeTestPkg;
    setActiveTestPkg(null);
    setReviewState({
      attempt,
      pkg: currentPkg,
      unlockedNext,
      nextBlockTitle,
    });
  };

  const handleCancelTest = () => {
    setActiveTestPkg(null);
  };

  const handleRetakeTest = () => {
    if (!reviewState) return;
    const { pkg, attempt } = reviewState;
    handleStartTest(pkg, attempt.blockId);
  };

  const handleDoneReview = () => {
    setReviewState(null);
    setActiveTab('tests');
  };

  return (
    <div className="h-full w-full overflow-hidden bg-slate-50/80 dark:bg-[#030712]/90 text-slate-900 dark:text-slate-100 flex flex-col font-sans select-none relative">
      {/* Floating Interactive Star-like Particle Background */}
      <ParticleBackground />

      {/* Real-time Offline Connectivity Monitor & Banner */}
      <div className="relative z-20">
        <OfflineStatusBanner />
      </div>

      {/* First-time onboarding modal */}
      <OnboardingModal />

      {/* Top Navbar with Direct Admin Access */}
      <div className="relative z-20">
        <Navbar
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
        />
      </div>

      {/* Main Scrollable Container with Dynamic Safe Padding */}
      <main className={`flex-1 overflow-y-auto max-w-md w-full mx-auto px-4 pt-3 relative z-10 ${
        activeTestPkg ? 'pb-4' : 'pb-32 scroll-smooth'
      }`}>
        {/* Test Engine View */}
        {activeTestPkg ? (
          <TestRunner
            testPackage={activeTestPkg}
            blockId={activeBlockId}
            onFinish={handleFinishTest}
            onCancel={handleCancelTest}
          />
        ) : reviewState ? (
          /* Post Test Review View */
          <PostTestReview
            attempt={reviewState.attempt}
            testPackage={reviewState.pkg}
            unlockedNext={reviewState.unlockedNext}
            nextBlockTitle={reviewState.nextBlockTitle}
            onRetake={handleRetakeTest}
            onDone={handleDoneReview}
            onStartNextBlock={(nextBlockId) => handleStartTest(reviewState.pkg, nextBlockId)}
          />
        ) : (
          /* Normal Tab Views */
          <>
            {activeTab === 'home' && (
              <HomeDashboard
                onStartTest={handleStartTest}
                onOpenCreateModal={() => setIsCreateModalOpen(true)}
                onOpenEditProfile={() => setIsEditProfileOpen(true)}
                onOpenReceiptModal={() => setIsReceiptModalOpen(true)}
              />
            )}
            {activeTab === 'tests' && (
              <TestList
                onStartTest={handleStartTest}
                onOpenCreateModal={() => setIsCreateModalOpen(true)}
                onEditTest={(pkg) => setEditingTestPkg(pkg)}
                onOpenReceiptModal={() => setIsReceiptModalOpen(true)}
              />
            )}
            {activeTab === 'results' && <ResultsAndMistakes />}
            {activeTab === 'wallet' && <WalletView />}
            {activeTab === 'leaderboard' && <Leaderboard />}
            {activeTab === 'profile' && (
              <ProfileView
                onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
                onOpenEditProfile={() => setIsEditProfileOpen(true)}
                onOpenReceiptModal={() => setIsReceiptModalOpen(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Edit Profile Modal (Rendered at root level over all navigation) */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
      />

      {/* Subscription & Tariff Modal */}
      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => {
          setIsSubscriptionModalOpen(false);
          setPendingTestStart(null);
        }}
        onSuccessAndStart={() => {
          setIsSubscriptionModalOpen(false);
          if (paywallTargetTest) {
            setReviewState(null);
            setActiveTestPkg(paywallTargetTest.pkg);
            setActiveBlockId(paywallTargetTest.blockId);
            setPaywallTargetTest(null);
          } else if (pendingTestStart) {
            setReviewState(null);
            setActiveTestPkg(pendingTestStart.pkg);
            setActiveBlockId(pendingTestStart.blockId);
            setPendingTestStart(null);
          }
        }}
        onOpenDepositModal={(deficit) => {
          setIsSubscriptionModalOpen(false);
          setDepositSuggestedAmount(deficit);
          setIsReceiptModalOpen(true);
        }}
      />

      {/* Daily Free Limit Paywall Modal */}
      <PaywallModal
        isOpen={isPaywallModalOpen}
        onClose={() => {
          setIsPaywallModalOpen(false);
          setPaywallTargetTest(null);
        }}
        onTopUp={() => {
          setIsPaywallModalOpen(false);
          setIsReceiptModalOpen(true);
        }}
        onOpenSubscription={() => {
          setIsPaywallModalOpen(false);
          setIsSubscriptionModalOpen(true);
        }}
        testTitle={paywallTargetTest?.title}
        blockTitle={paywallTargetTest?.blockTitle}
      />

      {/* P2P Receipt AI Verification Modal (Hisobni to'ldirish) */}
      <ReceiptVerifyModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setDepositSuggestedAmount(undefined);
        }}
        initialAmount={depositSuggestedAmount}
        onSuccess={() => {
          if (pendingTestStart) {
            setTimeout(() => {
              setIsSubscriptionModalOpen(true);
            }, 1000);
          }
        }}
      />

      {/* Create / Edit Test Modal */}
      {(isCreateModalOpen || Boolean(editingTestPkg)) && (
        <CreateTestModal
          editPackage={editingTestPkg}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingTestPkg(null);
          }}
        />
      )}

      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onSuccess={() => {
          setIsAdminLoginOpen(false);
          setIsAdminModalOpen(true);
        }}
      />

      {/* Admin Panel Modal */}
      <AdminPanelModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />

      {/* Persistent Bottom Navigation Bar - cleanly hidden when modal is open */}
      {!activeTestPkg && !isEditProfileOpen && !isReceiptModalOpen && !isSubscriptionModalOpen && !isPaywallModalOpen && !isCreateModalOpen && !editingTestPkg && !isAdminModalOpen && !isAdminLoginOpen && !isNotificationsOpen && (
        <BottomNav onTabSelect={() => setReviewState(null)} />
      )}

      {/* Smooth Motivational Quotes & Minimalist Spinner App Loader */}
      {isAppLoading && <AppLoader isFadingOut={isLoaderFading} />}
    </div>
  );
};

export default App;
