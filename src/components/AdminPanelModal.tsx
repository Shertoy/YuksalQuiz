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
} from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';
import { TestPackage, MainCategory, DepartmentType, DEPARTMENTS } from '../types';

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
    testPackages,
    createTestPackage,
  } = useQuizStore();

  const [activeTab, setActiveTab] = useState<'universities' | 'pending' | 'news' | 'tests'>('universities');
  const [searchQuery, setSearchQuery] = useState('');
  const [newUniName, setNewUniName] = useState('');
  const [editingUni, setEditingUni] = useState<{ originalName: string; currentName: string } | null>(null);
  const [deletingUni, setDeletingUni] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // New announcement form state
  const [newsTitle, setNewsTitle] = useState('');
  const [newsMessage, setNewsMessage] = useState('');
  const [newsTag, setNewsTag] = useState<'yangilik' | 'eslatma' | 'muhim'>('yangilik');

  // Simple recommended test creator state
  const [testTitle, setTestTitle] = useState('');
  const [testUni, setTestUni] = useState(universities[0] || 'TATU');
  const [testDept, setTestDept] = useState<DepartmentType>('Axborot Texnologiyalari');

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

    addAnnouncement({
      title: newsTitle.trim(),
      message: newsMessage.trim(),
      tag: newsTag,
    });

    setNewsTitle('');
    setNewsMessage('');
    triggerHaptic('success');
    showNotification("Yangilik muvaffaqiyatli yuborildi va foydalanuvchilar bildirishnomasiga qo'shildi!");
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
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>YuksalQuiz Admin Paneli</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  Himoyalangan
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                OTMlar, bildirishnomalar va tavsiya etilgan testlar
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

        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 gap-1 p-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-[11px]">
          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('universities');
            }}
            className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center justify-center gap-0.5 transition-all ${
              activeTab === 'universities'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span className="truncate">OTMlar ({universities.length})</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('pending');
            }}
            className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center justify-center gap-0.5 transition-all relative ${
              activeTab === 'pending'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="truncate">Takliflar</span>
            {pendingUniversities.length > 0 && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('news');
            }}
            className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center justify-center gap-0.5 transition-all ${
              activeTab === 'news'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="truncate">Yangiliklar</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('tests');
            }}
            className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center justify-center gap-0.5 transition-all ${
              activeTab === 'tests'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="truncate">Testlar</span>
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
              {/* Form to send news */}
              <form onSubmit={handleSendNews} className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Foydalanuvchilarga yangilik yuborish:</span>
                </h4>

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

                <div>
                  <textarea
                    required
                    rows={3}
                    value={newsMessage}
                    onChange={(e) => setNewsMessage(e.target.value)}
                    placeholder="Xabar matni... Foydalanuvchilar qo'ng'iroqcha tugmasi orqali ko'rishadi."
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <select
                    value={newsTag}
                    onChange={(e) => setNewsTag(e.target.value as any)}
                    className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold"
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
                    <span>Yuborish</span>
                  </button>
                </div>
              </form>

              {/* Existing Announcements List */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase px-1">
                  Mavjud bildirishnomalar ({announcements.length} ta)
                </h4>
                {announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className="p-3 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 uppercase">
                          {ann.tag || 'yangilik'}
                        </span>
                        <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">
                          {ann.title}
                        </h5>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        {ann.message}
                      </p>
                      <span className="text-[9px] text-slate-400 mt-1 block">
                        {ann.date}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        deleteAnnouncement(ann.id);
                        showNotification("Bildirishnoma o'chirildi");
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                      title="O'chirish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
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
