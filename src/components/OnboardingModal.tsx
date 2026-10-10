import React, { useState, useEffect } from 'react';
import { useQuizStore } from '../store/useQuizStore';
import { useTranslation } from '../i18n/useTranslation';
import { UZBEKISTAN_REGIONS, Region, StudyType, AcademicYear, Gender, getAvailableAcademicYears } from '../types';
import { getTelegramWebApp, triggerHaptic } from '../utils/telegram';
import { Sparkles, Check, HeartHandshake, ShieldCheck, Ticket, AlertCircle, Globe, GraduationCap, BookOpen } from 'lucide-react';
import { PublicOfferModal } from './PublicOfferModal';
import { SearchableUniversitySelect } from './SearchableUniversitySelect';
import { AVATAR_OPTIONS, DEFAULT_AVATAR, getAvatarUrl } from '../constants/avatars';
import { UserAvatar } from './UserAvatar';
import { validateAndSanitizeName } from '../utils/security';

export const OnboardingModal: React.FC = () => {
  const { profile, registerUser } = useQuizStore();
  const { t, language, setLanguage } = useTranslation();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [region, setRegion] = useState<Region>('Toshkent shahri');
  const [isStudent, setIsStudent] = useState(true);
  const [university, setUniversity] = useState('');
  const [birthDate, setBirthDate] = useState('2004-01-01');
  const [gender, setGender] = useState<Gender>('male');
  const [studyType, setStudyType] = useState<StudyType>('Kunduzgi');
  const [academicYear, setAcademicYear] = useState<AcademicYear>(1);
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  const [acceptedOferta, setAcceptedOferta] = useState(false);
  const [showOfertaModal, setShowOfertaModal] = useState(false);
  const [step, setStep] = useState<'welcome' | 'form'>('welcome');

  // Field validation errors state (No browser popups)
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string;
    lastName?: string;
    birthDate?: string;
    university?: string;
    oferta?: string;
  }>({});

  // Localized required field message
  const getRequiredMsg = () => {
    switch (language) {
      case 'ru':
        return 'Пожалуйста, заполните это поле';
      case 'en':
        return 'Please fill out this field';
      case 'uz':
      default:
        return "Iltimos, ushbu maydonni to'ldiring";
    }
  };

  // Prefill from Telegram WebApp if available
  useEffect(() => {
    const tg = getTelegramWebApp();
    if (tg?.initDataUnsafe?.user) {
      const u = tg.initDataUnsafe.user;
      if (u.first_name) setFirstName(u.first_name);
      if (u.last_name) setLastName(u.last_name);
    }
  }, []);

  const isAdminPathOrQuery = typeof window !== 'undefined' && (
    window.location.search.toLowerCase().includes('admin') ||
    window.location.hash.toLowerCase().includes('admin') ||
    window.location.pathname.toLowerCase().includes('admin')
  );

  if (profile.isRegistered || isAdminPathOrQuery) {
    return null;
  }

  const handleStudyTypeChange = (type: StudyType) => {
    setStudyType(type);
    const availableYears = getAvailableAcademicYears(type);
    if (!availableYears.includes(academicYear)) {
      setAcademicYear(availableYears[0]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof fieldErrors = {};

    const vFirst = validateAndSanitizeName(firstName);
    if (!vFirst.isValid) {
      errors.firstName = vFirst.error;
    }

    const vLast = validateAndSanitizeName(lastName);
    if (!vLast.isValid) {
      errors.lastName = vLast.error;
    }

    if (isStudent && !university.trim()) {
      errors.university = t.selectUniError || "Iltimos, ro'yxatdan OTMni tanlang";
    }

    if (!birthDate) {
      errors.birthDate = getRequiredMsg();
    }
    if (!acceptedOferta) {
      errors.oferta = language === 'ru'
        ? 'Необходимо принять условия Публичной оферты'
        : language === 'en'
        ? 'Please accept the Public Offer terms'
        : 'Iltimos, Ommaviy oferta shartlariga rozilik bildiring';
    }

    if (Object.keys(errors).length > 0) {
      triggerHaptic('error');
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    const finalUniversity = isStudent ? university.trim() : 'OTM talabasi emas';
    registerUser({
      firstName: vFirst.sanitized,
      lastName: vLast.sanitized,
      region,
      university: finalUniversity,
      birthDate,
      gender,
      studyType: isStudent ? studyType : 'Kunduzgi',
      academicYear: isStudent ? academicYear : 1,
      avatar,
      acceptedOferta: true,
    });

    // Agar foydalanuvchi referal havola orqali kelgan bo'lsa, taklif qiluvchiga +1000 so'm yozish
    try {
      const storedRef =
        (typeof window !== 'undefined'
          ? sessionStorage.getItem('yuksalquiz_referrer_id') ||
            localStorage.getItem('yuksalquiz_referrer_id') ||
            new URLSearchParams(window.location.search).get('ref')
          : null);

      if (storedRef) {
        const tg = getTelegramWebApp();
        fetch('/api/wallet', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(tg?.initData ? { 'X-Telegram-Init-Data': tg.initData } : {}),
          },
          body: JSON.stringify({
            action: 'process_referral',
            referrerId: storedRef,
            newUserId: profile.id,
            initData: tg?.initData || '',
          }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d?.ok) {
              sessionStorage.removeItem('yuksalquiz_referrer_id');
              localStorage.removeItem('yuksalquiz_referrer_id');
            }
          })
          .catch(() => {});
      }
    } catch {}
  };

  const availableYears = getAvailableAcademicYears(studyType);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 p-6 my-8 animate-in fade-in zoom-in-95 duration-200">
          {step === 'welcome' ? (
            /* Welcome & Gratitude Screen */
            <div className="text-center py-4">
              {/* Quick Language Selector */}
              <div className="flex items-center justify-center gap-1.5 mb-5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-fit mx-auto border border-slate-200 dark:border-slate-700">
                <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5" strokeWidth={2} />
                {(
                  [
                    { code: 'uz', label: "O'zbek" },
                    { code: 'ru', label: 'Русский' },
                    { code: 'en', label: 'English' },
                  ] as const
                ).map((langItem) => {
                  const isSelected = language === langItem.code;
                  return (
                    <button
                      key={langItem.code}
                      type="button"
                      onClick={() => {
                        triggerHaptic('selection');
                        setLanguage(langItem.code);
                      }}
                      className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all ${
 isSelected
 ? 'bg-emerald-600 text-white shadow-xs'
 : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
 }`}
                    >
                      {langItem.label}
                    </button>
                  );
                })}
              </div>

              <div className="w-20 h-20 mx-auto rounded-2xl bg-emerald-600 flex items-center justify-center text-4xl shadow-md mb-5 animate-soft-pulse">
                <Sparkles className="w-10 h-10 text-white" strokeWidth={1.75} />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-3">
                <HeartHandshake className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.75} />
                <span>YuksalQuiz Platformasi</span>
              </div>

              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                YuksalQuiz
              </h2>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-6 px-1">
                {t.onboardingDesc}
              </p>

              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 rounded-2xl p-4 text-left mb-6 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={1.75} />
                  <span>{t.onboardingVoucherBenefit}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={1.75} />
                  <span>{t.onboardingPracticeBenefit}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={1.75} />
                  <span>{t.onboardingSecurityBenefit}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  setStep('form');
                }}
                className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95"
              >
                <span>{t.onboardingTitle}</span>
                <span>&rarr;</span>
              </button>
            </div>
          ) : (
            /* Registration Form Screen with Custom Validation */
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {t.onboardingTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.onboardingSubtitle}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900 overflow-hidden shadow-sm flex items-center justify-center p-0.5">
                  <UserAvatar avatar={avatar} />
                </div>
              </div>

              <form noValidate onSubmit={handleSave} className="space-y-3.5 text-xs">
                {/* Avatar Selector - Clean 5x2 Grid with Ring-4 Effect */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">
                      {t.selectAvatar}:
                    </label>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                      {t.customAvatarsCount}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2.5 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                    {AVATAR_OPTIONS.map((av) => {
                      const isSelected = avatar === av.src;
                      return (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => {
                            triggerHaptic('selection');
                            setAvatar(av.src);
                          }}
                          className={`relative aspect-square rounded-2xl overflow-hidden p-1 transition-all flex items-center justify-center bg-white dark:bg-slate-900 border ${
 isSelected
 ? 'ring-4 ring-emerald-500 border-emerald-500 scale-105 shadow-md z-10'
 : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:scale-102 opacity-85 hover:opacity-100'
 }`}
                          title={av.alt}
                        >
                          <img
                            src={getAvatarUrl(av.src)}
                            alt={av.alt}
                            className="w-full h-full object-cover rounded-xl"
                            loading="lazy"
                          />
                          {isSelected && (
                            <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow">
                              <Check className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Name fields */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t.firstName}:
                    </label>
                    <input
                      type="text"
                      minLength={2}
                      maxLength={25}
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        if (fieldErrors.firstName) setFieldErrors({ ...fieldErrors, firstName: undefined });
                      }}
                      placeholder={language === 'ru' ? 'Иван' : language === 'en' ? 'John' : 'Ali'}
                      className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-slate-900 dark:text-white focus:outline-none focus:ring-2 font-medium transition-colors ${
 fieldErrors.firstName
 ? 'border-orange-500 focus:ring-orange-500'
 : 'border-slate-300 dark:border-slate-700 focus:ring-emerald-500'
 }`}
                    />
                    {fieldErrors.firstName && (
                      <p className="text-[11px] text-orange-500 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" strokeWidth={1.75} />
                        <span>{fieldErrors.firstName}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t.lastName}:
                    </label>
                    <input
                      type="text"
                      minLength={2}
                      maxLength={25}
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        if (fieldErrors.lastName) setFieldErrors({ ...fieldErrors, lastName: undefined });
                      }}
                      placeholder={language === 'ru' ? 'Иванов' : language === 'en' ? 'Doe' : 'Valiyev'}
                      className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-slate-900 dark:text-white focus:outline-none focus:ring-2 font-medium transition-colors ${
 fieldErrors.lastName
 ? 'border-orange-500 focus:ring-orange-500'
 : 'border-slate-300 dark:border-slate-700 focus:ring-emerald-500'
 }`}
                    />
                    {fieldErrors.lastName && (
                      <p className="text-[11px] text-orange-500 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" strokeWidth={1.75} />
                        <span>{fieldErrors.lastName}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Region */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.region}:
                  </label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value as Region)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    {UZBEKISTAN_REGIONS.map((reg) => (
                      <option key={reg} value={reg}>
                        {reg}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Student Status: OTM talabasi vs Talaba emasman */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t.studentStatus}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('selection');
                        setIsStudent(true);
                        if (university === 'OTM talabasi emas') setUniversity('');
                        if (fieldErrors.university) {
                          setFieldErrors({ ...fieldErrors, university: undefined });
                        }
                      }}
                      className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
 isStudent
 ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 ring-2 ring-emerald-500/30 text-emerald-900 dark:text-emerald-100 font-bold'
 : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
 }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
 isStudent ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
 }`}>
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs truncate">{t.statusStudent}</div>
                        <div className="text-[11px] opacity-75 font-normal truncate">Universitet / Institut</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('selection');
                        setIsStudent(false);
                        setUniversity('OTM talabasi emas');
                        if (fieldErrors.university) {
                          setFieldErrors({ ...fieldErrors, university: undefined });
                        }
                      }}
                      className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
 !isStudent
 ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-500 ring-2 ring-teal-500/30 text-teal-900 dark:text-teal-100 font-bold'
 : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
 }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
 !isStudent ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
 }`}>
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs truncate">{t.statusNotStudent}</div>
                        <div className="text-[11px] opacity-75 font-normal truncate">{t.statusNotStudentSub}</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Conditional University and Course section */}
                {isStudent ? (
                  <>
                    {/* Searchable University Selector */}
                    <div>
                      <SearchableUniversitySelect
                        label={t.universityLabel || "OTM / Ta'lim muassasasi:"}
                        value={university}
                        onChange={(val) => {
                          setUniversity(val);
                          if (fieldErrors.university) {
                            setFieldErrors({ ...fieldErrors, university: undefined });
                          }
                        }}
                        error={fieldErrors.university}
                        allowCustom={false}
                      />
                    </div>

                    {/* Educational Mode & Dynamic Academic Years */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {t.studyType}:
                        </label>
                        <select
                          value={studyType}
                          onChange={(e) => handleStudyTypeChange(e.target.value as StudyType)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        >
                          <option value="Kunduzgi">{t.studyKunduzgi}</option>
                          <option value="Sirtqi">{t.studySirtqi} (5 yil)</option>
                          <option value="Kechki">{t.studyKechki}</option>
                          <option value="Tibbiyot">{t.studyTibbiyot} (6 yil)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {t.academicYear}:
                        </label>
                        <select
                          value={academicYear}
                          onChange={(e) => setAcademicYear(Number(e.target.value) as AcademicYear)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        >
                          {availableYears.map((yr) => (
                            <option key={yr} value={yr}>
                              {yr}{t.courseUnit}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Informative card for non-students */
                  <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/80 text-teal-800 dark:text-teal-200">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                      <span>{t.statusNotStudent} ({t.statusNotStudentSub})</span>
                    </div>
                    <p className="text-[11px] mt-1.5 text-teal-700 dark:text-teal-300 leading-relaxed">
                      {t.nonStudentNote}
                    </p>
                  </div>
                )}

                {/* Birth Date & Gender */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t.birthDate}:
                    </label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => {
                        setBirthDate(e.target.value);
                        if (fieldErrors.birthDate) setFieldErrors({ ...fieldErrors, birthDate: undefined });
                      }}
                      className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-slate-900 dark:text-white focus:outline-none focus:ring-2 font-medium transition-colors ${
 fieldErrors.birthDate
 ? 'border-orange-500 focus:ring-orange-500'
 : 'border-slate-300 dark:border-slate-700 focus:ring-emerald-500'
 }`}
                    />
                    {fieldErrors.birthDate && (
                      <p className="text-[11px] text-orange-500 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" strokeWidth={1.75} />
                        <span>{fieldErrors.birthDate}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t.gender}:
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('selection');
                          setGender('male');
                        }}
                        className={`py-2 rounded-xl font-semibold border transition-all ${
 gender === 'male'
 ? 'bg-emerald-600 text-white border-emerald-600'
 : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
 }`}
                      >
                        {t.genderMale}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('selection');
                          setGender('female');
                        }}
                        className={`py-2 rounded-xl font-semibold border transition-all ${
 gender === 'female'
 ? 'bg-emerald-600 text-white border-emerald-600'
 : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
 }`}
                      >
                        {t.genderFemale}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mandatory Public Offer (Oferta) Checkbox */}
                <div className="pt-2 pb-1">
                  <div className={`p-3 rounded-2xl border transition-colors ${
 fieldErrors.oferta
 ? 'bg-orange-50/70 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800'
 : 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200/70 dark:border-emerald-800/60'
 } flex items-start gap-2.5`}>
                    <input
                      type="checkbox"
                      id="ofertaCheckbox"
                      checked={acceptedOferta}
                      onChange={(e) => {
                        triggerHaptic('selection');
                        setAcceptedOferta(e.target.checked);
                        if (fieldErrors.oferta) setFieldErrors({ ...fieldErrors, oferta: undefined });
                      }}
                      className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                    />
                    <label
                      htmlFor="ofertaCheckbox"
                      className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug cursor-pointer select-none"
                    >
                      <span>Men </span>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setShowOfertaModal(true);
                        }}
                        className="text-emerald-600 dark:text-emerald-400 font-bold underline hover:text-emerald-700 inline"
                      >
                        Ommaviy oferta
                      </button>{' '}
                      <span>shartlariga roziman (Virtual vaucher va bonuslar kartaga yechib olinmaydi).</span>
                    </label>
                  </div>
                  {fieldErrors.oferta && (
                    <p className="text-[11px] text-orange-500 font-semibold mt-1 px-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" strokeWidth={1.75} />
                      <span>{fieldErrors.oferta}</span>
                    </p>
                  )}
                </div>

                {/* Submit button remains disabled until checked */}
                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={!acceptedOferta}
                    className="w-full py-3 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    <Check className="w-5 h-5 text-white" strokeWidth={2} />
                    <span>{t.completeRegistration}</span>
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
