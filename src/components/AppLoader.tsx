import React, { useState, useEffect } from 'react';
import { Sparkles, Quote } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

interface AppLoaderProps {
  isFadingOut?: boolean;
}

export const EDUCATIONAL_QUOTES = {
  uz: [
    {
      quote: "Ilmdan boshqa najot yo'q va bo'lmagay.",
      author: "Imom Buxoriy",
    },
    {
      quote: "Bilim – insoniyatning eng buyuk boyligidir.",
      author: "Alisher Navoiy",
    },
    {
      quote: "Haqiqiy bilim – o'rganishga bo'lgan samimiy muhabbatdan boshlanadi.",
      author: "Abu Ali ibn Sino",
    },
    {
      quote: "Katta natijalarga erishish uchun bugun kichik qadamlardan boshlash kerak.",
      author: "Sharq hikmati",
    },
    {
      quote: "Bilimga qilingan sarmoya har doim eng yuqori daromad keltiradi.",
      author: "Benjamin Franklin",
    },
    {
      quote: "O'rganishni to'xtatgan inson keksayadi, o'rganishda davom etgan esa hamisha yoshdir.",
      author: "Genri Ford",
    },
    {
      quote: "Kelajak o'z orzularining buyukligiga ishonganlarga tegishlidir.",
      author: "Eleonora Ruzvelt",
    },
    {
      quote: "Ilm olish – igna bilan quduq qazishdek sabr talab etadi, sabr qilgan g'olib bo'ladi.",
      author: "Xalq maqoli",
    },
  ],
  ru: [
    {
      quote: "Знание — самое великое богатство человека.",
      author: "Алишер Навои",
    },
    {
      quote: "Нет спасения, кроме как в знаниях и стремлении к ним.",
      author: "Имам аль-Бухари",
    },
    {
      quote: "Инвестиции в знания платят лучшие дивиденды.",
      author: "Бенджамин Франклин",
    },
    {
      quote: "Тот, кто перестает учиться — стареет. Тот, кто продолжает учиться — молод всегда.",
      author: "Генри Форд",
    },
    {
      quote: "Истинное знание начинается с любви к познанию мира.",
      author: "Ибн Сина (Авиценна)",
    },
    {
      quote: "Будущее принадлежит тем, кто всем сердцем верит в красоту своей мечты.",
      author: "Элеонора Рузвельт",
    },
    {
      quote: "Чтобы достичь великих вершин, нужно сделать уверенный шаг уже сегодня.",
      author: "Мудрость Востока",
    },
  ],
  en: [
    {
      quote: "Knowledge is the greatest treasure of humanity.",
      author: "Alisher Navoi",
    },
    {
      quote: "An investment in knowledge pays the best interest.",
      author: "Benjamin Franklin",
    },
    {
      quote: "Anyone who stops learning is old, whether at twenty or eighty.",
      author: "Henry Ford",
    },
    {
      quote: "The future belongs to those who believe in the beauty of their dreams.",
      author: "Eleanor Roosevelt",
    },
  ],
};

export const AppLoader: React.FC<AppLoaderProps> = ({ isFadingOut = false }) => {
  const { language } = useTranslation();

  const quotesList =
    EDUCATIONAL_QUOTES[language as keyof typeof EDUCATIONAL_QUOTES] ||
    EDUCATIONAL_QUOTES.uz;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Rotate quotes every 3 seconds with a smooth fade in/out transition
  useEffect(() => {
    if (isFadingOut) return;

    let fadeTimeout: ReturnType<typeof setTimeout> | null = null;
    const interval = setInterval(() => {
      // 1. Fade out current quote
      setIsVisible(false);

      // 2. Switch quote and fade back in after 350ms
      fadeTimeout = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % quotesList.length);
        setIsVisible(true);
      }, 350);
    }, 3000);

    return () => {
      clearInterval(interval);
      if (fadeTimeout) clearTimeout(fadeTimeout);
    };
  }, [quotesList.length, isFadingOut]);

  const currentItem = quotesList[currentIndex] || quotesList[0];

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-between p-6 bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-white transition-opacity duration-500 ease-in-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Subtle Ambient Background Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-orange-500/10 dark:bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header: Brand Left & Minimalist Spinner Top-Right */}
      <div className="relative z-10 flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/25">
            <Sparkles className="w-4 h-4 text-orange-200" />
          </div>
          <span className="font-black text-sm tracking-tight bg-gradient-to-r from-emerald-600 via-teal-600 to-orange-500 bg-clip-text text-transparent dark:from-emerald-400 dark:via-teal-300 dark:to-orange-400">
            YuksalQuiz
          </span>
        </div>

        {/* Minimalist Top-Right Modern Dual-Ring Spinner */}
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            {language === 'ru' ? 'Загрузка...' : language === 'en' ? 'Loading...' : 'Yuklanmoqda...'}
          </span>
          <div className="relative w-7 h-7 flex items-center justify-center">
            {/* Outer static ring track */}
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 dark:border-emerald-400/20"></div>
            {/* Sleek rotating gradient arc */}
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-500 border-r-orange-500 animate-spin"></div>
            {/* Center glowing micro-dot */}
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500"></div>
          </div>
        </div>
      </div>

      {/* Center of Screen: Educational Quotes with Smooth 3s Fade Transition */}
      <div className="relative z-10 max-w-sm mx-auto text-center px-4 my-auto">
        <div
          className={`transition-all duration-350 ease-out transform ${
            isVisible
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-2 scale-98'
          }`}
        >
          {/* Quote Icon Bubble */}
          <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
            <Quote className="w-5 h-5 fill-emerald-500/20" />
          </div>

          {/* Quote Text */}
          <blockquote className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 leading-relaxed tracking-tight">
            "{currentItem.quote}"
          </blockquote>

          {/* Author Badge */}
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
            <span>{currentItem.author}</span>
          </div>
        </div>

        {/* Dynamic 3-second Progress Indicator Line */}
        <div className="w-24 h-1 bg-slate-200/60 dark:bg-slate-800/80 rounded-full mx-auto mt-6 overflow-hidden">
          <div
            key={currentIndex}
            className="h-full bg-gradient-to-r from-emerald-500 to-orange-400 rounded-full animate-loader-bar"
          />
        </div>
      </div>

      {/* Bottom Footer Note */}
      <div className="relative z-10 text-center pb-2">
        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
          HEMIS • IELTS • TOPIK • SAT • Fanlar
        </p>
      </div>
    </div>
  );
};
