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
import { initTelegramApp, getTelegramWebApp } from './utils/telegram';

export const App: React.FC = () => {
  const { theme, setTheme, activeTab, setActiveTab, checkDailyStreak, profile } = useQuizStore();

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

  // Create test modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Notifications modal
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Admin login and panel modal
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

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
  }, []);

  // Update HTML root class whenever theme changes
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Handlers for test flow
  const handleStartTest = (pkg: TestPackage, blockId: string) => {
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
    setReviewState(null);
    setActiveTestPkg(pkg);
    setActiveBlockId(attempt.blockId);
  };

  const handleDoneReview = () => {
    setReviewState(null);
    setActiveTab('tests');
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 select-none">
      {/* Real-time Offline Connectivity Monitor & Banner */}
      <OfflineStatusBanner />

      {/* First-time onboarding modal */}
      <OnboardingModal />

      {/* Top Navbar with Direct Admin Access */}
      <Navbar
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
      />

      {/* Main Scrollable Container with Safe pb-32 to prevent bottom navigation overlap */}
      <main className="flex-1 overflow-y-auto max-w-md w-full mx-auto px-4 pt-3 pb-32 relative scroll-smooth">
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
          />
        ) : (
          /* Normal Tab Views */
          <>
            {activeTab === 'home' && (
              <HomeDashboard
                onStartTest={handleStartTest}
                onOpenCreateModal={() => setIsCreateModalOpen(true)}
              />
            )}
            {activeTab === 'tests' && (
              <TestList
                onStartTest={handleStartTest}
                onOpenCreateModal={() => setIsCreateModalOpen(true)}
              />
            )}
            {activeTab === 'results' && <ResultsAndMistakes />}
            {activeTab === 'wallet' && <WalletView />}
            {activeTab === 'leaderboard' && <Leaderboard />}
            {activeTab === 'profile' && (
              <ProfileView onOpenAdminLogin={() => setIsAdminLoginOpen(true)} />
            )}
          </>
        )}
      </main>

      {/* Create Test Modal */}
      {isCreateModalOpen && (
        <CreateTestModal onClose={() => setIsCreateModalOpen(false)} />
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

      {/* Persistent Bottom Navigation Bar */}
      {!activeTestPkg && <BottomNav />}
    </div>
  );
};

export default App;
