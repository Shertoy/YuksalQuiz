/**
 * OTMlarning fakultetlari (test yaratishda tanlash uchun tavsiyalar).
 *
 * Manba: har bir OTMning rasmiy sayti (verified: true) yoki rasmiy sayt ochilmaganda
 * ta'lim portallari / Vikipediya (verified: false). Yig'ilgan sana: 2026-10-10.
 * Ro'yxat bo'sh bo'lsa, ishonchli manba topilmagan. Muallif baribir o'zi yozishi mumkin.
 * Yangilash: shu faylga qo'lda qo'shing yoki tahrirlang.
 */
export interface UniversityFacultyInfo {
  faculties: string[];
  source: string;
  verified: boolean;
}

export const UNIVERSITY_FACULTIES: Record<string, UniversityFacultyInfo> = {
  "Abu Ali Ibn Sino nomidagi Buxoro Davlat Tibbiyot Instituti (BuxDTI)": {
    faculties: ["Tibbiyot fakulteti", "Biotibbiyot fakulteti", "Xalqaro tibbiyot fakulteti", "Turkiya fakulteti", "Diplomdan keyingi ta'lim fakulteti"],
    source: "https://bsmi.uz/fakultet-va-kafedralar-tuzilmasi/",
    verified: true,
  },
  "Abu Rayhon Beruniy nomidagi Urganch Davlat Universiteti (UrDU)": {
    faculties: ["Fizika-matematika fakulteti", "Xorijiy filologiya fakulteti", "Filologiya fakulteti", "Tabiiy va qishloq xo'jaligi fanlari fakulteti", "Sport faoliyati fakulteti", "Iqtisodiyot fakulteti", "Texnika fakulteti", "Kimyoviy texnologiya fakulteti", "Intellektual ilmlar va texnologiyalar fakulteti", "Psixologiya va san'at fakulteti", "Tarix va huquq fakulteti"],
    source: "https://urdu.uz/uz/site/faculty",
    verified: true,
  },
  "Ajiniyoz nomidagi Nukus Davlat Pedagogika Instituti": {
    faculties: ["Ellikqal'a fakulteti", "Maktabgacha va boshlang'ich ta'lim fakulteti", "Tabiiy fanlar fakulteti", "Filologiya fakulteti", "Tarix fakulteti", "Pedagogika-psixologiya va ijodiy ta'lim fakulteti", "Aniq fanlar fakulteti"],
    source: "https://ndpi.uz/uz/category/faculties/",
    verified: true,
  },
  "Alfraganus Universiteti (Alfraganus University)": {
    faculties: ["Davolash ishi va pediatriya fakulteti", "Filologiya fakulteti", "Ijtimoiy fanlar fakulteti", "Iqtisodiyot fakulteti", "Jismoniy tarbiya va sport fakulteti", "Raqamli texnologiyalar fakulteti", "Stomatologiya va farmatsiya fakulteti", "Turizm fakulteti"],
    source: "https://afu.uz/uz/fakultetlar-royxati",
    verified: true,
  },
  "Alisher Navoiy nomidagi Toshkent davlat o'zbek tili va adabiyoti universiteti": {
    faculties: ["O'zbek filologiyasi fakulteti", "O'zbek tili va adabiyoti fakulteti", "O'zbek-ingliz tarjima nazariyasi va amaliyoti fakulteti"],
    source: "https://mentalaba.uz/universities/otm-haqida/alisher-navoiy-nomidagi-toshkent-davlat-ozbek-tili-va-adabiyoti-universiteti",
    verified: false,
  },
  "Amity Universiteti Toshkent": {
    faculties: [],
    source: "",
    verified: false,
  },
  "Andijon Davlat Pedagogika Instituti": {
    faculties: [],
    source: "",
    verified: false,
  },
  "Andijon Davlat Tibbiyot Instituti (ADTI)": {
    faculties: ["Davolash ishi fakulteti", "Pediatriya fakulteti", "Stomatologiya fakulteti", "Farmatsiya fakulteti"],
    source: "https://adti.uz/fakultetlar.html",
    verified: true,
  },
  "Andijon Davlat Chet Tillari Instituti": {
    faculties: ["Ingliz tili va adabiyoti fakulteti", "Ingliz filologiyasi, o'qitish metodikasi va tarjimashunoslik fakulteti", "Roman-german va slavyan tillari fakulteti"],
    source: "https://infoedu.uz/oliygoh/andijon-davlat-chet-tillari-instituti",
    verified: false,
  },
  "Andijon Iqtisodiyot va Qurilish Instituti": {
    faculties: ["Iqtisodiyot fakulteti", "Arxitektura va qurilish fakulteti"],
    source: "https://oliygoh.uz/oliygohlar/andijon-iqtisodiyot-va-qurilish-instituti",
    verified: false,
  },
  "Andijon Mashinasozlik Instituti (AndMI)": {
    faculties: ["Avtomatika va elektrotexnika fakulteti", "Avtomobilsozlik fakulteti", "Mashinasozlik texnologiyasi fakulteti", "Transport va logistika fakulteti", "Innovatsion ta'lim texnologiyalari fakulteti"],
    source: "https://oliygoh.uz/uz/oliygohlar/andijon-mashinasozlik-instituti",
    verified: false,
  },
  "Andijon Qishloq Xo'jaligi va Agrotexnologiyalar Instituti": {
    faculties: ["Agrobiologiya fakulteti", "O'simliklar himoyasi, agrokimyo va tuproqshunoslik fakulteti", "Agrobiznes va raqamli iqtisodiyot fakulteti", "Qishloq xo'jaligi mahsulotlarini saqlash va qayta ishlash fakulteti", "Agroinjeneriya va gidromelioratsiya fakulteti"],
    source: "https://kun.uz/news/2021/07/17/tanishuv-andijon-qishloq-xojaligi-va-agrotexnologiyalar-instituti",
    verified: false,
  },
  "Angren Universiteti": {
    faculties: [],
    source: "",
    verified: false,
  },
  "Berdaq nomidagi Qoraqalpoq Davlat Universiteti (QDU)": {
    faculties: ["Qoraqalpoq filologiyasi fakulteti", "O'zbek filologiyasi fakulteti", "Tarix va huquq fakulteti", "Ijtimoiy-iqtisodiy fakulteti", "Jismoniy madaniyat fakulteti", "Kimyo-texnologiya fakulteti", "Fizika-matematika fakulteti", "Tabiatshunoslik fakulteti", "Texnika fakulteti", "Chet tillari fakulteti"],
    source: "https://oliygoh.uz/oliygohlar/qoraqalpoq-davlat-universiteti/2025?form=12",
    verified: false,
  },
  "Britaniya Menejment Universiteti (BMU)": {
    faculties: [],
    source: "",
    verified: false,
  },
  "Buxoro Davlat Pedagogika Instituti": {
    faculties: ["Jismoniy madaniyat fakulteti", "Harbiy ta'lim fakulteti", "Maktabgacha va boshlang'ich ta'lim fakulteti", "Aniq va tabiiy fanlar fakulteti", "Pedagogika va ijtimoiy fanlar fakulteti", "Tillar fakulteti"],
    source: "https://buxdpi.uz/",
    verified: true,
  },
  "Buxoro Davlat Universiteti (BuxDU)": {
    faculties: ["Filologiya fakulteti", "Xorijiy tillar fakulteti", "Iqtisodiyot va turizm fakulteti", "Tarix fakulteti", "Yuridik fakulteti", "Davlat auditi fakulteti", "Sport va san'at fakulteti", "Fizika-matematika va axborot texnologiyalari fakulteti", "Tabiiy fanlar va agrobiotexnologiya fakulteti"],
    source: "https://buxdu.uz/",
    verified: true,
  },
  "Buxoro Innovatsiyalar Universiteti": {
    faculties: [],
    source: "",
    verified: false,
  },
  "Buxoro Muhandislik-Texnologiya Instituti (BMTI)": {
    faculties: ["Elektronika va ishlab chiqarishda axborot-kommunikatsiya texnologiyalari fakulteti", "Muhandislik-qurilish fakulteti", "Yengil sanoat fakulteti", "Neft-gazkimyo sanoati texnologiyasi fakulteti", "Kimyoviy va oziq-ovqat texnologiyasi fakulteti"],
    source: "https://oliygoh.uz/uz/oliygohlar/buxoro-muhandislik-texnologiya-instituti",
    verified: false,
  },
  "Buxoro Tabiiy Resurslarni Boshqarish Instituti": {
    faculties: ["Gidromelioratsiya fakulteti"],
    source: "https://oliygoh.uz/uz/oliygohlar/toshkent-irrigatsiya-va-qishloq-xo-jaligini-mexanizatsiyalash-muhandislari-instituti-buxoro-filiali",
    verified: false,
  },
  "Cambridge International University": {
    faculties: [],
    source: "",
    verified: false,
  },
  "Central Asian University (CAU / sobiq Akfa Universiteti)": {
    faculties: ["Tibbiyot fakulteti", "Stomatologiya fakulteti", "Muhandislik fakulteti", "Arxitektura va dizayn fakulteti", "Biznes fakulteti", "Mehmonxona menejmenti va turizm fakulteti"],
    source: "https://centralasian.uz",
    verified: true,
  },
  "Davlat Soliq Qo'mitasi huzuridagi Fiskal Institut": {
    faculties: [],
    source: "",
    verified: false,
  },
  "Denov Tadbirkorlik va Pedagogika Instituti": {
    faculties: ["Tadbirkorlik va boshqaruv fakulteti", "Pedagogika va san'at fakulteti", "Aniq va tabiiy fanlar fakulteti", "Xorijiy tillar fakulteti", "Filologiya fakulteti"],
    source: "https://infoedu.uz/oliygoh/denov-tadbirkorlik-va-pedagogika-instituti",
    verified: false,
  },
  "EMU Universiteti (European Medical University)": {
    faculties: [],
    source: "",
    verified: false,
  },
  "Farg'ona Davlat Universiteti (FarDU)": {
    faculties: ["Fizika-matematika fakulteti", "Filologiya fakulteti", "Tarix fakulteti", "Xorijiy tillar fakulteti", "Biologiya fakulteti", "Kimyo fakulteti", "Geografiya va iqtisodiyot fakulteti", "Pedagogika va psixologiya fakulteti", "Jismoniy madaniyat fakulteti", "San'atshunoslik fakulteti", "Maktabgacha va boshlang'ich ta'lim fakulteti", "Harbiy ta'lim fakulteti", "Ijtimoiy-iqtisodiy fakulteti", "Ekologiya va qishloq xo'jaligi fakulteti"],
    source: "https://infoedu.uz/oliygoh/fargona-davlat-universiteti",
    verified: false,
  },
  "Farg'ona Jamoat Salomatligi Tibbiyot Instituti": {
    faculties: ["Davolash ishi fakulteti", "Tibbiy profilaktika va jamoat salomatligi fakulteti", "Xalqaro fakultet", "Pediatriya fakulteti"],
    source: "https://fjsti.uz/faculty/37/davolash-ishi",
    verified: true,
  },
  "Farg'ona Politexnika Instituti (FarPI)": {
    faculties: ["Mexanika va yengil sanoat muhandisligi fakulteti", "Energetika muhandisligi fakulteti", "Kimyo muhandisligi fakulteti", "Arxitektura va qurilish fakulteti", "Ishlab chiqarishda boshqaruv fakulteti", "Axborot texnologiyalari va sun'iy intellekt fakulteti", "Telekommunikatsiya va kiberxavfsizlik fakulteti"],
    source: "https://fstu.uz/view-page/156",
    verified: true,
  },
  "G.V. Plexanov nomidagi REU Toshkent filiali": {
    faculties: ["Raqamli iqtisodiyot va moliya fakulteti", "Iqtisodiyot va biznes fakulteti"],
    source: "https://reu.uz/",
    verified: true,
  },
  "Geologiya Fanlari Universiteti": {
    faculties: ["Geologiya-qidiruv fakulteti", "Konchilik va metallurgiya fakulteti", "Gidrogeologiya va muhandislik geologiyasi fakulteti"],
    source: "https://infoedu.uz/oliygoh/geologiya-fanlari-universiteti",
    verified: false,
  },
  "Guliston Davlat Pedagogika Instituti": {
    faculties: ["Gumanitar fanlar fakulteti", "Pedagogika fakulteti", "Tabiiy fanlar fakulteti", "San'atshunoslik fakulteti", "Jismoniy madaniyat fakulteti", "Maktabgacha va boshlang'ich ta'lim fakulteti", "Masofaviy ta'lim fakulteti"],
    source: "https://infoedu.uz/oliygoh/guliston-davlat-pedagogika-instituti",
    verified: false,
  },
  "Guliston Davlat Universiteti (GulDU)": {
    faculties: ["Axborot texnologiyalari va fizika-matematika fakulteti", "Filologiya fakulteti", "Tabiiy fanlar fakulteti", "Psixologiya va ijtimoiy fanlar fakulteti", "Sport faoliyati fakulteti", "Raqamli iqtisodiyot va innovatsiyalar fakulteti", "San'atshunoslik fakulteti", "Ishlab chiqarish texnologiyalari fakulteti", "Tibbiyot fakulteti"],
    source: "https://guldu.uz/uz/universitet/tuzilma/fakutetlar/",
    verified: true,
  },
  "Huquqni Muhofaza Qilish Akademiyasi": {
    faculties: ["Magistratura fakulteti", "Qayta tayyorlash va malaka oshirish fakulteti"],
    source: "https://proacademy.uz/",
    verified: false,
  },
  "I.M. Gubkin nomidagi Rossiya Davlat Neft va Gaz Universiteti filiali": {
    faculties: [],
    source: "",
    verified: false,
  },
  "Impuls Tibbiyot Instituti": {
    faculties: [],
    source: "",
    verified: false,
  },
  "Ipak yo'li' turizm va madaniy meros xalqaro universiteti": {
    faculties: ["Turizm menejmenti fakulteti", "Turizm xizmatlari va madaniy meros fakulteti"],
    source: "https://infoedu.uz/oliygoh/ipak-yoli-turizm-va-madaniy-meros-xalqaro-universiteti",
    verified: false,
  },
  "Iqtisodiyot va Pedagogika Universiteti (UEP)": {
    faculties: [],
    source: "",
    verified: false,
  },
  "Islom Karimov nomidagi Toshkent davlat texnika universiteti (TDTU)": {
    faculties: ["Issiqlik energetikasi fakulteti", "Elektronika va avtomatika fakulteti", "Energetika fakulteti", "Geologiya va konchilik fakulteti", "Mashinasozlik fakulteti", "Mexanika fakulteti", "Neft va gaz fakulteti", "Muhandislik texnologiyalari fakulteti"],
    source: "https://en.wikipedia.org/wiki/Tashkent_State_Technical_University",
    verified: false,
  },
  "IT Park Universiteti": {
    faculties: [],
    source: "",
    verified: false,
  },
  "Jahon Iqtisodiyoti va Diplomatiya Universiteti (JIDU)": {
    faculties: ["Xalqaro munosabatlar fakulteti", "Xalqaro iqtisodiyot va menejment fakulteti", "Xalqaro huquq fakulteti", "Executive Education fakulteti"],
    source: "https://www.uwed.uz/faculties",
    verified: true,
  },
  "Jamoat Xavfsizligi Universiteti": {
    faculties: ["Harbiy qo'mondonlik fakulteti", "Huquqiy tartibotni ta'minlash fakulteti", "Jangovar xizmat va logistika fakulteti", "Sirtqi ta'lim fakulteti", "Malaka oshirish va qayta tayyorlash fakulteti"],
    source: "https://infoedu.uz/oliygoh/jamoat-xavfsizligi-universiteti",
    verified: false,
  },
  "Jizzax Davlat Pedagogika Universiteti (JDPU)": {
    faculties: ["Aniq fanlar fakulteti", "Tabiiy fanlar fakulteti", "O'zbek tili va adabiyoti fakulteti", "Boshlang'ich ta'lim fakulteti", "Tarix fakulteti", "Fizika va texnologiya ta'limi fakulteti", "Xorijiy tillar fakulteti", "Rus tili va adabiyoti fakulteti", "Jismoniy madaniyat fakulteti", "Pedagogika va psixologiya fakulteti", "Maktabgacha ta'lim fakulteti", "Tibbiyot fakulteti"],
    source: "https://infoedu.uz/oliygoh/jizzax-davlat-pedagogika-universiteti",
    verified: false,
  },
  "Jizzax Politexnika Instituti (JPI)": {
    faculties: ["Energetika fakulteti", "Transport muhandisligi fakulteti", "Sanoat texnologiyalari fakulteti", "Qurilish muhandisligi fakulteti", "Kibersport fakulteti"],
    source: "https://new.jizpi.uz/fakultetlar",
    verified: true,
  },
  "Jizzax Xalqaro Universiteti": {
    faculties: [],
    source: "",
    verified: false,
  },
  "Kamoliddin Behzod nomidagi Milliy rassomlik va dizayn instituti": {
    faculties: ["Dizayn fakulteti", "Tasviriy san'at fakulteti", "San'atshunoslik va amaliy san'at fakulteti"],
    source: "https://mrdi.uz/",
    verified: true,
  },
  "Koreya Xalqaro Universiteti (KIUF Farg'ona)": {
    faculties: [],
    source: "",
    verified: false,
  },
  "M.V. Lomonosov nomidagi MGU Toshkent filiali": {
    faculties: [],
    source: "",
    verified: false,
  },
  "MEPhI Milliy Tadqiqot Yadro Universiteti Toshkent filiali": {
    faculties: ["Tabiiy-ilmiy fanlar kafedrasi", "Yadro fizikasi va issiqlik fizikasi kafedrasi", "Elektr va issiqlik energetikasi kafedrasi", "Gumanitar fanlar va jismoniy tarbiya kafedrasi"],
    source: "https://tashkent.mephi.ru/departments",
    verified: true,
  },
  "MGIMO Toshkent filiali": {
    faculties: [],
    source: "",
    verified: false,
  },
  "Millat Umidi Universiteti": {
    faculties: [],
    source: "",
    verified: false,
  },
  "Muhammad al-Xorazmiy nomidagi Toshkent axborot texnologiyalari universiteti (TATU)": {
    faculties: ["Kompyuter injiniringi fakulteti", "Dasturiy injiniring fakulteti", "Kiberxavfsizlik fakulteti", "Telekommunikatsiya texnologiyalari fakulteti", "Televizion texnologiyalar fakulteti", "Radio va mobil aloqa fakulteti", "AKT sohasida iqtisodiyot va menejment fakulteti", "Raqamli ta'lim va texnologiyalar fakulteti", "Zarafshon fakulteti"],
    source: "https://tuit.uz/fakultetlar",
    verified: true,
  },
  "Namangan Davlat Pedagogika Instituti": {
    faculties: ["Pedagogika fakulteti", "Aniq va tabiiy fanlar fakulteti", "Ijtimoiy fanlar fakulteti"],
    source: "https://namspi.uz/uz/fakultetlar",
    verified: true,
  },
  "Namangan Davlat Universiteti (NamDU)": {
    faculties: ["Fizika-matematika fakulteti", "Tabiiy fanlar fakulteti", "Pedagogika fakulteti", "Filologiya fakulteti", "Jahon tillari fakulteti", "Yuridik fakulteti", "Ijtimoiy fanlar fakulteti", "Iqtisodiyot fakulteti"],
    source: "https://namdu.uz/en/faculty/details/1",
    verified: false,
  },
  "Namangan Davlat Chet Tillari Instituti": {
    faculties: ["Til va tarjima fakulteti", "Filologiya fakulteti"],
    source: "https://namsifl.uz/faculties",
    verified: true,
  },
  "Namangan Muhandislik-Qurilish Instituti (NamMQI)": {
    faculties: ["Qurilish fakulteti", "Muhandislik fakulteti", "Transport fakulteti", "Qurilish texnologiyasi fakulteti"],
    source: "https://oliygoh.uz/oliygohlar/namangan-muhandislik-qurilish-instituti/2025",
    verified: false,
  },
  "Namangan Muhandislik-Texnologiya Instituti (NamMTI)": {
    faculties: ["Kimyo texnologiya fakulteti", "Muhandislik-texnologiya fakulteti", "Yengil sanoat texnologiyasi fakulteti", "Avtomatika va energetika fakulteti", "Qishloq xo'jalik mahsulotlari texnologiyasi fakulteti", "NamMTI va Saratov davlat texnika universiteti qo'shma fakulteti"],
    source: "https://oliygoh.uz/oliygohlar/namangan-muhandislik-texnologiya-instituti/2025?form=11",
    verified: false,
  },
  "Namangan To'qimachilik Sanoati Instituti": {
    faculties: [],
    source: "",
    verified: false,
  },
  "Navoiy Davlat Konchilik va Texnologiyalar Universiteti (NDKTU)": {
    faculties: ["Konchilik fakulteti", "Energo-mexanika fakulteti", "Kimyo-metallurgiya fakulteti"],
    source: "https://oliygoh.uz/oliygohlar/navoiy-davlat-konchilik-instituti/2025?lang=ru",
    verified: false,
  },
  "Navoiy Davlat Pedagogika Instituti": {
    faculties: ["Fizika-matematika fakulteti", "Ingliz filologiyasi fakulteti", "Tarix fakulteti", "Xorijiy tillar fakulteti", "Maktabgacha ta'lim fakulteti", "Pedagogika fakulteti", "Tabiiy fanlar fakulteti", "Jismoniy madaniyat fakulteti"],
    source: "https://www.unirank.org/uz/uni/navoiy-davlat-universiteti/",
    verified: false,
  },
  "Nizomiy nomidagi Toshkent davlat pedagogika universiteti (TDPU)": {
    faculties: ["Aniq fanlar fakulteti", "Tarix fakulteti", "Tabiiy fanlar fakulteti", "Kasbiy ta'lim va san'at fakulteti", "Maktabgacha va boshlang'ich ta'lim fakulteti", "Filologiya fakulteti", "Qo'shma ta'lim fakulteti", "Pedagogika, psixologiya va inklyuziv ta'lim fakulteti", "Harbiy ta'lim fakulteti"],
    source: "https://en.wikipedia.org/wiki/Tashkent_State_Pedagogic_University_named_after_Nizami",
    verified: false,
  },
  "Nordic International University (Shimoliy Xalqaro Universiteti)": {
    faculties: [],
    source: "",
    verified: false,
  },
  "Osiyo Xalqaro Universiteti (Buxoro)": {
    faculties: [],
    source: "",
    verified: false,
  },
  "Oxus Universiteti (Oxus University)": {
    faculties: ["Huquq va davlat boshqaruvi fakulteti", "Iqtisodiyot va biznes fakulteti", "Fan va texnologiya fakulteti", "Ijtimoiy va gumanitar fanlar fakulteti"],
    source: "https://mentalaba.uz/universities/otm-haqida/oxus-universiteti",
    verified: false,
  },
  "Oziq-ovqat Texnologiyasi va Muhandisligi Xalqaro Instituti": {
    faculties: ["Oziq-ovqat texnologiyasi va boshqaruv fakulteti"],
    source: "https://iifte.uz/about/faculties",
    verified: true,
  },
  "PDP Universiteti (PDP University)": {
    faculties: [],
    source: "",
    verified: false,
  },
  "ProUni (Professional University)": {
    faculties: [],
    source: "",
    verified: false,
  },
  "Puchon Universiteti (BUT)": {
    faculties: ["Maktabgacha ta'lim bo'limi", "Menejment bo'limi", "Arxitektura bo'limi", "Elektron biznes bo'limi", "Go'zallik estetikasi bo'limi", "Dietologiya va nutritsiologiya bo'limi", "Axborot texnologiyalari bo'limi", "Multimedia va o'yin kontenti bo'limi", "Ijtimoiy farovonlik bo'limi", "Pazandachilik san'ati bo'limi"],
    source: "https://bucheon.uz/en",
    verified: true,
  },
  "Qarshi Davlat Universiteti (QarDU)": {
    faculties: ["Matematika va kompyuter ilmlari fakulteti", "Kimyo-biologiya fakulteti", "San'atshunoslik fakulteti", "Sport fakulteti", "Filologiya fakulteti", "Tarix fakulteti", "Pedagogika fakulteti", "Xalqaro qo'shma ta'lim dasturlari fakulteti", "Fizika fakulteti", "Xorijiy tillar fakulteti", "Geografiya va agronomiya fakulteti", "Tibbiyot fakulteti", "Iqtisodiyot fakulteti"],
    source: "https://qarshidu.uz/uz/fakultetlar",
    verified: true,
  },
  "Qarshi Irrigatsiya va Agrotexnologiyalar Instituti": {
    faculties: [],
    source: "",
    verified: false,
  },
  "Qarshi Muhandislik-Iqtisodiyot Instituti (QMII)": {
    faculties: ["Iqtisodiyot fakulteti", "Sanoat texnologiyasi fakulteti", "Kasb ta'limi fakulteti", "Neft va gaz fakulteti", "Energetika fakulteti", "Muhandislik-texnika fakulteti"],
    source: "https://oliygoh.uz/oliygohlar/qarshi-muhandislik-iqtisodiyot-instituti/2024",
    verified: false,
  },
  "Qoraqalpog'iston Qishloq Xo'jaligi va Agrotexnologiyalar Instituti": {
    faculties: ["Qishloq xo'jaligi menejmenti va zootexniya fakulteti", "Agronomiya fakulteti", "Agroinjeneriya fakulteti"],
    source: "https://oliygoh.uz/oliygohlar/toshkent-davlat-agrar-universiteti-nukus-filiali/2025?form=13",
    verified: false,
  },
  "Qoraqalpog'iston Tibbiyot Instituti": {
    faculties: ["Davolash va stomatologiya fakulteti", "Pediatriya va oliy malakali hamshiralik ishi fakulteti", "Tibbiy-profilaktika va farmatsiya fakulteti", "Vrachlar malakasini oshirish fakulteti"],
    source: "https://oliygoh.uz/oliygohlar/toshkent-pediatriya-tibbiyot-instituti-nukus-filiali/2025?lang=kk",
    verified: false,
  },
  "Qo'qon Davlat Pedagogika Instituti (QDPI)": {
    faculties: ["Gumanitar fanlar va tillar fakulteti", "Boshlang'ich va texnologik ta'lim fakulteti", "San'at va sport fakulteti", "Tabiiy fanlar va iqtisodiyot fakulteti", "Aniq fanlar va muhandislik fakulteti", "Pedagogika va psixologiya fakulteti", "Xorijiy filologiya fakulteti"],
    source: "https://www.kokandsu.uz/faculty",
    verified: true,
  },
  "Qo'qon Universiteti (Kokand University)": {
    faculties: ["Turizm va iqtisodiyot fakulteti", "Jahon tillari va filologiya fakulteti", "Ta'lim fakulteti"],
    source: "https://www.kokanduni.uz/uz/static/organizational-structure",
    verified: true,
  },
  "Renessans Ta'lim Universiteti (Renaissance University)": {
    faculties: [],
    source: "",
    verified: false,
  },
  "Samarqand Davlat Arxitektura-Qurilish Universiteti (SamDAQU)": {
    faculties: ["Arxitektura fakulteti", "Qurilish fakulteti", "Madaniy meros obyektlarini asrash fakulteti", "Iqtisodiyot va boshqaruv fakulteti"],
    source: "https://sdtu.uz/",
    verified: true,
  },
  "Samarqand Davlat Tibbiyot Universiteti (SamDTU)": {
    faculties: ["Davolash ishi fakulteti", "Pediatriya fakulteti", "Stomatologiya fakulteti", "Pedagogika va psixologiya fakulteti", "Boshqaruv va menejment fakulteti", "Biotexnologiya, injiniring va farmatsiya fakulteti", "Xalqaro ta'lim fakulteti", "Diplomdan keyingi ta'lim fakulteti"],
    source: "https://www.sammu.uz/",
    verified: true,
  },
  "Samarqand Davlat Veterinariya Meditsinasi Universiteti (SamDVMCHBU)": {
    faculties: ["Veterinariya profilaktikasi va davolash fakulteti", "Veterinariya diagnostikasi va oziq-ovqat xavfsizligi fakulteti", "Zootexniya va oziq-ovqat mahsulotlarini qayta ishlash texnologiyalari fakulteti", "Biotexnologiya va ekologiya fakulteti", "Iqtisodiyot fakulteti"],
    source: "https://ssuv.uz/en/faculty/view/1",
    verified: true,
  },
  "Samarqand Davlat Chet Tillar Instituti (SamDCHTI)": {
    faculties: ["Ingliz tili fakulteti", "Roman-german tillari fakulteti", "Sharq tillari fakulteti", "Tarjima nazariyasi va amaliyoti fakulteti", "Qo'shma ta'lim dasturlari fakulteti", "Kechki ta'lim fakulteti"],
    source: "https://infoedu.uz/oliygoh/samarqand-davlat-chet-tillar-instituti",
    verified: false,
  },
  "Samarqand Iqtisodiyot va Servis Instituti (SamISI)": {
    faculties: ["Iqtisodiyot fakulteti", "Menejment va marketing fakulteti", "Bank-moliya xizmatlari fakulteti", "Buxgalteriya hisobi fakulteti", "Xalqaro iqtisodiy munosabatlar fakulteti", "Servis fakulteti", "Kechki ta'lim fakulteti", "Sirtqi ta'lim fakulteti", "Masofaviy ta'lim fakulteti"],
    source: "https://www.sies.uz/en/structure/institute/faculties",
    verified: true,
  },
  "Singapur Menejmentni Rivojlantirish Instituti (MDIS Tashkent)": {
    faculties: [],
    source: "",
    verified: false,
  },
  "STARS International University": {
    faculties: ["Global biznes texnologiyalari va moliya fakulteti"],
    source: "https://stars.university/faculties",
    verified: true,
  },
  "TEAM Universiteti": {
    faculties: [],
    source: "",
    verified: false,
  },
  "Termiz Agrotexnologiyalar va Innovatsion Rivojlanish Instituti": {
    faculties: [],
    source: "",
    verified: false,
  },
  "Termiz Davlat Pedagogika Instituti": {
    faculties: ["Tillar fakulteti", "Tabiiy va aniq fanlar fakulteti", "Pedagogika va ijtimoiy fanlar fakulteti", "Jismoniy madaniyat va san'at fakulteti", "Maktabgacha va boshlang'ich ta'lim fakulteti"],
    source: "https://terdpi.uz",
    verified: true,
  },
  "Termiz Davlat Universiteti (TerDU)": {
    faculties: ["O'zbek filologiyasi fakulteti", "Rus filologiyasi fakulteti", "Xorijiy filologiya fakulteti", "Tarix va ijtimoiy fanlar fakulteti", "Pedagogika fakulteti", "Fizika-matematika fakulteti", "Tabiiy fanlar fakulteti", "Boshlang'ich ta'lim fakulteti", "Maktabgacha ta'lim fakulteti", "Jismoniy madaniyat fakulteti", "San'atshunoslik fakulteti", "Moliya va iqtisodiyot fakulteti", "Texnologik ta'lim fakulteti", "Kompyuter injiniringi va axborot texnologiyalari fakulteti"],
    source: "https://infoedu.uz/oliygoh/termiz-davlat-universiteti",
    verified: false,
  },
  "Termiz Iqtisodiyot va Servis Universiteti": {
    faculties: ["Tibbiyot fakulteti", "Pedagogika va ijtimoiy-gumanitar fanlar fakulteti", "Iqtisodiyot va axborot texnologiyalari fakulteti"],
    source: "https://tues.uz/resource/category/102",
    verified: true,
  },
  "TMC Instituti (TMC Institute)": {
    faculties: [],
    source: "",
    verified: false,
  },
  "Toshkent Amaliy Fanlar Universiteti (UTAS)": {
    faculties: ["Iqtisodiyot fakulteti", "Pedagogika va psixologiya fakulteti", "Axborot texnologiyalari fakulteti", "Tillar fakulteti"],
    source: "https://utas.uz",
    verified: true,
  },
  "Toshkent Arxitektura-Qurilish Universiteti (TAQU)": {
    faculties: ["Arxitektura fakulteti", "Qurilish fakulteti", "Muhandislik fakulteti", "Menejment fakulteti"],
    source: "https://taqu.uz",
    verified: true,
  },
  "Toshkent Davlat Agrar Universiteti (TDAU)": {
    faculties: ["Agromuhandislik va agrotexnologiya fakulteti", "Meva-sabzavotchilik va uzumchilik fakulteti", "O'simliklar himoyasi, agrokimyo va tuproqshunoslik fakulteti", "O'rmon xo'jaligi va landshaft dizayn fakulteti", "Qishloq xo'jaligi mahsulotlarini saqlash va qayta ishlash fakulteti", "Agroiqtisodiyot, logistika va xizmatlar fakulteti", "Zooinjeneriya fakulteti", "Qo'shma ta'lim dasturlari fakulteti", "Sirtqi (masofaviy) ta'lim fakulteti"],
    source: "https://tdau.uz/faculties/",
    verified: true,
  },
  "Toshkent Davlat Iqtisodiyot Universiteti (TDIU)": {
    faculties: ["Iqtisodiyot fakulteti", "Moliya va buxgalteriya hisobi fakulteti", "Biznes boshqaruvi (Menejment) fakulteti", "Raqamli iqtisodiyot fakulteti", "Xalqaro turizm fakulteti"],
    source: "https://infoedu.uz/oliygoh/toshkent-davlat-iqtisodiyot-universiteti",
    verified: false,
  },
  "Toshkent davlat stomatologiya instituti (TDSI)": {
    faculties: ["Stomatologiya fakulteti", "Stomatologiya 2-fakulteti", "Davolash fakulteti", "Xalqaro ta'lim fakulteti", "Xalq tabobati va oliy hamshiralik ishi fakulteti"],
    source: "https://tsdi.uz",
    verified: true,
  },
  "Toshkent Davlat Transport Universiteti (TDTU)": {
    faculties: ["Aviatsiya transporti muhandisligi fakulteti", "Temir yo'l transporti muhandisligi fakulteti", "Avtomobil transporti muhandisligi fakulteti", "Avtomobil yo'llari muhandisligi fakulteti", "Elektrotexnika va kompyuter muhandisligi fakulteti", "Qurilish muhandisligi fakulteti", "Transport tizimlari boshqaruvi fakulteti", "Iqtisodiyot fakulteti", "Xalqaro ta'lim dasturlari fakulteti"],
    source: "https://infoedu.uz/oliygoh/toshkent-davlat-transport-universiteti",
    verified: false,
  },
  "Toshkent Davlat Yuridik Universiteti (TDYU)": {
    faculties: ["Ommaviy huquq fakulteti", "Xususiy huquq fakulteti", "Jinoiy odil sudlov fakulteti", "Xalqaro huquq va qiyosiy huquqshunoslik fakulteti"],
    source: "https://infoedu.uz/oliygoh/toshkent-davlat-yuridik-universiteti",
    verified: false,
  },
  "Toshkent davlat sharqshunoslik universiteti (TDSHU)": {
    faculties: ["Arabshunoslik oliy maktabi", "Eronshunoslik va afg'onshunoslik oliy maktabi", "Turkshunoslik oliy maktabi", "Janubiy Osiyo tillari oliy maktabi", "Yaponshunoslik oliy maktabi", "Koreyashunoslik oliy maktabi", "Xitoyshunoslik oliy maktabi", "Tarjimashunoslik, tilshunoslik va xalqaro jurnalistika oliy maktabi", "Tashqi siyosat va xalqaro iqtisodiy munosabatlar instituti", "Sharq sivilizatsiyasi va falsafa fakulteti", "Amaliy fanlar fakulteti"],
    source: "https://tsuos.uz/fakultetlar-va-kafedralar/",
    verified: true,
  },
  "Toshkent farmatsevtika instituti (ToshFI)": {
    faculties: ["Farmatsiya fakulteti", "Sanoat farmatsiyasi fakulteti", "Farmatsevtlarni malakasini oshirish va qayta tayyorlash fakulteti"],
    source: "https://infoedu.uz/oliygoh/toshkent-farmatsevtika-instituti",
    verified: false,
  },
  "Toshkent Gumanitar Fanlar Universiteti (TGFU)": {
    faculties: ["Amaliy va gumanitar fanlar fakulteti"],
    source: "https://tgfu.uz/uz/faculties-departments",
    verified: true,
  },
  "Toshkent irrigatsiya va qishloq xo'jaligini mexanizatsiyalash muhandislari instituti (TIQXMMI)": {
    faculties: ["Gidrotexnika qurilishi fakulteti", "Gidromelioratsiya fakulteti", "Qishloq xo'jaligini mexanizatsiyalash fakulteti", "Energetika fakulteti", "Yer resurslari va kadastr fakulteti", "Ekologiya va huquq fakulteti", "Iqtisodiyot fakulteti"],
    source: "https://tiiame.uz/faculties/faculties",
    verified: true,
  },
  "Toshkent Kimyo Xalqaro Universiteti (KIUT / sobiq Yeoju)": {
    faculties: ["Muhandislik maktabi", "Biznes va moliya maktabi", "Ta'lim maktabi", "San'at maktabi", "Tibbiyot maktabi"],
    source: "https://kiut.uz/en/institute/about-us/",
    verified: true,
  },
  "Toshkent Kimyo-Texnologiya Instituti (TKTI)": {
    faculties: ["Noorganik moddalar texnologiyasi fakulteti", "Yoqilg'i va organik birikmalar kimyoviy texnologiyasi fakulteti", "Oziq-ovqat mahsulotlari texnologiyasi fakulteti", "Menejment va kasb ta'limi fakulteti", "Vinochilik texnologiyasi va sanoat uzumchiligi fakulteti"],
    source: "https://abt.uz/blog/toshkent-kimyo-texnologiya-instituti",
    verified: false,
  },
  "Toshkent Moliya Instituti (TMI)": {
    faculties: [],
    source: "",
    verified: false,
  },
  "Toshkent pediatriya tibbiyot instituti (ToshPTI)": {
    faculties: ["1-Davolash fakulteti", "2-Davolash fakulteti", "3-Davolash fakulteti", "Tibbiy profilaktika, jamoat salomatligi va atrof-muhit fakulteti", "Tibbiy-pedagogika, stomatologiya, farmatsiya va pediatriya ishi fakulteti", "Menejment, tibbiy biologiya, biotibbiyot muhandisligi va oliy hamshiralik ishi fakulteti", "1-Pediatriya ishi fakulteti", "2-Pediatriya ishi fakulteti", "Tibbiy-pedagogika va davolash fakulteti", "1-Stomatologiya fakulteti", "2-Stomatologiya fakulteti", "Xalqaro fakultet", "Malaka oshirish fakulteti"],
    source: "https://tashmeduni.uz/tashkiliy-tuzilma/fakultetlar/",
    verified: true,
  },
  "Toshkent Tibbiyot Akademiyasi (TMA)": {
    faculties: ["1-Davolash fakulteti", "2-Davolash fakulteti", "3-Davolash fakulteti", "Tibbiy profilaktika, jamoat salomatligi va atrof-muhit fakulteti", "Tibbiy-pedagogika, stomatologiya, farmatsiya va pediatriya ishi fakulteti", "Menejment, tibbiy biologiya, biotibbiyot muhandisligi va oliy hamshiralik ishi fakulteti", "1-Pediatriya ishi fakulteti", "2-Pediatriya ishi fakulteti", "Tibbiy-pedagogika va davolash fakulteti", "1-Stomatologiya fakulteti", "2-Stomatologiya fakulteti", "Xalqaro fakultet", "Malaka oshirish fakulteti"],
    source: "https://tashmeduni.uz/tashkiliy-tuzilma/fakultetlar/",
    verified: true,
  },
  "Toshkent To'qimachilik va Yengil Sanoat Instituti (TTYESI)": {
    faculties: ["Iqtisodiyot fakulteti", "To'qimachilik muhandisligi fakulteti", "Sanoat texnologiyalari va mexanika fakulteti", "Dizayn va texnologiyalar fakulteti"],
    source: "https://ttysi.uz/faculty",
    verified: true,
  },
  "Toshkent shahridagi Inha Universiteti (IUT)": {
    faculties: ["Kompyuter va axborot muhandisligi maktabi (SOCIE)", "Biznes va logistika maktabi (SBL)"],
    source: "https://inha.uz/program-overview-kor/",
    verified: true,
  },
  "Toshkent shahridagi Xalqaro Vestminster Universiteti (WIUT)": {
    faculties: ["Biznes va iqtisodiyot maktabi", "Huquq, texnologiya va ta'lim maktabi"],
    source: "https://en.wikipedia.org/wiki/Westminster_International_University_in_Tashkent",
    verified: false,
  },
  "Turin Politexnika Universiteti (TTPU)": {
    faculties: ["Tabiiy-matematik fanlar fakulteti", "Menejment, iqtisodiyot va gumanitar fanlar fakulteti", "Avtomatik boshqaruv va kompyuter muhandisligi fakulteti", "Qurilish muhandisligi va arxitektura fakulteti", "Mashinasozlik va aerokosmik muhandislik fakulteti"],
    source: "https://turin.uz/",
    verified: true,
  },
  "Urganch Davlat Pedagogika Instituti": {
    faculties: ["Aniq va amaliy fanlar fakulteti", "Pedagogika fakulteti", "Filologiya fakulteti", "Boshlang'ich ta'lim fakulteti", "Ijtimoiy fanlar fakulteti"],
    source: "https://infoedu.uz/oliygoh/urganch-davlat-pedagogika-instituti",
    verified: false,
  },
  "Webster Universiteti (Toshkent va Samarqand)": {
    faculties: [],
    source: "",
    verified: false,
  },
  "Yangi O'zbekiston Universiteti (New Uzbekistan University)": {
    faculties: ["Muhandislik maktabi", "Kompyuter fanlari maktabi", "Menejment maktabi", "Gumanitar, ijtimoiy va tabiiy fanlar maktabi"],
    source: "https://newuu.uz/en/school-of-engineering",
    verified: true,
  },
  "Zahiriddin Muhammad Bobur nomidagi Andijon Davlat Universiteti (ADU)": {
    faculties: ["Filologiya fakulteti", "Matematika fakulteti", "Fizika fakulteti", "Ijtimoiy iqtisodiyot fakulteti", "Tarix fakulteti", "Tabiiy fanlar fakulteti", "Jismoniy madaniyat fakulteti", "Pedagogika va san'atshunoslik fakulteti", "Axborot texnologiyalari va kompyuter injiniringi fakulteti"],
    source: "https://infoedu.uz/oliygoh/andijon-davlat-universiteti",
    verified: false,
  },
  "O'zbekiston Davlat Jahon Tillari Universiteti (O'zDJTU)": {
    faculties: ["Ingliz filologiyasi fakulteti", "Ingliz tili 1-fakulteti", "Ingliz tili 2-fakulteti", "Ingliz tili 3-fakulteti", "Rus filologiyasi fakulteti", "Roman-german filologiyasi fakulteti", "Sharq filologiyasi fakulteti", "Xalqaro jurnalistika fakulteti", "Tarjimonlik fakulteti", "Sirtqi va kechki ta'lim fakulteti"],
    source: "https://uzswlu.uz",
    verified: true,
  },
  "O'zbekiston Davlat Jismoniy Tarbiya va Sport Universiteti": {
    faculties: ["Futbol fakulteti", "Sport o'yinlari fakulteti", "Yengil atletika, kuch ishlatiladigan sport turlari va ko'pkurash fakulteti", "Yakka kurash sport turlari fakulteti", "Milliy sport turlari fakulteti", "Sport menejmenti va turizm fakulteti"],
    source: "https://infoedu.uz/oliygoh/ozbekiston-davlat-jismoniy-tarbiya-va-sport-universiteti",
    verified: false,
  },
  "O'zbekiston Davlat Konservatoriyasi": {
    faculties: ["Akademik ijrochilik fakulteti", "Musiqiy san'at fakulteti", "Fortepiano va orkestr cholg'ulari fakulteti", "O'zbek maqom san'ati fakulteti", "Kompozitorlik, san'atshunoslik va fortepiano fakulteti"],
    source: "https://infoedu.uz/oliygoh/ozbekiston-davlat-konservatoriyasi",
    verified: false,
  },
  "O'zbekiston Davlat San'at va Madaniyat Instituti": {
    faculties: ["Teatr san'ati fakulteti", "Xalq ijodiyoti fakulteti", "Kino, televideniye va radio san'ati fakulteti", "Kutubxona-axborot faoliyati fakulteti"],
    source: "https://dsmi.uz",
    verified: true,
  },
  "O'zbekiston Davlat Xoreografiya Akademiyasi": {
    faculties: ["Xoreografiya san'ati fakulteti"],
    source: "https://uzdxa.uz/tuzulma/fakultetlar/",
    verified: true,
  },
  "O'zbekiston Jurnalistika va Ommaviy Kommunikatsiyalar Universiteti": {
    faculties: ["Jurnalistika fakulteti", "Media marketing va reklama fakulteti", "Xalqaro jurnalistika va jamoatchilik bilan aloqalar fakulteti", "Internet jurnalistika va ijtimoiy tarmoqlar fakulteti", "Masofaviy va kechki ta'lim fakulteti"],
    source: "https://infoedu.uz/oliygoh/ozbekiston-jurnalistika-va-ommaviy-kommunikatsiyalar-universiteti",
    verified: false,
  },
  "O'zbekiston Milliy Universiteti (O'zMU)": {
    faculties: ["Matematika fakulteti", "Amaliy matematika va intellektual texnologiyalar fakulteti", "Fizika fakulteti", "Kimyo fakulteti", "Biologiya va ekologiya fakulteti", "Geologiya va muhandislik geologiyasi fakulteti", "Geografiya va geoaxborot tizimlari fakulteti", "Iqtisodiyot fakulteti", "Tarix fakulteti", "Ijtimoiy fanlar fakulteti", "Xorijiy filologiya fakulteti", "Taekvondo va sport faoliyati fakulteti", "Jurnalistika va o'zbek filologiyasi fakulteti"],
    source: "https://nuu.uz/fakultet-va-kafedralar/",
    verified: true,
  },
  "O'zbekiston Xalqaro Islomshunoslik Akademiyasi": {
    faculties: ["Islom iqtisodiyoti va xalqaro munosabatlar fakulteti", "Mumtoz sharq filologiyasi fakulteti", "Islomshunoslik fakulteti"],
    source: "https://iiau.uz/oz/category/18",
    verified: true,
  },
  "O'zbekiston-Finlyandiya Pedagogika Instituti": {
    faculties: [],
    source: "",
    verified: false,
  },
  "Shahrisabz Davlat Pedagogika Instituti": {
    faculties: ["Pedagogika fakulteti", "Maktabgacha va boshlang'ich ta'lim fakulteti", "Tabiiy fanlar fakulteti", "Ijtimoiy-gumanitar fanlar fakulteti", "Filologiya fakulteti", "Jismoniy madaniyat fakulteti"],
    source: "https://infoedu.uz/oliygoh/shahrisabz-davlat-pedagogika-instituti",
    verified: false,
  },
  "Shahrisabz Innovatsion Universiteti": {
    faculties: [],
    source: "",
    verified: false,
  },
  "Sharof Rashidov nomidagi Samarqand Davlat Universiteti (SamDU)": {
    faculties: ["Matematika fakulteti", "Geografiya va ekologiya fakulteti", "Tarix fakulteti", "Psixologiya va ijtimoiy-siyosiy fanlar fakulteti", "Yuridik fakulteti", "Telekommunikatsiya va kompyuter injiniringi fakulteti"],
    source: "https://www.samdu.uz/uz/pages/tarix_fakulteti",
    verified: true,
  },
  "Chirchiq Davlat Pedagogika Universiteti (CHDPU)": {
    faculties: ["San'atshunoslik fakulteti", "Aniq fanlar fakulteti", "Gumanitar fanlar fakulteti", "Tabiiy fanlar fakulteti", "Pedagogika fakulteti", "Jismoniy madaniyat fakulteti", "Boshlang'ich ta'lim fakulteti", "Turizm fakulteti"],
    source: "https://cspu.uz/en/faculties-and-departments",
    verified: true,
  },
};
