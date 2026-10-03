import React, { useState } from 'react';
import { useQuizStore } from '../store/useQuizStore';
import { useTranslation } from '../i18n/useTranslation';
import {
  TOP_UNIVERSITIES,
  DEPARTMENTS,
  DepartmentType,
  Question,
  TestPackage,
  MainCategory,
  MAIN_CATEGORIES,
} from '../types';
import { splitQuestionsIntoBlocks } from '../utils/testSplitter';
import { sanitizeText, decodeHtmlEntities } from '../utils/security';
import {
  X,
  Plus,
  Trash2,
  Lock,
  Unlock,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Coins,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';
import { publishTestToCloud, deleteTestFromCloud } from '../services/testSyncService';
import { SearchableUniversitySelect } from './SearchableUniversitySelect';

interface CreateTestModalProps {
  onClose: () => void;
  editPackage?: TestPackage | null;
}

export const CreateTestModal: React.FC<CreateTestModalProps> = ({ onClose, editPackage }) => {
  const { profile, createTestPackage, updateTestPackage, deleteTestPackage, addCustomUniversity, customUniversities, universities } = useQuizStore();
  const { t } = useTranslation();

  const isEditMode = Boolean(editPackage);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const initialQuestions = React.useMemo(() => {
    if (editPackage?.blocks && editPackage.blocks.length > 0) {
      const flattened = editPackage.blocks.flatMap((b) => b.questions);
      if (flattened.length > 0) {
        return flattened.map((q) => ({
          ...q,
          text: decodeHtmlEntities(q.text),
          options: q.options.map((opt) => decodeHtmlEntities(opt)),
          explanation: q.explanation ? decodeHtmlEntities(q.explanation) : '',
        }));
      }
    }
    return [
      {
        id: 'q-1',
        text: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        explanation: '',
      },
    ];
  }, [editPackage]);

  const [title, setTitle] = useState(editPackage?.title ? decodeHtmlEntities(editPackage.title) : '');
  const [category, setCategory] = useState<MainCategory>(editPackage?.category || 'Oliy Ta\'lim (HEMIS)');

  const allKnownUnis = [...(universities || []), ...TOP_UNIVERSITIES, ...(customUniversities || [])];
  const initialIsCustom = Boolean(
    editPackage && (editPackage.isCustomUniversity || (editPackage.university && !allKnownUnis.includes(editPackage.university)))
  );

  const [selectedUniversity, setSelectedUniversity] = useState(
    editPackage && !initialIsCustom
      ? editPackage.university
      : profile.university || universities?.[0] || TOP_UNIVERSITIES[0]
  );
  const [isCustomUni, setIsCustomUni] = useState(initialIsCustom);
  const [customUniName, setCustomUniName] = useState(initialIsCustom && editPackage ? editPackage.university : '');
  const [department, setDepartment] = useState<DepartmentType>(editPackage?.department || 'Axborot Texnologiyalari');
  const [isPublic, setIsPublic] = useState(editPackage ? editPackage.isPublic : true);
  const [password, setPassword] = useState(editPackage?.password || '');

  // Mode: manual builder or bulk parser
  const [inputMode, setInputMode] = useState<'manual' | 'bulk'>('manual');

  // Manual questions
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);

  // Bulk import text
  const [bulkText, setBulkText] = useState(() => {
    if (editPackage?.blocks && editPackage.blocks.length > 0) {
      const flattened = editPackage.blocks.flatMap((b) => b.questions);
      if (flattened.length > 0) {
        return flattened
          .map((q) => {
            const opts = q.options
              .map((opt, i) => (i === q.correctOptionIndex ? `#${decodeHtmlEntities(opt)}` : decodeHtmlEntities(opt)))
              .join('\n====\n');
            return `${decodeHtmlEntities(q.text)}\n====\n${opts}\n++++`;
          })
          .join('\n\n');
      }
    }
    return '';
  });
  const [bulkError, setBulkError] = useState('');
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState('');

  // Form field validation errors
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // Auto-calculated test blocks
  const liveBlocks = splitQuestionsIntoBlocks(questions);

  const clearFieldError = (key: string) => {
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleAddQuestion = () => {
    triggerHaptic('light');
    setQuestions([
      ...questions,
      {
        id: `q-${questions.length + 1}-${Math.random().toString(36).substring(2, 7)}`,
        text: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        explanation: '',
      },
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    triggerHaptic('light');
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const updateQuestionText = (idx: number, text: string) => {
    clearFieldError(`q-${idx}`);
    const updated = [...questions];
    updated[idx].text = text;
    setQuestions(updated);
  };

  const updateOptionText = (qIdx: number, optIdx: number, text: string) => {
    clearFieldError(`q-${qIdx}-opt-${optIdx}`);
    const updated = [...questions];
    updated[qIdx].options[optIdx] = text;
    setQuestions(updated);
  };

  const updateCorrectOption = (qIdx: number, optIdx: number) => {
    triggerHaptic('selection');
    const updated = [...questions];
    updated[qIdx].correctOptionIndex = optIdx;
    setQuestions(updated);
  };

  const handleAddOption = (qIdx: number) => {
    if (questions[qIdx].options.length >= 6) return;
    triggerHaptic('light');
    const updated = [...questions];
    updated[qIdx].options.push('');
    setQuestions(updated);
  };

  const handleRemoveOption = (qIdx: number, optIdx: number) => {
    if (questions[qIdx].options.length <= 2) return;
    triggerHaptic('light');
    const updated = [...questions];
    updated[qIdx].options = updated[qIdx].options.filter((_, i) => i !== optIdx);
    if (updated[qIdx].correctOptionIndex >= updated[qIdx].options.length) {
      updated[qIdx].correctOptionIndex = 0;
    }
    setQuestions(updated);
  };

  const updateExplanation = (qIdx: number, exp: string) => {
    const updated = [...questions];
    updated[qIdx].explanation = exp;
    setQuestions(updated);
  };

  // Robust bulk parser for ==== and ++++ delimiters with flexible fallback
  const handleParseBulkText = () => {
    const trimmed = bulkText.trim();
    if (!trimmed) {
      setBulkError(t.fieldRequired);
      return;
    }

    try {
      const parsed: Question[] = [];

      if (trimmed.includes('++++')) {
        // Primary format with ++++ question separator and ==== option separator
        const rawBlocks = trimmed.split(/\+{4,}/).map((b) => b.trim()).filter(Boolean);

        rawBlocks.forEach((blockStr, qIdx) => {
          const parts = blockStr.split(/={4,}/).map((p) => p.trim()).filter(Boolean);
          if (parts.length >= 2) {
            const qText = parts[0];
            const rawOptions = parts.slice(1);
            let correctIndex = 0;
            const options: string[] = [];

            rawOptions.forEach((opt, oIdx) => {
              let optText = opt;
              if (optText.startsWith('#') || optText.startsWith('+')) {
                correctIndex = oIdx;
                optText = optText.substring(1).trim();
              } else if (optText.startsWith('=')) {
                optText = optText.substring(1).trim();
              }
              options.push(optText);
            });

            while (options.length < 4) {
              options.push(`Variant ${options.length + 1}`);
            }

            parsed.push({
              id: `bulk-q-${qIdx + 1}-${Math.random().toString(36).substring(2, 6)}`,
              text: qText,
              options,
              correctOptionIndex: correctIndex,
              explanation: '',
            });
          }
        });
      } else {
        // Fallback: blank-line separated questions
        const blocks = trimmed.split(/\n\s*\n/);
        blocks.forEach((b, idx) => {
          const lines = b.split('\n').map((l) => l.trim()).filter(Boolean);
          if (lines.length >= 2) {
            const qText = lines[0].replace(/^\d+[\.\)]\s*/, '');
            const rawOptions = lines.slice(1);
            let correctIndex = 0;
            const options: string[] = [];

            rawOptions.forEach((opt, oIdx) => {
              let optText = opt;
              if (optText.startsWith('#') || optText.startsWith('+')) {
                correctIndex = oIdx;
                optText = optText.substring(1).trim();
              } else if (optText.startsWith('=')) {
                optText = optText.substring(1).trim();
              } else if (/^[A-D][\.\)]\s*/i.test(optText)) {
                optText = optText.replace(/^[A-D][\.\)]\s*/i, '');
              }
              options.push(optText);
            });

            while (options.length < 4) {
              options.push(`Variant ${options.length + 1}`);
            }

            parsed.push({
              id: `bulk-q-${idx + 1}-${Math.random().toString(36).substring(2, 6)}`,
              text: qText,
              options: options.slice(0, 4),
              correctOptionIndex: correctIndex >= 4 ? 0 : correctIndex,
              explanation: '',
            });
          }
        });
      }

      if (parsed.length > 0) {
        setQuestions(parsed);
        setInputMode('manual');
        setBulkError('');
        setBulkSuccessMsg(`${parsed.length} ${t.parsedQuestionsCount}`);
        triggerHaptic('success');
      } else {
        setBulkError('Format aniqlanmadi. Har bir savol va javoblar orasiga ====, savollar oxiriga ++++ yozing.');
        triggerHaptic('error');
      }
    } catch {
      setBulkError('Matnni tahlil qilishda xatolik yuz berdi.');
      triggerHaptic('error');
    }
  };

  const handleSaveTest = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, boolean> = {};

    if (!title.trim()) {
      newErrors.title = true;
    }

    if (isCustomUni && !customUniName.trim()) {
      newErrors.customUni = true;
    }

    if (!isPublic && !password.trim()) {
      newErrors.password = true;
    }

    // Validate questions and options
    questions.forEach((q, qIdx) => {
      if (!q.text.trim()) {
        newErrors[`q-${qIdx}`] = true;
      }
      q.options.forEach((opt, oIdx) => {
        if (!opt.trim()) {
          newErrors[`q-${qIdx}-opt-${oIdx}`] = true;
        }
      });
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      triggerHaptic('warning');
      return;
    }

    const finalUniversity = sanitizeText(isCustomUni ? customUniName.trim() : selectedUniversity);
    if (isCustomUni) {
      addCustomUniversity(finalUniversity);
    }

    const validQuestions = questions
      .filter((q) => q.text.trim().length > 0)
      .map((q) => ({
        ...q,
        text: sanitizeText(q.text),
        options: q.options.map((opt) => sanitizeText(opt)),
        explanation: q.explanation ? sanitizeText(q.explanation) : undefined,
      }));

    const testBlocks = splitQuestionsIntoBlocks(validQuestions);

    if (editPackage) {
      const updatedPackage: TestPackage = {
        ...editPackage,
        title: sanitizeText(title.trim()),
        category,
        university: finalUniversity,
        isCustomUniversity: isCustomUni,
        isPendingReview: isCustomUni,
        department,
        isPublic,
        password: isPublic ? undefined : sanitizeText(password.trim()),
        totalQuestions: validQuestions.length,
        blocks: testBlocks,
      };

      updateTestPackage(updatedPackage);
      triggerHaptic('success');

      publishTestToCloud(updatedPackage).then((res) => {
        if (res.success) {
          console.log('Test updated in Supabase:', updatedPackage.title);
        }
      });

      onClose();
      return;
    }

    const newPackage: TestPackage = {
      id: 'pkg-' + Math.random().toString(36).substring(2, 9),
      title: sanitizeText(title.trim()),
      category,
      university: finalUniversity,
      isCustomUniversity: isCustomUni,
      isPendingReview: isCustomUni,
      department,
      isPublic,
      password: isPublic ? undefined : sanitizeText(password.trim()),
      totalQuestions: validQuestions.length,
      blocks: testBlocks,
      createdAt: new Date().toISOString().split('T')[0],
      authorId: profile.id,
      authorName: sanitizeText(`${profile.firstName} ${profile.lastName}`.trim() || 'Talaba'),
      isCommunityCreated: true,
      authorWalletBalance: 0,
    };

    createTestPackage(newPackage);
    triggerHaptic('success');

    // Publish to cloud so all students can immediately see the test
    publishTestToCloud(newPackage).then((res) => {
      if (res.success) {
        console.log('Test published to Supabase:', newPackage.title);
      }
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center p-3 pb-44 sm:pb-32 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 my-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Layers className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                {isEditMode ? 'Testni tahrirlash' : t.createTestModalTitle}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isEditMode
                  ? "Test savollari, javoblari va ma'lumotlarini yangilang"
                  : t.createTestModalDesc}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Form with noValidate to block native browser tooltips */}
        <form noValidate onSubmit={handleSaveTest} className="space-y-4 text-xs">
          {/* Category Selection */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t.categoryLabel}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as MainCategory)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500"
            >
              {MAIN_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Test Title */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t.testTitleLabel}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                clearFieldError('title');
              }}
              placeholder="Masalan: Raqamli iqtisodiyot va Big Data"
              className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
                errors.title
                  ? 'border-orange-500 focus:ring-orange-500'
                  : 'border-slate-300 dark:border-slate-700 focus:ring-emerald-500'
              }`}
            />
            {errors.title && (
              <p className="text-[11px] text-orange-500 font-semibold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" strokeWidth={1.75} />
                <span>{t.fieldRequired}</span>
              </p>
            )}
          </div>

          {/* University Selection with Custom OTM */}
          <div>
            <SearchableUniversitySelect
              label={t.universityLabel}
              value={selectedUniversity}
              isCustomSelected={isCustomUni}
              onChange={(uni) => {
                if (uni === 'custom') {
                  setIsCustomUni(true);
                } else {
                  setIsCustomUni(false);
                  setSelectedUniversity(uni);
                }
              }}
              onCustomSelect={() => setIsCustomUni(true)}
              allowCustom={true}
              universities={universities}
              customUniversities={customUniversities}
            />

            {/* Custom University input */}
            {isCustomUni && (
              <div className="mt-2 space-y-1.5 animate-in fade-in">
                <input
                  type="text"
                  value={customUniName}
                  onChange={(e) => {
                    setCustomUniName(e.target.value);
                    clearFieldError('customUni');
                  }}
                  placeholder={t.customUniPlaceholder}
                  className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border font-medium text-slate-900 dark:text-white ${
                    errors.customUni
                      ? 'border-orange-500 focus:ring-orange-500'
                      : 'border-emerald-400 focus:ring-emerald-500'
                  }`}
                />
                {errors.customUni && (
                  <p className="text-[11px] text-orange-500 font-semibold mt-0.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" strokeWidth={1.75} />
                    <span>{t.fieldRequired}</span>
                  </p>
                )}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/70 text-orange-700 dark:text-orange-300 text-[11px] font-semibold border border-orange-200 dark:border-orange-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-orange-500 shrink-0" strokeWidth={1.75} />
                  <span>Admin paneli tekshiruviga yuboriladi</span>
                </div>
              </div>
            )}
          </div>

          {/* Department & Access Control */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.departmentLabel}
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as DepartmentType)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.accessLabel}
              </label>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`py-2 rounded-xl font-bold border transition-all flex items-center justify-center gap-1 ${
                    isPublic
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent'
                  }`}
                >
                  <Unlock className="w-3 h-3" strokeWidth={1.75} />
                  <span>{t.publicAccess}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`py-2 rounded-xl font-bold border transition-all flex items-center justify-center gap-1 ${
                    !isPublic
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent'
                  }`}
                >
                  <Lock className="w-3 h-3" strokeWidth={1.75} />
                  <span>{t.privateAccess}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Private Password field */}
          {!isPublic && (
            <div className="animate-in fade-in">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.testPasswordLabel}
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError('password');
                }}
                placeholder={t.testPasswordPlaceholder}
                className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-slate-900 dark:text-white font-medium ${
                  errors.password
                    ? 'border-orange-500 focus:ring-orange-500'
                    : 'border-amber-400 focus:ring-amber-500'
                }`}
              />
              {errors.password && (
                <p className="text-[11px] text-orange-500 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" strokeWidth={1.75} />
                  <span>{t.fieldRequired}</span>
                </p>
              )}
            </div>
          )}

          {/* Clean Auto-Split & Author Reward Card */}
          <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/80 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <Coins className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-emerald-950 dark:text-emerald-200 leading-tight">
                  {t.authorRewardNotice}
                </p>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Jami: <strong className="text-slate-900 dark:text-white">{questions.length}</strong> ta savol ({liveBlocks.length} ta blok)
                </p>
              </div>
            </div>
          </div>

          {/* Input Mode Switcher */}
          <div className="flex items-center justify-between pt-1">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Savollarni kiritish:
            </span>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setInputMode('manual')}
                className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all ${
                  inputMode === 'manual'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                {t.inputModeManual}
              </button>
              <button
                type="button"
                onClick={() => setInputMode('bulk')}
                className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all ${
                  inputMode === 'bulk'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                {t.inputModeBulk}
              </button>
            </div>
          </div>

          {/* Bulk Import Mode */}
          {inputMode === 'bulk' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span>{t.pasteLabel}</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  Format: #to'g'ri, ====, ++++
                </span>
              </div>
              <textarea
                rows={8}
                value={bulkText}
                onChange={(e) => {
                  setBulkText(e.target.value);
                  setBulkError('');
                  setBulkSuccessMsg('');
                }}
                placeholder={t.bulkPlaceholder}
                className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
              />
              {bulkError && (
                <p className="text-orange-500 text-[11px] font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                  <span>{bulkError}</span>
                </p>
              )}
              {bulkSuccessMsg && (
                <p className="text-emerald-500 text-[11px] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                  <span>{bulkSuccessMsg}</span>
                </p>
              )}
              <button
                type="button"
                onClick={handleParseBulkText}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <FileText className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>{t.parseBtn}</span>
              </button>
            </div>
          ) : (
            /* Manual Question Cards */
            <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
              {questions.map((q, qIdx) => {
                const qHasError = errors[`q-${qIdx}`];

                return (
                  <div
                    key={q.id}
                    className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                        {t.questionNumber} #{qIdx + 1}
                      </span>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(qIdx)}
                          className="text-orange-500 hover:text-orange-600 p-1 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </button>
                      )}
                    </div>

                    <div>
                      <input
                        type="text"
                        value={q.text}
                        onChange={(e) => updateQuestionText(qIdx, e.target.value)}
                        placeholder="Savol matnini kiriting..."
                        className={`w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border text-slate-900 dark:text-white font-medium text-xs focus:outline-none focus:ring-2 ${
                          qHasError
                            ? 'border-orange-500 focus:ring-orange-500'
                            : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500'
                        }`}
                      />
                      {qHasError && (
                        <p className="text-[10px] text-orange-500 font-semibold mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" strokeWidth={1.75} />
                          <span>{t.fieldRequired}</span>
                        </p>
                      )}
                    </div>

                    {/* Options with radio button for correct answer */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Variantlar (To'g'ri javobni tanlang):
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt, oIdx) => {
                          const optHasError = errors[`q-${qIdx}-opt-${oIdx}`];
                          const isCorrect = q.correctOptionIndex === oIdx;

                          return (
                            <div key={oIdx} className="space-y-0.5">
                              <div
                                className={`flex items-center gap-1.5 p-1 rounded-xl border transition-all ${
                                  isCorrect
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`correct-${q.id}`}
                                  checked={isCorrect}
                                  onChange={() => updateCorrectOption(qIdx, oIdx)}
                                  className="accent-emerald-600 ml-1.5 cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => updateOptionText(qIdx, oIdx, e.target.value)}
                                  placeholder={`Variant ${['A', 'B', 'C', 'D', 'E', 'F'][oIdx] || oIdx + 1}`}
                                  className="w-full px-1.5 py-1 bg-transparent text-[11px] text-slate-900 dark:text-white focus:outline-none font-medium"
                                />
                                {q.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOption(qIdx, oIdx)}
                                    className="p-1 text-slate-400 hover:text-orange-500"
                                  >
                                    <X className="w-3 h-3" strokeWidth={1.75} />
                                  </button>
                                )}
                              </div>
                              {optHasError && (
                                <p className="text-[9px] text-orange-500 font-semibold pl-1">
                                  {t.fieldRequired}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {q.options.length < 6 && (
                        <button
                          type="button"
                          onClick={() => handleAddOption(qIdx)}
                          className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 pt-0.5 hover:underline"
                        >
                          <Plus className="w-3 h-3" strokeWidth={1.75} />
                          <span>Variant qo'shish</span>
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={q.explanation || ''}
                      onChange={(e) => updateExplanation(qIdx, e.target.value)}
                      placeholder="Tushuntirish / Izoh (ixtiyoriy)..."
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400"
                    />
                  </div>
                );
              })}

              <button
                type="button"
                onClick={handleAddQuestion}
                className="w-full py-2.5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold flex items-center justify-center gap-1.5 hover:border-emerald-500 hover:text-emerald-500 transition-colors"
              >
                <Plus className="w-4 h-4" strokeWidth={1.75} />
                <span>{t.addQuestionBtn}</span>
              </button>
            </div>
          )}

          {/* Submit & Delete actions */}
          <div className="pt-2 space-y-2.5">
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />
              <span>
                {isEditMode
                  ? `O'zgarishlarni saqlash (${liveBlocks.length} ta blok)`
                  : `${t.publishTestBtn} (${liveBlocks.length} ta blok)`}
              </span>
            </button>

            {isEditMode && editPackage && (
              <div className="pt-1">
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('warning');
                      setShowDeleteConfirm(true);
                    }}
                    className="w-full py-2.5 rounded-2xl bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/60 text-orange-600 dark:text-orange-400 font-bold text-xs border border-orange-200 dark:border-orange-800/60 flex items-center justify-center gap-1.5 transition-colors active:scale-98"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Testni butunlay o'chirish</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-2xl bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 space-y-2 animate-in fade-in">
                    <p className="text-[11px] font-bold text-orange-700 dark:text-orange-300 text-center">
                      Ushbu testni butunlay o'chirishni tasdiqlaysizmi?
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
                      >
                        Bekor qilish
                      </button>
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={async () => {
                          const targetId = editPackage.id;
                          triggerHaptic('medium');
                          deleteTestPackage(targetId);
                          triggerHaptic('success');
                          onClose();
                          try {
                            await deleteTestFromCloud(targetId);
                          } catch (err) {
                            console.warn('Cloud delete error:', err);
                          }
                        }}
                        className="flex-1 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-600/30 transition-all active:scale-95 flex items-center justify-center gap-1"
                      >
                        {isDeleting ? (
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
                )}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
