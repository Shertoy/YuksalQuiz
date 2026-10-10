import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useQuizStore, useUserBalanceRealtime } from './store/useQuizStore';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { OnboardingModal } from './components/OnboardingModal';
import { HomeDashboard } from './components/HomeDashboard';
import { TestList } from './components/TestList';
import { TestRunner } from './components/TestRunner';
import { PostTestReview } from './components/PostTestReview';
import { ResultsAndMistakes } from './components/ResultsAndMistakes';
import { Leaderboard } from './components/Leaderboard';
import { ProfileView } from './components/ProfileView';
import { WalletView } from './components/WalletView';
import { NotificationsModal } from './components/NotificationsModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { OfflineStatusBanner } from './components/OfflineStatusBanner';
import { ShieldAlert, Send } from 'lucide-react';
import { TestPackage, TestAttempt } from './types';
import { initTelegramApp, getTelegramWebApp, syncTelegramTheme, triggerHaptic, useTelegramBackButton } from './utils/telegram';
import { isAdminSessionAuthenticated, setAdminSessionAuthenticated, getStoredAdminBrowserKey } from './utils/security';
import { apiPost, getTelegramInitData } from './services/api';
import {
  fetchCloudTests,
  fetchCloudUniversities,
  fetchCloudLeaderboard,
  fetchCloudAnnouncements,
  setupRealtimeTestSubscription,
  checkUserBlockedStatus,
} from './services/testSyncService';
import { LeaderboardUser } from './types';
import { ParticleBackground, shouldReduceBackgroundMotion } from './components/ParticleBackground';
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

// Og'ir oynalar (admin panel, test yaratish) faqat ochilganda yuklanadi:
// talabalar ularning kodini har safar yuklab olmaydi.
//
// Muhim: yangi deploydan keyin Telegram ochiq turgan eski sahifa eski fayl nomlarini
// so'raydi va ular endi serverda yo'q. Shunda oyna ochilmay qolardi. Yuklab bo'lmasa,
// sahifa bir marta yangilanadi (yangi fayllar bilan) va oyna avtomatik qayta ochiladi.
const CHUNK_RELOAD_KEY = 'yq_chunk_reload_once';
const REOPEN_KEY = 'yq_reopen_after_reload';

