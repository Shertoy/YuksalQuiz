import React, { useState, useEffect, useMemo } from 'react';
import { useQuizStore, deduplicateUniversities, normalizeUniversityKey } from '../store/useQuizStore';
import {
  ShieldCheck,
  X,
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  Building2,
  Clock,
  AlertCircle,
  Bell,
  Send,
  BookOpen,
  Database,
  Download,
  Upload,
  ShieldAlert,
  MapPin,
  User,
  Users,
  MessageSquare,
  Calendar,
  CornerDownRight,
  Pin,
  Tag,
  CreditCard,
  KeyRound,
  Copy,
  CheckCircle2,
  Sparkles,
  Cloud,
  RefreshCw,
  ExternalLink,
  Code,
  Filter,
  RotateCcw,
  UserCheck,
  Smartphone,
  Trophy,
  Award,
  Mail,
  ChevronRight,
  UserPlus,
  ShieldBan,
  Receipt,
  Eye,
  Coins,
  Wallet,
  CircleDollarSign,
  Maximize2,
  Minimize2,
  LogOut,
  Laptop,
  CheckCheck,
  Link,
  Sun,
  Moon,
  ArrowRight,
  Crown,
  Scale,
} from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';
import {
  TestPackage,
  MainCategory,
  DepartmentType,
  DEPARTMENTS,
  UZBEKISTAN_REGIONS,
  Region,
  AnnouncementTargetType,
  SubscriptionPlanType,
  LeaderboardUser,
  Gender,
  AVAILABLE_SEMESTERS,
  AVAILABLE_ACADEMIC_YEARS,
} from '../types';
import {
  exportEncryptedBackup,
  importEncryptedBackup,
  sanitizeText,
  decodeHtmlEntities,
  getAuthorizedAdminTelegramIds,
  addAuthorizedAdminTelegramId,
  removeAuthorizedAdminTelegramId,
  cleanTelegramId,
  isTelegramIdAuthorizedAdmin,
  clearAdminSession,
} from '../utils/security';
import { formatDateTime } from '../utils/announcements';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
  normalizeSupabaseUrl,
} from '../services/supabase';
import {
  syncAllTestsWithCloud,
  fetchCloudTests,
  publishTestToCloud,
  deleteTestFromCloud,
  clearAllTestsFromCloud,
  publishUniversityToCloud,
  deleteUniversityFromCloud,
  fetchCloudLeaderboard,
  fetchAdminUsersList,
  fetchCloudAnnouncements,
  publishAnnouncementToCloud,
  deleteAnnouncementFromCloud,
} from '../services/testSyncService';
import { getUserSubscriptionInfo, UserSubscriptionInfo } from '../utils/subscriptionUtils';
import { sendTargetedAnnouncement, BroadcastResult } from '../services/notificationService';
import { SearchableUniversitySelect } from './SearchableUniversitySelect';
import { getGenderSafeAvatar } from '../constants/avatars';
import {
  PaymentRecord,
  fetchAllPayments,
  approveReceiptPayment,
  rejectReceiptPayment,
  adminManualCredit,
  ManualCreditMode,
} from '../services/receiptService';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({ isOpen, onClose }) => {
  const {
    theme,
    setTheme,
    universities,
    pendingUniversities,
    addUniversity,
    updateUniversity,
    deleteUniversity,
    approvePendingUniversity,
    rejectPendingUniversity,
    announcements,
    addAnnouncement,
    deleteAnnouncement,
    announcementReplies,
    replyToUserMessage,
    deleteAnnouncementReply,
    testPackages,
    createTestPackage,
    deleteTestPackage,
    clearAllTests,
    restoreBackupData,
    subscriptionPrices,
    updateSubscriptionPrices,
    paymentMethods,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    togglePaymentMethod,
    promocodes,
    createPromocode,
    deletePromocode,
  } = useQuizStore();

  type AdminTab =
    | 'users'
    | 'receipts'
    | 'news'
    | 'universities'
    | 'pending'
    | 'tests'
    | 'supabase'
    | 'pricing'
    | 'payments'
    | 'promocodes'
    | 'security';

  type NavCategoryId = 'users_group' | 'finance_group' | 'tests_group' | 'system_group';

  interface AdminNavTabItem {
    id: AdminTab;
    label: string;
    icon: any;
    badge?: string | number | null;
    badgeColor?: string;
    pulse?: boolean;
    statusDot?: string;
    onClickExtra?: () => void | Promise<any>;
  }

  interface AdminNavCategory {
    id: NavCategoryId;
    title: string;
    shortTitle: string;
    icon: any;
    tabs: AdminNavTabItem[];
  }

  const getCategoryForTab = (tab: AdminTab): NavCategoryId => {
    if (tab === 'users' || tab === 'news') return 'users_group';
    if (tab === 'receipts' || tab === 'pricing' || tab === 'payments' || tab === 'promocodes') return 'finance_group';
    if (tab === 'tests' || tab === 'universities' || tab === 'pending') return 'tests_group';
    return 'system_group';
  };

  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [activeNavCategory, setActiveNavCategory] = useState<NavCategoryId>(() => getCategoryForTab('users'));

  useEffect(() => {
    setActiveNavCategory(getCategoryForTab(activeTab));
  }, [activeTab]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const isInsideTelegram = typeof window !== 'undefined' && Boolean((window as any).Telegram?.WebApp?.initData);
  const [searchQuery, setSearchQuery] = useState('');
  const [newUniName, setNewUniName] = useState('');
  const [editingUni, setEditingUni] = useState<{ originalName: string; currentName: string } | null>(null);
  const [deletingUni, setDeletingUni] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Payments / Receipts state
  const [paymentsList, setPaymentsList] = useState<PaymentRecord[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [selectedReceiptImage, setSelectedReceiptImage] = useState<string | null>(null);
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null);
  const [showManualTopUp, setShowManualTopUp] = useState(false);

  // Manual Top-up form state
  const [manualActionMode, setManualActionMode] = useState<ManualCreditMode>('subscription_only');
  const [manualUserId, setManualUserId] = useState('');
  const [manualFullName, setManualFullName] = useState('');
  const [manualAmount, setManualAmount] = useState('35000');
  const [manualPlan, setManualPlan] = useState<'none' | '3_months' | '6_months' | '1_year'>('3_months');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Users statistics & filter state
  const [usersList, setUsersList] = useState<LeaderboardUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userGenderFilter, setUserGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [userUniFilter, setUserUniFilter] = useState('all');
  const [userRegionFilter, setUserRegionFilter] = useState('all');
  const [userSubscriptionFilter, setUserSubscriptionFilter] = useState<'all' | 'active' | 'expiring' | 'expired' | 'none' | 'has_balance'>('all');
  const [userSortBy, setUserSortBy] = useState<'default' | 'balance_desc' | 'subscription_exp' | 'name'>('default');

  // User statistics & filtered list memo
  const totalWalletSum = useMemo(() => {
    return usersList.reduce((acc, u) => acc + (u.walletBalance || 0), 0);
  }, [usersList]);

  const totalApprovedReceiptsSum = useMemo(() => {
    return paymentsList
      .filter((p) => p.status === 'approved' || p.status === 'auto_approved' || p.status === 'manual_approved')
      .reduce((acc, p) => acc + Number(p.amount || 0), 0);
  }, [paymentsList]);

  const approvedReceiptsCount = useMemo(() => {
    return paymentsList.filter(
      (p) => p.status === 'approved' || p.status === 'auto_approved' || p.status === 'manual_approved'
    ).length;
  }, [paymentsList]);

  const pendingReceiptsCount = useMemo(() => {
    return paymentsList.filter((p) => p.status === 'pending' || p.status === 'pending_manual').length;
  }, [paymentsList]);

  const activeSubscribersCount = useMemo(() => {
    return usersList.filter((u) => {
      const i = getUserSubscriptionInfo(u);
      return i.status === 'active' || i.status === 'expiring_soon';
    }).length;
  }, [usersList]);

  const expiringSoonCount = useMemo(() => {
    return usersList.filter((u) => getUserSubscriptionInfo(u).status === 'expiring_soon').length;
  }, [usersList]);

  const usersWithBalanceCount = useMemo(() => {
    return usersList.filter((u) => (u.walletBalance || 0) > 0).length;
  }, [usersList]);

  const rejectedReceiptsCount = useMemo(() => {
    return paymentsList.filter((p) => p.status === 'rejected').length;
  }, [paymentsList]);

  const showNotification = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const loadPayments = async () => {
    setIsLoadingPayments(true);
    try {
      const data = await fetchAllPayments();
      setPaymentsList(data);
    } catch (err) {
      console.warn('Load payments error:', err);
    } finally {
      setIsLoadingPayments(false);
    }
  };

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const allUsers = await fetchAdminUsersList();
      setUsersList(allUsers);
    } catch (err) {
      console.warn('Load users error:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const refreshAdminWhitelist = () => {
    setAuthorizedAdminIds(getAuthorizedAdminTelegramIds());
  };

  const navCategories: AdminNavCategory[] = useMemo(() => [
    {
      id: 'users_group' as NavCategoryId,
      title: 'Auditoriya & Talabalar',
      shortTitle: 'Auditoriya',
      icon: Users,
      tabs: [
        {
          id: 'users' as AdminTab,
          label: 'Foydalanuvchilar',
          icon: Users,
          badge: usersList.length > 0 ? String(usersList.length) : null,
          badgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400',
        },
        {
          id: 'news' as AdminTab,
          label: 'Xabarnomalar',
          icon: Send,
          pulse: (announcementReplies || []).some((r) => !r.adminReply),
        },
      ],
    },
    {
      id: 'finance_group' as NavCategoryId,
      title: "Moliya & To'lovlar",
      shortTitle: 'Moliya',
      icon: Receipt,
      tabs: [
        {
          id: 'receipts' as AdminTab,
          label: "Kvitansiyalar & To'lovlar",
          icon: Receipt,
          badge: pendingReceiptsCount > 0 ? String(pendingReceiptsCount) : null,
          badgeColor: 'bg-amber-500 text-white animate-pulse',
          pulse: pendingReceiptsCount > 0,
          onClickExtra: () => {
            loadPayments();
          },
        },
        {
          id: 'pricing' as AdminTab,
          label: 'Obuna Narxlari',
          icon: Tag,
        },
        {
          id: 'payments' as AdminTab,
          label: "To'lov Usullari",
          icon: CreditCard,
        },
        {
          id: 'promocodes' as AdminTab,
          label: 'Promokodlar',
          icon: KeyRound,
        },
      ],
    },
    {
      id: 'tests_group' as NavCategoryId,
      title: "Testlar & Ta'lim",
      shortTitle: 'Testlar',
      icon: BookOpen,
      tabs: [
        {
          id: 'tests' as AdminTab,
          label: `Testlar (${testPackages.length})`,
          icon: BookOpen,
          badge: testPackages.length > 0 ? String(testPackages.length) : null,
          badgeColor: 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
        },
        {
          id: 'universities' as AdminTab,
          label: 'OTMlar & Kafedralar',
          icon: Building2,
        },
        {
          id: 'pending' as AdminTab,
          label: 'Talabalar Takliflari',
          icon: Clock,
          pulse: pendingUniversities.length > 0,
        },
      ],
    },
    {
      id: 'system_group' as NavCategoryId,
      title: 'Tizim & Baza',
      shortTitle: 'Tizim',
      icon: ShieldCheck,
      tabs: [
        {
          id: 'supabase' as AdminTab,
          label: 'Supabase Baza',
          icon: Cloud,
          statusDot: getSupabaseConfig().isConfigured ? 'bg-emerald-500' : 'bg-amber-400',
        },
        {
          id: 'security' as AdminTab,
          label: 'Xavfsizlik',
          icon: Database,
        },
      ],
    },
  ], [usersList.length, announcementReplies, pendingReceiptsCount, paymentsList, testPackages.length, pendingUniversities.length]);

  const filteredUsers = useMemo(() => {
    let list = usersList.filter((u) => {
      if (userGenderFilter !== 'all' && u.gender !== userGenderFilter) return false;
      if (userUniFilter !== 'all' && normalizeUniversityKey(u.university) !== normalizeUniversityKey(userUniFilter)) return false;
      if (userRegionFilter !== 'all' && (u.region || '').toLowerCase() !== userRegionFilter.toLowerCase()) return false;

      if (userSubscriptionFilter !== 'all') {
        const subInfo = getUserSubscriptionInfo(u);
        if (userSubscriptionFilter === 'active' && subInfo.status !== 'active' && subInfo.status !== 'expiring_soon') return false;
        if (userSubscriptionFilter === 'expiring' && subInfo.status !== 'expiring_soon') return false;
        if (userSubscriptionFilter === 'expired' && subInfo.status !== 'expired') return false;
        if (userSubscriptionFilter === 'none' && subInfo.status !== 'none') return false;
        if (userSubscriptionFilter === 'has_balance' && (u.walletBalance || 0) <= 0) return false;
      }

      if (userSearchQuery.trim()) {
        const q = userSearchQuery.trim().toLowerCase();
        const mName = (u.name || '').toLowerCase().includes(q);
        const mId = (u.id || '').toLowerCase().includes(q);
        const mUser = (u.username || '').toLowerCase().includes(q);
        const mUni = (u.university || '').toLowerCase().includes(q);
        const mReg = (u.region || '').toLowerCase().includes(q);
        if (!mName && !mId && !mUser && !mUni && !mReg) return false;
      }
      return true;
    });

    if (userSortBy === 'balance_desc') {
      list = [...list].sort((a, b) => (b.walletBalance || 0) - (a.walletBalance || 0));
    } else if (userSortBy === 'subscription_exp') {
      list = [...list].sort((a, b) => {
        const aInfo = getUserSubscriptionInfo(a);
        const bInfo = getUserSubscriptionInfo(b);
        return aInfo.daysRemaining - bInfo.daysRemaining;
      });
    } else if (userSortBy === 'name') {
      list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'uz'));
    }

    return list;
  }, [usersList, userGenderFilter, userUniFilter, userRegionFilter, userSubscriptionFilter, userSearchQuery, userSortBy]);

  // Supabase Cloud Integration state
  const initialSupabaseConfig = getSupabaseConfig();
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(initialSupabaseConfig.url);
  const [supabaseKeyInput, setSupabaseKeyInput] = useState(initialSupabaseConfig.anonKey);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [supabaseStatusResult, setSupabaseStatusResult] = useState<{ success: boolean; message: string; tableReady?: boolean } | null>(null);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Subscription Pricing state
  const [priceForm3M, setPriceForm3M] = useState<number>(subscriptionPrices?.['3_months'] || 35000);
  const [priceForm6M, setPriceForm6M] = useState<number>(subscriptionPrices?.['6_months'] || 50000);
  const [priceForm1Y, setPriceForm1Y] = useState<number>(subscriptionPrices?.['1_year'] || 90000);

  // Payment Methods state
  const [newPayName, setNewPayName] = useState('Payme');
  const [newPayDetails, setNewPayDetails] = useState('');
  const [newPayInstructions, setNewPayInstructions] = useState('');

  // Promocode state
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoAmountInput, setPromoAmountInput] = useState<number>(30000);
  const [promoPlanSelect, setPromoPlanSelect] = useState<SubscriptionPlanType>('6_months');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // New announcement form state
  const [newsTitle, setNewsTitle] = useState('');
  const [newsMessage, setNewsMessage] = useState('');
  const [newsLink, setNewsLink] = useState('');
  const [newsTag, setNewsTag] = useState<'yangilik' | 'eslatma' | 'muhim'>('yangilik');
  const [newsTargetType, setNewsTargetType] = useState<AnnouncementTargetType>('all');
  const [newsTargetUni, setNewsTargetUni] = useState(universities[0] || 'TATU');
  const [newsTargetRegion, setNewsTargetRegion] = useState<Region>('Toshkent shahri');
  const [newsTargetUser, setNewsTargetUser] = useState('');
  const [newsSendViaTelegram, setNewsSendViaTelegram] = useState(false);
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [broadcastReport, setBroadcastReport] = useState<BroadcastResult | null>(null);
  const [newsSubTab, setNewsSubTab] = useState<'send' | 'inquiries'>('send');
  const [adminReplyTexts, setAdminReplyTexts] = useState<Record<string, string>>({});

  // Admin Telegram ID Whitelist management state
  const [authorizedAdminIds, setAuthorizedAdminIds] = useState<string[]>([]);
  const [newAdminIdInput, setNewAdminIdInput] = useState('');

  // Simple recommended test creator state
  const [testTitle, setTestTitle] = useState('');
  const [testUni, setTestUni] = useState(universities[0] || 'TATU');
  const [testDept, setTestDept] = useState<DepartmentType>('Axborot Texnologiyalari');
  const [testSemester, setTestSemester] = useState<number>(1);
  const [testAcademicYear, setTestAcademicYear] = useState<string>('2025-2026');

  // Admin test management state
  const [adminTestSearch, setAdminTestSearch] = useState('');
  const [adminTestCategoryFilter, setAdminTestCategoryFilter] = useState<string>('all');
  const [deletingTestPkg, setDeletingTestPkg] = useState<TestPackage | null>(null);
  const [isDeletingTest, setIsDeletingTest] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  const handleSavePrices = (e: React.FormEvent) => {
    e.preventDefault();
    updateSubscriptionPrices({
      '3_months': Number(priceForm3M) || 35000,
      '6_months': Number(priceForm6M) || 50000,
      '1_year': Number(priceForm1Y) || 90000,
    });
    triggerHaptic('success');
    showNotification("Obuna narxlari muvaffaqiyatli saqlandi!");
  };

  const handleAddPaymentMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayDetails.trim()) return;
    addPaymentMethod({
      name: newPayName.trim(),
      details: newPayDetails.trim(),
      instructions: newPayInstructions.trim() || undefined,
      isActive: true,
    });
    setNewPayDetails('');
    setNewPayInstructions('');
    triggerHaptic('success');
    showNotification("Yangi to'lov usuli muvaffaqiyatli qo'shildi!");
  };

  const handleGenerateRandomPromo = () => {
    const kAmount = Math.round((promoAmountInput || 30000) / 1000);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const code = `YUK-${kAmount}K-${randomNum}`;
    setPromoCodeInput(code);
    triggerHaptic('selection');
  };

  const handleCreatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) return;
    const amount = Number(promoAmountInput) || 30000;
    createPromocode(code, amount, promoPlanSelect);
    setPromoCodeInput('');
    triggerHaptic('success');
    showNotification(`"${code}" (+${amount.toLocaleString('uz-UZ')} so'm) promokodi muvaffaqiyatli yaratildi!`);
  };

  const handleCopyPromo = (code: string) => {
    triggerHaptic('light');
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code);
    }
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleExportBackup = () => {
    triggerHaptic('medium');
    const storeState = useQuizStore.getState();
    const backupJson = exportEncryptedBackup(storeState);
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const todayStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `YuksalQuiz_Backup_${todayStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Zaxira fayli kompyuteringizga yuklab olindi!');
  };

  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = importEncryptedBackup(content);
      if (result.success && result.data) {
        restoreBackupData(result.data);
        triggerHaptic('success');
        showNotification("Zaxiradan muvaffaqiyatli tiklandi!");
      } else {
        triggerHaptic('error');
        showNotification(result.error || "Zaxirani tiklashda xatolik yuz berdi!");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  useEffect(() => {
    if (isOpen) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('yuksal_admin_id', '7847500525');
      }
      loadUsers();
      loadPayments();
      refreshAdminWhitelist();
      fetchCloudAnnouncements().catch(() => {});
    }
  }, [isOpen]);

  const handleAdminLogout = () => {
    triggerHaptic('medium');
    clearAdminSession();
    showNotification("Admin sessiyasi yakunlandi.");
    setTimeout(() => {
      onClose();
    }, 250);
  };

  const handleCopyAdminLink = () => {
    triggerHaptic('light');
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}${window.location.pathname}?admin=true`;
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(url).then(() => {
          setCopiedLink(true);
          showNotification("Admin havolasi nusxalandi!");
          setTimeout(() => setCopiedLink(false), 3000);
        }).catch(() => {
          showNotification(url);
        });
      } else {
        showNotification(url);
      }
    }
  };

  const handleApprovePayment = async (
    payment: PaymentRecord,
    plan?: '3_months' | '6_months' | '1_year' | null
  ) => {
    setProcessingPaymentId(payment.id);
    triggerHaptic('medium');
    try {
      const res = await approveReceiptPayment(
        payment.id,
        payment.user_id,
        payment.amount,
        plan
      );
      if (res.success) {
        triggerHaptic('success');
        showNotification(res.message);
        await loadPayments();
        await loadUsers();
      } else {
        triggerHaptic('error');
        showNotification(res.message || 'Xatolik yuz berdi');
      }
    } catch (err: any) {
      triggerHaptic('error');
      showNotification(err?.message || 'Xatolik yuz berdi');
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    if (!confirm("Haqiqatan ham bu to'lov arizasini rad etmoqchimisiz?")) return;
    setProcessingPaymentId(paymentId);
    triggerHaptic('warning');
    try {
      const ok = await rejectReceiptPayment(paymentId);
      if (ok) {
        showNotification("To'lov arizasi rad etildi.");
        await loadPayments();
      } else {
        showNotification("Xatolik yuz berdi");
      }
    } catch (err: any) {
      showNotification(err?.message || 'Xatolik');
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const handleManualCreditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUserId.trim()) {
      showNotification("Iltimos, talabaning Telegram ID sini kiriting.");
      return;
    }
    const amt = Number(manualAmount) || 0;
    if (manualActionMode !== 'subscription_only' && amt < 0) {
      showNotification("Iltimos, to'g'ri summa kiriting.");
      return;
    }
    setIsSubmittingManual(true);
    triggerHaptic('medium');
    try {
      const plan = manualPlan !== 'none' ? manualPlan : (manualActionMode === 'subscription_only' ? '3_months' : null);
      const res = await adminManualCredit(
        manualUserId.trim(),
        amt,
        manualFullName.trim() || undefined,
        plan,
        manualActionMode
      );
      if (res.success) {
        triggerHaptic('success');
        showNotification(res.message);
        setManualUserId('');
        setManualFullName('');
        setManualAmount('35000');
        setManualPlan('3_months');
        setShowManualTopUp(false);
        await loadPayments();
        await loadUsers();
      } else {
        triggerHaptic('error');
        showNotification(res.message);
      }
    } catch (err: any) {
      showNotification(err?.message || 'Xatolik');
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const openManualTopUpForUser = (user: LeaderboardUser, mode: ManualCreditMode = 'subscription_only') => {
    setManualUserId(user.id);
    setManualFullName(user.name);
    setManualActionMode(mode);
    if (mode === 'set_balance') {
      setManualAmount(String(user.walletBalance || 0));
    } else if (mode === 'subscription_only') {
      setManualPlan('3_months');
    }
    setShowManualTopUp(true);
    setActiveTab('receipts');
    triggerHaptic('selection');
  };

  const handleAddUni = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newUniName.trim();
    if (!trimmed) return;

    if (universities.some((u) => u.toLowerCase() === trimmed.toLowerCase())) {
      showNotification('Bu OTM allaqachon mavjud!');
      triggerHaptic('warning');
      return;
    }

    addUniversity(trimmed);
    publishUniversityToCloud(trimmed).catch(() => {});
    setNewUniName('');
    triggerHaptic('success');
    showNotification(`"${trimmed}" muvaffaqiyatli qo'shildi!`);
  };

  const handleSaveEdit = (originalName: string) => {
    if (!editingUni) return;
    const trimmed = editingUni.currentName.trim();
    if (!trimmed) return;

    updateUniversity(originalName, trimmed);
    publishUniversityToCloud(trimmed).catch(() => {});
    deleteUniversityFromCloud(originalName).catch(() => {});
    setEditingUni(null);
    triggerHaptic('success');
    showNotification(`OTM nomi yangilandi: "${trimmed}"`);
  };

  const handleDeleteUni = (name: string) => {
    deleteUniversity(name);
    deleteUniversityFromCloud(name).catch(() => {});
    deleteUniversityFromCloud(name.trim()).catch(() => {});
    deleteUniversityFromCloud(name.toLowerCase().trim()).catch(() => {});
    setDeletingUni(null);
    triggerHaptic('warning');
    showNotification(`"${name}" o'chirildi`);
  };

  const handleApprove = (name: string) => {
    approvePendingUniversity(name);
    publishUniversityToCloud(name).catch(() => {});
    triggerHaptic('success');
    showNotification(`"${name}" tasdiqlandi va ro'yxatga qo'shildi!`);
  };

  const handleReject = (name: string) => {
    rejectPendingUniversity(name);
    triggerHaptic('light');
    showNotification(`"${name}" taklifi rad etildi`);
  };

  const handleSendNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle.trim() || !newsMessage.trim()) return;

    let targetLabel = 'Barchaga';
    let targetValue = '';

    if (newsTargetType === 'university') {
      targetValue = newsTargetUni;
      targetLabel = `OTM: ${newsTargetUni}`;
    } else if (newsTargetType === 'region') {
      targetValue = newsTargetRegion;
      targetLabel = `Viloyat: ${newsTargetRegion}`;
    } else if (newsTargetType === 'user') {
      targetValue = newsTargetUser.trim();
      targetLabel = `ID: ${newsTargetUser.trim()}`;
    }

    setIsSendingBroadcast(true);
    try {
      const result = await sendTargetedAnnouncement({
        title: newsTitle.trim(),
        message: newsMessage.trim(),
        link: newsLink.trim() || undefined,
        tag: newsTag,
        targetType: newsTargetType,
        targetValue,
        targetLabel,
        sendViaTelegramBot: newsSendViaTelegram,
        registeredUsers: usersList,
      });

      triggerHaptic('success');
      showNotification(result.message);
      setBroadcastReport(result);

      setNewsTitle('');
      setNewsMessage('');
      setNewsLink('');
      setNewsTargetUser('');
    } catch (err: any) {
      triggerHaptic('error');
      showNotification(`Xatolik: ${err?.message || 'Xabar yuborib bo\'lmadi'}`);
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const handleDeleteAnnouncement = async (annId: string) => {
    deleteAnnouncement(annId);
    await deleteAnnouncementFromCloud(annId);
    triggerHaptic('light');
    showNotification("Bildirishnoma o'chirildi!");
  };

  const handleDirectMessageUser = (user: LeaderboardUser) => {
    triggerHaptic('selection');
    setNewsTargetType('user');
    setNewsTargetUser(user.id);
    setActiveTab('news');
  };

  const handleAddAdminId = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = cleanTelegramId(newAdminIdInput);
    if (!clean) return;
    addAuthorizedAdminTelegramId(clean);
    setNewAdminIdInput('');
    refreshAdminWhitelist();
    triggerHaptic('success');
    showNotification(`Admin Telegram ID (${clean}) qo'shildi!`);
  };

  const handleRemoveAdminId = (id: string) => {
    removeAuthorizedAdminTelegramId(id);
    refreshAdminWhitelist();
    triggerHaptic('light');
    showNotification(`Admin Telegram ID (${id}) o'chirildi!`);
  };

  const handleSendAdminReply = (replyId: string) => {
    const text = (adminReplyTexts[replyId] || '').trim();
    if (!text) return;

    replyToUserMessage(replyId, text);
    setAdminReplyTexts((prev) => ({ ...prev, [replyId]: '' }));
    triggerHaptic('success');
    showNotification("Foydalanuvchiga javob muvaffaqiyatli yuborildi!");
  };

  const handleCreateRecommendedTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testTitle.trim()) return;

    const newPkg: TestPackage = {
      id: 'admin-pkg-' + Date.now(),
      title: testTitle.trim(),
      category: "Oliy Ta'lim (HEMIS)",
      university: testUni,
      department: testDept,
      semester: Number(testSemester),
      academicYear: testAcademicYear,
      totalQuestions: 25,
      isPublic: true,
      isCommunityCreated: false,
      authorName: 'YuksalQuiz Admin',
      authorId: 'admin',
      authorWalletBalance: 0,
      createdAt: new Date().toISOString(),
      blocks: [
        {
          id: 'b-1',
          blockNumber: 1,
          title: '1-qism (Boshlang\'ich blok)',
          passingScore: 18,
          isLocked: false,
          questions: Array.from({ length: 25 }, (_, i) => ({
            id: `q-admin-${i + 1}`,
            text: `${testTitle} fani bo'yicha ${i + 1}-savol matni...`,
            options: [
              'A) To\'g\'ri standart javob varianti',
              'B) Ikkinchi muqobil javob',
              'C) Uchinchi noto\'g\'ri javob',
              'D) To\'rtinchi noto\'g\'ri variant',
            ],
            correctOptionIndex: 0,
            explanation: 'Ushbu fanning asosiy qoidalari va standartlariga ko\'ra to\'g\'ri javob A varianti hisoblanadi.',
          })),
        },
      ],
    };

    createTestPackage(newPkg);
    publishTestToCloud(newPkg).catch(() => {});
    setTestTitle('');
    triggerHaptic('success');
    showNotification(`"${newPkg.title}" tavsiya etilgan test sifatida yaratildi va bulutga yuklandi!`);
  };

  const handleDeleteTestByAdmin = (pkg: TestPackage) => {
    triggerHaptic('warning');
    setDeletingTestPkg(pkg);
  };

  const handleConfirmDeleteTestByAdmin = async () => {
    if (!deletingTestPkg || isDeletingTest) return;
    const targetId = deletingTestPkg.id;
    const targetTitle = deletingTestPkg.title;

    triggerHaptic('medium');
    // 1. Immediately delete from local store & log in deletedPackageIds (instant UI update)
    deleteTestPackage(targetId);
    setDeletingTestPkg(null);
    setIsDeletingTest(false);
    triggerHaptic('success');
    showNotification(`"${targetTitle}" testi muvaffaqiyatli o'chirildi!`);

    // 2. Delete from cloud database in background
    try {
      await deleteTestFromCloud(targetId);
    } catch (err) {
      console.warn('Admin cloud delete error:', err);
    }
  };

  const handleClearAllTestsByAdmin = async () => {
    setShowClearAllConfirm(false);
    triggerHaptic('warning');

    // 1. Immediately clear local store & record all deleted package IDs
    clearAllTests();
    showNotification("Barcha testlar muvaffaqiyatli tozalandi!");

    // 2. Clear from Supabase cloud database
    try {
      await clearAllTestsFromCloud();
    } catch (err) {
      console.warn('Error clearing cloud tests:', err);
    }
  };

  const filteredAdminTests = testPackages.filter((pkg) => {
    const matchesCat =
      adminTestCategoryFilter === 'all' || (pkg.category || "Oliy Ta'lim (HEMIS)") === adminTestCategoryFilter;
    const query = adminTestSearch.toLowerCase().trim();
    const matchesSearch =
      !query ||
      pkg.title.toLowerCase().includes(query) ||
      pkg.university.toLowerCase().includes(query) ||
      pkg.department.toLowerCase().includes(query) ||
      pkg.authorName.toLowerCase().includes(query);
    return matchesCat && matchesSearch;
  });

  const filteredUniversities = deduplicateUniversities(universities || [])
    .filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const terms = q.split(/\s+/).filter(Boolean);
      const uniNorm = u.toLowerCase();
      return terms.every((t) => uniNorm.includes(t));
    });

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md animate-in fade-in transition-all ${
      isFullscreen ? 'p-0' : 'p-2 sm:p-4'
    }`}>
      <div className={`bg-white dark:bg-slate-900 flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-200 ${
        isFullscreen
          ? 'w-full h-full rounded-none'
          : 'rounded-3xl max-w-6xl xl:max-w-7xl w-full max-h-[95vh] h-full'
      }`}>
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <ShieldCheck className="w-5 h-5" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                <span>YuksalQuiz Boshqaruv Markazi</span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  v2.0
                </span>
                {!isInsideTelegram ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                    <Laptop className="w-3 h-3" /> Brauzer
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                    <Smartphone className="w-3 h-3" /> Telegram
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Talabalar, to'lov kvitansiyalari, imtihon testlari va tizim sozlamalari
              </p>
            </div>
          </div>

          {/* Quick Header Actions: Copy link, Fullscreen, Logout, Close */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={handleCopyAdminLink}
              title="Brauzerda to'g'ridan-to'g'ri ochish uchun havola"
              className="px-2.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700/80 transition-all flex items-center gap-1.5"
            >
              {copiedLink ? (
                <>
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline text-emerald-600">Nusxalandi</span>
                </>
              ) : (
                <>
                  <Link className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Admin Havola</span>
                </>
              )}
            </button>

            {/* Light / Dark Mode Toggle */}
            <button
              onClick={() => {
                triggerHaptic('light');
                const nextTheme = theme === 'dark' ? 'light' : 'dark';
                setTheme(nextTheme);
              }}
              title={theme === 'dark' ? "Yorug' rejimga o'tish (Light Mode)" : "Qorong'i rejimga o'tish (Dark Mode)"}
              className={`p-1.5 sm:p-2 rounded-xl transition-all flex items-center justify-center ${
                theme === 'dark'
                  ? 'text-amber-400 hover:text-amber-300 bg-slate-800 hover:bg-slate-700/80 border border-slate-700'
                  : 'text-amber-500 hover:text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200/60'
              }`}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" strokeWidth={2} />
              ) : (
                <Moon className="w-4 h-4" strokeWidth={2} />
              )}
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                setIsFullscreen(!isFullscreen);
              }}
              title={isFullscreen ? "Oynani kichraytirish" : "To'liq ekran rejimiga o'tish"}
              className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" strokeWidth={1.75} />
              ) : (
                <Maximize2 className="w-4 h-4" strokeWidth={1.75} />
              )}
            </button>

            <button
              onClick={handleAdminLogout}
              title="Admin sessiyasini tugatish (Chiqish)"
              className="px-2.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 bg-slate-100 dark:bg-slate-800 transition-all flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chiqish</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 transition-colors"
              title="Yopish"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold text-center animate-in fade-in shadow-md">
            {feedback}
          </div>
        )}

        {/* Responsive Dashboard Body (Desktop Sidebar + Mobile Categorized Bar) */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Mobile Categorized Header (md:hidden) */}
          <div className="md:hidden shrink-0 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90">
            {/* 4 Main Categories Bar */}
            <div className="grid grid-cols-4 gap-1 p-1.5 bg-slate-100/90 dark:bg-slate-950/70 border-b border-slate-200/60 dark:border-slate-800/60 text-[11px]">
              {navCategories.map((cat) => {
                const isCatActive = activeNavCategory === cat.id;
                const CatIcon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      triggerHaptic('light');
                      setActiveNavCategory(cat.id);
                      if (!cat.tabs.some((t) => t.id === activeTab)) {
                        const firstTab = cat.tabs[0];
                        if (firstTab) {
                          setActiveTab(firstTab.id);
                          if (firstTab.onClickExtra) firstTab.onClickExtra();
                        }
                      }
                    }}
                    className={`py-1.5 px-1 rounded-xl font-bold flex items-center justify-center gap-1 transition-all ${
                      isCatActive
                        ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <CatIcon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                    <span className="truncate">{cat.shortTitle}</span>
                  </button>
                );
              })}
            </div>

            {/* Sub-tabs row for active category */}
            <div className="flex items-center gap-1.5 p-2 overflow-x-auto scrollbar-none text-xs">
              {(navCategories.find((c) => c.id === activeNavCategory)?.tabs || []).map((tabItem) => {
                const isActive = activeTab === tabItem.id;
                const TabIcon = tabItem.icon;
                return (
                  <button
                    key={tabItem.id}
                    onClick={() => {
                      triggerHaptic('selection');
                      setActiveTab(tabItem.id);
                      if (tabItem.onClickExtra) tabItem.onClickExtra();
                    }}
                    className={`py-1.5 px-3 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/80'
                    }`}
                  >
                    {TabIcon && <TabIcon className="w-3.5 h-3.5" strokeWidth={1.75} />}
                    <span>{tabItem.label}</span>
                    {tabItem.badge && (
                      <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${tabItem.badgeColor || 'bg-slate-200 dark:bg-slate-700'}`}>
                        {tabItem.badge}
                      </span>
                    )}
                    {tabItem.pulse && !tabItem.badge && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    )}
                    {tabItem.statusDot && (
                      <span className={`w-2 h-2 rounded-full ${tabItem.statusDot}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop Left Sidebar (hidden md:flex) */}
          <aside className="hidden md:flex w-64 lg:w-72 shrink-0 bg-slate-50/90 dark:bg-slate-950/70 border-r border-slate-200/80 dark:border-slate-800/80 flex-col justify-between overflow-y-auto">
            <div className="p-3 lg:p-4 space-y-4">
              {navCategories.map((cat) => (
                <div key={cat.id} className="space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-black tracking-wider uppercase text-slate-600 dark:text-slate-400 flex items-center justify-between">
                    <span>{cat.title}</span>
                  </div>
                  <div className="space-y-0.5">
                    {(cat.tabs || []).map((tabItem) => {
                      const isActive = activeTab === tabItem.id;
                      const TabIcon = tabItem.icon;
                      return (
                        <button
                          key={tabItem.id}
                          onClick={() => {
                            triggerHaptic('selection');
                            setActiveTab(tabItem.id);
                            if (tabItem.onClickExtra) tabItem.onClickExtra();
                          }}
                          className={`w-full px-3 py-2 rounded-xl font-bold text-xs flex items-center justify-between transition-all ${
                            isActive
                              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-2xs border border-slate-200/70 dark:border-slate-700/80'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-900/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            {TabIcon && (
                              <TabIcon
                                className={`w-4 h-4 shrink-0 ${
                                  isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                                }`}
                                strokeWidth={1.75}
                              />
                            )}
                            <span className="truncate">{tabItem.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {tabItem.badge && (
                              <span
                                className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                                  tabItem.badgeColor || 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                                }`}
                              >
                                {tabItem.badge}
                              </span>
                            )}
                            {tabItem.pulse && !tabItem.badge && (
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            )}
                            {tabItem.statusDot && (
                              <span className={`w-2 h-2 rounded-full ${tabItem.statusDot}`} />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Sidebar Financial Quick Overview Widget */}
            <div className="p-3 m-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <span>Moliya Balansi</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px] flex items-center gap-1">
                    <Receipt className="w-3 h-3 text-blue-500" /> Kassa:
                  </span>
                  <span className="font-extrabold text-blue-600 dark:text-blue-400 text-[11px]">
                    {totalApprovedReceiptsSum.toLocaleString('uz-UZ')} so'm
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px] flex items-center gap-1">
                    <Wallet className="w-3 h-3 text-emerald-500" /> Hamyonlar:
                  </span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-[11px]">
                    {totalWalletSum.toLocaleString('uz-UZ')} so'm
                  </span>
                </div>
              </div>
            </div>
          </aside>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 pb-20 sm:pb-8 space-y-4">
          {/* USERS STATISTICS & FILTERING TAB */}
          {activeTab === 'users' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Top Banner / Headline */}
              <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
                    <Users className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Foydalanuvchilar Statistikasi</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        {usersList.length} ta talaba
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Jinsi, OTMlar va viloyatlar kesimida talabalar hisoboti va filtri
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    loadUsers();
                  }}
                  disabled={isLoadingUsers}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs self-start sm:self-auto shrink-0"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin text-emerald-500' : ''}`} strokeWidth={1.75} />
                  <span>{isLoadingUsers ? 'Yuklanmoqda...' : 'Yangilash'}</span>
                </button>
              </div>

              {/* 4 Summary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold">Jami Talabalar</span>
                    <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {usersList.length}
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" strokeWidth={1.75} />
                    <span>Ro'yxatdan o'tgan</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold">Talabalar Hamyon Qoldig'i</span>
                    <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                  </div>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 truncate">
                    {totalWalletSum.toLocaleString('uz-UZ')} <span className="text-xs font-bold text-slate-400">so'm</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                    {usersWithBalanceCount} ta talaba hisobida
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold">Tasdiqlangan Kassa Tushumi</span>
                    <Coins className="w-4 h-4 text-blue-500" strokeWidth={1.75} />
                  </div>
                  <div className="text-xl font-black text-blue-600 dark:text-blue-400 truncate">
                    {totalApprovedReceiptsSum.toLocaleString('uz-UZ')} <span className="text-xs font-bold text-slate-400">so'm</span>
                  </div>
                  <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                    {approvedReceiptsCount} ta kvitansiya bo'yicha
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold">Faol Obunachilar</span>
                    <Sparkles className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {activeSubscribersCount}
                  </div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                    Tugashiga &le; 7 kun: {expiringSoonCount} ta
                  </div>
                </div>
              </div>

              {/* Moliyaviy Hisob-kitob Farqi Tushuntirish Baneri */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/90 via-emerald-50/50 to-slate-50/90 dark:from-slate-900 dark:via-emerald-950/20 dark:to-slate-900 border border-blue-200/80 dark:border-slate-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Receipt className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <div className="space-y-0.5">
                    <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                      <span>Moliyaviy Hisobot & Hisob-kitob Tushuntirishi:</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                        Kassa: {totalApprovedReceiptsSum.toLocaleString('uz-UZ')} so'm &bull; Hamyonlar: {totalWalletSum.toLocaleString('uz-UZ')} so'm
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      • <b>Tasdiqlangan Kassa ({totalApprovedReceiptsSum.toLocaleString('uz-UZ')} so'm)</b> — Kvitansiyalar & to'lovlar bo'limidagi {approvedReceiptsCount} ta tasdiqlangan chek bo'yicha tushgan real pul tushumi.<br />
                      • <b>Talabalar Hamyon Qoldig'i ({totalWalletSum.toLocaleString('uz-UZ')} so'm)</b> — {usersList.length} ta talabaning akkauntlaridagi joriy pul miqdori (kassa tushumi + admin qo'lda to'ldirgan bonuslar yoki dastlabki hisoblar).
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setActiveTab('receipts');
                    loadPayments();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] whitespace-nowrap shadow-xs shrink-0 self-end sm:self-auto transition-all active:scale-95 flex items-center gap-1"
                >
                  <span>Kvitansiyalarga o'tish</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Filter Controls Bar */}
              <div className="p-3.5 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Filter className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                    <span>Filtrlash va saralash parametrlari:</span>
                  </div>

                  {(userGenderFilter !== 'all' || userUniFilter !== 'all' || userRegionFilter !== 'all' || userSubscriptionFilter !== 'all' || userSortBy !== 'default' || userSearchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setUserGenderFilter('all');
                        setUserUniFilter('all');
                        setUserRegionFilter('all');
                        setUserSubscriptionFilter('all');
                        setUserSortBy('default');
                        setUserSearchQuery('');
                      }}
                      className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline font-bold flex items-center gap-1"
                    >
                      <X className="w-3 h-3" strokeWidth={1.75} />
                      <span>Filtrlarni tozalash</span>
                    </button>
                  )}
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Qidiruv: Ism, @username, Telegram ID yoki OTM nomi bo'yicha..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                  {userSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setUserSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  )}
                </div>

                {/* 5 Dropdown Filters: Obuna/Hamyon, Saralash, OTM, Viloyat, Jinsi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                  {/* 1. Obuna & Hamyon Filter */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                      Obuna & Hamyon:
                    </label>
                    <select
                      value={userSubscriptionFilter}
                      onChange={(e) => {
                        triggerHaptic('selection');
                        setUserSubscriptionFilter(e.target.value as any);
                      }}
                      className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="all">Barcha talabalar</option>
                      <option value="active">⭐ Faol obunachilar</option>
                      <option value="expiring">⏳ Tugashiga &le; 7 kun qolgan</option>
                      <option value="expired">❌ Obunasi tugaganlar</option>
                      <option value="none">⚪ Bepul (Obuna yo'q)</option>
                      <option value="has_balance">💰 Balansida puli borlar (&gt; 0)</option>
                    </select>
                  </div>

                  {/* 2. Saralash (Sort By) */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                      Saralash (Tartib):
                    </label>
                    <select
                      value={userSortBy}
                      onChange={(e) => {
                        triggerHaptic('selection');
                        setUserSortBy(e.target.value as any);
                      }}
                      className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="default">Oxirgi ro'yxatdan o'tganlar</option>
                      <option value="balance_desc">Hamyon balansi (ko'pdan kamga)</option>
                      <option value="subscription_exp">Obuna tugashi yaqinlar</option>
                      <option value="name">Alifbo bo'yicha (A-Z)</option>
                    </select>
                  </div>

                  {/* 3. OTM Filter */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                      OTMlar kesimida:
                    </label>
                    <select
                      value={userUniFilter}
                      onChange={(e) => {
                        triggerHaptic('selection');
                        setUserUniFilter(e.target.value);
                      }}
                      className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 truncate"
                    >
                      <option value="all">Barcha OTMlar</option>
                      {Array.from(
                        new Set(
                          usersList
                            .map((u) => (u.university || '').trim())
                            .filter(Boolean)
                        )
                      )
                        .sort((a, b) => a.localeCompare(b, 'uz'))
                        .map((uni) => (
                          <option key={uni} value={uni}>
                            {uni}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* 4. Region Filter */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                      Viloyatlar kesimida:
                    </label>
                    <select
                      value={userRegionFilter}
                      onChange={(e) => {
                        triggerHaptic('selection');
                        setUserRegionFilter(e.target.value);
                      }}
                      className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="all">Barcha viloyatlar</option>
                      {UZBEKISTAN_REGIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 5. Gender Filter */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                      Jinsi:
                    </label>
                    <select
                      value={userGenderFilter}
                      onChange={(e) => {
                        triggerHaptic('selection');
                        setUserGenderFilter(e.target.value as any);
                      }}
                      className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="all">Barchasi</option>
                      <option value="male">Erkak talabalar</option>
                      <option value="female">Ayol talabalar</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Talabalar Ro'yxati</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                      {filteredUsers.length} ta
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Hamyon mablag'i va obuna muddatlari
                  </span>
                </div>

                {filteredUsers.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                    <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" strokeWidth={1.75} />
                    <p className="font-bold text-slate-600 dark:text-slate-300">
                      Belgilangan parametrlar bo'yicha talaba topilmadi
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      Filtrlarni o'zgartiring yoki barcha talabalarni ko'rish uchun tozalang.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setUserGenderFilter('all');
                        setUserUniFilter('all');
                        setUserRegionFilter('all');
                        setUserSubscriptionFilter('all');
                        setUserSortBy('default');
                        setUserSearchQuery('');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition-colors"
                    >
                      Barchasini ko'rsatish
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                        <tr>
                          <th className="py-3 px-3 w-10 text-center">№</th>
                          <th className="py-3 px-3">Talaba</th>
                          <th className="py-3 px-3">Hamyon Balansi</th>
                          <th className="py-3 px-3">Obuna & Qolgan muddat</th>
                          <th className="py-3 px-3">OTM (Universitet)</th>
                          <th className="py-3 px-3 text-center">Ball / Testlar</th>
                          <th className="py-3 px-3 text-right">Amal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredUsers.map((student, idx) => {
                          const isFemale = student.gender === 'female' || (student.gender as string) === 'ayol';
                          const safeAvatar = getGenderSafeAvatar(student.avatar, student.gender);
                          const fallbackAvatar = isFemale ? '/avatars/avatar_1.png' : '/avatars/avatar_3.png';
                          const rawName = student.name || '';
                          const displayName =
                            rawName && rawName.toLowerCase() !== 'talaba' && !rawName.startsWith('Talaba #')
                              ? rawName
                              : (student.username
                                  ? `@${student.username.replace(/^@/, '')}`
                                  : (student.first_name
                                      ? `${student.first_name} ${student.last_name || ''}`.trim()
                                      : (rawName || 'Talaba')));
                          const subInfo = getUserSubscriptionInfo(student);
                          const balance = student.walletBalance || 0;

                          return (
                            <tr
                              key={student.id}
                              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              <td className="py-3 px-3 text-center font-bold text-slate-400 text-xs">
                                {idx + 1}
                              </td>

                              {/* Talaba profili */}
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2.5">
                                  <img
                                    src={safeAvatar}
                                    alt={displayName}
                                    className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = fallbackAvatar;
                                    }}
                                  />
                                  <div className="min-w-0">
                                    <div className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                                      <span className="truncate">{displayName}</span>
                                      {isFemale ? (
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                                          Ayol
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                                          Erkak
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                                      <span className="flex items-center gap-0.5">
                                        <Smartphone className="w-2.5 h-2.5 text-emerald-500" strokeWidth={1.75} />
                                        <span>ID: {student.id}</span>
                                      </span>
                                      {student.username && (
                                        <span className="text-slate-400 truncate">
                                          @{student.username.replace(/^@/, '')}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Hamyon Balansi */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                {balance > 0 ? (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-black text-xs shadow-2xs">
                                    <Coins className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={2} />
                                    <span>{balance.toLocaleString('uz-UZ')} so'm</span>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 font-semibold text-xs">
                                    <Wallet className="w-3 h-3 text-slate-400 shrink-0" strokeWidth={1.75} />
                                    <span>0 so'm</span>
                                  </div>
                                )}
                              </td>

                              {/* Obunasi & Qolgan muddat */}
                              <td className="py-3 px-3">
                                <div className="space-y-0.5">
                                  {subInfo.status === 'active' && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-extrabold text-[11px] whitespace-nowrap shadow-2xs">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" strokeWidth={2.5} />
                                      <span>{subInfo.label}</span>
                                    </span>
                                  )}
                                  {subInfo.status === 'expiring_soon' && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-extrabold text-[11px] whitespace-nowrap shadow-2xs animate-pulse">
                                      <Clock className="w-3 h-3 text-amber-500 shrink-0" strokeWidth={2.5} />
                                      <span>{subInfo.label}</span>
                                    </span>
                                  )}
                                  {subInfo.status === 'expired' && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 font-bold text-[10px] whitespace-nowrap">
                                      <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" strokeWidth={2} />
                                      <span>{subInfo.label}</span>
                                    </span>
                                  )}
                                  {subInfo.status === 'none' && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium text-[10px] whitespace-nowrap">
                                      <span>Obunasi yo'q</span>
                                    </span>
                                  )}
                                  <div className="text-[10px] text-slate-400 font-medium truncate max-w-[170px]" title={subInfo.subLabel}>
                                    {subInfo.planName !== 'Bepul' ? `${subInfo.planName} • ` : ''}{subInfo.subLabel}
                                  </div>
                                </div>
                              </td>

                              {/* OTM va Viloyat */}
                              <td className="py-3 px-3">
                                <div className="font-semibold text-slate-700 dark:text-slate-300 text-xs max-w-xs truncate" title={student.university}>
                                  {student.university || 'Kiritilmagan'}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <span>{student.academicYear}-kurs</span>
                                  <span>&bull;</span>
                                  <span className="truncate">{student.region || 'Toshkent shahri'}</span>
                                </div>
                              </td>

                              {/* Ball va Testlar */}
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                <div className="font-black text-emerald-600 dark:text-emerald-400 text-xs">
                                  {student.scorePoints ?? (student.correctAnswersCount ? student.correctAnswersCount * 4 : 0)} ball
                                </div>
                                <div className="text-[10px] text-slate-400 font-semibold">
                                  {student.testsCompleted || 0} ta test
                                </div>
                              </td>

                              {/* Amallar */}
                              <td className="py-3 px-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openManualTopUpForUser(student, 'subscription_only')}
                                    className="px-2 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-[10px] font-bold border border-purple-200 dark:border-purple-800 transition-colors inline-flex items-center gap-1 shadow-2xs"
                                    title="Faqat VIP obunani yoqish (hamyon o'zgarmaydi)"
                                  >
                                    <Crown className="w-3 h-3 text-purple-600 dark:text-purple-400" strokeWidth={1.75} />
                                    <span>Obuna</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openManualTopUpForUser(student, 'add_funds')}
                                    className="px-2 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 transition-colors inline-flex items-center gap-1 shadow-2xs"
                                    title="Talaba hamyoniga pul qo'shish"
                                  >
                                    <Coins className="w-3 h-3 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                                    <span>+Pul</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openManualTopUpForUser(student, 'set_balance')}
                                    className="px-2 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800 transition-colors inline-flex items-center gap-1 shadow-2xs"
                                    title="Balansni to'g'rilash (0 qilish yoki aniq summa belgilash)"
                                  >
                                    <Scale className="w-3 h-3 text-amber-600 dark:text-amber-400" strokeWidth={1.75} />
                                    <span>To'g'rilash</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDirectMessageUser(student)}
                                    className="px-2 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200 dark:border-blue-800 transition-colors inline-flex items-center gap-1 shadow-2xs"
                                    title="Talabaga shaxsiy xabar yuborish"
                                  >
                                    <Send className="w-3 h-3 text-blue-600 dark:text-blue-400" strokeWidth={1.75} />
                                    <span>Xabar</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Receipts & Payment Verification */}
          {activeTab === 'receipts' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Top Banner */}
              <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
                    <Receipt className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>To'lov Kvitansiyalari va Cheklar</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        {paymentsList.filter((p) => p.status === 'pending').length} ta kutilmoqda
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Talabalar yuborgan to'lov cheklarini tekshirish, tasdiqlash va hisobiga qo'shish
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowManualTopUp(!showManualTopUp)}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Qo'lda to'ldirish</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      loadPayments();
                    }}
                    disabled={isLoadingPayments}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isLoadingPayments ? 'animate-spin text-amber-500' : ''}`} strokeWidth={1.75} />
                    <span>{isLoadingPayments ? 'Yuklanmoqda...' : 'Yangilash'}</span>
                  </button>
                </div>
              </div>

              {/* 4 Summary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold">Kutilmoqda</span>
                    <Clock className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
                  </div>
                  <div className="text-xl font-black text-amber-600 dark:text-amber-400">
                    {paymentsList.filter((p) => p.status === 'pending').length}
                  </div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                    Admin ko'rigi zarur
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold">Tasdiqlangan Kassa</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" strokeWidth={1.75} />
                  </div>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 truncate">
                    {totalApprovedReceiptsSum.toLocaleString('uz-UZ')} <span className="text-xs font-bold text-slate-400">so'm</span>
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    {approvedReceiptsCount} ta chek tasdiqlangan
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold">Talabalar Hamyon Qoldig'i</span>
                    <Wallet className="w-4 h-4 text-blue-500" strokeWidth={1.75} />
                  </div>
                  <div className="text-xl font-black text-blue-600 dark:text-blue-400 truncate">
                    {totalWalletSum.toLocaleString('uz-UZ')} <span className="text-xs font-bold text-slate-400">so'm</span>
                  </div>
                  <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                    {usersWithBalanceCount} ta talaba hisobida
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold">Rad etilgan</span>
                    <AlertCircle className="w-4 h-4 text-rose-500" strokeWidth={1.75} />
                  </div>
                  <div className="text-xl font-black text-rose-600 dark:text-rose-400">
                    {paymentsList.filter((p) => p.status === 'rejected').length}
                  </div>
                  <div className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                    Soxta / xato cheklar
                  </div>
                </div>
              </div>

              {/* Moliyaviy Hisob-kitob Farqi Tushuntirish Baneri */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/90 via-emerald-50/50 to-slate-50/90 dark:from-slate-900 dark:via-emerald-950/20 dark:to-slate-900 border border-blue-200/80 dark:border-slate-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Coins className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <div className="space-y-0.5">
                    <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                      <span>Kassa Tushumi ({totalApprovedReceiptsSum.toLocaleString('uz-UZ')} so'm) va Hamyonlar ({totalWalletSum.toLocaleString('uz-UZ')} so'm):</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      • <b>Kassa Tushumi: {totalApprovedReceiptsSum.toLocaleString('uz-UZ')} so'm</b> — Talabalar kvitansiya yuklagan va admin tasdiqlagan {approvedReceiptsCount} ta to'lov orqali tushgan haqiqiy pul miqdori.<br />
                      • <b>Hamyon Balansi: {totalWalletSum.toLocaleString('uz-UZ')} so'm</b> — Barcha talabalar hisobidagi umumiy mablag' (bunga kassa tushumidan tashqari admin tomonidan qo'lda to'ldirilgan bonuslar ham kiradi).
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setActiveTab('users');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] whitespace-nowrap shadow-xs shrink-0 self-end sm:self-auto transition-all active:scale-95 flex items-center gap-1"
                >
                  <span>Talabalarni ko'rish</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Quick Manual Top-up Collapsible Form */}
              {showManualTopUp && (
                <form
                  onSubmit={handleManualCreditSubmit}
                  className="p-4 rounded-3xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-4 animate-in slide-in-from-top-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-amber-600 dark:text-amber-400" strokeWidth={1.75} />
                      <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">
                        Talaba Hisobini Boshqarish (Obuna / Pul / To'g'rilash)
                      </h5>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowManualTopUp(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  </div>

                  {/* Mode Selector Tabs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setManualActionMode('subscription_only');
                        setManualPlan('3_months');
                        triggerHaptic('selection');
                      }}
                      className={`px-2.5 py-2 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                        manualActionMode === 'subscription_only'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Crown className="w-3.5 h-3.5" />
                      <span>Faqat Obuna</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setManualActionMode('add_funds');
                        setManualPlan('none');
                        triggerHaptic('selection');
                      }}
                      className={`px-2.5 py-2 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                        manualActionMode === 'add_funds'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>Pul Qo'shish</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setManualActionMode('set_balance');
                        triggerHaptic('selection');
                      }}
                      className={`px-2.5 py-2 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                        manualActionMode === 'set_balance'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Scale className="w-3.5 h-3.5" />
                      <span>Balansni To'g'rilash</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setManualActionMode('both');
                        setManualPlan('3_months');
                        triggerHaptic('selection');
                      }}
                      className={`px-2.5 py-2 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                        manualActionMode === 'both'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Obuna + Pul</span>
                    </button>
                  </div>

                  {/* Mode explanation info box */}
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                    {manualActionMode === 'subscription_only' && (
                      <p>👑 <b>Faqat Obuna Yoqish:</b> Talaba hamyoniga qo'shimcha pul o'tkazilmaydi (balans o'zgarmaydi). Faqat tanlangan muddatga VIP obuna faollashtiriladi va talabaga bildirishnoma yuboriladi.</p>
                    )}
                    {manualActionMode === 'add_funds' && (
                      <p>💳 <b>Hamyonga Pul Qo'shish:</b> Talaba hamyoniga kiritilgan summa qo'shiladi. Talaba ilovada o'z xohishi bilan istagan tarifini aktivlashtirishi mumkin.</p>
                    )}
                    {manualActionMode === 'set_balance' && (
                      <p>⚖️ <b>Balansni Aniq Belgilash (To'g'rilash):</b> Talaba balansi aynan shu summaga o'rnatiladi (masalan: ortiqcha pullarni 0 qilish yoki 25 000 so'm qilib qo'yish uchun).</p>
                    )}
                    {manualActionMode === 'both' && (
                      <p>🔄 <b>Obuna va Pul Qo'shish:</b> Ham hamyonga kiritilgan summa o'tkaziladi, ham VIP obunasi faollashadi.</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                        Talaba Telegram ID (Majburiy):
                      </label>
                      <input
                        type="text"
                        value={manualUserId}
                        onChange={(e) => setManualUserId(e.target.value)}
                        placeholder="Masalan: 117932388 yoki user-k31dje7"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                        Talaba Ism-Familiyasi (Ixtiyoriy):
                      </label>
                      <input
                        type="text"
                        value={manualFullName}
                        onChange={(e) => setManualFullName(e.target.value)}
                        placeholder="Masalan: Jamshid Aliyev"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Summa Input / Balance Status */}
                    {manualActionMode === 'subscription_only' ? (
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                          Hamyon Summasi:
                        </label>
                        <div className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400">
                          0 so'm (Hamyon balansi o'zgarmaydi)
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                          {manualActionMode === 'set_balance' ? "Yangi Balans Summasi (so'm):" : "Qo'shiladigan Summa (so'm):"}
                        </label>
                        <div className="space-y-1.5">
                          <input
                            type="number"
                            value={manualAmount}
                            onChange={(e) => setManualAmount(e.target.value)}
                            placeholder={manualActionMode === 'set_balance' ? "0" : "35000"}
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                            required
                          />
                          <div className="flex gap-1.5 flex-wrap">
                            {manualActionMode === 'set_balance' ? (
                              [0, 25000, 35000, 50000].map((amt) => (
                                <button
                                  key={amt}
                                  type="button"
                                  onClick={() => setManualAmount(amt.toString())}
                                  className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold hover:bg-amber-50 text-slate-700 dark:text-slate-300"
                                >
                                  {amt === 0 ? "0 so'm (0 qilish)" : `${amt.toLocaleString('uz-UZ')} so'm`}
                                </button>
                              ))
                            ) : (
                              [10000, 25000, 35000, 60000, 100000].map((amt) => (
                                <button
                                  key={amt}
                                  type="button"
                                  onClick={() => setManualAmount(amt.toString())}
                                  className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold hover:bg-amber-50 text-slate-700 dark:text-slate-300"
                                >
                                  +{amt.toLocaleString('uz-UZ')}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Plan Selector */}
                    {manualActionMode === 'add_funds' ? (
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                          Tarif / Obuna:
                        </label>
                        <div className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400">
                          Obuna yoqilmaydi (Faqat pul qo'shiladi)
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                          Tarif / Obuna muddati:
                        </label>
                        <select
                          value={manualPlan}
                          onChange={(e) => setManualPlan(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          {manualActionMode === 'set_balance' && (
                            <option value="none">Obunaga tegilmasin (Mavjud holati qolsin)</option>
                          )}
                          <option value="3_months">3 oylik VIP Obuna (90 kun)</option>
                          <option value="6_months">6 oylik VIP Obuna (180 kun)</option>
                          <option value="1_year">1 yillik VIP Obuna (365 kun)</option>
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Talaba hisobida VIP obuna ko'rsatilgan muddatga faollashtiriladi.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isSubmittingManual}
                      className={`px-4 py-2 rounded-xl text-white text-xs font-black flex items-center gap-1.5 shadow-md disabled:opacity-50 transition-all ${
                        manualActionMode === 'subscription_only'
                          ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'
                          : manualActionMode === 'set_balance'
                          ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                          : manualActionMode === 'both'
                          ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                          : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      }`}
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 ${isSubmittingManual ? 'animate-spin' : ''}`} strokeWidth={1.75} />
                      <span>
                        {isSubmittingManual
                          ? 'Bajarilmoqda...'
                          : manualActionMode === 'subscription_only'
                          ? "👑 Faqat Obunani Yoqish"
                          : manualActionMode === 'set_balance'
                          ? "⚖️ Balansni To'g'rilash"
                          : manualActionMode === 'both'
                          ? "🔄 Obuna va Pul Qo'shish"
                          : "💳 Hamyonga Pul Qo'shish"}
                      </span>
                    </button>
                  </div>
                </form>
              )}

              {/* Filter & Search Bar */}
              <div className="p-3.5 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  {/* Status Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                    {(
                      [
                        { id: 'pending', label: 'Kutilmoqda', count: paymentsList.filter((p) => p.status === 'pending').length },
                        { id: 'all', label: 'Barchasi', count: paymentsList.length },
                        { id: 'approved', label: 'Tasdiqlangan', count: paymentsList.filter((p) => p.status === 'approved').length },
                        { id: 'rejected', label: 'Rad etilgan', count: paymentsList.filter((p) => p.status === 'rejected').length },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic('selection');
                          setPaymentFilter(f.id);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                          paymentFilter === f.id
                            ? f.id === 'pending'
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span>{f.label}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                            paymentFilter === f.id
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {f.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Search Bar */}
                  <div className="relative min-w-[220px]">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
                    <input
                      type="text"
                      value={paymentSearch}
                      onChange={(e) => setPaymentSearch(e.target.value)}
                      placeholder="Talaba ismi yoki Telegram ID..."
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    {paymentSearch && (
                      <button
                        type="button"
                        onClick={() => setPaymentSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" strokeWidth={1.75} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Payments List */}
              <div className="space-y-3">
                {isLoadingPayments ? (
                  <div className="py-16 text-center text-slate-400 text-xs space-y-2">
                    <RotateCcw className="w-7 h-7 mx-auto animate-spin text-amber-500" strokeWidth={1.75} />
                    <p className="font-bold">Kvitansiyalar yuklanmoqda...</p>
                  </div>
                ) : paymentsList.filter((p) => {
                    if (paymentFilter !== 'all' && p.status !== paymentFilter) return false;
                    if (paymentSearch.trim()) {
                      const q = paymentSearch.trim().toLowerCase();
                      const mId = (p.user_id || '').toLowerCase().includes(q);
                      const mName = (p.users?.full_name || '').toLowerCase().includes(q);
                      const mTx = (p.transaction_id || '').toLowerCase().includes(q);
                      if (!mId && !mName && !mTx) return false;
                    }
                    return true;
                  }).length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs space-y-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                    <Receipt className="w-9 h-9 mx-auto text-slate-300 dark:text-slate-600" strokeWidth={1.75} />
                    <p className="font-bold text-slate-600 dark:text-slate-300 text-sm">
                      To'lov kvitansiyalari topilmadi
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      {paymentFilter === 'pending'
                        ? "Ayni vaqtda yangi kutilayotgan to'lov cheki yo'q."
                        : "Ushbu parametr bo'yicha hech qanday to'lov mavjud emas."}
                    </p>
                  </div>
                ) : (
                  paymentsList
                    .filter((p) => {
                      if (paymentFilter !== 'all' && p.status !== paymentFilter) return false;
                      if (paymentSearch.trim()) {
                        const q = paymentSearch.trim().toLowerCase();
                        const mId = (p.user_id || '').toLowerCase().includes(q);
                        const mName = (p.users?.full_name || '').toLowerCase().includes(q);
                        const mTx = (p.transaction_id || '').toLowerCase().includes(q);
                        if (!mId && !mName && !mTx) return false;
                      }
                      return true;
                    })
                    .map((payment) => {
                      const isPending = payment.status === 'pending';
                      const isApproved = payment.status === 'approved';
                      const isRejected = payment.status === 'rejected';
                      const isProcessing = processingPaymentId === payment.id;

                      return (
                        <div
                          key={payment.id}
                          className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3.5 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                        >
                          {/* Card Top Row: Student info & status badge */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                                {(payment.users?.full_name || 'Talaba').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                  <span>{payment.users?.full_name || 'Talaba'}</span>
                                  {payment.users?.has_paid && (
                                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                      VIP
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                                  <span>ID: {payment.user_id}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard?.writeText(payment.user_id);
                                      showNotification("Talaba ID nusxalandi!");
                                    }}
                                    className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    title="ID ni nusxalash"
                                  >
                                    <Copy className="w-3 h-3" strokeWidth={1.75} />
                                  </button>
                                  {payment.users?.university && (
                                    <span className="text-slate-500 dark:text-slate-400 font-sans truncate max-w-[160px]">
                                      • {payment.users.university}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-auto">
                              {isPending && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                  <Clock className="w-3 h-3" strokeWidth={1.75} />
                                  <span>Kutilmoqda</span>
                                </span>
                              )}
                              {isApproved && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                  <CheckCircle2 className="w-3 h-3" strokeWidth={1.75} />
                                  <span>Tasdiqlangan</span>
                                </span>
                              )}
                              {isRejected && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                  <AlertCircle className="w-3 h-3" strokeWidth={1.75} />
                                  <span>Rad etilgan</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Card Middle: Image and Details */}
                          <div className="flex flex-col sm:flex-row gap-4 items-start">
                            {/* Receipt Image Thumbnail */}
                            {payment.receipt_image_url ? (
                              <div
                                onClick={() => setSelectedReceiptImage(payment.receipt_image_url)}
                                className="relative group w-24 h-28 sm:w-28 sm:h-32 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 cursor-zoom-in shrink-0 shadow-2xs"
                              >
                                <img
                                  src={payment.receipt_image_url}
                                  alt="Kvitansiya"
                                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Eye className="w-5 h-5" strokeWidth={1.75} />
                                </div>
                                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/60 text-[9px] text-white font-bold backdrop-blur-xs">
                                  Ko'rish
                                </span>
                              </div>
                            ) : (
                              <div className="w-24 h-28 sm:w-28 sm:h-32 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 text-center p-2 shrink-0">
                                <Receipt className="w-6 h-6 mb-1 text-slate-300 dark:text-slate-600" strokeWidth={1.75} />
                                <span className="text-[10px] font-bold">Rasm yo'q</span>
                                <span className="text-[9px] text-slate-400">(Qo'lda)</span>
                              </div>
                            )}

                            {/* Details Grid */}
                            <div className="flex-1 space-y-2 text-xs w-full">
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <div>
                                  <span className="text-[10px] font-extrabold text-slate-400 uppercase block">
                                    To'lov Summasi:
                                  </span>
                                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                                    +{(Number(payment.amount) || 0).toLocaleString('uz-UZ')}{' '}
                                    <span className="text-xs font-bold text-slate-500">so'm</span>
                                  </span>
                                </div>

                                <div className="text-right">
                                  <span className="text-[10px] font-extrabold text-slate-400 uppercase block">
                                    Talaba Hozirgi Balansi:
                                  </span>
                                  <span className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                                    {(Number(payment.users?.balance) || 0).toLocaleString('uz-UZ')} so'm
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                                <div>
                                  <span className="text-slate-400">Tranzaksiya: </span>
                                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                    {payment.transaction_id || 'Mavjud emas'}
                                  </span>
                                </div>

                                <div>
                                  <span className="text-slate-400">Vaqti: </span>
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                                    {payment.created_at
                                      ? new Date(payment.created_at).toLocaleString('uz-UZ', {
                                          timeZone: 'Asia/Tashkent',
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })
                                      : 'Noma\'lum'}
                                  </span>
                                </div>

                                <div>
                                  <span className="text-slate-400">Tasdiqlash manbasi: </span>
                                  <span className="font-bold text-slate-700 dark:text-slate-300">
                                    {payment.verified_by === 'ai'
                                      ? '🤖 Gemini AI'
                                      : payment.verified_by === 'admin'
                                      ? '👤 Admin'
                                      : '⏳ Kutilmoqda'}
                                  </span>
                                </div>

                                {payment.sender_card && (
                                  <div>
                                    <span className="text-slate-400">Karta: </span>
                                    <span className="font-mono text-slate-700 dark:text-slate-300">
                                      {payment.sender_card}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Card Bottom Row: Action Buttons */}
                          {isPending && (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleApprovePayment(payment)}
                                  disabled={isProcessing}
                                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-all"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                                  <span>Tasdiqlash (+{(Number(payment.amount) || 0).toLocaleString('uz-UZ')} so'm)</span>
                                </button>

                                {/* Quick Subscription Activations */}
                                <button
                                  type="button"
                                  onClick={() => handleApprovePayment(payment, '3_months')}
                                  disabled={isProcessing}
                                  className="px-2.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800 transition-all"
                                  title="3 oylik VIP obuna yoqish"
                                >
                                  <span>🌟 3 Oylik VIP</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleApprovePayment(payment, '6_months')}
                                  disabled={isProcessing}
                                  className="px-2.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800 transition-all"
                                  title="6 oylik VIP obuna yoqish"
                                >
                                  <span>🌟 6 Oylik VIP</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleApprovePayment(payment, '1_year')}
                                  disabled={isProcessing}
                                  className="px-2.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800 transition-all"
                                  title="1 yillik VIP obuna yoqish"
                                >
                                  <span>🌟 1 Yillik VIP</span>
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRejectPayment(payment.id)}
                                disabled={isProcessing}
                                className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-200 dark:border-rose-900 transition-all"
                              >
                                <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                                <span>Rad etish</span>
                              </button>
                            </div>
                          )}

                          {isApproved && (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                              <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                                <span>To'lov tasdiqlangan va talaba hisobiga qo'shilgan</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => openManualTopUpForUser({ id: payment.user_id, name: payment.users?.full_name || 'Talaba' } as any)}
                                className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline font-semibold"
                              >
                                Yana balans qo'shish
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>

              {/* Receipt Image Zoom Modal */}
              {selectedReceiptImage && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
                  onClick={() => setSelectedReceiptImage(null)}
                >
                  <div
                    className="relative max-w-2xl max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl p-2 border border-slate-800 flex flex-col items-center animate-in zoom-in-95"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="w-full flex items-center justify-between p-2 pb-3 text-white">
                      <span className="text-xs font-bold flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
                        <span>Kvitansiya Tasviri</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <a
                          href={selectedReceiptImage}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" strokeWidth={1.75} />
                          <span>Yangi oynada</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => setSelectedReceiptImage(null)}
                          className="p-1 rounded-xl text-slate-400 hover:text-white bg-slate-800"
                        >
                          <X className="w-4 h-4" strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>
                    <img
                      src={selectedReceiptImage}
                      alt="Chek rasmi"
                      className="max-h-[78vh] w-auto object-contain rounded-2xl"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'universities' && (
            <>
              {/* Add New University Form */}
              <form onSubmit={handleAddUni} className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Yangi OTM qo'shish:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newUniName}
                    onChange={(e) => setNewUniName(e.target.value)}
                    placeholder="Masalan: Toshkent Davlat Yuridik Universiteti"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-600/20 active:scale-95 transition-all shrink-0"
                  >
                    <Plus className="w-4 h-4" strokeWidth={1.75} />
                    <span>Qo'shish</span>
                  </button>
                </div>
              </form>

              {/* Search Box */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" strokeWidth={1.75} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="OTM nomi bo'yicha qidirish..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              {/* Delete Confirmation Alert */}
              {deletingUni && (
                <div className="p-3 rounded-2xl bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-900/60 space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0 text-orange-500" strokeWidth={1.75} />
                    <span>Haqiqatan ham bu OTMni o'chirmoqchimisiz?</span>
                  </div>
                  <p className="text-[11px] text-orange-700 dark:text-orange-300 font-medium line-clamp-1">
                    "{deletingUni}"
                  </p>
                  <div className="flex items-center gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setDeletingUni(null)}
                      className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                    >
                      Bekor qilish
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteUni(deletingUni)}
                      className="px-3 py-1 rounded-lg bg-orange-600 text-white text-xs font-bold"
                    >
                      O'chirish
                    </button>
                  </div>
                </div>
              )}

              {/* University List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 px-1">
                  <span>OTM nomi ({filteredUniversities.length} ta)</span>
                  <span>Amallar</span>
                </div>

                {filteredUniversities.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-medium">
                    Mos keladigan OTM topilmadi
                  </div>
                ) : (
                  filteredUniversities.map((uni, idx) => (
                    <div
                      key={uni}
                      className="p-2.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shadow-xs transition-colors hover:border-emerald-300"
                    >
                      {editingUni?.originalName === uni ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editingUni.currentName}
                            onChange={(e) =>
                              setEditingUni({ originalName: uni, currentName: e.target.value })
                            }
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-500 text-xs text-slate-900 dark:text-white font-medium focus:outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(uni)}
                            className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" strokeWidth={1.75} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingUni(null)}
                            className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-mono text-slate-400 w-5 shrink-0">
                              {idx + 1}.
                            </span>
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {uni}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setEditingUni({ originalName: uni, currentName: uni })}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors"
                              title="Tahrirlash"
                            >
                              <Edit2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingUni(uni)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-slate-700 transition-colors"
                              title="O'chirish"
                            >
                              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {activeTab === 'pending' && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs">
                <span className="font-bold block mb-0.5">Talabalar taklif qilgan OTMlar</span>
                Foydalanuvchilar yangi test yaratish vaqtida kiritgan OTMlar shu yerda paydo bo'ladi.
              </div>

              {pendingUniversities.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" strokeWidth={1.75} />
                  <p className="font-bold">Hozircha yangi takliflar yo'q</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingUniversities.map((name, idx) => (
                    <div
                      key={name + idx}
                      className="p-3 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 block w-max mb-1">
                          Talaba taklifi
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {name}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleApprove(name)}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                        >
                          <Check className="w-3.5 h-3.5" strokeWidth={1.75} />
                          <span>Tasdiqlash</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(name)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-orange-100 text-slate-600 hover:text-orange-600 font-bold text-xs flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                          <span>Rad</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'news' && (
            <div className="space-y-4">
              {/* Sub-tab Navigation */}
              <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setNewsSubTab('send');
                  }}
                  className={`flex-1 py-1.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                    newsSubTab === 'send'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Xabar Yuborish</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setNewsSubTab('inquiries');
                  }}
                  className={`flex-1 py-1.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 relative ${
                    newsSubTab === 'inquiries'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Foydalanuvchilar Javoblari</span>
                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                    {announcementReplies.length}
                  </span>
                  {(announcementReplies || []).some((r) => !r.adminReply) && (
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse ml-0.5" />
                  )}
                </button>
              </div>

              {/* Sub-Tab 1: Send Announcement Form & Sent List */}
              {newsSubTab === 'send' && (
                <div className="space-y-4 animate-in fade-in">
                  <form onSubmit={handleSendNews} className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                      <span>Foydalanuvchilarga bildirishnoma va xabar yuborish:</span>
                    </h4>

                    {/* Broadcast report feedback */}
                    {broadcastReport && (
                      <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1 animate-in fade-in">
                        <div className="font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={1.75} />
                          <span>Yetkazish Natijasi</span>
                        </div>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                          {broadcastReport.message}
                        </p>
                        {broadcastReport.telegramBroadcast && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-emerald-200/50 dark:border-emerald-800/50 flex items-center gap-2">
                            <span>Telegram orqali yetkazildi: <b>{broadcastReport.telegramBroadcast.sent}</b> ta</span>
                            {broadcastReport.telegramBroadcast.failed > 0 && (
                              <span className="text-orange-500">Yetib bormadi: {broadcastReport.telegramBroadcast.failed} ta</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Title */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                        Sarlavha:
                      </label>
                      <input
                        type="text"
                        required
                        value={newsTitle}
                        onChange={(e) => setNewsTitle(e.target.value)}
                        placeholder="Masalan: HEMIS Oraliq Nazorat Testlari Boshlandi!"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Message Body */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                        Xabar matni:
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={newsMessage}
                        onChange={(e) => setNewsMessage(e.target.value)}
                        placeholder="Xabar matni... Talabalar bildirishnoma sifatida qabul qilishadi."
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 resize-none"
                      />
                    </div>

                    {/* Optional Link / Havola */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1 flex items-center justify-between">
                        <span>Havola (URL - ixtiyoriy):</span>
                        <span className="text-[9px] text-slate-400 font-normal">Tugma sifatida ochiladi</span>
                      </label>
                      <div className="relative">
                        <ExternalLink className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
                        <input
                          type="url"
                          value={newsLink}
                          onChange={(e) => setNewsLink(e.target.value)}
                          placeholder="https://t.me/YuksalQuizBot yoki https://..."
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Target Audience Selector */}
                    <div className="space-y-1.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                        Xabar kimlar uchun yuboriladi? (Auditoriya filtri):
                      </label>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                        {[
                          { id: 'all', label: 'Barchaga', icon: Users },
                          { id: 'university', label: 'OTM Talabalariga', icon: Building2 },
                          { id: 'region', label: 'Viloyatga', icon: MapPin },
                          { id: 'user', label: 'Aniq ID ga', icon: User },
                        ].map((target) => {
                          const Icon = target.icon;
                          const isSelected = newsTargetType === target.id;
                          return (
                            <button
                              key={target.id}
                              type="button"
                              onClick={() => {
                                triggerHaptic('selection');
                                setNewsTargetType(target.id as any);
                              }}
                              className={`p-2 rounded-xl border flex items-center justify-center gap-1 font-bold transition-all ${
                                isSelected
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-xs'
                                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                              <span>{target.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Dynamic Field Based on Target */}
                      {newsTargetType === 'university' && (
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in">
                          <SearchableUniversitySelect
                            label="Qaysi OTM yoki o'quv markazi talabalariga:"
                            value={newsTargetUni}
                            onChange={(val) => setNewsTargetUni(val)}
                            universities={universities}
                            allowCustom={false}
                          />
                        </div>
                      )}

                      {newsTargetType === 'region' && (
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">
                            Qaysi viloyat talabalariga:
                          </label>
                          <select
                            value={newsTargetRegion}
                            onChange={(e) => setNewsTargetRegion(e.target.value as any)}
                            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                          >
                            {UZBEKISTAN_REGIONS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {newsTargetType === 'user' && (
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">
                            Aniq Telegram ID yoki Talaba ID raqami:
                          </label>
                          <input
                            type="text"
                            required
                            value={newsTargetUser}
                            onChange={(e) => setNewsTargetUser(e.target.value)}
                            placeholder="Masalan: 6219808382 yoki user-qjhlguo..."
                            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                          />
                        </div>
                      )}
                    </div>

                    {/* Delivery Channel Selector */}
                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newsSendViaTelegram}
                          onChange={(e) => {
                            triggerHaptic('selection');
                            setNewsSendViaTelegram(e.target.checked);
                          }}
                          className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700"
                        />
                        <div className="text-xs">
                          <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Send className="w-3.5 h-3.5 text-blue-500" strokeWidth={1.75} />
                            <span>Telegram bot orqali ham yuborish (Direct sendMessage)</span>
                          </span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {newsSendViaTelegram ? (
                              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                Xabar Mini App'ga tushadi VA Telegram Bot API orqali talabaning chatiga to'g'ridan-to'g'ri yuboriladi.
                              </span>
                            ) : (
                              <span className="text-slate-400">
                                Xabar FAQAT Mini App ichidagi "Bildirishnomalar" bo'limiga tushadi va foydalanuvchi ilovaga kirganda qizil nuqta (badge) bilan ko'rinadi.
                              </span>
                            )}
                          </p>
                        </div>
                      </label>
                    </div>

                    {/* Tag & Submit Button */}
                    <div className="flex items-center justify-between pt-1">
                      <select
                        value={newsTag}
                        onChange={(e) => setNewsTag(e.target.value as any)}
                        className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                      >
                        <option value="yangilik">Yangilik</option>
                        <option value="eslatma">Eslatma</option>
                        <option value="muhim">Muhim</option>
                      </select>

                      <button
                        type="submit"
                        disabled={isSendingBroadcast}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 active:scale-95 transition-all disabled:cursor-not-allowed"
                      >
                        <Send className={`w-3.5 h-3.5 ${isSendingBroadcast ? 'animate-spin' : ''}`} strokeWidth={1.75} />
                        <span>{isSendingBroadcast ? 'Yuborilmoqda...' : 'Xabarni Yuborish'}</span>
                      </button>
                    </div>
                  </form>

                  {/* Existing Announcements List */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase px-1">
                      Yuborilgan bildirishnomalar ({announcements.length} ta)
                    </h4>
                    {announcements.map((ann) => (
                      <div
                        key={ann.id}
                        className="p-3 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 uppercase">
                              {ann.tag || 'yangilik'}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              Auditoriya: {ann.targetLabel || 'Barchaga'}
                            </span>
                            {ann.link && (
                              <a
                                href={ann.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                <ExternalLink className="w-2.5 h-2.5" strokeWidth={1.75} />
                                <span>Havola</span>
                              </a>
                            )}
                            <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">
                              {ann.title}
                            </h5>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {ann.message}
                          </p>
                          <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" strokeWidth={1.75} />
                            <span>{formatDateTime(ann.date, ann.time)}</span>
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-orange-500 transition-colors shrink-0"
                          title="O'chirish"
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-Tab 2: User Inquiries & Admin Replies */}
              {newsSubTab === 'inquiries' && (
                <div className="space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase">
                      Talabalar yozgan javoblar & murojaatlar ({announcementReplies.length} ta)
                    </h4>
                  </div>

                  {(!announcementReplies || announcementReplies.length === 0) ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" strokeWidth={1.75} />
                      <p className="font-bold">Hozircha foydalanuvchilardan xabar yoki savollar yo'q</p>
                      <p className="text-[11px] mt-0.5 text-slate-400">
                        Talabalar bildirishnomaga javob yozganda shu yerda paydo bo'ladi.
                      </p>
                    </div>
                  ) : (
                    announcementReplies.map((reply) => {
                      const hasReplied = !!reply.adminReply;
                      const replyText = adminReplyTexts[reply.id] || '';

                      return (
                        <div
                          key={reply.id}
                          className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2.5 shadow-xs"
                        >
                          {/* User Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                                  {reply.userName}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  • {reply.userUniversity || reply.userRegion}
                                </span>
                                {!hasReplied && (
                                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                                    Javob berilmagan
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 flex items-center gap-1">
                                <Pin className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={1.75} />
                                <span>{reply.announcementTitle}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" strokeWidth={1.75} />
                                <span>{formatDateTime(reply.date, reply.time)}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  deleteAnnouncementReply(reply.id);
                                  showNotification("Murojaat o'chirildi");
                                }}
                                className="p-1 text-slate-400 hover:text-orange-500 rounded-md transition-colors"
                                title="O'chirish"
                              >
                                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                              </button>
                            </div>
                          </div>

                          {/* User Message */}
                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 font-medium">
                            "{reply.message}"
                          </div>

                          {/* Existing Admin Reply (if sent) */}
                          {hasReplied && (
                            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
                              <div className="flex items-center justify-between text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mb-1">
                                <span className="flex items-center gap-1">
                                  <Check className="w-3 h-3" strokeWidth={1.75} />
                                  <span>Sizning javobingiz:</span>
                                </span>
                                <span>{formatDateTime(reply.adminReply!.date, reply.adminReply!.time)}</span>
                              </div>
                              <p className="text-emerald-950 dark:text-emerald-100 font-semibold">
                                {reply.adminReply!.message}
                              </p>
                            </div>
                          )}

                          {/* Admin Reply Form */}
                          <div className="pt-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={replyText}
                                onChange={(e) =>
                                  setAdminReplyTexts((prev) => ({
                                    ...prev,
                                    [reply.id]: e.target.value,
                                  }))
                                }
                                placeholder={hasReplied ? "Javobni tahrirlash..." : "Foydalanuvchiga javob yozish..."}
                                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleSendAdminReply(reply.id)}
                                disabled={!replyText.trim()}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1 shadow-sm shrink-0 active:scale-95 transition-all"
                              >
                                <Send className="w-3 h-3" strokeWidth={1.75} />
                                <span>{hasReplied ? "Yangilash" : "Javob qaytarish"}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Subscription Pricing Management */}
          {activeTab === 'pricing' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-3xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-xs text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                    <span>Obuna Narxlari Boshqaruvi</span>
                  </h4>
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300 mt-0.5">
                    Talabalar uchun 3 xil muddatdagi Premium obuna tariflarini belgilang va yangilang
                  </p>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                  3 xil tarif
                </span>
              </div>

              <form onSubmit={handleSavePrices} className="p-4 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* 3 Months */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 dark:text-white">3 Oylik Obuna</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">90 kun</span>
                    </div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block">Narxi (so'mda):</label>
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      value={priceForm3M}
                      onChange={(e) => setPriceForm3M(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-[10px] text-slate-400">Oraliq nazoratlar uchun tezkor reja</p>
                  </div>

                  {/* 6 Months */}
                  <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-950 dark:text-emerald-200">6 Oylik Obuna</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">Talabalar tanlovi</span>
                    </div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block">Asl narxi (so'mda):</label>
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      value={priceForm6M}
                      onChange={(e) => setPriceForm6M(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      20 000 vaucherli narxi: {Math.max(0, priceForm6M - 20000).toLocaleString('uz-UZ')} so'm
                    </p>
                  </div>

                  {/* 1 Year */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 dark:text-white">1 Yillik Obuna</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">365 kun</span>
                    </div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block">Narxi (so'mda):</label>
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      value={priceForm1Y}
                      onChange={(e) => setPriceForm1Y(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-[10px] text-slate-400">Cheksiz yillik to'liq kafolat</p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" strokeWidth={1.75} />
                    <span>Narxlarni saqlash va yangilash</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab 5: Payment Methods Management */}
          {activeTab === 'payments' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-3xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-xs text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                    <span>To'lov Usullari va Rekvizitlar</span>
                  </h4>
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300 mt-0.5">
                    Talabalar to'lov qilishi uchun karta va hisob raqamlarini boshqaring (qo'shish, o'chirish, yoqish/o'chirish)
                  </p>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                  {(paymentMethods || []).length} ta usul
                </span>
              </div>

              {/* Add Payment Method Form */}
              <form onSubmit={handleAddPaymentMethod} className="p-4 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3 shadow-sm">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.75} />
                  <span>Yangi to'lov usulini qo'shish:</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">To'lov tizimi nomi:</label>
                    <input
                      type="text"
                      value={newPayName}
                      onChange={(e) => setNewPayName(e.target.value)}
                      placeholder="Masalan: Payme, Click Up, Uzum..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Karta raqami / Rekvizitlar:</label>
                    <input
                      type="text"
                      value={newPayDetails}
                      onChange={(e) => setNewPayDetails(e.target.value)}
                      placeholder="8600 5505 1234 5678 (Yuksal Quiz)"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Ko'rsatma (Ixtiyoriy):</label>
                    <input
                      type="text"
                      value={newPayInstructions}
                      onChange={(e) => setNewPayInstructions(e.target.value)}
                      placeholder="Chekni @YuksalQuiz_bot ga yuboring"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={!newPayDetails.trim()}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>To'lov usulini qo'shish</span>
                  </button>
                </div>
              </form>

              {/* Payment Methods List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase px-1">
                  Mavjud To'lov Usullari ({paymentMethods?.length || 0})
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {(paymentMethods || []).map((pm) => (
                    <div
                      key={pm.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        pm.isActive
                          ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-xs'
                          : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-60'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white">{pm.name}</span>
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                              pm.isActive
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {pm.isActive ? 'Faol' : 'Nofaol'}
                          </span>
                        </div>
                        <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 truncate select-all">
                          {pm.details}
                        </p>
                        {pm.instructions && (
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{pm.instructions}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => togglePaymentMethod(pm.id)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                            pm.isActive
                              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {pm.isActive ? 'Yoqilgan' : "O'chirilgan"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            deletePaymentMethod(pm.id);
                            showNotification("To'lov usuli o'chirildi");
                          }}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-orange-500 transition-colors"
                          title="O'chirish"
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 6: Promocodes Management */}
          {activeTab === 'promocodes' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-3xl bg-orange-50/70 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-xs text-orange-950 dark:text-orange-100 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-orange-600 dark:text-orange-400" strokeWidth={1.75} />
                    <span>Promokodlar Boshqaruvi</span>
                  </h4>
                  <p className="text-[11px] text-orange-700/80 dark:text-orange-300 mt-0.5">
                    To'lov chekini botga yuborgan talabalar uchun maxsus faollashtirish promokodlarini yarating va taqdim eting
                  </p>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-500 text-white">
                  {(promocodes || []).length} ta promokod
                </span>
              </div>

              {/* Generate Promocode Form */}
              <form onSubmit={handleCreatePromo} className="p-4 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3 shadow-sm">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" strokeWidth={1.75} />
                  <span>Yangi Promokod Yaratish:</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      Qo'shiladigan Summa (so'm):
                    </label>
                    <input
                      type="number"
                      step="1000"
                      min="1000"
                      value={promoAmountInput}
                      onChange={(e) => setPromoAmountInput(Number(e.target.value))}
                      placeholder="30000"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {[15000, 30000, 50000, 70000, 90000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setPromoAmountInput(amt)}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border transition-all ${
                            promoAmountInput === amt
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {amt / 1000}k
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Mo'ljallangan Tarif (Ixtiyoriy):</label>
                    <select
                      value={promoPlanSelect}
                      onChange={(e) => setPromoPlanSelect(e.target.value as SubscriptionPlanType)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="3_months">3 Oylik (15 000 so'm vaucher bilan)</option>
                      <option value="6_months">6 Oylik (30 000 so'm vaucher bilan)</option>
                      <option value="1_year">1 Yillik (70 000 so'm vaucher bilan)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Promokod kodi:</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCodeInput}
                        onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                        placeholder="Masalan: YUK-30K-7193"
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                      />
                      <button
                        type="button"
                        onClick={handleGenerateRandomPromo}
                        className="px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 text-xs font-bold shrink-0 transition-colors"
                      >
                        Generatsiya
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={!promoCodeInput.trim()}
                    className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Promokodni Saqlash (+{(promoAmountInput || 30000).toLocaleString('uz-UZ')} so'm)</span>
                  </button>
                </div>
              </form>

              {/* Promocodes List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase px-1">
                  Barcha Promokodlar Ro'yxati ({promocodes?.length || 0})
                </h4>

                {(!promocodes || promocodes.length === 0) ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-medium">
                    Hozircha promokodlar yaratilmagan
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {promocodes.map((promo) => {
                      const promoAmount = promo.amount || (promo.plan === '3_months' ? 15000 : promo.plan === '1_year' ? 70000 : 30000);
                      const is3M = promo.plan === '3_months';
                      const is6M = promo.plan === '6_months';
                      const planBadge = is3M ? '3 oylik' : is6M ? '6 oylik' : '1 yillik';

                      return (
                        <div
                          key={promo.code}
                          className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            promo.isUsed
                              ? 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-60'
                              : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-xs'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-sm text-slate-900 dark:text-white tracking-wider select-all">
                                {promo.code}
                              </span>
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                +{promoAmount.toLocaleString('uz-UZ')} so'm
                              </span>
                              {promo.plan && (
                                <span className="text-[9px] font-bold px-1 py-0.2 rounded-md bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300">
                                  {planBadge}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                              <span>Yaratildi: {promo.createdAt}</span>
                              {promo.isUsed ? (
                                <span className="text-orange-500 font-bold">
                                  Ishlatilgan {promo.usedBy ? `(${promo.usedBy})` : ''}
                                </span>
                              ) : (
                                <span className="text-emerald-500 font-bold">Faol (Kutilmoqda)</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCopyPromo(promo.code)}
                              className="px-2.5 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 hover:bg-orange-100 text-xs font-bold border border-orange-200 dark:border-orange-800 flex items-center gap-1 transition-all active:scale-95"
                            >
                              {copiedCode === promo.code ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.75} />
                                  <span className="text-[10px] text-emerald-600">Nusxalandi</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />
                                  <span className="text-[10px]">Nusxa</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                deletePromocode(promo.code);
                                showNotification(`"${promo.code}" promokodi o'chirildi`);
                              }}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-orange-500 transition-colors"
                              title="O'chirish"
                            >
                              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'tests' && (
            <div className="space-y-4">
              <form onSubmit={handleCreateRecommendedTest} className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                  <span>Tavsiya etilgan rasmiy test qo'shish:</span>
                </h4>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Fan / Test nomi:
                  </label>
                  <input
                    type="text"
                    required
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    placeholder="Masalan: Ma'lumotlar tuzilmasi va algoritmlar..."
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <SearchableUniversitySelect
                      label="OTM:"
                      value={testUni}
                      onChange={(val) => setTestUni(val)}
                      universities={universities}
                      allowCustom={false}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Yo'nalish:
                    </label>
                    <select
                      value={testDept}
                      onChange={(e) => setTestDept(e.target.value as any)}
                      className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-medium"
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      O'quv yili:
                    </label>
                    <select
                      value={testAcademicYear}
                      onChange={(e) => setTestAcademicYear(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-medium"
                    >
                      {AVAILABLE_ACADEMIC_YEARS.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Semestr:
                    </label>
                    <select
                      value={testSemester}
                      onChange={(e) => setTestSemester(Number(e.target.value))}
                      className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-medium"
                    >
                      {AVAILABLE_SEMESTERS.map((s) => (
                        <option key={s} value={s}>
                          {s}-semestr ({Math.ceil(s / 2)}-kurs)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" strokeWidth={1.75} />
                  <span>Tavsiya etilgan test sifatida chiqarish</span>
                </button>
              </form>

              {/* Test Management Section (Admin Delete Any Test) */}
              <div className="space-y-3 pt-3 border-t border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                    <span>Tizimdagi barcha testlar ({testPackages.length} ta)</span>
                  </h4>
                  {testPackages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('warning');
                        setShowClearAllConfirm(true);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-bold text-[11px] border border-orange-200 dark:border-orange-900/60 active:scale-95 transition-all flex items-center gap-1"
                      title="Barcha testlarni bitta bosishda tozalash"
                    >
                      <Trash2 className="w-3 h-3" strokeWidth={1.75} />
                      <span>Barchasini tozalash</span>
                    </button>
                  )}
                </div>

                {/* Search & Category Filter */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" strokeWidth={1.75} />
                    <input
                      type="text"
                      value={adminTestSearch}
                      onChange={(e) => setAdminTestSearch(e.target.value)}
                      placeholder="Nomi, OTM yoki muallif bo'yicha qidirish..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <select
                    value={adminTestCategoryFilter}
                    onChange={(e) => setAdminTestCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium"
                  >
                    <option value="all">Barcha kategoriyalar</option>
                    <option value="Oliy Ta'lim (HEMIS)">Oliy Ta'lim (HEMIS)</option>
                    <option value="O'quv Markazi">O'quv Markazi</option>
                    <option value="Xalqaro Sertifikatlar (IELTS, TOPIK, SAT, TOEFL)">Xalqaro Sertifikatlar</option>
                    <option value="Abituriyent">Abituriyent</option>
                    <option value="Maktab">Maktab</option>
                  </select>
                </div>

                {/* Test Cards List */}
                {filteredAdminTests.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <p className="font-bold text-slate-600 dark:text-slate-300">Testlar topilmadi</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {testPackages.length === 0
                        ? "Hozirda tizimda hech qanday test mavjud emas."
                        : "Qidiruv so'zini yoki filtrni o'zgartirib ko'ring."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {filteredAdminTests.map((pkg) => (
                      <div
                        key={pkg.id}
                        className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-xs flex items-center justify-between gap-3 transition-all hover:border-slate-300 dark:hover:border-slate-600"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                              {pkg.category || "Oliy Ta'lim (HEMIS)"}
                            </span>
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {decodeHtmlEntities(pkg.department || '')}
                            </span>
                            {!pkg.isPublic ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                                Parolli
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                                Ochiq
                              </span>
                            )}
                            {pkg.isCommunityCreated && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                                Foydalanuvchi testi
                              </span>
                            )}
                            {(pkg.semester || pkg.academicYear) && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50">
                                {pkg.semester ? `${pkg.semester}-semestr` : ''}
                                {pkg.semester && pkg.academicYear ? ' • ' : ''}
                                {pkg.academicYear ? `${pkg.academicYear}` : ''}
                              </span>
                            )}
                          </div>

                          <h5 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                            {decodeHtmlEntities(pkg.title)}
                          </h5>

                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {decodeHtmlEntities(pkg.university || '')}
                            </span>
                            <span>•</span>
                            <span>Muallif: <strong className="text-slate-800 dark:text-slate-200">{decodeHtmlEntities(pkg.authorName || '')}</strong></span>
                            <span>•</span>
                            <span>{pkg.totalQuestions} ta savol ({pkg.blocks.length} blok)</span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteTestByAdmin(pkg)}
                            className="px-2.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/50 dark:hover:bg-orange-900/60 text-orange-600 dark:text-orange-400 font-bold text-xs transition-colors flex items-center gap-1 active:scale-95 border border-orange-200 dark:border-orange-800/60"
                            title="Admin sifatida testni o'chirish"
                          >
                            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                            <span className="text-[11px]">O'chirish</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Supabase Cloud Database Tab */}
          {activeTab === 'supabase' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Header Card */}
              <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/25 shrink-0 mt-0.5">
                    <Cloud className="w-5 h-5 text-white" strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        Supabase Bulutli Baza (Umumiy Testlar Markazi)
                      </h4>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          getSupabaseConfig().isConfigured
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {getSupabaseConfig().isConfigured ? 'Ulangan' : 'Ulanmagan'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Supabase orqali bir foydalanuvchi yaratgan barcha testlar real vaqtda markaziy bazaga saqlanadi va boshqa barcha talabalarda avtomatik ko'rinadi.
                    </p>
                  </div>
                </div>
              </div>

              {/* Status or Test Result Notification */}
              {supabaseStatusResult && (
                <div
                  className={`p-3.5 rounded-2xl text-xs font-bold flex items-start gap-2.5 animate-in fade-in ${
                    supabaseStatusResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                      : 'bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200'
                  }`}
                >
                  {supabaseStatusResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" strokeWidth={1.75} />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" strokeWidth={1.75} />
                  )}
                  <div className="flex-1">
                    <span>{supabaseStatusResult.message}</span>
                  </div>
                </div>
              )}

              {/* Supabase Configuration Form */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">
                      Ulanish Kalitlari (Project API)
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      Supabase boshqaruv panelidan Project Settings &gt; API orqali olingan kalitlarni kiriting
                    </p>
                  </div>
                  {getSupabaseConfig().source === 'env' && (
                    <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-200/50">
                      .env orqali yuklangan
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Project URL:
                      </label>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        https:// bilan boshlanishi kerak
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="https://your-project-id.supabase.co"
                      value={supabaseUrlInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const normalized = normalizeSupabaseUrl(raw);
                        setSupabaseUrlInput(normalized);
                        // If user accidentally pasted the anon key into URL and anon key was empty
                        if (raw.trim().startsWith('eyJ') && !supabaseKeyInput.trim()) {
                          setSupabaseKeyInput(raw.trim());
                        }
                      }}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Supabase boshqaruv panelida: <b>Project Settings &gt; API &gt; Project URL</b> (masalan: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">https://xyz.supabase.co</code>)
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Anon (Public) API Key:
                      </label>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        eyJ... deb boshlanadi
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={supabaseKeyInput}
                      onChange={(e) => setSupabaseKeyInput(e.target.value.trim())}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Supabase boshqaruv panelida: <b>Project Settings &gt; API &gt; Project API Keys &gt; anon public</b>
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      saveSupabaseConfig(supabaseUrlInput, supabaseKeyInput);
                      triggerHaptic('success');
                      showNotification("Supabase sozlamalari muvaffaqiyatli saqlandi!");
                    }}
                    className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                  >
                    Saqlash
                  </button>

                  <button
                    type="button"
                    disabled={isTestingSupabase || !supabaseUrlInput.trim() || !supabaseKeyInput.trim()}
                    onClick={async () => {
                      triggerHaptic('selection');
                      setIsTestingSupabase(true);
                      setSupabaseStatusResult(null);
                      const res = await testSupabaseConnection(supabaseUrlInput, supabaseKeyInput);
                      setIsTestingSupabase(false);
                      setSupabaseStatusResult(res);
                      triggerHaptic(res.success ? 'success' : 'error');
                    }}
                    className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-bold text-xs active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingSupabase ? 'animate-spin' : ''}`} strokeWidth={1.75} />
                    <span>{isTestingSupabase ? 'Tekshirilmoqda...' : 'Ulanishni tekshirish'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSyncingSupabase || !getSupabaseConfig().isConfigured}
                    onClick={async () => {
                      triggerHaptic('medium');
                      setIsSyncingSupabase(true);
                      const res = await syncAllTestsWithCloud();
                      setIsSyncingSupabase(false);
                      showNotification(res.message);
                      triggerHaptic(res.success ? 'success' : 'error');
                    }}
                    className="py-2.5 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold text-xs active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50 ml-auto"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSupabase ? 'animate-spin' : ''}`} strokeWidth={1.75} />
                    <span>{isSyncingSupabase ? 'Sinxronlanmoqda...' : 'Hamma testlarni sinxronlash'}</span>
                  </button>
                </div>
              </div>

              {/* Ready SQL Schema Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                    <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">
                      Supabase SQL Jadval Skripti (Bir martalik o'rnatish)
                    </h5>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const sqlContent = `CREATE TABLE IF NOT EXISTS public.test_packages (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Oliy Ta''lim (HEMIS)',
  university TEXT NOT NULL,
  is_custom_university BOOLEAN DEFAULT false,
  is_pending_review BOOLEAN DEFAULT false,
  department TEXT NOT NULL,
  is_public BOOLEAN DEFAULT true,
  password TEXT,
  total_questions INTEGER DEFAULT 0,
  blocks JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  author_id TEXT,
  author_name TEXT,
  is_community_created BOOLEAN DEFAULT true,
  author_wallet_balance NUMERIC DEFAULT 0
);

ALTER TABLE public.test_packages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'test_packages' AND policyname = 'Allow public read access') THEN
    CREATE POLICY "Allow public read access" ON public.test_packages FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'test_packages' AND policyname = 'Allow public insert access') THEN
    CREATE POLICY "Allow public insert access" ON public.test_packages FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'test_packages' AND policyname = 'Allow public update access') THEN
    CREATE POLICY "Allow public update access" ON public.test_packages FOR UPDATE TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'test_packages' AND policyname = 'Allow public delete access') THEN
    CREATE POLICY "Allow public delete access" ON public.test_packages FOR DELETE TO anon, authenticated USING (true);
  END IF;
END $$;

-- OTMlar umumiy sinxronizatsiya jadvali
CREATE TABLE IF NOT EXISTS public.universities (
  name TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'universities' AND policyname = 'Allow public read universities') THEN
    CREATE POLICY "Allow public read universities" ON public.universities FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'universities' AND policyname = 'Allow public insert universities') THEN
    CREATE POLICY "Allow public insert universities" ON public.universities FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'universities' AND policyname = 'Allow public update universities') THEN
    CREATE POLICY "Allow public update universities" ON public.universities FOR UPDATE TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'universities' AND policyname = 'Allow public delete universities') THEN
    CREATE POLICY "Allow public delete universities" ON public.universities FOR DELETE TO anon, authenticated USING (true);
  END IF;
END $$;

-- Talabalar Reyting (Leaderboard) sinxronizatsiya jadvali
CREATE TABLE IF NOT EXISTS public.leaderboard_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  university TEXT,
  avatar TEXT DEFAULT '/avatars/avatar_1.png',
  academic_year INTEGER DEFAULT 1,
  coins INTEGER DEFAULT 0,
  tests_completed INTEGER DEFAULT 0,
  correct_answers_count INTEGER DEFAULT 0,
  score_points INTEGER DEFAULT 0,
  total_questions_attempted INTEGER DEFAULT 0,
  accuracy_percentage INTEGER DEFAULT 80,
  best_time TEXT DEFAULT '02:45',
  best_time_seconds INTEGER DEFAULT 165,
  total_time_spent_seconds INTEGER DEFAULT 0,
  total_time_spent_formatted TEXT DEFAULT '00:00',
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.leaderboard_users ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leaderboard_users' AND policyname = 'Allow public read leaderboard_users') THEN
    CREATE POLICY "Allow public read leaderboard_users" ON public.leaderboard_users FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leaderboard_users' AND policyname = 'Allow public insert leaderboard_users') THEN
    CREATE POLICY "Allow public insert leaderboard_users" ON public.leaderboard_users FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leaderboard_users' AND policyname = 'Allow public update leaderboard_users') THEN
    CREATE POLICY "Allow public update leaderboard_users" ON public.leaderboard_users FOR UPDATE TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leaderboard_users' AND policyname = 'Allow public delete leaderboard_users') THEN
    CREATE POLICY "Allow public delete leaderboard_users" ON public.leaderboard_users FOR DELETE TO anon, authenticated USING (true);
  END IF;
END $$;

-- P2P To'lovlar (payments) jadvali
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  receipt_image_url TEXT,
  transaction_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON public.payments (transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments (user_id);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Allow public insert payments" ON public.payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update payments" ON public.payments FOR UPDATE USING (true);

-- Foydalanuvchilar (users) obuna holati
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  university TEXT,
  region TEXT,
  coins NUMERIC DEFAULT 0,
  has_paid BOOLEAN DEFAULT false,
  paid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS has_paid BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS paid_until TIMESTAMPTZ;`;
                      navigator.clipboard.writeText(sqlContent);
                      triggerHaptic('success');
                      setCopiedSql(true);
                      setTimeout(() => setCopiedSql(false), 2500);
                    }}
                    className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.75} />
                        <span className="text-emerald-600 font-bold">Nusxalandi!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />
                        <span>SQL Kodini Nusxalash</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-slate-950 text-slate-200 p-3.5 rounded-2xl text-[11px] font-mono leading-relaxed overflow-x-auto max-h-48 border border-slate-800">
                  <pre>{`-- Supabase SQL Editor ga qo'yib, 'RUN' tugmasini bosing:
CREATE TABLE IF NOT EXISTS public.test_packages (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Oliy Ta''lim (HEMIS)',
  university TEXT NOT NULL,
  is_custom_university BOOLEAN DEFAULT false,
  is_pending_review BOOLEAN DEFAULT false,
  department TEXT NOT NULL,
  is_public BOOLEAN DEFAULT true,
  password TEXT,
  total_questions INTEGER DEFAULT 0,
  blocks JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  author_id TEXT,
  author_name TEXT,
  is_community_created BOOLEAN DEFAULT true,
  author_wallet_balance NUMERIC DEFAULT 0
);

ALTER TABLE public.test_packages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'test_packages' AND policyname = 'Allow public read access') THEN
    CREATE POLICY "Allow public read access" ON public.test_packages FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'test_packages' AND policyname = 'Allow public insert access') THEN
    CREATE POLICY "Allow public insert access" ON public.test_packages FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
END $$;

-- OTMlar (Universitetlar) sinxronizatsiya jadvali
CREATE TABLE IF NOT EXISTS public.universities (
  name TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'universities' AND policyname = 'Allow public read universities') THEN
    CREATE POLICY "Allow public read universities" ON public.universities FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'universities' AND policyname = 'Allow public insert universities') THEN
    CREATE POLICY "Allow public insert universities" ON public.universities FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
END $$;

-- Talabalar Reyting (Leaderboard) sinxronizatsiya jadvali
CREATE TABLE IF NOT EXISTS public.leaderboard_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  university TEXT,
  avatar TEXT DEFAULT '/avatars/avatar_1.png',
  academic_year INTEGER DEFAULT 1,
  coins INTEGER DEFAULT 0,
  tests_completed INTEGER DEFAULT 0,
  correct_answers_count INTEGER DEFAULT 0,
  score_points INTEGER DEFAULT 0,
  total_questions_attempted INTEGER DEFAULT 0,
  accuracy_percentage INTEGER DEFAULT 80,
  best_time TEXT DEFAULT '02:45',
  best_time_seconds INTEGER DEFAULT 165,
  total_time_spent_seconds INTEGER DEFAULT 0,
  total_time_spent_formatted TEXT DEFAULT '00:00',
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.leaderboard_users ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leaderboard_users' AND policyname = 'Allow public read leaderboard_users') THEN
    CREATE POLICY "Allow public read leaderboard_users" ON public.leaderboard_users FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leaderboard_users' AND policyname = 'Allow public insert leaderboard_users') THEN
    CREATE POLICY "Allow public insert leaderboard_users" ON public.leaderboard_users FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
END $$;`}</pre>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-950 dark:text-emerald-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.75} />
                    <span>Qanday ulanadi (2 daqiqalik qo'llanma):</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                    <li><b>supabase.com</b> saytida bepul ro'yxatdan o'tib, yangi loyiha (New Project) yarating.</li>
                    <li>Loyihangizning <b>SQL Editor</b> bo'limiga kirib, yuqoridagi SQL kodni qo'ying va <b>RUN</b> ni bosing.</li>
                    <li><b>Project Settings &gt; API</b> bo'limidan URL va anon keyni nusxalab, yuqoridagi maydonlarga joylang va <b>Saqlash</b> ni bosing.</li>
                    <li>Bo'ldi! Endi kim test tuzsa, bir zumda butun platformadagi hamma talabalarda ko'rinadi.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Security & Backup Management Tab */}
          {activeTab === 'security' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                      Xavfsizlik & Zaxira Markazi
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Tizim xavfsizlik protokollari va ma'lumotlar zaxirasi
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                  100% Himoyalangan
                </span>
              </div>

              {/* Status Indicators */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                    <Check className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>SHA-256 Anti-Tamper</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Balans va tangalar o'zgartirilishdan himoyalangan.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                    <Check className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Brute-Force Rate Limiter</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Admin login parolini terish hujumidan 15 min blok.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                    <Check className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>XSS & Script Sanitizer</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Foydalanuvchi kiritgan testlar va maydonlar tozalanadi.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                    <Check className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Anti-Cheat Engine</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Savollarga tezlik monitoringi va botlarga qarshi filtr.
                  </p>
                </div>
              </div>

              {/* Admin Telegram Whitelist Management */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                      <span>Admin Telegram ID Ruxsatnomalari (Whitelist)</span>
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Faqat quyidagi Telegram ID egalari Admin paneliga kira oladi.
                    </p>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    {authorizedAdminIds.length} ta admin
                  </span>
                </div>

                {/* Add new Admin Telegram ID form */}
                <form onSubmit={handleAddAdminId} className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newAdminIdInput}
                    onChange={(e) => setNewAdminIdInput(e.target.value)}
                    placeholder="Yangi Admin Telegram ID (masalan: 6219808382)..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-600/20 active:scale-95 transition-all shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Qo'shish</span>
                  </button>
                </form>

                {/* Whitelist ID list */}
                <div className="space-y-1.5">
                  {authorizedAdminIds.map((id) => (
                    <div
                      key={id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.75} />
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          Telegram ID: {id}
                        </span>
                        {id === '6219808382' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                            Bosh Administrator
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(id);
                            triggerHaptic('light');
                            showNotification(`Telegram ID (${id}) nusxalandi!`);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                          title="Nusxalash"
                        >
                          <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </button>
                        {authorizedAdminIds.length > 1 && id !== '6219808382' && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAdminId(id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                            title="O'chirish"
                          >
                            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Backup & Recovery Actions */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-3">
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                    <span>Ma'lumotlar Zaxirasi (Disaster Recovery)</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    "Shuncha harakat yo'q bo'lmasin": Barcha ma'lumotlarni kompyuterga saqlab qo'yish yoki qayta tiklash
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 font-bold text-xs flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all text-center"
                  >
                    <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                    <span>Zaxirani yuklab olish (JSON)</span>
                  </button>

                  <label className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold text-xs flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all text-center cursor-pointer">
                    <Upload className="w-4 h-4 text-slate-600 dark:text-slate-300" strokeWidth={1.75} />
                    <span>Zaxirani tiklash (Yuklash)</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackupFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Emergency Danger Zone */}
              <div className="p-4 rounded-3xl bg-orange-50/60 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 space-y-2">
                <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300 font-extrabold text-xs">
                  <ShieldAlert className="w-4 h-4" strokeWidth={1.75} />
                  <span>Favqulodda Holat (Testlarni tozalash)</span>
                </div>
                <p className="text-[10px] text-orange-600/80 dark:text-orange-400">
                  Foydalanuvchilar o'zlari test tuzishlari uchun tizimdagi barcha testlarni bitta bosishda tozalash.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('warning');
                    setShowClearAllConfirm(true);
                  }}
                  className="px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-600/20 active:scale-95 transition-all"
                >
                  Barcha testlarni tozalash
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs active:scale-95 transition-all"
          >
            Yopish
          </button>
        </div>

        {/* Admin Clear All Tests Confirmation Modal */}
        {showClearAllConfirm && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-center animate-in zoom-in-95">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-100 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-4">
                <ShieldAlert className="w-7 h-7" strokeWidth={1.75} />
              </div>

              <h3 className="font-extrabold text-base text-slate-900 dark:white mb-2">
                Barcha testlarni tozalash
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                Rostdan ham tizimdagi va bulutli bazadagi <b className="text-orange-600 dark:text-orange-400">BARCHA testlarni</b> butunlay tozalashni tasdiqlaysizmi? Bu amal qaytarib bo'lmaydi!
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowClearAllConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={handleClearAllTestsByAdmin}
                  className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-600/30 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Ha, barchasini tozalash</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Test Delete Confirmation Modal */}
        {deletingTestPkg && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-center animate-in zoom-in-95">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-100 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-4">
                <Trash2 className="w-7 h-7" strokeWidth={1.75} />
              </div>

              <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-2">
                Admin: Testni o'chirish
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                Ushbu testni tizimdan va bulutli bazadan butunlay o'chirishni tasdiqlaysizmi?
              </p>

              <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 mb-5 text-left text-xs space-y-1">
                <p className="font-black text-slate-900 dark:text-white truncate">{deletingTestPkg.title}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  OTM: <span className="text-slate-700 dark:text-slate-300 font-medium">{deletingTestPkg.university}</span>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Muallif: <span className="text-slate-700 dark:text-slate-300 font-medium">{deletingTestPkg.authorName}</span> ({deletingTestPkg.authorId})
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Savollar: <span className="text-slate-700 dark:text-slate-300 font-medium">{deletingTestPkg.totalQuestions} ta</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isDeletingTest}
                  onClick={() => setDeletingTestPkg(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  disabled={isDeletingTest}
                  onClick={handleConfirmDeleteTestByAdmin}
                  className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-600/30 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  {isDeletingTest ? (
                    <span>O'chirilmoqda...</span>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                      <span>Ha, o'chirish</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
