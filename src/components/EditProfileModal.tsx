import React, { useState, useEffect } from 'react';
import { useQuizStore } from '../store/useQuizStore';
import { useTranslation } from '../i18n/useTranslation';
import {
  UZBEKISTAN_REGIONS,
  Region,
  StudyType,
  AcademicYear,
  Gender,
} from '../types';
import {
  X,
  Check,
  Edit3,
  User,
  Sparkles,
  School,
  MapPin,
  GraduationCap,
  Calendar,
} from 'lucide-react';
import { triggerHaptic, soundFX } from '../utils/telegram';
import { AVATAR_OPTIONS, getAvatarUrl } from '../constants/avatars';
import { UserAvatar } from './UserAvatar';
import { SearchableUniversitySelect } from './SearchableUniversitySelect';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { profile, updateProfile, universities } = useQuizStore();
  const { t } = useTranslation();

  const [firstName, setFirstName] = useState(profile.firstName || '');
  const [lastName, setLastName] = useState(profile.lastName || '');
  const [region, setRegion] = useState<Region>(profile.region);
  const [university, setUniversity] = useState(
    profile.university || universities[0] || 'TATU'
  );
  const [studyType, setStudyType] = useState<StudyType>(profile.studyType);
  const [academicYear, setAcademicYear] = useState<AcademicYear>(profile.academicYear);
  const [avatar, setAvatar] = useState(profile.avatar);

  // Sync state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
      setRegion(profile.region);
      setUniversity(profile.university || universities[0] || 'TATU');
      setStudyType(profile.studyType);
      setAcademicYear(profile.academicYear);
      setAvatar(profile.avatar);
    }
  }, [isOpen, profile, universities]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('success');
    soundFX.playCorrect();

    updateProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      region,
      university,
      studyType,
      academicYear,
      avatar,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-emerald-500/80 dark:border-emerald-500 shadow-2xl shadow-emerald-500/15 max-w-md w-full overflow-hidden max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header with Visual Editing Mode Status */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/25">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  {t.editDataTitle || 'Profilni tahrirlash'}
                </h3>
                <span className="flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                  <span>Faol rejim</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Ma'lumotlar va avatarni yangilang
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors active:scale-95"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Active Avatar Section with Live Preview */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center">
            <div className="flex items-center justify-between mb-3 text-left">
              <label className="block font-bold text-slate-800 dark:text-slate-200 text-xs">
                {t.updateAvatarLabel || 'Avatarni tanlang:'}
              </label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-100/70 dark:bg-emerald-950/70 px-2 py-0.5 rounded-md">
                {t.customAvatarsCount || '10 ta maxsus avatar'}
              </span>
            </div>

            {/* Central Animated Active Preview */}
            <div className="relative inline-block mx-auto mb-3.5">
              <div className="w-16 h-16 rounded-2xl ring-4 ring-emerald-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 overflow-hidden shadow-lg shadow-emerald-500/25 p-0.5 bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center transition-all duration-300">
                <UserAvatar avatar={avatar} />
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md ring-2 ring-white dark:ring-slate-900">
                <Check className="w-3 h-3" />
              </span>
            </div>

            {/* Interactive 5x2 Avatar Grid with Smooth Animation */}
            <div className="grid grid-cols-5 gap-2 pt-1">
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
                    className={`relative aspect-square rounded-2xl overflow-hidden p-1 transition-all duration-200 flex items-center justify-center bg-white dark:bg-slate-900 border ${
                      isSelected
                        ? 'ring-4 ring-emerald-500 border-emerald-500 scale-105 shadow-md shadow-emerald-500/30 z-10'
                        : 'border-slate-200 dark:border-slate-700/80 hover:border-emerald-400 hover:scale-102 opacity-80 hover:opacity-100'
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.nameLabel || 'Ism:'}
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="Ismingiz"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.surnameLabel || 'Familiya:'}
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="Familiyangiz"
              />
            </div>
          </div>

          {/* Region & University Selector (University strictly kept in Uzbek) */}
          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.regionLabel || 'Viloyat:'}
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as Region)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                label={t.uniLabel || "OTM / Ta'lim muassasasi:"}
                value={university}
                onChange={(val) => setUniversity(val)}
                universities={universities}
                allowCustom={false}
              />
            </div>
          </div>

          {/* Study Type & Year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.studyTypeLabel || "Ta'lim shakli:"}
              </label>
              <select
                value={studyType}
                onChange={(e) => setStudyType(e.target.value as StudyType)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="Kunduzgi">{t.studyKunduzgi || 'Kunduzgi'}</option>
                <option value="Sirtqi">{t.studySirtqi || 'Sirtqi'}</option>
                <option value="Kechki">{t.studyKechki || 'Kechki'}</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.courseLabel || 'Kurs:'}
              </label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(Number(e.target.value) as AcademicYear)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value={1}>1{t.courseUnit || '-kurs'}</option>
                <option value={2}>2{t.courseUnit || '-kurs'}</option>
                <option value={3}>3{t.courseUnit || '-kurs'}</option>
                <option value={4}>4{t.courseUnit || '-kurs'}</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
            >
              {t.cancel || 'Bekor qilish'}
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{t.saveChangesBtn || "O'zgarishlarni saqlash"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
