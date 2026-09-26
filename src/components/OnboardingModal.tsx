import React, { useState, useEffect } from 'react';
import { useQuizStore } from '../store/useQuizStore';
import { UZBEKISTAN_REGIONS, Region, StudyType, AcademicYear, Gender } from '../types';
import { getTelegramWebApp, triggerHaptic } from '../utils/telegram';
import { Sparkles, Check, HeartHandshake, ShieldCheck, Ticket } from 'lucide-react';
import { PublicOfferModal } from './PublicOfferModal';

const AVATAR_OPTIONS = [
  '👨‍🎓', '👩‍🎓', '🧑‍💻', '👩‍💻', '👨‍🏫', '👩‍🏫',
  '👨‍🔬', '👩‍🔬', '👨‍💼', '👩‍💼', '👨‍⚕️', '👩‍⚕️',
];

export const OnboardingModal: React.FC = () => {
  const { profile, registerUser } = useQuizStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [region, setRegion] = useState<Region>('Toshkent shahri');
  const [birthDate, setBirthDate] = useState('2004-01-01');
  const [gender, setGender] = useState<Gender>('male');
  const [studyType, setStudyType] = useState<StudyType>('Kunduzgi');
  const [academicYear, setAcademicYear] = useState<AcademicYear>(1);
  const [avatar, setAvatar] = useState('👨‍🎓');
  const [acceptedOferta, setAcceptedOferta] = useState(false);
  const [showOfertaModal, setShowOfertaModal] = useState(false);
  const [step, setStep] = useState<'welcome' | 'form'>('welcome');
  const [error, setError] = useState('');

  // Prefill from Telegram WebApp if available
  useEffect(() => {
    const tg = getTelegramWebApp();
    if (tg?.initDataUnsafe?.user) {
      const u = tg.initDataUnsafe.user;
      if (u.first_name) setFirstName(u.first_name);
      if (u.last_name) setLastName(u.last_name);
    }
  }, []);

  if (profile.isRegistered) {
    return null;
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setError('Iltimos, ismingizni kiriting');
      triggerHaptic('error');
      return;
    }
    if (!lastName.trim()) {
      setError('Iltimos, familiyangizni kiriting');
      triggerHaptic('error');
      return;
    }
    if (!acceptedOferta) {
      setError('Iltimos, Ommaviy oferta shartlariga rozilik bildiring');
      triggerHaptic('error');
      return;
    }

    registerUser({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      region,
      birthDate,
      gender,
      studyType,
      academicYear,
      avatar,
      acceptedOferta: true,
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 my-8 animate-in fade-in zoom-in-95 duration-200">
          {step === 'welcome' ? (
            /* Welcome & Gratitude Screen */
            <div className="text-center py-4">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center text-4xl shadow-xl shadow-indigo-500/30 mb-5 animate-soft-pulse">
                🎓
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-3">
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>Minnatdorchilik bilan</span>
              </div>

              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                YuksalQuiz ga Xush Kelibsiz!
              </h2>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                O'zbekiston oliy ta'lim talabalari va o'quvchilari uchun yaratilgan innovatsion va xavfsiz test platformasini tanlaganingiz uchun tashakkur!
              </p>

              <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 rounded-2xl p-4 text-left mb-6 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-950 dark:text-indigo-100">
                  <Ticket className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>35 000 so'mlik boshlang'ich obuna vaucheri taqdim etiladi!</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>+5 ta boshlang'ich Yuksal Tangasi sovg'a</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                  <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>Rasmiy Ommaviy oferta va shifrlangan xotira</span>
                </div>
              </div>

              <button
                onClick={() => {
                  triggerHaptic('medium');
                  setStep('form');
                }}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all transform active:scale-95"
              >
                <span>Profilni to'ldirish</span>
                <span>&rarr;</span>
              </button>
            </div>
          ) : (
            /* Registration Form Screen */
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    Talaba Profilini Yarating
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Reyting va natijalar uchun ma'lumotlaringizni kiriting
                  </p>
                </div>
                <div className="text-2xl p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900">
                  {avatar}
                </div>
              </div>

              {error && (
                <div className="p-3 mb-4 rounded-xl bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                  {error}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-3.5 text-xs">
                {/* Avatar Selector */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Avatarni tanlang:
                  </label>
                  <div className="grid grid-cols-6 gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    {AVATAR_OPTIONS.map((av) => (
                      <button
                        key={av}
                        type="button"
                        onClick={() => {
                          triggerHaptic('selection');
                          setAvatar(av);
                        }}
                        className={`h-10 text-xl rounded-xl flex items-center justify-center transition-all ${
                          avatar === av
                            ? 'bg-indigo-600 text-white shadow-md scale-110'
                            : 'hover:bg-slate-200 dark:hover:bg-slate-700/60'
                        }`}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name fields */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Ismingiz:
                    </label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Masalan, Ali"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Familiyangiz:
                    </label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Valiyev"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                </div>

                {/* Region */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Viloyatingiz (Hudud):
                  </label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value as Region)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    {UZBEKISTAN_REGIONS.map((reg) => (
                      <option key={reg} value={reg}>
                        {reg}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Birth Date & Gender */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tug'ilgan sana:
                    </label>
                    <input
                      type="date"
                      required
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Jinsi:
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setGender('male')}
                        className={`py-2 rounded-xl font-semibold border transition-all ${
                          gender === 'male'
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        Erkak
                      </button>
                      <button
                        type="button"
                        onClick={() => setGender('female')}
                        className={`py-2 rounded-xl font-semibold border transition-all ${
                          gender === 'female'
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        Ayol
                      </button>
                    </div>
                  </div>
                </div>

                {/* Study Type & Academic Year */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Ta'lim shakli:
                    </label>
                    <select
                      value={studyType}
                      onChange={(e) => setStudyType(e.target.value as StudyType)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      <option value="Kunduzgi">Kunduzgi</option>
                      <option value="Sirtqi">Sirtqi</option>
                      <option value="Kechki">Kechki</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Akademik kurs:
                    </label>
                    <select
                      value={academicYear}
                      onChange={(e) => setAcademicYear(Number(e.target.value) as AcademicYear)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      <option value={1}>1-kurs</option>
                      <option value={2}>2-kurs</option>
                      <option value={3}>3-kurs</option>
                      <option value={4}>4-kurs</option>
                    </select>
                  </div>
                </div>

                {/* Mandatory Public Offer (Oferta) Checkbox */}
                <div className="pt-2 pb-1">
                  <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/60 flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="ofertaCheckbox"
                      required
                      checked={acceptedOferta}
                      onChange={(e) => {
                        triggerHaptic('selection');
                        setAcceptedOferta(e.target.checked);
                      }}
                      className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                    />
                    <label
                      htmlFor="ofertaCheckbox"
                      className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug cursor-pointer select-none"
                    >
                      Men{' '}
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setShowOfertaModal(true);
                        }}
                        className="text-indigo-600 dark:text-indigo-400 font-bold underline hover:text-indigo-700 inline"
                      >
                        Ommaviy oferta
                      </button>{' '}
                      shartlariga roziman.
                    </label>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Ma'lumotlarni saqlash va boshlash</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Public Offer Legal Modal */}
      <PublicOfferModal
        isOpen={showOfertaModal}
        onClose={() => setShowOfertaModal(false)}
        onAccept={() => setAcceptedOferta(true)}
      />
    </>
  );
};
