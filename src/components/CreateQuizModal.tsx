import React, { useState, useRef } from 'react';
import { useQuizStore } from '../store/useQuizStore';
import { useTranslation } from '../i18n/useTranslation';
import {
  MAIN_CATEGORIES,
  MainCategory,
  TestPackage,
} from '../types';
import {
  saveQuizWithQuestions,
  QuizQuestionInput,
} from '../services/testSyncService';
import {
  X,
  Sparkles,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Share2,
  Copy,
  Check,
  Plus,
  Trash2,
  Globe,
  Link as LinkIcon,
  HelpCircle,
  FileCode,
  Layers,
  ArrowLeft,
  Loader2,
  Send,
} from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';

interface CreateQuizModalProps {
  onClose: () => void;
  editPackage?: TestPackage | null;
}

type StepType = 'input' | 'loading' | 'preview' | 'success';
type InputSource = 'file' | 'text';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export const CreateQuizModal: React.FC<CreateQuizModalProps> = ({ onClose, editPackage }) => {
  const { profile } = useQuizStore();
  const { t } = useTranslation();

  // Initial State from editPackage if provided
  const isEditing = Boolean(editPackage);

  const initialParsedQuestions: QuizQuestionInput[] = React.useMemo(() => {
    if (editPackage?.blocks && editPackage.blocks.length > 0) {
      const flattened = editPackage.blocks.flatMap((b) => b.questions);
      if (flattened.length > 0) {
        return flattened.map((q) => ({
          question: q.text,
          options: q.options,
          correct_answer: q.options[q.correctOptionIndex] || q.options[0] || '',
          explanation: q.explanation,
        }));
      }
    }
    return [];
  }, [editPackage]);

  // Step state
  const [step, setStep] = useState<StepType>(isEditing ? 'preview' : 'input');
  const [inputSource, setInputSource] = useState<InputSource>('file');

  // Form Fields
  const [title, setTitle] = useState(editPackage?.title || '');
  const [category, setCategory] = useState<MainCategory>(editPackage?.category || 'Oliy Ta\'lim (HEMIS)');
  const [visibility, setVisibility] = useState<'public' | 'unlisted'>(
    editPackage ? (editPackage.isPublic ? 'public' : 'unlisted') : 'public'
  );

  // File Upload State
  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [manualText, setManualText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Loading & Progress
  const [loadingMsg, setLoadingMsg] = useState('Fayl tayyorlanmoqda...');
  const [errorMessage, setErrorMessage] = useState('');

  // Parsed Questions for Preview Screen
  const [questions, setQuestions] = useState<QuizQuestionInput[]>(initialParsedQuestions);

  // Created Quiz ID for Sharing
  const [createdQuizId, setCreatedQuizId] = useState<string>(editPackage?.id || '');
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Validation errors
  const [titleError, setTitleError] = useState(false);

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > MAX_FILE_SIZE) {
      setErrorMessage("Fayl hajmi 5 MB dan oshmasligi kerak (Maksimal ruxsat: 5 MB).");
      triggerHaptic('error');
      return;
    }

    const validExtensions = ['.docx', '.pdf', '.txt'];
    const hasValidExt = validExtensions.some((ext) => selected.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setErrorMessage("Faqat .docx (Word), .pdf yoki .txt formatidagi fayllar qabul qilinadi.");
      triggerHaptic('error');
      return;
    }

    setErrorMessage('');
    setFile(selected);
    triggerHaptic('light');

    // Auto-fill title from filename if empty
    if (!title.trim()) {
      const cleanName = selected.name.replace(/\.[^/.]+$/, '').replace(/[_\\-]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFileBase64(result);
    };
    reader.onerror = () => {
      setErrorMessage("Faylni o'qishda xatolik yuz berdi.");
    };
    reader.readAsDataURL(selected);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFileBase64('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Trigger Gemini AI parsing
  const handleStartParsing = async () => {
    if (!title.trim()) {
      setTitleError(true);
      triggerHaptic('warning');
      return;
    }

    if (inputSource === 'file' && !fileBase64) {
      setErrorMessage("Iltimos, avval .docx, .pdf yoki .txt fayl yuklang.");
      triggerHaptic('warning');
      return;
    }

    if (inputSource === 'text' && !manualText.trim()) {
      setErrorMessage("Iltimos, test matnini kiriting.");
      triggerHaptic('warning');
      return;
    }

    setErrorMessage('');
    setStep('loading');
    triggerHaptic('medium');

    const loadingSteps = [
      "Hujjat Gemini 1.5 Flash ga yuborilmoqda...",
      "AI savol matnlari va variantlarni ajratib olmoqda...",
      "To'g'ri javoblar tekshirilmoqda va belgilanmoqda...",
      "Natijalar tahrirlash uchun tayyorlanmoqda...",
    ];

    let stepIdx = 0;
    const interval = setInterval(() => {
      stepIdx = (stepIdx + 1) % loadingSteps.length;
      setLoadingMsg(loadingSteps[stepIdx]);
    }, 2800);

    try {
      const payload: any = {};
      if (inputSource === 'file') {
        payload.fileBase64 = fileBase64;
        payload.fileName = file?.name || '';
        payload.mimeType = file?.type || '';
      } else {
        payload.rawText = manualText.trim();
      }

      const response = await fetch('/api/parse-quiz-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      clearInterval(interval);

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Fayldan testlarni ajratishda xatolik yuz berdi.");
      }

      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error("Hujjatdan savollar aniqlanmadi. Iltimos, boshqa fayl yoki matn bilan urinib ko'ring.");
      }

      setQuestions(data.questions);
      setStep('preview');
      triggerHaptic('success');
    } catch (err: any) {
      clearInterval(interval);
      console.error('Quiz parsing error:', err);
      setErrorMessage(err?.message || "AI tahlilida kutilmagan xatolik yuz berdi.");
      setStep('input');
      triggerHaptic('error');
    }
  };

  // Preview modifications
  const handleUpdateQuestionText = (index: number, newText: string) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], question: newText };
      return updated;
    });
  };

  const handleUpdateOption = (qIdx: number, optIdx: number, newOptText: string) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const q = { ...updated[qIdx] };
      const oldOpt = q.options[optIdx];
      const newOptions = [...q.options];
      newOptions[optIdx] = newOptText;
      q.options = newOptions;

      // If this option was the correct answer, update correct_answer text as well
      if (q.correct_answer === oldOpt) {
        q.correct_answer = newOptText;
      }
      updated[qIdx] = q;
      return updated;
    });
  };

  const handleSetCorrectAnswer = (qIdx: number, optText: string) => {
    triggerHaptic('light');
    setQuestions((prev) => {
      const updated = [...prev];
      updated[qIdx] = { ...updated[qIdx], correct_answer: optText };
      return updated;
    });
  };

  const handleRemoveQuestion = (qIdx: number) => {
    triggerHaptic('light');
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== qIdx));
  };

  const handleAddNewQuestion = () => {
    triggerHaptic('light');
    setQuestions((prev) => [
      ...prev,
      {
        question: `Yangi savol #${prev.length + 1}`,
        options: ['Variant A', 'Variant B', 'Variant C', 'Variant D'],
        correct_answer: 'Variant A',
      },
    ]);
  };

  // Save to Supabase
  const handleSaveQuiz = async () => {
    if (questions.length === 0) {
      setErrorMessage("Hech bo'lmaganda 1 ta savol bo'lishi kerak.");
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    triggerHaptic('medium');

    const quizId = createdQuizId || `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const creatorName = `${profile.firstName} ${profile.lastName}`.trim() || 'Talaba';

    try {
      const result = await saveQuizWithQuestions({
        quizId,
        title: title.trim(),
        category,
        visibility,
        creatorId: profile.id,
        creatorName,
        questions,
        university: profile.university || 'Yuksal Quiz',
      });

      if (result.success) {
        setCreatedQuizId(quizId);
        setStep('success');
        triggerHaptic('success');
      } else {
        throw new Error(result.message);
      }
    } catch (saveErr: any) {
      console.error('Quiz save error:', saveErr);
      setErrorMessage(saveErr?.message || "Testni saqlashda xatolik yuz berdi.");
      triggerHaptic('error');
    } finally {
      setIsSaving(false);
    }
  };

  const shareUrl = `https://t.me/YuksalQuiz_bot?start=quiz_${createdQuizId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    triggerHaptic('success');
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleTelegramShare = () => {
    const text = encodeURIComponent(`🎯 Men Yuksal Quiz platformasida yangi test yaratdim: "${title}"!\n\nBilimingizni sinab ko'ring:`);
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${text}`;
    window.open(tgUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 pb-24 sm:pb-28 bg-slate-950/80 backdrop-blur-md overflow-y-auto font-sans animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 my-4 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>AI Test Importer</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-300 dark:border-emerald-800">
                  Gemini 1.5
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Word (.docx), PDF yoki matnlarni AI orqali testga aylantiring
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-xs font-semibold animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span className="flex-1">{errorMessage}</span>
            <button
              onClick={() => setErrorMessage('')}
              className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-200 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* STEP 1: INPUT & CONFIGURATION */}
        {step === 'input' && (
          <div className="space-y-4">
            {/* Test Details */}
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              {/* Title Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Test nomi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (titleError) setTitleError(false);
                  }}
                  placeholder="Masalan: Falsafa 1-kurs yakuniy nazorat"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    titleError
                      ? 'border-rose-500 focus:ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500/20 focus:border-emerald-500'
                  }`}
                />
                {titleError && (
                  <p className="text-[11px] text-rose-500 mt-1 font-semibold">Test nomini kiritish majburiy</p>
                )}
              </div>

              {/* Category & Visibility */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Category Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Fani / Kategoriya
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as MainCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {MAIN_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Visibility Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ko'rinish darajasi
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setVisibility('public')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        visibility === 'public'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Ommaviy</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibility('unlisted')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        visibility === 'unlisted'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>Faqat havola</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Source Switcher: File Upload vs Textarea */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Manbani tanlang:
                </span>
                <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setInputSource('file');
                      triggerHaptic('light');
                    }}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      inputSource === 'file'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Fayl (.docx, .pdf, .txt)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputSource('text');
                      triggerHaptic('light');
                    }}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      inputSource === 'text'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Matn (Nusxalash)</span>
                  </button>
                </div>
              </div>

              {/* File Dropzone */}
              {inputSource === 'file' ? (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx,.pdf,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,text/plain"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {!file ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-emerald-50/30 dark:bg-slate-800/30 group"
                    >
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        Hujjatni yuklash uchun bosing
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                        Formatlar: Word (.docx), PDF (.pdf), Matn (.txt) &bull; Maks 5 MB
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                          <FileCode className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                            {(file.size / 1024 / 1024).toFixed(2)} MB &bull; Tayyor
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors"
                        title="Faylni o'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Manual Textarea */
                <div>
                  <textarea
                    rows={7}
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="Savollar matnini shu yerga nusxalab qo'ying (paste)...&#10;&#10;Masalan:&#10;1. O'zbekiston mustaqilligi qachon e'lon qilingan?&#10;A) 1991-yil 1-sentabr&#10;B) 1992-yil 8-dekabr&#10;C) 1990-yil 24-mart&#10;D) 1993-yil 1-oktabr"
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 leading-relaxed"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    AI savollar va variantlarni avtomatik aniqlaydi. To'g'ri javob belgilanmagan bo'lsa, o'zi topadi.
                  </p>
                </div>
              )}
            </div>

            {/* Parse Button */}
            <button
              type="button"
              onClick={handleStartParsing}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>✨ Gemini AI orqali tahlil qilish</span>
            </button>
          </div>
        )}

        {/* STEP 2: LOADING SKELETON SCREEN */}
        {step === 'loading' && (
          <div className="py-8 space-y-6 text-center animate-in fade-in">
            {/* Glowing AI Spinner */}
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 animate-spin">
                <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[22px] flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-emerald-500" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                Gemini 1.5 Flash tahlil qilmoqda
              </h3>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-pulse">
                {loadingMsg}
              </p>
            </div>

            {/* Skeleton Cards */}
            <div className="space-y-3 pt-2 text-left">
              {[1, 2].map((s) => (
                <div
                  key={s}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2.5 animate-pulse"
                >
                  <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full w-3/4" />
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="h-8 bg-slate-200 dark:bg-slate-700/60 rounded-xl" />
                    <div className="h-8 bg-slate-200 dark:bg-slate-700/60 rounded-xl" />
                    <div className="h-8 bg-slate-200 dark:bg-slate-700/60 rounded-xl" />
                    <div className="h-8 bg-slate-200 dark:bg-slate-700/60 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: PREVIEW & EDITING SCREEN */}
        {step === 'preview' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Summary Bar */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  Jami aniqlangan: {questions.length} ta savol
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep('input');
                  triggerHaptic('light');
                }}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Qayta yuklash</span>
              </button>
            </div>

            {/* Questions List */}
            <div className="max-h-80 sm:max-h-96 overflow-y-auto space-y-3 pr-1">
              {questions.map((q, qIdx) => (
                <div
                  key={qIdx}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      Savol #{qIdx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIdx)}
                      className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                      title="Savolni o'chirish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Question Textarea */}
                  <textarea
                    rows={2}
                    value={q.question}
                    onChange={(e) => handleUpdateQuestionText(qIdx, e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Savol matni..."
                  />

                  {/* Options & Correct Answer Selector */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      Variantlar (To'g'ri javobni tanlash uchun bosing):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = q.correct_answer.trim().toLowerCase() === opt.trim().toLowerCase();
                        const letter = String.fromCharCode(65 + optIdx);

                        return (
                          <div
                            key={optIdx}
                            className={`flex items-center gap-2 p-1.5 rounded-xl border transition-all ${
                              isCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-950 dark:text-emerald-100'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleSetCorrectAnswer(qIdx, opt)}
                              className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 transition-all ${
                                isCorrect
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-emerald-100 dark:hover:bg-emerald-950 hover:text-emerald-600'
                              }`}
                              title="To'g'ri javob deb belgilash"
                            >
                              {isCorrect ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : letter}
                            </button>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => handleUpdateOption(qIdx, optIdx, e.target.value)}
                              className="w-full bg-transparent text-xs font-semibold focus:outline-none"
                              placeholder={`Variant ${letter}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Question Button */}
            <button
              type="button"
              onClick={handleAddNewQuestion}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 text-slate-600 dark:text-slate-400 hover:text-emerald-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Yangi savol qo'shish</span>
            </button>

            {/* Save & Upload Button */}
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveQuiz}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Bazada saqlanmoqda...</span>
                </>
              ) : (
                <>
                  <span>💾 Testni saqlash va yuklash</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* STEP 4: SUCCESS & SHARE SCREEN */}
        {step === 'success' && (
          <div className="py-6 space-y-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Test muvaffaqiyatli saqlandi!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                "{title}" testi bazaga yozildi va do'stlaringiz bilan ulashishga tayyor.
              </p>
            </div>

            {/* Share Link Box */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2.5 text-left">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                <span>Telegram orqali ulashish havolasi:</span>
                <span className="text-emerald-600 font-extrabold">Yuksal Quiz Bot</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="w-full bg-transparent text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shrink-0 transition-all active:scale-95"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Nusxalandi!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Nusxa olish</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleTelegramShare}
                className="py-3 px-4 rounded-xl bg-[#229ED9] hover:bg-[#1e8bc0] text-white font-extrabold text-xs shadow-md shadow-sky-500/20 flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Telegramda yuborish</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                }}
                className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs transition-colors"
              >
                <span>Yopish</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
