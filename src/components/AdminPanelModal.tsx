import React, { useState } from 'react';
import { useQuizStore } from '../store/useQuizStore';
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
} from '../types';
import { exportEncryptedBackup, importEncryptedBackup, sanitizeText } from '../utils/security';
import { formatDateTime } from '../utils/announcements';
import { getSupabaseConfig, saveSupabaseConfig, testSupabaseConnection, normalizeSupabaseUrl } from '../services/supabase';
import { syncAllTestsWithCloud, fetchCloudTests } from '../services/testSyncService';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({ isOpen, onClose }) => {
  const {
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

  const [activeTab, setActiveTab] = useState<
    'universities' | 'pending' | 'news' | 'supabase' | 'tests' | 'pricing' | 'payments' | 'promocodes' | 'security'
  >('universities');
  const [searchQuery, setSearchQuery] = useState('');
  const [newUniName, setNewUniName] = useState('');
  const [editingUni, setEditingUni] = useState<{ originalName: string; currentName: string } | null>(null);
  const [deletingUni, setDeletingUni] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

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
  const [newsTag, setNewsTag] = useState<'yangilik' | 'eslatma' | 'muhim'>('yangilik');
  const [newsTargetType, setNewsTargetType] = useState<AnnouncementTargetType>('all');
  const [newsTargetUni, setNewsTargetUni] = useState(universities[0] || 'TATU');
  const [newsTargetRegion, setNewsTargetRegion] = useState<Region>('Toshkent shahri');
  const [newsTargetUser, setNewsTargetUser] = useState('');
  const [newsSubTab, setNewsSubTab] = useState<'send' | 'inquiries'>('send');
  const [adminReplyTexts, setAdminReplyTexts] = useState<Record<string, string>>({});

  // Simple recommended test creator state
  const [testTitle, setTestTitle] = useState('');
  const [testUni, setTestUni] = useState(universities[0] || 'TATU');
  const [testDept, setTestDept] = useState<DepartmentType>('Axborot Texnologiyalari');

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

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
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
    setNewUniName('');
    triggerHaptic('success');
    showNotification(`"${trimmed}" muvaffaqiyatli qo'shildi!`);
  };

  const handleSaveEdit = (originalName: string) => {
    if (!editingUni) return;
    const trimmed = editingUni.currentName.trim();
    if (!trimmed) return;

    updateUniversity(originalName, trimmed);
    setEditingUni(null);
    triggerHaptic('success');
    showNotification(`OTM nomi yangilandi: "${trimmed}"`);
  };

  const handleDeleteUni = (name: string) => {
    deleteUniversity(name);
    setDeletingUni(null);
    triggerHaptic('warning');
    showNotification(`"${name}" o'chirildi`);
  };

  const handleApprove = (name: string) => {
    approvePendingUniversity(name);
    triggerHaptic('success');
    showNotification(`"${name}" tasdiqlandi va ro'yxatga qo'shildi!`);
  };

  const handleReject = (name: string) => {
    rejectPendingUniversity(name);
    triggerHaptic('light');
    showNotification(`"${name}" taklifi rad etildi`);
  };

  const handleSendNews = (e: React.FormEvent) => {
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
      targetLabel = `Shaxsiy: ${newsTargetUser.trim()}`;
    }

    addAnnouncement({
      title: newsTitle.trim(),
      message: newsMessage.trim(),
      tag: newsTag,
      targetType: newsTargetType,
      targetValue,
      targetLabel,
    });

    setNewsTitle('');
    setNewsMessage('');
    setNewsTargetUser('');
    triggerHaptic('success');
    showNotification("Xabar muvaffaqiyatli yuborildi va belgilangan auditoriya bildirishnomasiga qo'shildi!");
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
    setTestTitle('');
    triggerHaptic('success');
    showNotification(`"${newPkg.title}" tavsiya etilgan test sifatida yaratildi!`);
  };

  const filteredUniversities = universities.filter((u) =>
    u.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl lg:max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>YuksalQuiz Admin Paneli</span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  v1.0
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  Himoyalangan
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                OTMlar, to'lovlar, promokodlar va tizim boshqaruvi
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold text-center animate-in fade-in shadow-md">
            {feedback}
          </div>
        )}

        {/* Navigation Tabs - Responsive Scrollable Bar */}
        <div className="flex items-center gap-1.5 p-2 bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-100 dark:border-slate-800 text-[11px] overflow-x-auto scrollbar-none">
          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('universities');
            }}
            className={`py-2 px-3 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'universities'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>OTMlar</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('pending');
            }}
            className={`py-2 px-3 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all relative ${
              activeTab === 'pending'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Takliflar</span>
            {pendingUniversities.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('news');
            }}
            className={`py-2 px-3 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all relative ${
              activeTab === 'news'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Xabarlar</span>
            {(announcementReplies || []).some((r) => !r.adminReply) && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('pricing');
            }}
            className={`py-2 px-3 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'pricing'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Obuna Narxlari</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('payments');
            }}
            className={`py-2 px-3 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'payments'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>To'lov Usullari</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('promocodes');
            }}
            className={`py-2 px-3 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'promocodes'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Promokodlar</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('tests');
            }}
            className={`py-2 px-3 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'tests'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Testlar</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('supabase');
            }}
            className={`py-2 px-3 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'supabase'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-sky-500" />
            <span>Supabase Baza</span>
            {getSupabaseConfig().isConfigured ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('security');
            }}
            className={`py-2 px-3 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'security'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Xavfsizlik</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-indigo-600/20 active:scale-95 transition-all shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Qo'shish</span>
                  </button>
                </div>
              </form>

              {/* Search Box */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="OTM nomi bo'yicha qidirish..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              {/* Delete Confirmation Alert */}
              {deletingUni && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>Haqiqatan ham bu OTMni o'chirmoqchimisiz?</span>
                  </div>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 font-medium line-clamp-1">
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
                      className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold"
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
                      className="p-2.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shadow-xs transition-colors hover:border-indigo-300"
                    >
                      {editingUni?.originalName === uni ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editingUni.currentName}
                            onChange={(e) =>
                              setEditingUni({ originalName: uni, currentName: e.target.value })
                            }
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-indigo-500 text-xs text-slate-900 dark:text-white font-medium focus:outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(uni)}
                            className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingUni(null)}
                            className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
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
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors"
                              title="Tahrirlash"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingUni(uni)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors"
                              title="O'chirish"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
                  <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
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
                          <Check className="w-3.5 h-3.5" />
                          <span>Tasdiqlash</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(name)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-rose-100 text-slate-600 hover:text-rose-600 font-bold text-xs flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
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
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
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
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Foydalanuvchilar Javoblari</span>
                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                    {announcementReplies.length}
                  </span>
                  {(announcementReplies || []).some((r) => !r.adminReply) && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse ml-0.5" />
                  )}
                </button>
              </div>

              {/* Sub-Tab 1: Send Announcement Form & Sent List */}
              {newsSubTab === 'send' && (
                <div className="space-y-4 animate-in fade-in">
                  <form onSubmit={handleSendNews} className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Foydalanuvchilarga yangilik yoki xabar yuborish:</span>
                    </h4>

                    {/* Title */}
                    <div>
                      <input
                        type="text"
                        required
                        value={newsTitle}
                        onChange={(e) => setNewsTitle(e.target.value)}
                        placeholder="Sarlavha (masalan: Yangi fan testlari qo'shildi)..."
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Message Body */}
                    <div>
                      <textarea
                        required
                        rows={3}
                        value={newsMessage}
                        onChange={(e) => setNewsMessage(e.target.value)}
                        placeholder="Xabar matni... Foydalanuvchilar bildirishnoma sifatida qabul qilishadi va javob qaytara olishadi."
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                    </div>

                    {/* Target Audience Selector */}
                    <div className="space-y-1.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                        Xabar kimlar uchun yuboriladi? (Auditoriya):
                      </label>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                        {[
                          { id: 'all', label: 'Barchaga', icon: Users },
                          { id: 'university', label: 'OTM / Markaz', icon: Building2 },
                          { id: 'region', label: 'Viloyat', icon: MapPin },
                          { id: 'user', label: 'Shaxsiy', icon: User },
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
                                  ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              <span>{target.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Dynamic Field Based on Target */}
                      {newsTargetType === 'university' && (
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">
                            Qaysi OTM yoki o'quv markazi talabalariga:
                          </label>
                          <select
                            value={newsTargetUni}
                            onChange={(e) => setNewsTargetUni(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                          >
                            {universities.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
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
                            Talaba ID'si yoki Ismi:
                          </label>
                          <input
                            type="text"
                            required
                            value={newsTargetUser}
                            onChange={(e) => setNewsTargetUser(e.target.value)}
                            placeholder="Masalan: user-abc123 yoki Sherzod..."
                            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium"
                          />
                        </div>
                      )}
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
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-1.5 active:scale-95"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Xabarni Yuborish</span>
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
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 uppercase">
                              {ann.tag || 'yangilik'}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              Auditoriya: {ann.targetLabel || 'Barchaga'}
                            </span>
                            <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">
                              {ann.title}
                            </h5>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {ann.message}
                          </p>
                          <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{formatDateTime(ann.date, ann.time)}</span>
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            deleteAnnouncement(ann.id);
                            showNotification("Bildirishnoma o'chirildi");
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition-colors shrink-0"
                          title="O'chirish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
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
                              <div className="text-[10px] text-indigo-500 font-bold mt-0.5 flex items-center gap-1">
                                <Pin className="w-3 h-3 text-indigo-500 shrink-0" />
                                <span>{reply.announcementTitle}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{formatDateTime(reply.date, reply.time)}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  deleteAnnouncementReply(reply.id);
                                  showNotification("Murojaat o'chirildi");
                                }}
                                className="p-1 text-slate-400 hover:text-rose-500 rounded-md transition-colors"
                                title="O'chirish"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
                                  <Check className="w-3 h-3" />
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
                                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleSendAdminReply(reply.id)}
                                disabled={!replyText.trim()}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1 shadow-sm shrink-0 active:scale-95 transition-all"
                              >
                                <Send className="w-3 h-3" />
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
              <div className="p-4 rounded-3xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-xs text-indigo-950 dark:text-indigo-100 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Obuna Narxlari Boshqaruvi</span>
                  </h4>
                  <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300 mt-0.5">
                    Talabalar uchun 3 xil muddatdagi Premium obuna tariflarini belgilang va yangilang
                  </p>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                  3 xil tarif
                </span>
              </div>

              <form onSubmit={handleSavePrices} className="p-4 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* 3 Months */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 dark:text-white">3 Oylik Obuna</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400">90 kun</span>
                    </div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block">Narxi (so'mda):</label>
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      value={priceForm3M}
                      onChange={(e) => setPriceForm3M(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-[10px] text-slate-400">Oraliq nazoratlar uchun tezkor reja</p>
                  </div>

                  {/* 6 Months */}
                  <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-indigo-950 dark:text-indigo-200">6 Oylik Obuna</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">Talabalar tanlovi</span>
                    </div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block">Asl narxi (so'mda):</label>
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      value={priceForm6M}
                      onChange={(e) => setPriceForm6M(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
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
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-[10px] text-slate-400">Cheksiz yillik to'liq kafolat</p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
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
                    <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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
                  <Plus className="w-3.5 h-3.5 text-emerald-500" />
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
                    <Plus className="w-3.5 h-3.5" />
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
                        <p className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 truncate select-all">
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
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 transition-colors"
                          title="O'chirish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
              <div className="p-4 rounded-3xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-xs text-purple-950 dark:text-purple-100 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Promokodlar Boshqaruvi</span>
                  </h4>
                  <p className="text-[11px] text-purple-700/80 dark:text-purple-300 mt-0.5">
                    To'lov chekini botga yuborgan talabalar uchun maxsus faollashtirish promokodlarini yarating va taqdim eting
                  </p>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-600 text-white">
                  {(promocodes || []).length} ta promokod
                </span>
              </div>

              {/* Generate Promocode Form */}
              <form onSubmit={handleCreatePromo} className="p-4 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3 shadow-sm">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
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
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {[15000, 30000, 50000, 70000, 90000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setPromoAmountInput(amt)}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border transition-all ${
                            promoAmountInput === amt
                              ? 'bg-purple-600 text-white border-purple-600'
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
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
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
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
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
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-purple-600/20 active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
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
                                <span className="text-[9px] font-bold px-1 py-0.2 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                                  {planBadge}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                              <span>Yaratildi: {promo.createdAt}</span>
                              {promo.isUsed ? (
                                <span className="text-rose-500 font-bold">
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
                              className="px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 hover:bg-purple-100 text-xs font-bold border border-purple-200 dark:border-purple-800 flex items-center gap-1 transition-all active:scale-95"
                            >
                              {copiedCode === promo.code ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="text-[10px] text-emerald-600">Nusxalandi</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
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
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 transition-colors"
                              title="O'chirish"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
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
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      OTM:
                    </label>
                    <select
                      value={testUni}
                      onChange={(e) => setTestUni(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-medium"
                    >
                      {universities.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
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

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tavsiya etilgan test sifatida chiqarish</span>
                </button>
              </form>

              {/* Current test packages count */}
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                <span>Hozirda tizimda mavjud testlar soni:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {testPackages.length} ta
                </span>
              </div>
            </div>
          )}

          {/* Supabase Cloud Database Tab */}
          {activeTab === 'supabase' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Header Card */}
              <div className="p-4 rounded-3xl bg-gradient-to-br from-sky-900/40 via-indigo-900/30 to-slate-900 border border-sky-500/30 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/25 shrink-0 mt-0.5">
                    <Cloud className="w-5 h-5 text-white" />
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
                      : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  }`}
                >
                  {supabaseStatusResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
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
                    <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold border border-indigo-200/50">
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
                      <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">
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
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium focus:ring-2 focus:ring-sky-500 outline-none"
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
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium focus:ring-2 focus:ring-sky-500 outline-none font-mono"
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
                    className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
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
                    className="py-2.5 px-4 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 font-bold text-xs active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingSupabase ? 'animate-spin' : ''}`} />
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
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSupabase ? 'animate-spin' : ''}`} />
                    <span>{isSyncingSupabase ? 'Sinxronlanmoqda...' : 'Hamma testlarni sinxronlash'}</span>
                  </button>
                </div>
              </div>

              {/* Ready SQL Schema Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-sky-500" />
                    <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">
                      Supabase SQL Jadval Skripti (Bir martalik o'rnatish)
                    </h5>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const sqlContent = `CREATE TABLE IF NOT EXISTS public.test_packages (\\n  id TEXT PRIMARY KEY,\\n  title TEXT NOT NULL,\\n  category TEXT NOT NULL DEFAULT 'Oliy Ta''lim (HEMIS)',\\n  university TEXT NOT NULL,\\n  is_custom_university BOOLEAN DEFAULT false,\\n  is_pending_review BOOLEAN DEFAULT false,\\n  department TEXT NOT NULL,\\n  is_public BOOLEAN DEFAULT true,\\n  password TEXT,\\n  total_questions INTEGER DEFAULT 0,\\n  blocks JSONB NOT NULL,\\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,\\n  author_id TEXT,\\n  author_name TEXT,\\n  is_community_created BOOLEAN DEFAULT true,\\n  author_wallet_balance NUMERIC DEFAULT 0\\n);\\n\\nALTER TABLE public.test_packages ENABLE ROW LEVEL SECURITY;\\n\\nCREATE POLICY "Allow public read access" ON public.test_packages FOR SELECT TO anon, authenticated USING (true);\\nCREATE POLICY "Allow public insert access" ON public.test_packages FOR INSERT TO anon, authenticated WITH CHECK (true);\\nCREATE POLICY "Allow public update access" ON public.test_packages FOR UPDATE TO anon, authenticated USING (true);\\nCREATE POLICY "Allow public delete access" ON public.test_packages FOR DELETE TO anon, authenticated USING (true);\\n\\nALTER PUBLICATION supabase_realtime ADD TABLE public.test_packages;`;
                      navigator.clipboard.writeText(sqlContent);
                      triggerHaptic('success');
                      setCopiedSql(true);
                      setTimeout(() => setCopiedSql(false), 2500);
                    }}
                    className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600 font-bold">Nusxalandi!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
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
CREATE POLICY "Allow public read access" ON public.test_packages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public insert access" ON public.test_packages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.test_packages FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Allow public delete access" ON public.test_packages FOR DELETE TO anon, authenticated USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.test_packages;`}</pre>
                </div>

                <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-sky-900 dark:text-sky-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-500" />
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
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
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
                    <Check className="w-3.5 h-3.5" />
                    <span>SHA-256 Anti-Tamper</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Balans va tangalar o'zgartirilishdan himoyalangan.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                    <Check className="w-3.5 h-3.5" />
                    <span>Brute-Force Rate Limiter</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Admin login parolini terish hujumidan 15 min blok.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                    <Check className="w-3.5 h-3.5" />
                    <span>XSS & Script Sanitizer</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Foydalanuvchi kiritgan testlar va maydonlar tozalanadi.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                    <Check className="w-3.5 h-3.5" />
                    <span>Anti-Cheat Engine</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Savollarga tezlik monitoringi va botlarga qarshi filtr.
                  </p>
                </div>
              </div>

              {/* Backup & Recovery Actions */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-3">
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-indigo-500" />
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
                    className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 font-bold text-xs flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all text-center"
                  >
                    <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Zaxirani yuklab olish (JSON)</span>
                  </button>

                  <label className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold text-xs flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all text-center cursor-pointer">
                    <Upload className="w-4 h-4 text-slate-600 dark:text-slate-300" />
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
              <div className="p-4 rounded-3xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-2">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-extrabold text-xs">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Favqulodda Holat (Testlarni tozalash)</span>
                </div>
                <p className="text-[10px] text-rose-600/80 dark:text-rose-400">
                  Foydalanuvchilar o'zlari test tuzishlari uchun tizimdagi barcha testlarni bitta bosishda tozalash.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Barcha mavjud testlarni tozalashni tasdiqlaysizmi?")) {
                      clearAllTests();
                      triggerHaptic('warning');
                      showNotification("Barcha testlar muvaffaqiyatli tozalandi!");
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 active:scale-95 transition-all"
                >
                  Barcha testlarni tozalash
                </button>
              </div>
            </div>
          )}
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
      </div>
    </div>
  );
};
