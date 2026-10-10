import React, { useState, useRef, useMemo } from 'react';
import { useQuizStore } from '../store/useQuizStore';
import { FacultyPicker } from './FacultyPicker';
import { useTranslation } from '../i18n/useTranslation';
import {
  TOP_UNIVERSITIES,
  TestPackage,
  MAIN_CATEGORIES,
  MainCategory,
  StudyType,
} from '../types';
import {
  saveQuizWithQuestions,
  QuizQuestionInput,
} from '../services/testSyncService';
import {
  parseBulkQuizText,
  HEMIS_SAMPLE_TEMPLATE,
  STANDARD_SAMPLE_TEMPLATE,
  downloadSampleTemplateFile,
} from '../utils/quizParser';
import { SearchableUniversitySelect } from './SearchableUniversitySelect';
import {
  X,
  Sparkles,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Plus,
  Trash2,
  Globe,
  Link as LinkIcon,
  FileCode,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Send,
  School,
  GraduationCap,
  Calendar,
  Layers,
  BookOpen,
  Edit3,
  Download,
  Zap,
  PlusCircle,
  Save,
} from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';

interface CreateQuizModalProps {
  onClose: () => void;
  editPackage?: TestPackage | null;
}

type WizardStep = 1 | 2 | 3 | 4; // 1: Metadata, 2: Questions Input, 3: Preview, 4: Success Share
type TopInputMode = 'manual' | 'bulk'; // 'manual' (Donalik) | 'bulk' (Barchasini bittada)
type BulkSubMode = 'text' | 'file'; // 'text' (Matn orqali) | 'file' (Fayl orqali)

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export const CreateQuizModal: React.FC<CreateQuizModalProps> = ({ onClose, editPackage }) => {
  const { profile, addCustomUniversity, customUniversities, universities } = useQuizStore();
  const { t } = useTranslation();

  const isEditing = Boolean(editPackage);

  // Initial questions from editPackage if present
  const initialQuestions: QuizQuestionInput[] = useMemo(() => {
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
  const [currentStep, setCurrentStep] = useState<WizardStep>(isEditing ? 3 : 1);
  const [topInputMode, setTopInputMode] = useState<TopInputMode>('manual');
  const [bulkSubMode, setBulkSubMode] = useState<BulkSubMode>('text');
  const [sampleCopied, setSampleCopied] = useState<boolean>(false);

  // --- 1-QADAM: TEST PASPORTI (METADATA) ---
  const [title, setTitle] = useState(editPackage?.title || '');
  const [faculty, setFaculty] = useState((editPackage as any)?.faculty || editPackage?.department || '');

  const allKnownUnis = [...(universities || []), ...TOP_UNIVERSITIES, ...(customUniversities || [])];
  const initialIsCustomUni = Boolean(
    editPackage && (editPackage.isCustomUniversity || (editPackage.university && !allKnownUnis.includes(editPackage.university)))
  );

  const [university, setUniversity] = useState(
    editPackage && !initialIsCustomUni
      ? editPackage.university
      : profile.university || universities?.[0] || TOP_UNIVERSITIES[0]
  );
  const [isCustomUni, setIsCustomUni] = useState(initialIsCustomUni);
  const [customUniName, setCustomUniName] = useState(initialIsCustomUni && editPackage ? editPackage.university : '');



  // Ta'lim shakli (Kunduzgi, Sirtqi [5-kurs], Kechki, Masofaviy)
  const [studyType, setStudyType] = useState<StudyType>(
    (editPackage as any)?.studyType || (editPackage as any)?.study_type || (profile.studyType as any) || 'Kunduzgi'
  );

  const maxCourse = studyType === 'Sirtqi' ? 5 : 4;
  const maxSemester = studyType === 'Sirtqi' ? 10 : 8;

  // Kurs tanlash (Sirtqi bo'lsa 1-5, aks holda 1-4)
  const initialCourse = editPackage?.semester ? Math.ceil(editPackage.semester / 2) : 1;
  const [courseYear, setCourseYear] = useState<number>(
    initialCourse >= 1 && initialCourse <= maxCourse ? initialCourse : 1
  );

  // Semestr tanlash (Sirtqi bo'lsa 1-10, aks holda 1-8)
  const [semester, setSemester] = useState<number>(editPackage?.semester || 1);

  const handleStudyTypeChange = (newType: StudyType) => {
    setStudyType(newType);
    const newMaxC = newType === 'Sirtqi' ? 5 : 4;
    const newMaxS = newType === 'Sirtqi' ? 10 : 8;
    if (courseYear > newMaxC) {
      setCourseYear(newMaxC);
      setSemester(newMaxS);
    } else if (semester > newMaxS) {
      setSemester(newMaxS);
    }
    triggerHaptic('light');
  };

  // Ko'rinish darajasi (Ommaviy / Faqat havola)
  const [isPublic, setIsPublic] = useState<boolean>(editPackage ? editPackage.isPublic : true);
  const [category, setCategory] = useState<MainCategory>(editPackage?.category || 'Oliy Ta\'lim (HEMIS)');

  // Step 1 Validation Errors
  const [errors, setErrors] = useState<{
    title?: boolean;
    university?: boolean;
    faculty?: boolean;
    semester?: boolean;
  }>({});

  // --- 2-QADAM: SAVOLLARNI KIRITISH ---
  // USUL A: Fayl yuklash (AI yoki Shablon orqali)
  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [fileTextContent, setFileTextContent] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiLoadingMsg, setAiLoadingMsg] = useState('Hujjat tahlilga tayyorlanmoqda...');

  // USUL B: Ommaviy matn (Shablon / HEMIS Parser)
  const [bulkText, setBulkText] = useState('');
  const [bulkError, setBulkError] = useState('');

  // USUL C: Qo'lda bittalab donalik kiritish (Manual)
  const [manualQuestions, setManualQuestions] = useState<QuizQuestionInput[]>([
    {
      question: '',
      options: ['', '', '', ''],
      correct_answer: '',
    },
  ]);

  // --- 3-QADAM: PREVIEW VA TAHRIRLASH ---
  const [questions, setQuestions] = useState<QuizQuestionInput[]>(initialQuestions);
  const [globalError, setGlobalError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // --- 4-QADAM: SUCCESS SHARE ---
  const [createdQuizId, setCreatedQuizId] = useState<string>(editPackage?.id || '');
  const [isCopied, setIsCopied] = useState(false);

  // ==========================================
  // 1-QADAM VALIDATSIYASI VA KEYINGISIGA O'TISH
  // ==========================================
  const handleProceedToStep2 = () => {
    const newErrors: typeof errors = {};
    if (!title.trim()) newErrors.title = true;
    if (isCustomUni && !customUniName.trim()) newErrors.university = true;
    if (!faculty.trim()) newErrors.faculty = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      triggerHaptic('warning');
      return;
    }

    setErrors({});
    if (isCustomUni && customUniName.trim()) {
      addCustomUniversity(customUniName.trim());
    }

    setCurrentStep(2);
    triggerHaptic('light');
  };

  // ==========================================
  // USUL A: FAYL YUKLASH VA GEMINI AI TAHLILI
  // ==========================================
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > MAX_FILE_SIZE) {
      setGlobalError("Fayl hajmi 5 MB dan oshmasligi kerak (Maksimal ruxsat: 5 MB).");
      triggerHaptic('error');
      return;
    }

    const validExtensions = ['.docx', '.pdf', '.txt'];
    const hasValidExt = validExtensions.some((ext) => selected.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setGlobalError("Faqat .docx (Word), .pdf yoki .txt formatidagi fayllar qabul qilinadi.");
      triggerHaptic('error');
      return;
    }

    setGlobalError('');
    setFile(selected);
    triggerHaptic('light');

    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result as string);
    };
    reader.onerror = () => {
      setGlobalError("Faylni o'qishda xatolik yuz berdi.");
    };
    reader.readAsDataURL(selected);

    // Agar matn (.txt) fayl bo'lsa, to'g'ridan-to'g'ri matnini ham o'qiymiz
    if (selected.name.toLowerCase().endsWith('.txt')) {
      const txtReader = new FileReader();
      txtReader.onload = () => {
        setFileTextContent(txtReader.result as string);
      };
      txtReader.readAsText(selected);
    } else {
      setFileTextContent('');
    }
  };

  const handleParseTxtDirectly = () => {
    if (!fileTextContent.trim()) {
      setGlobalError(".txt fayli bo'sh yoki o'qib bo'lmadi.");
      triggerHaptic('warning');
      return;
    }

    const res = parseBulkQuizText(fileTextContent);
    if (res.questions.length > 0) {
      setQuestions(res.questions);
      setGlobalError('');
      setCurrentStep(3); // To Preview
      triggerHaptic('success');
    } else {
      setGlobalError(res.error || ".txt faylidan test savollari aniqlanmadi.");
      triggerHaptic('error');
    }
  };

  const handleStartAiParsing = async () => {
    if (!fileBase64) {
      setGlobalError("Iltimos, avval Word (.docx), PDF yoki .txt fayl yuklang.");
      triggerHaptic('warning');
      return;
    }

    setGlobalError('');
    setIsAiLoading(true);
    triggerHaptic('medium');

    const steps = [
      "Fayl Gemini 1.5 Flash ga yuborilmoqda...",
      "AI savol matnlari va javob variantlarini ajratmoqda...",
      "To'g'ri javoblar tekshirilmoqda...",
      "Natijalar tayyorlanmoqda...",
    ];

    let stepIdx = 0;
    const interval = setInterval(() => {
      stepIdx = (stepIdx + 1) % steps.length;
      setAiLoadingMsg(steps[stepIdx]);
    }, 2800);

    try {
      const response = await fetch('/api/parse-quiz-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64,
          fileName: file?.name || '',
          mimeType: file?.type || '',
        }),
      });

      clearInterval(interval);
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Faylni tahlil qilishda xatolik yuz berdi.");
      }

      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error("Hujjatdan test savollari topilmadi. Fayl tarkibini tekshiring.");
      }

      setQuestions(data.questions);
      setIsAiLoading(false);
      setCurrentStep(3); // To Preview
      triggerHaptic('success');
    } catch (err: any) {
      clearInterval(interval);
      setIsAiLoading(false);
      console.error('AI parsing error:', err);
      setGlobalError(err?.message || "AI tahlilida kutilmagan xatolik yuz berdi.");
      triggerHaptic('error');
    }
  };

  // ==========================================
  // USUL B: SHABLON ASOSIDA MATNNI TAHLIL QILISH
  // ==========================================
  const handleParseBulkText = () => {
    const trimmed = bulkText.trim();
    if (!trimmed) {
      setBulkError("Iltimos, test matnini kiriting.");
      triggerHaptic('warning');
      return;
    }

    const res = parseBulkQuizText(trimmed);
    if (res.questions.length > 0) {
      setQuestions(res.questions);
      setBulkError('');
      setCurrentStep(3); // To Preview
      triggerHaptic('success');
    } else {
      setBulkError(res.error || "Format aniqlanmadi. Rasmiy HEMIS (==== va ++++) yoki A, B, C, D formatida kiriting.");
      triggerHaptic('error');
    }
  };

  // ==========================================
  // USUL C: QO'LDA KIRITISH LOGIKASI
  // ==========================================
  const handleAddManualQuestion = () => {
    triggerHaptic('light');
    setManualQuestions((prev) => [
      ...prev,
      {
        question: '',
        options: ['', '', '', ''],
        correct_answer: '',
      },
    ]);
  };

  const handleRemoveManualQuestion = (idx: number) => {
    triggerHaptic('light');
    if (manualQuestions.length <= 1) return;
    setManualQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleProceedManualToPreview = () => {
    const valid = manualQuestions
      .filter((q) => q.question.trim().length > 0)
      .map((q) => {
        const cleanedOpts = q.options.map((opt, i) => opt.trim() || `Variant ${String.fromCharCode(65 + i)}`);
        const correctAns = q.correct_answer.trim() || cleanedOpts[0];
        return {
          question: q.question.trim(),
          options: cleanedOpts,
          correct_answer: correctAns,
        };
      });

    if (valid.length === 0) {
      setGlobalError("Kamida 1 ta savol matnini kiriting.");
      triggerHaptic('warning');
      return;
    }

    setQuestions(valid);
    setGlobalError('');
    setCurrentStep(3); // To Preview
    triggerHaptic('light');
  };

  // ==========================================
  // 3-QADAM: PREVIEW VA TAHRIRLASH AMALLARI
  // ==========================================
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

  const handleRemovePreviewQuestion = (qIdx: number) => {
    triggerHaptic('light');
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== qIdx));
  };

  const handleAddNewPreviewQuestion = () => {
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

  // ==========================================
  // 3-QADAM: BAZAGA SAQLASH VA E'LON QILISH
  // ==========================================
  const handleSaveAndPublishQuiz = async (overrideQuestions?: QuizQuestionInput[]) => {
    let finalQs = (overrideQuestions && overrideQuestions.length > 0) ? overrideQuestions : questions;
    if (finalQs.length === 0 && manualQuestions.some(q => q.question.trim().length > 0)) {
      finalQs = manualQuestions
        .filter((q) => q.question.trim().length > 0)
        .map((q) => {
          const cleanedOpts = q.options.map((opt, i) => opt.trim() || `Variant ${String.fromCharCode(65 + i)}`);
          const correctAns = q.correct_answer.trim() || cleanedOpts[0];
          return {
            question: q.question.trim(),
            options: cleanedOpts,
            correct_answer: correctAns,
          };
        });
    }

    if (finalQs.length === 0) {
      setGlobalError("Saqlash uchun kamida 1 ta savol bo'lishi kerak.");
      return;
    }

    setIsSaving(true);
    setGlobalError('');
    triggerHaptic('medium');

    const finalUniversity = isCustomUni ? customUniName.trim() : university;
    const quizId = createdQuizId || `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const creatorName = `${profile.firstName} ${profile.lastName}`.trim() || 'Talaba';

    try {
      const result = await saveQuizWithQuestions({
        quizId,
        title: title.trim(),
        university: finalUniversity,
        faculty: faculty.trim(),
        course_year: courseYear,
        semester,
        studyType: studyType,
        study_type: studyType,
        creatorId: profile.id,
        creatorName,
        is_public: isPublic,
        category,
        visibility: isPublic ? 'public' : 'unlisted',
        questions: finalQs,
      });

      if (result.success) {
        setCreatedQuizId(quizId);
        setCurrentStep(4); // Success Share
        triggerHaptic('success');
      } else {
        throw new Error(result.message);
      }
    } catch (saveErr: any) {
      console.error('Quiz save error:', saveErr);
      setGlobalError(saveErr?.message || "Testni saqlashda xatolik yuz berdi.");
      triggerHaptic('error');
    } finally {
      setIsSaving(false);
    }
  };

  // Share URL
  const shareUrl = `https://t.me/YuksalQuiz_bot?start=quiz_${createdQuizId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    triggerHaptic('success');
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleTelegramShare = () => {
    const text = encodeURIComponent(
      `🎯 Yuksal Quiz'da yangi test e'lon qilindi!\n\n` +
      `📚 Fan: ${title}\n` +
      `🏫 OTM: ${isCustomUni ? customUniName : university}\n` +
      `📖 Ta'lim shakli: ${studyType}\n` +
      `🎓 ${courseYear}-kurs, ${semester}-semestr\n\n` +
      `Bilimingizni sinab ko'ring:`
    );
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${text}`;
    window.open(tgUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-3 pb-24 sm:pb-28 bg-slate-950/80 backdrop-blur-md overflow-y-auto font-sans animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 my-4 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <PlusCircle className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isEditing ? "Testni tahrirlash" : "Yangi Test Yaratish"}</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Word, PDF, matn yoki qo'lda kiritish orqali mustaqil test tuzing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditing && currentStep <= 3 && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSaveAndPublishQuiz()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
                title="O'zgarishlarni saqlash"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Saqlash</span>
              </button>
            )}

            <button
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* 3-STEP WIZARD PROGRESS BAR */}
        {currentStep <= 3 && (
          <div className="mb-5">
            <div className="grid grid-cols-3 gap-2">
              {/* Step 1 Indicator */}
              <div
                className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                  currentStep === 1
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                    : currentStep > 1
                    ? 'bg-slate-100 dark:bg-slate-800 border-transparent text-emerald-600'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                    currentStep > 1
                      ? 'bg-emerald-600 text-white'
                      : currentStep === 1
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}
                >
                  {currentStep > 1 ? <Check className="w-3 h-3 stroke-[2.5]" /> : '1'}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold truncate">1. Pasport</p>
                </div>
              </div>

              {/* Step 2 Indicator */}
              <div
                className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                  currentStep === 2
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                    : currentStep > 2
                    ? 'bg-slate-100 dark:bg-slate-800 border-transparent text-emerald-600'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                    currentStep > 2
                      ? 'bg-emerald-600 text-white'
                      : currentStep === 2
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}
                >
                  {currentStep > 2 ? <Check className="w-3 h-3 stroke-[2.5]" /> : '2'}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold truncate">2. Savollar</p>
                </div>
              </div>

              {/* Step 3 Indicator */}
              <div
                className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                  currentStep === 3
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                    currentStep === 3
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}
                >
                  3
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold truncate">3. Preview</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {globalError && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-xs font-semibold animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" strokeWidth={1.75} />
            <span className="flex-1">{globalError}</span>
            <button
              onClick={() => setGlobalError('')}
              className="text-rose-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
              title="Yopish"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* ▶ 1-QADAM: TEST PASPORTI (METADATA)                           */}
        {/* ============================================================== */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Fan nomi */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={1.75} />
                <span>Fan nomi</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (errors.title) setErrors((prev) => ({ ...prev, title: false }));
                  }}
                  placeholder="Masalan: Falsafa, Algoritmlar, Mikroiqtisodiyot..."
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    errors.title
                      ? 'border-rose-500 focus:ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500/20 focus:border-emerald-500'
                  }`}
                />
              </div>
              {errors.title && (
                <p className="text-[11px] text-rose-500 mt-1 font-semibold">Fan nomini kiritish shart</p>
              )}
            </div>

            {/* OTM Tanlash */}
            <div>
              <SearchableUniversitySelect
                label="OTM (Universitet / Institut)"
                value={university}
                isCustomSelected={isCustomUni}
                onChange={(uni) => {
                  if (uni === 'custom') {
                    setIsCustomUni(true);
                  } else {
                    setIsCustomUni(false);
                    setUniversity(uni);
                  }
                  if (errors.university) setErrors((prev) => ({ ...prev, university: false }));
                }}
                onCustomSelect={() => setIsCustomUni(true)}
                allowCustom={true}
                universities={universities}
                customUniversities={customUniversities}
              />

              {/* Qo'lda OTM yozish maydoni */}
              {isCustomUni && (
                <div className="mt-2 space-y-1">
                  <input
                    type="text"
                    value={customUniName}
                    onChange={(e) => {
                      setCustomUniName(e.target.value);
                      if (errors.university) setErrors((prev) => ({ ...prev, university: false }));
                    }}
                    placeholder="OTM nomini to'liq yozing (masalan: TGFU, TATU...)"
                    className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs font-semibold text-slate-900 dark:text-white ${
                      errors.university
                        ? 'border-rose-500'
                        : 'border-emerald-400 focus:ring-emerald-500'
                    }`}
                  />
                  {errors.university && (
                    <p className="text-[11px] text-rose-500 font-semibold">OTM nomini kiriting</p>
                  )}
                </div>
              )}
            </div>

            {/* Yo'nalish / Fakultet */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={1.75} />
                <span>Yo'nalish / Fakultet</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={faculty}
                onChange={(e) => {
                  setFaculty(e.target.value);
                  if (errors.faculty) setErrors((prev) => ({ ...prev, faculty: false }));
                }}
                placeholder="Masalan: Dasturiy injiniring, Iqtisodiyot, Davolash ishi..."
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  errors.faculty
                    ? 'border-rose-500'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500/20 focus:border-emerald-500'
                }`}
              />
              {errors.faculty && (
                <p className="text-[11px] text-rose-500 mt-1 font-semibold">Yo'nalish yoki fakultet nomini kiriting</p>
              )}
              <FacultyPicker
                university={isCustomUni ? customUniName : university}
                value={faculty}
                onChange={(name) => {
                  setFaculty(name);
                  if (errors.faculty) setErrors((prev) => ({ ...prev, faculty: false }));
                }}
              />
            </div>

            {/* Ta'lim shakli (Kunduzgi / Sirtqi / Kechki / Masofaviy) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <School className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={1.75} />
                  <span>Ta'lim shakli</span>
                </label>
                {studyType === 'Sirtqi' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                    <GraduationCap className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" strokeWidth={2} />
                    <span>Sirtqi — 5 kurs / 10 semestr</span>
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(['Kunduzgi', 'Sirtqi', 'Kechki', 'Masofaviy'] as StudyType[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStudyTypeChange(st)}
                    className={`py-2 px-1 rounded-xl text-xs font-extrabold border transition-all ${
                      studyType === st
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-300'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Kurs tanlash */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={1.75} />
                  <span>Kurs tanlash ({maxCourse} ta kurs)</span>
                </label>
                <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                  {courseYear}-kurs
                </span>
              </div>
              <div className={`grid gap-2 ${studyType === 'Sirtqi' ? 'grid-cols-5' : 'grid-cols-4'}`}>
                {Array.from({ length: maxCourse }, (_, i) => i + 1).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setCourseYear(k);
                      setSemester(k * 2 - 1);
                      triggerHaptic('light');
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-extrabold border transition-all ${
                      courseYear === k
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-300'
                    }`}
                  >
                    {k}-kurs
                  </button>
                ))}
              </div>
            </div>

            {/* Semestr tanlash */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={1.75} />
                  <span>Semestr tanlash (1 - {maxSemester})</span>
                </label>
                <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                  {semester}-semestr
                </span>
              </div>
              <div className={`grid gap-1 ${studyType === 'Sirtqi' ? 'grid-cols-5 sm:grid-cols-10' : 'grid-cols-8'}`}>
                {Array.from({ length: maxSemester }, (_, i) => i + 1).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSemester(s);
                      setCourseYear(Math.ceil(s / 2));
                      triggerHaptic('light');
                    }}
                    className={`py-2 rounded-xl text-xs font-black border transition-all ${
                      semester === s
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Ko'rinish darajasi (Ommaviy / Faqat havola orqali) */}
            <div className="pt-1">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={1.75} />
                <span>Ko'rinish darajasi</span>
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    isPublic
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                  <span>Ommaviy (Barchaga)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    !isPublic
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                  <span>Faqat havola orqali</span>
                </button>
              </div>
            </div>

            {/* Step 1 Actions */}
            <div className="pt-2 flex items-center gap-2">
              {isEditing && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveAndPublishQuiz()}
                  className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
                >
                  <Save className="w-4 h-4 shrink-0" />
                  <span>{isSaving ? 'Saqlanmoqda...' : "O'zgarishlarni saqlash"}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleProceedToStep2}
                className={`${
                  isEditing
                    ? 'flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                    : 'w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/25'
                } py-3.5 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95`}
              >
                <span>{isEditing ? "Savollarga o'tish" : 'Keyingisi'}</span>
                <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ▶ 2-QADAM: SAVOLLARNI KIRITISH (DONALIK YOKI BARCHASINI BITTADA) */}
        {/* ============================================================== */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* 2 Ta Bosh Rejim: Donalik yoki Barchasini bittada */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setTopInputMode('manual');
                  triggerHaptic('light');
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all ${
                  topInputMode === 'manual'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Edit3 className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                <span>Donalik kiritish</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTopInputMode('bulk');
                  triggerHaptic('light');
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all ${
                  topInputMode === 'bulk'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                <span>Barchasini bittada</span>
              </button>
            </div>

            {/* -------------------------------------------------------- */}
            {/* 1. DONALIK KIRITISH (MANUAL BITTALAB)                    */}
            {/* -------------------------------------------------------- */}
            {topInputMode === 'manual' && (
              <div className="space-y-3">
                <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 text-xs font-medium flex items-center justify-between">
                  <span>Savollarni bittalab kiritish va to'g'ri javobni tanlash</span>
                  <span className="font-extrabold text-emerald-700 dark:text-emerald-300">
                    Jami: {manualQuestions.length} ta
                  </span>
                </div>

                <div className="max-h-72 sm:max-h-80 overflow-y-auto space-y-3 pr-1">
                  {manualQuestions.map((mq, mIdx) => (
                    <div
                      key={mIdx}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          Savol #{mIdx + 1}
                        </span>
                        {manualQuestions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveManualQuestion(mIdx)}
                            className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                            title="Savolni o'chirish"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={mq.question}
                        onChange={(e) => {
                          const val = e.target.value;
                          setManualQuestions((prev) => {
                            const up = [...prev];
                            up[mIdx].question = val;
                            return up;
                          });
                        }}
                        placeholder="Savol matnini kiriting..."
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />

                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          Variantlar (To'g'ri javobni tanlash uchun harfni bosing):
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {mq.options.map((opt, oIdx) => {
                            const isCorr = mq.correct_answer === opt && opt.length > 0;
                            const letter = String.fromCharCode(65 + oIdx);

                            return (
                              <div
                                key={oIdx}
                                className={`flex items-center gap-1.5 p-1 rounded-xl border transition-all ${
                                  isCorr
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-950 dark:text-emerald-100'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setManualQuestions((prev) => {
                                      const up = [...prev];
                                      up[mIdx].correct_answer = up[mIdx].options[oIdx];
                                      return up;
                                    });
                                  }}
                                  className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 transition-all ${
                                    isCorr
                                      ? 'bg-emerald-600 text-white shadow-sm'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-emerald-100'
                                  }`}
                                  title="To'g'ri javob deb belgilash"
                                >
                                  {isCorr ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : letter}
                                </button>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setManualQuestions((prev) => {
                                      const up = [...prev];
                                      const old = up[mIdx].options[oIdx];
                                      up[mIdx].options[oIdx] = val;
                                      if (up[mIdx].correct_answer === old) {
                                        up[mIdx].correct_answer = val;
                                      }
                                      return up;
                                    });
                                  }}
                                  placeholder={`Variant ${letter}`}
                                  className="w-full bg-transparent text-xs font-semibold focus:outline-none"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddManualQuestion}
                  className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                  <span>Yangi savol qo'shish</span>
                </button>

                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSaveAndPublishQuiz()}
                      className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>O'zgarishlarni saqlash</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleProceedManualToPreview}
                      className="px-4 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      title="Ko'rib chiqishga o'tish"
                    >
                      <span>Ko'rib chiqish</span>
                      <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleProceedManualToPreview}
                    className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <span>Ko'rib chiqishga o'tish</span>
                    <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                  </button>
                )}
              </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* 2. BARCHASINI BITTADA (SHABLON ASOSIDA: MATN YOKI FAYL) */}
            {/* -------------------------------------------------------- */}
            {topInputMode === 'bulk' && (
              <div className="space-y-3.5">
                {/* Matn yoki Fayl tanlash podtabi */}
                <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                  <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => {
                        setBulkSubMode('text');
                        triggerHaptic('light');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        bulkSubMode === 'text'
                          ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                      <span>Matn ko'rinishida</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBulkSubMode('file');
                        triggerHaptic('light');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        bulkSubMode === 'file'
                          ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                      <span>Fayl ko'rinishida</span>
                    </button>
                  </div>

                  {bulkSubMode === 'text' ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(HEMIS_SAMPLE_TEMPLATE);
                          setSampleCopied(true);
                          triggerHaptic('success');
                          setTimeout(() => setSampleCopied(false), 2000);
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-600 flex items-center gap-1"
                        title="Rasmiy HEMIS shablon nusxasini olish"
                      >
                        {sampleCopied ? <Check className="w-3 h-3 text-emerald-500" strokeWidth={2.5} /> : <Copy className="w-3 h-3" strokeWidth={1.75} />}
                        <span>{sampleCopied ? "Nusxalandi" : "Shablon nusxalash"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setBulkText(HEMIS_SAMPLE_TEMPLATE);
                          triggerHaptic('light');
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3 shrink-0" strokeWidth={1.75} />
                        <span>Namunani joylash</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        downloadSampleTemplateFile('hemis');
                        triggerHaptic('success');
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 flex items-center gap-1"
                      title="Namunaviy HEMIS test faylini kompyuteringizga yuklab oling"
                    >
                      <Download className="w-3 h-3 shrink-0" strokeWidth={1.75} />
                      <span>Shablon fayl (.txt)</span>
                    </button>
                  )}
                </div>

                {/* Sub-mode A: Matn ko'rinishida */}
                {bulkSubMode === 'text' && (
                  <div className="space-y-3">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" strokeWidth={1.75} />
                          <span>Qabul qilinadigan shablon formatlari:</span>
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">Avtomatik parser</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        • <b>HEMIS formati</b>: Savollar orasiga <code>++++</code>, variantlar orasiga <code>====</code>, to'g'ri javob oldiga <code>#</code>.<br />
                        • <b>Standart format</b>: Savol matni, pastidan <code>A) B) C) D)</code> va <code>Javob: B</code> (yoki to'g'ri variant oldiga <code>*</code>).
                      </p>
                    </div>

                    <textarea
                      rows={9}
                      value={bulkText}
                      onChange={(e) => {
                        setBulkText(e.target.value);
                        if (bulkError) setBulkError('');
                      }}
                      placeholder={`Savol matni\n====\n#To'g'ri javob varianti\n====\nNoto'g'ri javob 1\n====\nNoto'g'ri javob 2\n====\nNoto'g'ri javob 3\n++++\n\nKeyingi savol matni...`}
                      className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 leading-relaxed"
                    />

                    {bulkError && (
                      <p className="text-[11px] text-rose-500 font-semibold">{bulkError}</p>
                    )}

                    <div className="flex gap-2">
                      {bulkText.trim() && (
                        <button
                          type="button"
                          onClick={() => setBulkText('')}
                          className="px-3.5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-500 font-bold text-xs transition-colors shrink-0 flex items-center justify-center whitespace-nowrap"
                        >
                          Tozalash
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleParseBulkText}
                        className="flex-1 py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                      >
                        <FileText className="w-4 h-4 shrink-0" />
                        <span className="whitespace-nowrap">Matnni tahlil qilish</span>
                        <ArrowRight className="w-4 h-4 shrink-0" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub-mode B: Fayl ko'rinishida */}
                {bulkSubMode === 'file' && (
                  <div className="space-y-4">
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
                        className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-3xl p-7 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-emerald-50/30 dark:bg-slate-800/30 group"
                      >
                        <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                          <Upload className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                          Word (.docx), PDF yoki Matn (.txt) faylini tanlang
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          Maksimal hajm: 5 MB &bull; .txt fayllar zumda tahlil qilinadi, .docx va .pdf AI orqali
                        </p>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                            <FileCode className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {file.name}
                            </p>
                            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                              {(file.size / 1024 / 1024).toFixed(2)} MB &bull; {file.name.toLowerCase().endsWith('.txt') ? 'Matn formati (zumda tahlil mumkin)' : 'AI tahliliga tayyor'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setFile(null);
                            setFileBase64('');
                            setFileTextContent('');
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors"
                          title="O'chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* AI Loading Screen */}
                    {isAiLoading && (
                      <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 text-center space-y-2.5 animate-pulse">
                        <Loader2 className="w-7 h-7 mx-auto text-emerald-600 animate-spin" />
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          Gemini 1.5 Flash hujjatni o'qimoqda
                        </p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          {aiLoadingMsg}
                        </p>
                      </div>
                    )}

                    {/* Tahlil qilish tugmalari */}
                    {file?.name.toLowerCase().endsWith('.txt') ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={!fileTextContent || isAiLoading}
                          onClick={handleParseTxtDirectly}
                          className="w-full py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 min-w-0"
                        >
                          <Zap className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                          <span className="truncate">Shablon orqali zumda tahlil</span>
                        </button>

                        <button
                          type="button"
                          disabled={!file || isAiLoading}
                          onClick={handleStartAiParsing}
                          className="w-full py-3 px-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 min-w-0"
                        >
                          <Sparkles className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                          <span className="truncate">AI orqali tahlil</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!file || isAiLoading}
                        onClick={handleStartAiParsing}
                        className="w-full py-3 px-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 min-w-0"
                      >
                        <Sparkles className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                        <span className="truncate">Gemini AI orqali tahlil qilish</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Ortga qaytish */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="w-full py-2.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                <span>1-qadam (Pasport)ga qaytish</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ▶ 3-QADAM: KO'RIB CHIQISH VA TASDIQLASH (PREVIEW)              */}
        {/* ============================================================== */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Pasport qisqacha ma'lumot */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <p className="font-extrabold text-slate-900 dark:text-white truncate">{title}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {isCustomUni ? customUniName : university} &bull; {studyType} &bull; {courseYear}-kurs, {semester}-semestr &bull; {faculty}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black text-xs shrink-0">
                {questions.length} ta savol
              </span>
            </div>

            {/* Savollar ro'yxati (Kartochkalar) */}
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
                      onClick={() => handleRemovePreviewQuestion(qIdx)}
                      className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                      title="Savolni o'chirish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Savol matni */}
                  <textarea
                    rows={2}
                    value={q.question}
                    onChange={(e) => handleUpdateQuestionText(qIdx, e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Savol matni..."
                  />

                  {/* Variantlar */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      Variantlar (To'g'ri javobni tanlash uchun harfni bosing):
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

            {/* Yangi savol qo'shish */}
            <button
              type="button"
              onClick={handleAddNewPreviewQuestion}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 text-slate-600 dark:text-slate-400 hover:text-emerald-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Yangi savol qo'shish</span>
            </button>

            {/* "Testni saqlash va e'lon qilish" Tugmasi */}
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSaveAndPublishQuiz()}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Bazada saqlanmoqda...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{isEditing ? "O'zgarishlarni saqlash" : "Testni saqlash va e'lon qilish"}</span>
                </>
              )}
            </button>

            {/* Qadamlarga qaytish */}
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="py-1.5 px-3 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold text-xs flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                <span>Pasportni tahrirlash</span>
              </button>

              <span className="text-slate-300 dark:text-slate-700">&bull;</span>

              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="py-1.5 px-3 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold text-xs flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                <span>Savollar usuliga qaytish</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ▶ 4-QADAM: MUAFFAQIYATLI SAQLANDI VA ULASHISH (SHARE)          */}
        {/* ============================================================== */}
        {currentStep === 4 && (
          <div className="py-6 space-y-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Test muvaffaqiyatli e'lon qilindi!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                "{title}" testi bazaga yozildi. Kursdoshlar va talabalar bilan ulashing:
              </p>
            </div>

            {/* Ulashish havolasi */}
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

            {/* Action Tugmalari */}
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
