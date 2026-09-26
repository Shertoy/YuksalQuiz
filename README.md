# 🎓 YuksalQuiz — Telegram Mini App

YuksalQuiz — O'zbekiston talabalari va abituriyentlari uchun maxsus ishlab chiqilgan, yuqori xavfsizlikka ega zamonaviy va tezkor Telegram Mini App platformasi.

---

## 🌟 Asosiy Imkoniyatlar (Key Features)

### 1. 🗂️ Ko'p Tarmoqli Kategoriyalar (Multi-Track Categories)
* **🎓 Oliy Ta'lim (HEMIS)**: Universitet semestr yakuniy nazoratlari, kredit-modul fanlari (TDIU, TATU, TMA, SamDU, TGFU va boshqalar).
* **🏢 O'quv Markazi**: General English, CEFR Mock B2, Mental arifmetika va maxsus kurslar.
* **🌐 Xalqaro Sertifikatlar**: IELTS, TOPIK, SAT, TOEFL imtihonlariga intensiv tayyorgarlik testlari.
* **👨‍🏫 Abituriyent**: OTMlarga kirish uchun DTM majburiy va asosiy fanlar bloklari.
* **📚 Maktab**: 10-11 sinf fanlari, biologiya va ona tili olimpiada saralash savollari.

### 2. 🔒 Parolli Testlar Tizimi
* Maxsus yoki yopiq guruhlar uchun parollangan testlar (masalan: `TGFU2026`).
* Parol to'g'ri kiritilganda test darhol ochiladi va foydalanishga taqdim etiladi.

### 3. 💳 Talaba Hamyoni & Vaucher Tizimi
* **35 000 so'mlik Boshlang'ich Vaucher**: Yangi ro'yxatdan o'tgan foydalanuvchilarga ta'limiy obunalarni faollashtirish uchun taqdim etiladi.
* **Chegirmali Obunalar**:
  * 6 oylik Premium obuna: 50 000 so'm − 35 000 so'm vaucher = **15 000 so'm**.
  * 1 yillik Premium obuna: 90 000 so'm − 35 000 so'm vaucher = **55 000 so'm**.
* **Xavfsiz Qoidalar**: Hisobdagi vaucher va bonuslar faqat ilova ichidagi obunalar uchun ishlatiladi (kartaga yechib olinmaydi).

### 4. 🚀 Telegram Native Referal & Ulashish Tizimi
* Telegram foydalanuvchi IDsi asosida generatsiya qilinadigan shaxsiy taklif havolasi: `https://t.me/YuksalQuizBot?start=ref_${userId}`.
* Telegram mahalliy ulashish paneli (`window.Telegram.WebApp.openTelegramLink`).
* Har bir taklif qilingan foydalanuvchi uchun **+1 500 so'm** bonus.
* Bir marta bosish orqali havoladan nusxa olish va jonli hisoblagichlar.

### 5. 🪙 Mualliflik Rag'batlantirish Tizimi
* Talabalar yoki o'qituvchilar tomonidan yaratilgan ochiq testlar har bir yechilganda muallif hisobiga **+100 so'm** rag'batlantirish mablag'i avtomatik o'tkaziladi.

### 6. 📜 Ommaviy Oferta Shartnomasi
* O'zbekiston Respublikasi Fuqarolik Kodeksining 367–370-moddalariga muvofiq ommaviy oferta va qoidalar integratsiyasi.

### 7. 🛡️ Anti-Tamper & Klientsimon Xavfsizlik
* SHA-256 HMAC asosidagi Anti-Tamper xavfsizlik mexanizmi yordamida LocalStorage ma'lumotlari (balans, tangalar, test natijalari) soxtalashtirishdan himoyalangan.
* Real vaqt rejimida Web Audio API sintezatori (chime, buzz, coin FX).

---

## 🛠️ Texnologiyalar Steki (Tech Stack)

* **Frontend**: React 19, TypeScript, Vite
* **Styling**: Tailwind CSS v4, Lucide React Icons
* **State Management**: Zustand (Anti-Tamper LocalStorage persistence bilan)
* **SDK**: Telegram WebApp SDK
* **Audio**: Offline Web Audio Synthesizer Engine

---

## 🚀 Ishga tushirish (Local Development)

```bash
# Repozitoriyani klonlash
git clone https://github.com/shertoy/YuksalQuiz.git
cd YuksalQuiz

# Bog'liqliklarni o'rnatish
npm install

# Dasturni ishlab chiqish rejimida ishga tushirish
npm run dev

# Ishlab chiqarish (production) uchun yig'ish
npm run build
```

---

## 📄 Litsenziya
MIT License © 2026 YuksalQuiz
