export const OFERTA_TITLE = '"YUKSALQUIZ" TELEGRAM MINI APP FOYDALANUVCHI SHARTNOMASI (OMMAVIY OFERTA)';

export interface OfertaSection {
  title: string;
  items: string[];
}

export const OFERTA_SECTIONS: OfertaSection[] = [
  {
    title: '1. UMUMIY QOIDALAR',
    items: [
      '1.1. Mazkur hujjat "YuksalQuiz" platformasidan (keyingi o‘rinlarda — "Ilova") foydalanish shartlarini belgilaydi va O‘zbekiston Respublikasi Fuqarolik Kodeksining 367–370-moddalariga muvofiq ommaviy oferta hisoblanadi.',
      '1.2. Ilovada ro‘yxatdan o‘tish yoki "Roziman" tugmasini bosish orqali foydalanuvchi ushbu Oferta shartlarini to‘liq va so‘zsiz qabul qilgan (akseptlagan) hisoblanadi.',
    ],
  },
  {
    title: '2. ICHKI HAMYON, VAUCHER VA BONUSLAR QOIDASI',
    items: [
      '2.1. Ro‘yxatdan o‘tish paytida taqdim etiladigan 20 000 so‘mlik boshlang‘ich vaucher, referal tizim orqali yig‘iladigan bonuslar (har bir taklif uchun 1 500 so‘m) hamda test tuzuvchilarga hisoblanadigan rag‘batlantirish mablag‘lari (har bir yechim uchun 100 so‘m) virtual hisob-kitob birligi hisoblanadi.',
      '2.2. VIRTUAL BALANSNI YECHIB OLISH CHEKLOVI: Ilova ichidagi barcha bonuslar, vaucherlar va referal to‘lovlar faqat va faqat "YuksalQuiz" ilovasi ichidagi obunalar (3 oylik, 6 oylik, 1 yillik) yoki qo‘shimcha imkoniyatlarni faollashtirish uchun mo‘ljallangan.',
      '2.3. Ichki hisobdagi mablag‘lar hech qanday holatda naqd pulga, bank kartalariga (Uzcard, Humo, Visa va b.) yoki elektron to‘lov tizimlariga yechib berilmaydi va qaytarib to‘lanmaydi.',
    ],
  },
  {
    title: '3. KONTENT VA TESTLAR BO‘YICHA MAS\'ULIYAT',
    items: [
      '3.1. Ilova ma\'muriyati platformada taqdim etiladigan rasmiy ("Verified") testlarning haqqoniyligini ta\'minlashga harakat qiladi.',
      '3.2. Foydalanuvchilar yoki uchinchi shaxslar (talabalar, repetitorlar) tomonidan mustaqil kiritilgan hamda parollangan (masalan: TGFU2026 kabi) testlarning to‘g‘riligi, imtihon savollariga mosligi uchun testni tuzgan shaxs mas\'uldir. Ilova ma\'muriyati OTM yoki rasmiy imtihonlardagi yakuniy natijalar uchun javobgarlikni o‘z zimmasiga olmaydi.',
    ],
  },
  {
    title: '4. XAVFSIZLIK VA FOYDALANISH TALABLARI',
    items: [
      '4.1. Tizimda firibgarlik (botlar yordamida referal yig‘ish, kodni buzish, test javoblarini noqonuniy o‘g‘irlash) holatlari aniqlansa, foydalanuvchi hisobi ogohlantirishsiz bloklanadi va to‘plangan virtual mablag‘lar bekor qilinadi.',
    ],
  },
];
