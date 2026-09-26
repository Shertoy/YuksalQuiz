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
import { TestPackage, TestAttempt } from './types';
import { initTelegramApp } from './utils/telegram';

export const App: React.FC = () => {
  const { theme, activeTab, setActiveTab, checkDailyStreak, profile } = useQuizStore();

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

  // Initialize Telegram WebApp and Theme on mount
  useEffect(() => {
    initTelegramApp();

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (profile.isRegistered) {
      checkDailyStreak();
    }
  }, []);

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* First-time onboarding modal */}
      <OnboardingModal />

      {/* Top Navbar */}
      <Navbar />

      {/* Main Container */}
      <main className="flex-1 max-w-md w-full mx-auto p-4">
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
            {activeTab === 'profile' && <ProfileView />}
          </>
        )}
      </main>

      {/* Create Test Modal */}
      {isCreateModalOpen && (
        <CreateTestModal onClose={() => setIsCreateModalOpen(false)} />
      )}

      {/* Sticky Bottom Navigation (hidden while taking a test) */}
      {!activeTestPkg && <BottomNav />}
    </div>
  );
};

export default App;
