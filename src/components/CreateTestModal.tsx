import React, { useState } from 'react';
import { useQuizStore } from '../store/useQuizStore';
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
import {
  X,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Layers,
} from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';

interface CreateTestModalProps {
  onClose: () => void;
}

export const CreateTestModal: React.FC<CreateTestModalProps> = ({ onClose }) => {
  const { profile, createTestPackage, addCustomUniversity, customUniversities } = useQuizStore();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MainCategory>('Oliy Ta\'lim (HEMIS)');
  const [selectedUniversity, setSelectedUniversity] = useState(TOP_UNIVERSITIES[0]);
  const [isCustomUni, setIsCustomUni] = useState(false);
  const [customUniName, setCustomUniName] = useState('');
  const [department, setDepartment] = useState<DepartmentType>('Axborot Texnologiyalari');
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState('');

  // Mode: manual builder or fast import
  const [inputMode, setInputMode] = useState<'manual' | 'bulk'>('manual');

  // Manual questions
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 'q-1',
      text: '',
      options: ['', '', '', ''],
      correctOptionIndex: 0,
      explanation: '',
    },
  ]);

  // Bulk import text
  const [bulkText, setBulkText] = useState('');
  const [bulkError, setBulkError] = useState('');

  // Calculate live blocks preview
  const liveBlocks = splitQuestionsIntoBlocks(questions);

  const handleAddQuestion = () => {
    triggerHaptic('light');
    setQuestions([
      ...questions,
      {
        id: 'q-' + (questions.length + 1) + '-' + Math.random().toString(36).substring(2, 6),
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
    const updated = [...questions];
    updated[idx].text = text;
    setQuestions(updated);
  };

  const updateOptionText = (qIdx: number, optIdx: number, text: string) => {
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

  const updateExplanation = (qIdx: number, exp: string) => {
    const updated = [...questions];
    updated[qIdx].explanation = exp;
    setQuestions(updated);
  };

  // Fast Bulk Load Demo (e.g. 50 questions or 110 questions for instant testing!)
  const loadDemoQuestions = (count: number) => {
    triggerHaptic('medium');
    const demo: Question[] = [];
    for (let i = 1; i <= count; i++) {
      demo.push({
        id: `demo-q-${i}`,
        text: `${title || 'Namunaviy fan'} bo'yicha ${i}-savol matni?`,
        options: [
          `To'g'ri variant javobi (${i})`,
          `Noto'g'ri variant B`,
          `Noto'g'ri variant C`,
          `Noto'g'ri variant D`,
        ],
        correctOptionIndex: 0,
        explanation: `Ushbu ${i}-savol uchun qisqacha o'quv-uslubiy tushuntirish berilgan.`,
      });
    }
    setQuestions(demo);
  };

  // Bulk import parser (parses questions separated by blank lines or numbers)
  const handleParseBulkText = () => {
    if (!bulkText.trim()) return;
    try {
      const parsed: Question[] = [];
      const blocks = bulkText.split(/\n\s*\n/);

      blocks.forEach((b, idx) => {
        const lines = b.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length >= 3) {
          const qText = lines[0].replace(/^\d+[\.\)]\s*/, '');
          const optLines = lines.slice(1, 5);
          const options = optLines.map((opt) => opt.replace(/^[A-D][\.\)]\s*/i, ''));

          while (options.length < 4) {
            options.push(`Variant ${options.length + 1}`);
          }

          parsed.push({
            id: `bulk-q-${idx + 1}`,
            text: qText,
            options,
            correctOptionIndex: 0,
            explanation: '',
          });
        }
      });

      if (parsed.length > 0) {
        setQuestions(parsed);
        setInputMode('manual');
        setBulkError('');
        triggerHaptic('success');
      } else {
        setBulkError('Format aniqlanmadi. Har bir savol va variantlarni qatorma-qator yozing.');
      }
    } catch {
      setBulkError('Matnni o\'qishda xatolik yuz berdi.');
    }
  };

  const handleSaveTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Iltimos, fan nomini kiriting');
      return;
    }

    const finalUniversity = isCustomUni ? customUniName.trim() : selectedUniversity;
    if (isCustomUni && !customUniName.trim()) {
      alert('Iltimos, OTM nomini kiriting');
      return;
    }

    if (isCustomUni) {
      addCustomUniversity(customUniName.trim());
    }

    // Ensure questions have text
    const validQuestions = questions.filter((q) => q.text.trim().length > 0);
    if (validQuestions.length === 0) {
      alert('Kamida bitta to\'liq savol kiritilishi shart');
      return;
    }

    const testBlocks = splitQuestionsIntoBlocks(validQuestions);

    const newPackage: TestPackage = {
      id: 'pkg-' + Math.random().toString(36).substring(2, 9),
      title: title.trim(),
      category,
      university: finalUniversity,
      isCustomUniversity: isCustomUni,
      isPendingReview: isCustomUni,
      department,
      isPublic,
      password: isPublic ? undefined : password.trim(),
      totalQuestions: validQuestions.length,
      blocks: testBlocks,
      createdAt: new Date().toISOString().split('T')[0],
      authorId: profile.id,
      authorName: `${profile.firstName} ${profile.lastName}`.trim() || 'Talaba',
      isCommunityCreated: true,
      authorWalletBalance: 0,
    };

    createTestPackage(newPackage);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 my-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Yangi Test To'plami Yaratish
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Test tuzing, muallif bo'ling va har bir yechimdan +100 so'm ishlang
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSaveTest} className="space-y-4 text-xs">
          {/* Category Selection */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Kategoriya (Yo'nalish):
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as MainCategory)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500"
            >
              {MAIN_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Fan / Test nomi:
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masalan: Raqamli iqtisodiyot va Big Data"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* University Selection with Custom OTM */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Universitet (OTM):
            </label>
            <select
              value={isCustomUni ? 'custom' : selectedUniversity}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setIsCustomUni(true);
                } else {
                  setIsCustomUni(false);
                  setSelectedUniversity(e.target.value);
                }
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500"
            >
              {TOP_UNIVERSITIES.map((uni) => (
                <option key={uni} value={uni}>
                  {uni}
                </option>
              ))}
              {customUniversities.map((uni) => (
                <option key={uni} value={uni}>
                  {uni} (Foydalanuvchi qo'shgan)
                </option>
              ))}
              <option value="custom">+ Yangi OTM (Ro'yxatda yo'q)</option>
            </select>

            {/* Custom University input flagged for admin panel review */}
            {isCustomUni && (
              <div className="mt-2 space-y-1.5 animate-in fade-in">
                <input
                  type="text"
                  required
                  value={customUniName}
                  onChange={(e) => setCustomUniName(e.target.value)}
                  placeholder="Yangi OTM to'liq nomini kiriting..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-indigo-400 text-slate-900 dark:text-white font-medium"
                />
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 text-[11px] font-semibold border border-purple-200 dark:border-purple-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  <span>Admin paneli tekshiruviga yuboriladi</span>
                </div>
              </div>
            )}
          </div>

          {/* Department & Access Control */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Yo'nalish / Kafedra:
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
                Kirish huquqi (Access):
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
                  <Unlock className="w-3 h-3" />
                  <span>Ochiq</span>
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
                  <Lock className="w-3 h-3" />
                  <span>Yopiq</span>
                </button>
              </div>
            </div>
          </div>

          {/* Private Password field */}
          {!isPublic && (
            <div className="animate-in fade-in">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Maxfiy test paroli:
              </label>
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Talabalar uchun parolni kiriting (masalan: 2026)"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-amber-400 text-slate-900 dark:text-white font-medium"
              />
            </div>
          )}

          {/* Smart Question Splitting Live Banner */}
          <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 font-extrabold text-xs text-indigo-950 dark:text-indigo-200">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>Aqlli Savollarni Bo'lish Tizimi</span>
              </div>
              <span className="font-bold text-[11px] text-indigo-600 dark:text-indigo-400">
                Jami: {questions.length} ta savol
              </span>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed mb-2.5">
              Savollar soni ko'p bo'lsa (masalan 150 ta), ular avtomatik 20-25 tadan bloklarga ("Test 1", "Test 2", ...) bo'linadi va ketma-ket ochilish tizimi qo'llaniladi.
            </p>

            {/* Blocks Pills Preview */}
            <div className="flex flex-wrap gap-1.5">
              {liveBlocks.map((b) => (
                <span
                  key={b.id}
                  className="px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 text-[10px] font-bold"
                >
                  {b.title}: {b.questions.length} ta savol (O'tish: {b.passingScore} ta)
                </span>
              ))}
            </div>

            {/* Quick Demo Preload Buttons */}
            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60">
              <span className="text-[10px] font-semibold text-slate-500">Tezkor sinov:</span>
              <button
                type="button"
                onClick={() => loadDemoQuestions(25)}
                className="px-2 py-1 rounded bg-indigo-200/60 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100 text-[10px] font-bold hover:bg-indigo-300"
              >
                25 ta savol
              </button>
              <button
                type="button"
                onClick={() => loadDemoQuestions(50)}
                className="px-2 py-1 rounded bg-indigo-200/60 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100 text-[10px] font-bold hover:bg-indigo-300"
              >
                50 ta (2x25)
              </button>
              <button
                type="button"
                onClick={() => loadDemoQuestions(110)}
                className="px-2 py-1 rounded bg-indigo-200/60 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100 text-[10px] font-bold hover:bg-indigo-300"
              >
                110 ta (5x22)
              </button>
              <button
                type="button"
                onClick={() => loadDemoQuestions(150)}
                className="px-2 py-1 rounded bg-indigo-200/60 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100 text-[10px] font-bold hover:bg-indigo-300"
              >
                150 ta (6x25)
              </button>
            </div>
          </div>

          {/* Input Mode Selector */}
          <div className="flex items-center justify-between pt-1">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Savollarni kiritish usuli:
            </span>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setInputMode('manual')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                  inputMode === 'manual'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow'
                    : 'text-slate-500'
                }`}
              >
                Bittalab kiritish
              </button>
              <button
                type="button"
                onClick={() => setInputMode('bulk')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                  inputMode === 'bulk'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow'
                    : 'text-slate-500'
                }`}
              >
                Ommaviy nusxalash (Bulk)
              </button>
            </div>
          </div>

          {/* Mode: Bulk Import */}
          {inputMode === 'bulk' ? (
            <div className="space-y-2">
              <textarea
                rows={6}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`1. Makroiqtisodiy muvozanat nima?\nA) Yalpi talab va taklif tengligi\nB) Byudjet daromadi\nC) Valyuta zaxirasi\nD) Savdo defitsiti\n\n2. Keyingi savol...`}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-[11px]"
              />
              {bulkError && <p className="text-rose-500 text-[11px] font-semibold">{bulkError}</p>}
              <button
                type="button"
                onClick={handleParseBulkText}
                className="w-full py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
              >
                Matnni tahlil qilish va qo'shish
              </button>
            </div>
          ) : (
            /* Mode: Manual question cards (Showing first few with scroll) */
            <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
              {questions.map((q, qIdx) => (
                <div
                  key={q.id}
                  className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                      Savol #{qIdx + 1}
                    </span>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(qIdx)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    required
                    value={q.text}
                    onChange={(e) => updateQuestionText(qIdx, e.target.value)}
                    placeholder="Savol matnini kiriting..."
                    className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  />

                  {/* 4 Options with radio for correct answer */}
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name={`correct-${q.id}`}
                          checked={q.correctOptionIndex === oIdx}
                          onChange={() => updateCorrectOption(qIdx, oIdx)}
                          className="accent-indigo-600"
                        />
                        <input
                          type="text"
                          required
                          value={opt}
                          onChange={(e) => updateOptionText(qIdx, oIdx, e.target.value)}
                          placeholder={`Variant ${['A', 'B', 'C', 'D'][oIdx]}`}
                          className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px]"
                        />
                      </div>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={q.explanation || ''}
                    onChange={(e) => updateExplanation(qIdx, e.target.value)}
                    placeholder="Izoh / Tushuntirish (ixtiyoriy)..."
                    className="w-full px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500"
                  />
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddQuestion}
                className="w-full py-2 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold flex items-center justify-center gap-1.5 hover:border-indigo-500 hover:text-indigo-500 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Yana bitta savol qo'shish</span>
              </button>
            </div>
          )}

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Test to'plamini nashr qilish ({liveBlocks.length} ta blok)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