function lazyWithReload<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  reopenTarget: string
) {
  return lazy(async () => {
    try {
      const mod = await factory();
      try {
        sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      } catch {}
      return mod;
    } catch (err) {
      let alreadyReloaded = false;
      try {
        alreadyReloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1';
        if (!alreadyReloaded) {
          sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
          sessionStorage.setItem(REOPEN_KEY, reopenTarget);
        }
      } catch {}
      if (!alreadyReloaded) {
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });
}

const AdminPanelModal = lazyWithReload(
  () => import('./components/AdminPanelModal').then((m) => ({ default: m.AdminPanelModal })),
  'admin'
);
const CreateQuizModal = lazyWithReload(
  () => import('./components/CreateQuizModal').then((m) => ({ default: m.CreateQuizModal })),
  'create'
);

export const App: React.FC = () => {
  useUserBalanceRealtime();
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
    const currentTheme = useQuizStore.getState().theme;
    if (tg?.colorScheme && tg.colorScheme !== currentTheme) {
      setTheme(tg.colorScheme);
    }

    // Listen for Telegram live theme switch (Light / Dark) safely
    let handleThemeChange: (() => void) | null = null;
    if (tg && typeof (tg as any).onEvent === 'function') {
      handleThemeChange = () => {
        if (tg.colorScheme && tg.colorScheme !== useQuizStore.getState().theme) {
          setTheme(tg.colorScheme);
        }
      };
      (tg as any).onEvent('themeChanged', handleThemeChange);
    }

    if (profile.isRegistered) {
      checkDailyStreak();
    }

    // Admin huquqini server orqali jim tekshirish (Telegram ichida yoki eslab qolingan kalit bilan).
    // Frontendda parol yoki admin ID saqlanmaydi.
    let adminCheckCancelled = false;
    const verifyAdminSilently = async () => {
      if (!getTelegramInitData() && !getStoredAdminBrowserKey()) return false;
      const r = await apiPost('/api/admin', { action: 'whoami' });
      if (adminCheckCancelled) return false;
      if (r.ok && r.data?.admin) {
        setAdminSessionAuthenticated(true, true, r.data?.id || null);
        return true;
      }
      return false;
    };
    const adminCheckPromise = verifyAdminSilently().catch(() => false);

    // Yangi versiya uchun sahifa yangilangan bo'lsa, foydalanuvchi ochmoqchi bo'lgan oynani qayta ochamiz
    let reopenTarget: string | null = null;
    try {
      reopenTarget = sessionStorage.getItem(REOPEN_KEY);
      sessionStorage.removeItem(REOPEN_KEY);
    } catch {}
    if (reopenTarget === 'create') {
      setIsCreateModalOpen(true);
    } else if (reopenTarget === 'admin') {
      adminCheckPromise.then((ok) => {
        if (adminCheckCancelled) return;
        if (ok) setIsAdminModalOpen(true);
        else setIsAdminLoginOpen(true);
      });
    }

    // Brauzerda admin sahifasini ochish: ?admin, #admin yoki /admin (faqat kirish oynasini ochadi)
    const checkAdminRoute = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const isAdminQuery = urlParams.has('admin');
      const isAdminHash = window.location.hash.toLowerCase() === '#admin';
      const isAdminPath = window.location.pathname.toLowerCase().endsWith('/admin');

      if (isAdminQuery || isAdminHash || isAdminPath) {
        adminCheckPromise.then(() => {
          if (adminCheckCancelled) return;
          if (isAdminSessionAuthenticated()) {
            setIsAdminModalOpen(true);
          } else {
            setIsAdminLoginOpen(true);
          }
        });
      }
    };

    checkAdminRoute();
    window.addEventListener('hashchange', checkAdminRoute);
    window.addEventListener('popstate', checkAdminRoute);

    // Check if user is blocked or has updated cloud status and latest balance
    if (profile.id) {
      checkUserBlockedStatus(profile.id).catch(() => {});
      useQuizStore.getState().syncUser().catch(() => {});
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
      adminCheckCancelled = true;
      window.removeEventListener('hashchange', checkAdminRoute);
      window.removeEventListener('popstate', checkAdminRoute);
      clearTimeout(loaderTimer);
      unsubRealtime?.();
      if (tg && handleThemeChange && typeof (tg as any).offEvent === 'function') {
        (tg as any).offEvent('themeChanged', handleThemeChange);
      }
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

  // Deep Link handler: auto-open test when start=quiz_{quiz_id} or ?quiz_id=... is present,
  // and capture referral start=ref_{ref_id} or ?ref=...
  // Bo'lim, test yoki natija oynasi almashganda sahifa boshidan ochilsin
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [activeTab, activeTestPkg, reviewState]);

  const [reduceBgMotion] = useState(() => shouldReduceBackgroundMotion());

  const deepLinkHandledRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const startParam = String((window as any).Telegram?.WebApp?.initDataUnsafe?.start_param || '').trim();

    // 1. Referral param capturing
    const refParam =
      urlParams.get('ref') ||
      (startParam.startsWith('ref_') ? startParam.replace('ref_', '').trim() : '');

    if (refParam) {
      try {
        sessionStorage.setItem('yuksalquiz_referrer_id', refParam);
        localStorage.setItem('yuksalquiz_referrer_id', refParam);
      } catch {}
    }

    // 2. Quiz auto-open ONLY if quiz_ prefix is present
    const rawQuizId =
      urlParams.get('quiz_id') ||
      (startParam.startsWith('quiz_') ? startParam.replace('quiz_', '').trim() : '');

    // Havoladagi test faqat BIR MARTA ochiladi. Aks holda test tugagach yoki
    // bekor qilingach u qayta-qayta avtomatik boshlanib qolardi.
    if (rawQuizId && !deepLinkHandledRef.current && testPackages && testPackages.length > 0 && !activeTestPkg) {
      const targetPkg = testPackages.find((p) => p.id === rawQuizId);
      if (targetPkg && targetPkg.blocks && targetPkg.blocks.length > 0) {
        deepLinkHandledRef.current = true;
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

  // Telegram "Orqaga" tugmasi: avval ochiq oynani yopadi, keyin natija oynasidan,
  // so'ng boshqa bo'limdan bosh sahifaga qaytaradi. Test paytida TestRunner o'zi boshqaradi.
  // Bosh sahifada tugma yashiriladi (shunda ilova o'zi yopiladi).
  const backAction: (() => void) | null = (() => {
    if (activeTestPkg) return null;
    if (isAdminLoginOpen) return () => setIsAdminLoginOpen(false);
    if (isReceiptModalOpen) return () => { setIsReceiptModalOpen(false); setDepositSuggestedAmount(undefined); };
    if (isSubscriptionModalOpen) return () => { setIsSubscriptionModalOpen(false); setPendingTestStart(null); };
    if (isPaywallModalOpen) return () => { setIsPaywallModalOpen(false); setPaywallTargetTest(null); };
    if (isEditProfileOpen) return () => setIsEditProfileOpen(false);
    if (isNotificationsOpen) return () => setIsNotificationsOpen(false);
    if (isCreateModalOpen || editingTestPkg) return () => { setIsCreateModalOpen(false); setEditingTestPkg(null); };
    if (isAdminModalOpen) return () => setIsAdminModalOpen(false);
    if (reviewState) return () => handleDoneReview();
    if (activeTab !== 'home') return () => setActiveTab('home');
    return null;
  })();
  // Ochiq oyna bo'lsa ustuvorlik yuqori (2): avval oyna yopiladi, keyin ichki bo'limlar (1), keyin bo'lim (0)
  const anyModalOpen =
    isAdminLoginOpen || isReceiptModalOpen || isSubscriptionModalOpen || isPaywallModalOpen ||
    isEditProfileOpen || isNotificationsOpen || isCreateModalOpen || Boolean(editingTestPkg) ||
    isAdminModalOpen || Boolean(reviewState);
  useTelegramBackButton(backAction, anyModalOpen ? 2 : 0);

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
    <div className="h-full w-full overflow-hidden bg-slate-50/80 dark:bg-[#0c0a09]/90 text-slate-900 dark:text-slate-100 flex flex-col font-sans select-none relative">
      {/* Fon animatsiyasi: test paytida va kuchsiz qurilmalarda o'chiriladi */}
      {!activeTestPkg && !reduceBgMotion && <ParticleBackground />}

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
      <main ref={mainRef} className={`flex-1 overflow-y-auto max-w-md w-full mx-auto px-4 pt-3 relative z-10 ${
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
                onOpenAdminLogin={() => {
                  if (isAdminSessionAuthenticated()) {
                    setIsAdminModalOpen(true);
                  } else {
                    setIsAdminLoginOpen(true);
                  }
                }}
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
          // To'lovdan keyin talaba aynan shu testga qaytishi uchun eslab qolamiz
          if (paywallTargetTest) {
            setPendingTestStart({ pkg: paywallTargetTest.pkg, blockId: paywallTargetTest.blockId });
          }
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
        <Suspense fallback={null}>
          <CreateQuizModal
            editPackage={editingTestPkg}
            onClose={() => {
              setIsCreateModalOpen(false);
              setEditingTestPkg(null);
            }}
          />
        </Suspense>
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
      {isAdminModalOpen && (
        <Suspense fallback={null}>
          <AdminPanelModal
            isOpen={isAdminModalOpen}
            onClose={() => setIsAdminModalOpen(false)}
          />
        </Suspense>
      )}

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
