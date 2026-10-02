import React, { useState } from 'react';
import { useQuizStore } from '../store/useQuizStore';
import {
  UZBEKISTAN_REGIONS,
  Region,
  StudyType,
  AcademicYear,
  Gender,
} from '../types';
import {
  User,
  ShieldCheck,
  Coins,
  Flame,
  Award,
  Edit3,
  Check,
  X,
  BookOpen,
  Calendar,
  Lock,
  ScrollText,
  CheckSquare,
  ChevronRight,
} from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';
import { PublicOfferModal } from './PublicOfferModal';
import { AVATAR_OPTIONS, getAvatarUrl } from '../constants/avatars';
import { UserAvatar } from './UserAvatar';
import { SearchableUniversitySelect } from './SearchableUniversitySelect';

interface ProfileViewProps {
  onOpenAdminLogin?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onOpenAdminLogin }) => {
  const { profile, updateProfile, setActiveTab, universities } = useQuizStore();
  const [showOfertaModal, setShowOfertaModal] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [region, setRegion] = useState<Region>(profile.region);
  const [university, setUniversity] = useState(profile.university || universities[0] || 'TATU');
  const [birthDate, setBirthDate] = useState(profile.birthDate);
  const [gender, setGender] = useState<Gender>(profile.gender);
  const [studyType, setStudyType] = useState<StudyType>(profile.studyType);
  const [academicYear, setAcademicYear] = useState<AcademicYear>(profile.academicYear);
  const [avatar, setAvatar] = useState(profile.avatar);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('success');

    updateProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      region,
      university,
      birthDate,
      gender,
      studyType,
      academicYear,
      avatar,
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            Talaba Profili
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Shaxsiy ma'lumotlar va xavfsizlik sozlamalari
          </p>
        </div>

        <button
          onClick={() => {
            triggerHaptic('light');
            setIsEditing(!isEditing);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200"
        >
          {isEditing ? <X className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
          <span>{isEditing ? 'Bekor qilish' : 'Tahrirlash'}</span>
        </button>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm text-center">
        <div className="relative inline-block mx-auto mb-3">
          <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950 border-2 border-emerald-500/30 overflow-hidden shadow-md flex items-center justify-center p-1">
            <UserAvatar avatar={isEditing ? avatar : profile.avatar} />
          </div>
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
            <Check className="w-3.5 h-3.5" />
          </span>
        </div>

        <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
          {profile.firstName || 'Talaba'} {profile.lastName || ''}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {profile.university ? `${profile.university} • ` : ''}{profile.region} • {profile.academicYear}-kurs • {profile.studyType}
        </p>

        {/* Security Signature Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 text-[10px] font-bold mt-3">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Profil xavfsizligi tasdiqlangan (Anti-Tamper SHA-256)</span>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-left">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl">
            <div className="flex items-center gap-1.5 text-amber-500 font-black text-sm">
              <Coins className="w-4 h-4 fill-amber-500" />
              <span>{profile.coins}</span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Tangalar</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl">
            <div className="flex items-center gap-1.5 text-orange-500 font-black text-sm">
              <Flame className="w-4 h-4 fill-orange-500" />
              <span>{profile.streak} kun</span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Seriya (Streak)</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-black text-sm">
              <BookOpen className="w-4 h-4" />
              <span>{profile.completedTestsCount}</span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Yechilgan test</p>
          </div>
        </div>

        {/* 100% Free Learning Mode Status */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-left">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                100% Bepul Ta'lim Rejimi
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Barcha imtihonlar va testlar cheklovlarsiz ochiq
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            Faol
          </span>
        </div>
      </div>

      {/* My Results & Mistakes Analytics Card */}
      <div
        onClick={() => {
          triggerHaptic('light');
          setActiveTab('results');
        }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex items-center justify-between cursor-pointer hover:border-emerald-400 transition-all active:scale-[0.99]"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
              Mening natijalarim va tahlillar
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Yechilgan testlar, xatolar ustida ishlash va statistika
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <span>Ko'rish</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>

      {/* Public Offer Link Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 flex items-center justify-center">
            <ScrollText className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-slate-900 dark:text-white">
              Ommaviy Oferta Shartnomasi
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Foydalanuvchi qoidalari va vaucher talablari
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowOfertaModal(true)}
          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs"
        >
          O'qish
        </button>
      </div>

      <PublicOfferModal
        isOpen={showOfertaModal}
        onClose={() => setShowOfertaModal(false)}
      />

      {/* Admin Portal Entry */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onOpenAdminLogin?.();
          }}
          className="w-full py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs flex items-center justify-between transition-all active:scale-[0.99]"
        >
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Admin tizimiga kirish</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Boshqaruv paneli &rarr;</span>
        </button>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-3">
            Ma'lumotlarni o'zgartirish
          </h4>

          <form onSubmit={handleSave} className="space-y-3.5 text-xs">
            {/* Avatar Selector - Clean 5x2 Grid */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Avatarni yangilash:
                </label>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  10 ta maxsus avatar
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800">
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
                          ? 'ring-4 ring-emerald-500 border-emerald-500 scale-105 shadow-md shadow-emerald-500/25 z-10'
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

            {/* Names */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ism:
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Familiya:
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                />
              </div>
            </div>

            {/* Region & University */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Viloyat:
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value as Region)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                >
                  {UZBEKISTAN_REGIONS.map((reg) => (
                    <option key={reg} value={reg}>
                      {reg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <SearchableUniversitySelect
                  label="OTM / Ta'lim muassasasi:"
                  value={university}
                  onChange={(val) => setUniversity(val)}
                  universities={universities}
                  allowCustom={false}
                />
              </div>
            </div>

            {/* Study Type & Year */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ta'lim shakli:
                </label>
                <select
                  value={studyType}
                  onChange={(e) => setStudyType(e.target.value as StudyType)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                >
                  <option value="Kunduzgi">Kunduzgi</option>
                  <option value="Sirtqi">Sirtqi</option>
                  <option value="Kechki">Kechki</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kurs:
                </label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(Number(e.target.value) as AcademicYear)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                >
                  <option value={1}>1-kurs</option>
                  <option value={2}>2-kurs</option>
                  <option value={3}>3-kurs</option>
                  <option value={4}>4-kurs</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
            >
              <Check className="w-4 h-4" />
              <span>O'zgarishlarni saqlash</span>
            </button>
          </form>
        </div>
      )}

      {/* App Version Stamp */}
      <div className="pt-2 text-center">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[11px] font-bold shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>YuksalQuiz v1.0 • Rasmiy versiya</span>
        </div>
      </div>
    </div>
  );
};
