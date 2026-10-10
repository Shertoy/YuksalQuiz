import React, { useState, useEffect } from 'react';
import { FacultyPicker } from './FacultyPicker';
import { createPortal } from 'react-dom';
import { useQuizStore, deduplicateUniversities } from '../store/useQuizStore';
import { TestPackage, TOP_UNIVERSITIES, StudyType } from '../types';
import {
  updateQuizWithQuestions,
  fetchQuizQuestionsForEdit,
  EditableQuestionItem,
  QuizPassportData,
} from '../services/testSyncService';
import { triggerHaptic } from '../utils/telegram';
import {
  X,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  GraduationCap,
  Calendar,
  Layers,
  HelpCircle,
  Edit3,
} from 'lucide-react';
import { decodeHtmlEntities } from '../utils/security';

interface AdminEditQuizModalProps {
  quiz: TestPackage;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

interface FormQuestion {
  id?: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation?: string;
}

export const AdminEditQuizModal: React.FC<AdminEditQuizModalProps> = ({
  quiz,
  isOpen,
  onClose,
  onSaved,
}) => {
  const { universities, customUniversities } = useQuizStore();

  // Combine universities list
  const allUniversities = deduplicateUniversities([
    ...(universities || []),
    ...TOP_UNIVERSITIES,
    ...(customUniversities || []),
  ]);

  // --- PASPORT MA'LUMOTLARI ---
  const [title, setTitle] = useState(decodeHtmlEntities(quiz.title || ''));
  const [university, setUniversity] = useState(decodeHtmlEntities(quiz.university || ''));
  const [customUniInput, setCustomUniInput] = useState('');
  const [isOtherUni, setIsOtherUni] = useState(false);
  const [faculty, setFaculty] = useState(
    decodeHtmlEntities((quiz as any).faculty || quiz.department || '')
  );
  const [studyType, setStudyType] = useState<StudyType>(
    (quiz as any).studyType || (quiz as any).study_type || 'Kunduzgi'
  );

  const initialCourse = quiz.course_year || (quiz.semester ? Math.ceil(quiz.semester / 2) : 1);
  const [courseYear, setCourseYear] = useState<number>(
    initialCourse >= 1 && initialCourse <= 5 ? initialCourse : 1
  );
  const [semester, setSemester] = useState<number>(quiz.semester || 1);
  const [isPublic, setIsPublic] = useState<boolean>(quiz.isPublic ?? true);

  // --- SAVOLLAR MUHARRIRI ---
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load questions on open
  useEffect(() => {
    if (!isOpen || !quiz) return;

    setTitle(decodeHtmlEntities(quiz.title || ''));
    const uni = decodeHtmlEntities(quiz.university || '');
    if (allUniversities.includes(uni)) {
      setUniversity(uni);
      setIsOtherUni(false);
    } else if (uni) {
      setUniversity('__other__');
      setIsOtherUni(true);
      setCustomUniInput(uni);
    } else {
      setUniversity(allUniversities[0] || 'Toshkent Axborot Texnologiyalari Universiteti (TATU)');
      setIsOtherUni(false);
    }

    setFaculty(decodeHtmlEntities((quiz as any).faculty || quiz.department || ''));
    const resolvedStudyType: StudyType = (quiz as any).studyType || (quiz as any).study_type || 'Kunduzgi';
    setStudyType(resolvedStudyType);
    const maxCourse = resolvedStudyType === 'Sirtqi' ? 5 : 4;
    const c = quiz.course_year || (quiz.semester ? Math.ceil(quiz.semester / 2) : 1);
    setCourseYear(c >= 1 && c <= maxCourse ? c : 1);
    setSemester(quiz.semester || 1);
    setIsPublic(quiz.isPublic ?? true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Initial questions from blocks
    const localQuestions: FormQuestion[] = [];
    if (quiz.blocks && quiz.blocks.length > 0) {
      const flattened = quiz.blocks.flatMap((b) => b.questions || []);
      for (const q of flattened) {
        const rawOpts = Array.isArray(q.options) ? q.options : [];
        const opts: [string, string, string, string] = [
          rawOpts[0] || '',
          rawOpts[1] || '',
          rawOpts[2] || '',
          rawOpts[3] || '',
        ];
        const cIdx = Math.max(0, Math.min(3, q.correctOptionIndex ?? 0));
        localQuestions.push({
          id: q.id,
          question: decodeHtmlEntities(q.text || ''),
          options: opts.map(decodeHtmlEntities) as [string, string, string, string],
          correctIndex: cIdx,
          explanation: q.explanation ? decodeHtmlEntities(q.explanation) : undefined,
        });
      }
    }

    setQuestions(localQuestions);
    setIsLoadingQuestions(true);

    // Asynchronously fetch fresh data from Supabase `questions` table
    fetchQuizQuestionsForEdit(quiz.id)
      .then((remoteQs) => {
        if (remoteQs && remoteQs.length > 0) {
          const mapped: FormQuestion[] = remoteQs.map((rq) => {
            const rawOpts = Array.isArray(rq.options) ? rq.options : [];
            const opts: [string, string, string, string] = [
              rawOpts[0] || '',
              rawOpts[1] || '',
              rawOpts[2] || '',
              rawOpts[3] || '',
            ];
            let cIdx = opts.findIndex(
              (o) => o.trim().toLowerCase() === (rq.correct_answer || '').trim().toLowerCase()
            );
            if (cIdx < 0) cIdx = 0;
            return {
              id: rq.id,
              question: rq.question || '',
              options: opts,
              correctIndex: cIdx,
              explanation: rq.explanation,
            };
          });
          setQuestions(mapped);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch questions from DB, using local store:', err);
      })
      .finally(() => {
        setIsLoadingQuestions(false);
      });
  }, [isOpen, quiz.id]);

  if (!isOpen) return null;

  // Handlers for Question Editing
  const handleQuestionTextChange = (index: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], question: text };
      return copy;
    });
  };

  const handleOptionChange = (qIndex: number, optIndex: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const opts = [...copy[qIndex].options] as [string, string, string, string];
      opts[optIndex] = text;
      copy[qIndex] = { ...copy[qIndex], options: opts };
      return copy;
    });
  };

  const handleCorrectOptionChange = (qIndex: number, optIndex: number) => {
    triggerHaptic('selection');
    setQuestions((prev) => {
      const copy = [...prev];
      copy[qIndex] = { ...copy[qIndex], correctIndex: optIndex };
      return copy;
    });
  };

  const handleDeleteQuestion = (index: number) => {
    if (questions.length <= 1) {
      triggerHaptic('warning');
      setErrorMsg("Testda kamida 1 ta savol qolishi shart!");
      return;
    }
    triggerHaptic('light');
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddQuestion = () => {
    triggerHaptic('light');
    const newQ: FormQuestion = {
      id: `q_new_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      question: '',
      options: ['', '', '', ''],
      correctIndex: 0,
    };
    setQuestions((prev) => [...prev, newQ]);
  };

  // Validation & Save
  const handleSave = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMsg("Iltimos, fan nomini kiriting.");
      triggerHaptic('error');
      return;
    }

    const finalUniversity = isOtherUni ? customUniInput.trim() : university.trim();
    if (!finalUniversity) {
      setErrorMsg("Iltimos, OTM nomini tanlang yoki kiriting.");
      triggerHaptic('error');
      return;
    }

    if (questions.length === 0) {
      setErrorMsg("Testda kamida 1 ta savol bo'lishi kerak.");
      triggerHaptic('error');
      return;
    }

    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        setErrorMsg(`${i + 1}-savolning matni bo'sh bo'lishi mumkin emas.`);
        triggerHaptic('error');
        return;
      }
      for (let o = 0; o < 4; o++) {
        if (!q.options[o]?.trim()) {
          const optLetter = ['A', 'B', 'C', 'D'][o];
          q.options[o] = `Variant ${optLetter}`;
        }
      }
    }

    const passportData: QuizPassportData = {
      title: trimmedTitle,
      university: finalUniversity,
      faculty: faculty.trim() || undefined,
      course_year: courseYear,
      semester,
      is_public: isPublic,
      category: quiz.category || "Oliy Ta'lim (HEMIS)",
      studyType,
      study_type: studyType,
    };

    const finalQuestions: EditableQuestionItem[] = questions.map((q) => {
      const cleanOpts = q.options.map((o, idx) => o?.trim() || `Variant ${['A', 'B', 'C', 'D'][idx]}`);
      const cIdx = Math.max(0, Math.min(3, q.correctIndex ?? 0));
      return {
        id: q.id,
        question: q.question.trim(),
        options: cleanOpts,
        correct_answer: cleanOpts[cIdx] || cleanOpts[0],
        explanation: q.explanation?.trim(),
      };
    });

    setIsSaving(true);
    triggerHaptic('medium');

    try {
      const res = await updateQuizWithQuestions(quiz.id, passportData, finalQuestions);
      if (res.success) {
        triggerHaptic('success');
        setSuccessMsg("✅ Test muvaffaqiyatli yangilandi!");
        onSaved?.();
        setTimeout(() => {
          onClose();
        }, 900);
      } else {
        triggerHaptic('error');
        setErrorMsg(res.message || "Saqlashda xatolik yuz berdi.");
      }
    } catch (err: any) {
      triggerHaptic('error');
      setErrorMsg(err?.message || "Kutilmagan xatolik yuz berdi.");
    } finally {
      setIsSaving(false);
    }
  };

  const optionLetters = ['A', 'B', 'C', 'D'];

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:max-w-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 mr-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Edit3 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                  Testni Tahrirlash
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0 hidden xs:inline-block">
                  Muallif & Admin
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                ID: {quiz.id} • {questions.length} ta savol
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
              title="O'zgarishlarni saqlash"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Saqlanmoqda...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Saqlash</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Yopish"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Status Banners */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          {/* Section 1: Pasport ma'lumotlari */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm pb-1 border-b border-slate-200/80 dark:border-slate-800/80">
              <GraduationCap className="w-4 h-4 text-emerald-500" />
              <span>Test Pasporti (Asosiy ma'lumotlar)</span>
            </div>

            {/* Fan nomi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Fan nomi <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Masalan: Oliy Matematika, Dasturlash asoslari..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            {/* OTM Nomi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                OTM (Universitet) <span className="text-rose-500">*</span>
              </label>
              <select
                value={isOtherUni ? '__other__' : university}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__other__') {
                    setIsOtherUni(true);
                  } else {
                    setIsOtherUni(false);
                    setUniversity(val);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {allUniversities.map((uni) => (
                  <option key={uni} value={uni}>
                    {uni}
                  </option>
                ))}
                <option value="__other__">Boshqa OTM (Qo'lda kiritish)...</option>
              </select>

              {isOtherUni && (
                <input
                  type="text"
                  value={customUniInput}
                  onChange={(e) => setCustomUniInput(e.target.value)}
                  placeholder="OTM nomini to'liq kiriting (masalan: TGFU, SamDU)..."
                  className="w-full mt-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              )}
            </div>

            {/* Yo'nalish / Fakultet */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Yo'nalish / Fakultet
              </label>
              <input
                type="text"
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                placeholder="Masalan: Dasturiy injiniring, Iqtisodiyot..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
              <FacultyPicker
                university={isOtherUni ? customUniInput : university}
                value={faculty}
                onChange={setFaculty}
              />
            </div>

            {/* Ta'lim shakli (Kunduzgi / Sirtqi / Kechki / Masofaviy) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Ta'lim shakli</span>
                </label>
                {studyType === 'Sirtqi' && (
                  <span className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-800/60">
                    Sirtqi ta'lim (5-kursgacha)
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(['Kunduzgi', 'Sirtqi', 'Kechki', 'Masofaviy'] as StudyType[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setStudyType(st);
                      if (st !== 'Sirtqi' && courseYear > 4) {
                        setCourseYear(4);
                        setSemester(7);
                      }
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all text-center ${
                      studyType === st
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-300'
                    }`}
                  >
                    {st === 'Kunduzgi' ? '🎓 Kunduzgi' : st === 'Sirtqi' ? '💼 Sirtqi (5 kurs)' : st === 'Kechki' ? '🌙 Kechki' : '💻 Masofaviy'}
                  </button>
                ))}
              </div>
            </div>

            {/* Kurs va Semestr */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Kurs tanlash */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  <span>Kursni tanlang ({studyType === 'Sirtqi' ? '1-5 kurs' : '1-4 kurs'})</span>
                </label>
                <div className={`grid ${studyType === 'Sirtqi' ? 'grid-cols-5' : 'grid-cols-4'} gap-1.5`}>
                  {(studyType === 'Sirtqi' ? [1, 2, 3, 4, 5] : [1, 2, 3, 4]).map((c) => (
                    <label
                      key={c}
                      onClick={() => {
                        triggerHaptic('light');
                        setCourseYear(c);
                        // Auto-adjust semester to match course range
                        if (semester < (c - 1) * 2 + 1 || semester > c * 2) {
                          setSemester((c - 1) * 2 + 1);
                        }
                      }}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-black cursor-pointer transition-all active:scale-95 ${
                        courseYear === c
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="admin_course_year"
                        checked={courseYear === c}
                        onChange={() => setCourseYear(c)}
                        className="sr-only"
                      />
                      <span>{c}-kurs</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Semestr tanlash */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-500" />
                  <span>Semestrni tanlang ({studyType === 'Sirtqi' ? '1-10 semestr' : '1-8 semestr'})</span>
                </label>
                <select
                  value={semester}
                  onChange={(e) => {
                    triggerHaptic('light');
                    const s = Number(e.target.value);
                    setSemester(s);
                    setCourseYear(Math.ceil(s / 2));
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  {(studyType === 'Sirtqi' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [1, 2, 3, 4, 5, 6, 7, 8]).map((s) => (
                    <option key={s} value={s}>
                      {s}-semestr ({Math.ceil(s / 2)}-kurs)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Savollar muharriri */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  Savollar Ro'yxati
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {questions.length} ta
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddQuestion}
                className="flex items-center justify-center leading-none gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all active:scale-95 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Yangi savol</span>
              </button>
            </div>

            {isLoadingQuestions ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Loader2 className="w-6 h-6 mx-auto animate-spin text-emerald-500" />
                <p className="text-xs">Savollar bazadan yuklanmoqda...</p>
              </div>
            ) : questions.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Bu testda hozircha savollar yo'q.
                </p>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Birinchi savolni qo'shish</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q, qIdx) => (
                  <div
                    key={q.id || `q_${qIdx}`}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 relative group"
                  >
                    {/* Question Header & Delete */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-black text-xs flex items-center justify-center">
                          {qIdx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          -savol
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(qIdx)}
                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Savolni o'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Question Text Area */}
                    <div>
                      <textarea
                        rows={2}
                        value={q.question}
                        onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                        placeholder={`${qIdx + 1}-savol matnini kiriting...`}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium resize-y"
                      />
                    </div>

                    {/* Options (A, B, C, D) */}
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        Variantlar (To'g'ri javobni tanlang):
                      </p>

                      <div className="grid grid-cols-1 gap-2">
                        {optionLetters.map((letter, optIdx) => {
                          const isCorrect = q.correctIndex === optIdx;
                          return (
                            <div
                              key={letter}
                              className={`flex items-center gap-2 p-1.5 rounded-xl border transition-all ${
                                isCorrect
                                  ? 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-500 ring-1 ring-emerald-500/50'
                                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {/* Radio selector */}
                              <button
                                type="button"
                                onClick={() => handleCorrectOptionChange(qIdx, optIdx)}
                                className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 transition-all ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                                }`}
                                title={isCorrect ? "To'g'ri javob" : "To'g'ri deb belgilash"}
                              >
                                {letter}
                              </button>

                              {/* Option Input */}
                              <input
                                type="text"
                                value={q.options[optIdx]}
                                onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                                placeholder={`${letter} varianti matni...`}
                                className="flex-1 bg-transparent border-0 px-1 py-1 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none font-medium"
                              />

                              {/* Radio indicator */}
                              <input
                                type="radio"
                                name={`correct_q_${qIdx}`}
                                checked={isCorrect}
                                onChange={() => handleCorrectOptionChange(qIdx, optIdx)}
                                className="mr-2 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer accent-emerald-600"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add question bottom button */}
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-emerald-500/40 hover:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Yangi savol qo'shish</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 pb-6 sm:pb-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shrink-0 pb-safe">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
            >
              Bekor qilish
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saqlanmoqda...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 shrink-0" />
                  <span>O'zgarishlarni saqlash</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
