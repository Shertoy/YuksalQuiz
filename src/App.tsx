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
import { CreateQuizModal } from './components/CreateQuizModal';
import { ProfileView } from './components/ProfileView';
import { WalletView } from './components/WalletView';
import { AdminPanelModal } from './components/AdminPanelModal';
import { NotificationsModal } from './components/NotificationsModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { OfflineStatusBanner } from './components/OfflineStatusBanner';
import { ShieldAlert, Send } from 'lucide-react';
import { TestPackage, TestAttempt } from './types';
import { initTelegramApp, getTelegramWebApp, syncTelegramTheme, triggerHaptic } from './utils/telegram';
import {
  fetchCloudTests,
  fetchCloudUniversities,
  fetchCloudLeaderboard,
  fetchCloudAnnouncements,
  setupRealtimeTestSubscription,
  checkUserBlockedStatus,
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
  const { theme, setTheme, activeTab, setActiveTab, checkDailyStreak, profile, testAttempts, testPackages } = useQuizStore();

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

    // Check if user is blocked or has updated cloud status
    if (profile.id) {
      checkUserBlockedStatus(profile.id).catch(() => {});
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

  // Deep Link handler: auto-open test when start=quiz_{quiz_id} or ?quiz_id=... is present
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const rawQuizId =
      urlParams.get('quiz_id') ||
      (window as any).Telegram?.WebApp?.initDataUnsafe?.start_param?.replace('quiz_', '');

    if (rawQuizId && testPackages && testPackages.length > 0 && !activeTestPkg) {
      const targetPkg = testPackages.find((p) => p.id === rawQuizId);
      if (targetPkg && targetPkg.blocks && targetPkg.blocks.length > 0) {
        handleStartTest(targetPkg, targetPkg.blocks[0].id);
      }
    }
  }, [testPackages, activeTestPkg]);

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

  // 4. Bloklangan foydalanuvchilar himoyasi
  if (profile.is_blocked || profile.isBlocked) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden font-sans">
        {/* Pulsing red background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

        <div className="relative z-10 max-w-sm w-full space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-red-600/20 border-2 border-red-500/50 flex items-center justify-center text-red-500 shadow-2xl shadow-red-600/40 animate-bounce">
            <ShieldAlert className="w-10 h-10 stroke-[2.5]" />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-red-500/20 text-red-400 border border-red-500/30">
              Kirish Taqiqlangan
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-red-500 tracking-tight leading-snug">
              Qoidabuzarlik sababli hisobingiz bloklangan
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed pt-1">
              Platforma xavfsizlik va foydalanish qoidalarini buzganlik (soxta kvitansiya yuklash yoki qoidabuzarlik) aniqlanganligi sababli ushbu hisob ma'muriyat tomonidan bloklandi. Barcha testlar va hamyon xizmatlari to'xtatildi.
            </p>
          </div>

          {/* User Details Box */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-red-500/30 text-left text-xs font-mono space-y-1.5 shadow-inner">
            <div className="flex justify-between text-slate-400">
              <span>Talaba:</span>
              <span className="text-white font-bold">{profile.firstName || ''} {profile.lastName || ''}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Telegram ID:</span>
              <span className="text-red-400 font-bold">{profile.id}</span>
            </div>
            {profile.university && (
              <div className="flex justify-between text-slate-400">
                <span>OTM:</span>
                <span className="text-slate-200 truncate max-w-[180px]">{profile.university}</span>
              </div>
            )}
          </div>

          {/* Contact Admin Telegram Button */}
          <a
            href="https://t.me/Alisherasqadali"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-red-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Administratorga murojaat qilish (@Alisherasqadali)</span>
          </a>

          <p className="text-[10px] text-slate-500">
            Agar bu xatolik deb hisoblasangiz, Telegram orqali administrator bilan bog'laning.
          </p>
        </div>
      </div>
    );
  }

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

      {/* Create / Edit Test Modal (AI Test Importer) */}
      {(isCreateModalOpen || Boolean(editingTestPkg)) && (
        <CreateQuizModal
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
