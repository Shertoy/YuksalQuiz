export type Language = 'uz' | 'ru' | 'en';

export interface Translations {
  appName: string;
  tagline: string;
  onboardingTitle: string;
  onboardingSubtitle: string;
  onboardingDesc: string;
  firstName: string;
  lastName: string;
  region: string;
  birthDate: string;
  gender: string;
  genderMale: string;
  genderFemale: string;
  studyType: string;
  studyKunduzgi: string;
  studySirtqi: string;
  studyKechki: string;
  studyTibbiyot: string;
  academicYear: string;
  courseUnit: string;
  selectAvatar: string;
  customAvatarsCount: string;
  ofertaConsent: string;
  ofertaLink: string;
  completeRegistration: string;
  studentStatus: string;
  statusStudent: string;
  statusNotStudent: string;
  statusNotStudentSub: string;
  selectUniError: string;
  nonStudentNote: string;
  saveProfile: string;
  editProfile: string;
  cancel: string;
  
  // Dashboard & Header
  greeting: string;
  dailyBonusTitle: string;
  dailyBonusDesc: string;
  claimDailyBonus: string;
  claimedToday: string;
  activeVoucherTitle: string;
  activeVoucherDesc: string;
  activateOfferBtn: string;
  coins: string;
  streak: string;
  testsCompleted: string;
  quickTest: string;
  myProgress: string;

  // Bottom Nav
  navHome: string;
  navTests: string;
  navRating: string;
  navWallet: string;
  navProfile: string;

  // Categories
  catHemis: string;
  catCenter: string;
  catCert: string;
  catApplicant: string;
  catSchool: string;
  allCategories: string;
  searchPlaceholder: string;
  emptyCategoryTitle: string;
  emptyCategoryDesc: string;
  createTestBtn: string;

  // Test Runner
  questionCounter: string;
  timeRemaining: string;
  finishTest: string;
  testCompleted: string;
  correctAnswers: string;
  wrongAnswers: string;
  totalScore: string;
  earnedCoins: string;
  reviewAnswers: string;
  retakeTest: string;
  backToTests: string;

  // Password modal
  enterPasswordTitle: string;
  enterPasswordPrompt: string;
  passwordPlaceholder: string;
  unlockBtn: string;
  wrongPassword: string;

  // Wallet & Referral
  walletTitle: string;
  walletSubtitle: string;
  internalBalance: string;
  voucherBalance: string;
  authorEarnings: string;
  guardrailNoticeTitle: string;
  guardrailNoticeText: string;
  sub6Months: string;
  sub1Year: string;
  sub6MonthsDesc: string;
  sub1YearDesc: string;
  voucherApplied: string;
  activateSub: string;
  referralTitle: string;
  referralSubtitle: string;
  referralBtn: string;
  copyLink: string;
  linkCopied: string;
  invitedFriends: string;
  referralEarnings: string;
  topUpBtn: string;
  topUpModalTitle: string;
  topUpModalDesc: string;
  selectAmount: string;
  customAmountPlaceholder: string;
  paymentMethod: string;
  payBtn: string;
  insufficientBalanceShort: string;
  neededAmount: string;

  // Bulk parser & Create Test
  bulkCreateTitle: string;
  bulkCreateDesc: string;
  pasteLabel: string;
  parseBtn: string;
  parsedQuestionsCount: string;
  savePackageBtn: string;
  fieldRequired: string;
  createTestModalTitle: string;
  createTestModalDesc: string;
  categoryLabel: string;
  testTitleLabel: string;
  universityLabel: string;
  customUniPlaceholder: string;
  departmentLabel: string;
  accessLabel: string;
  publicAccess: string;
  privateAccess: string;
  testPasswordLabel: string;
  testPasswordPlaceholder: string;
  authorRewardNotice: string;
  inputModeManual: string;
  inputModeBulk: string;
  bulkPlaceholder: string;
  addQuestionBtn: string;
  publishTestBtn: string;
  questionNumber: string;
  previousBtn: string;
  nextBtn: string;
  totalTime: string;

  // Rank Titles
  rankMaster: string;
  rankScholar: string;
  rankActive: string;
  rankBeginner: string;

  // HomeDashboard
  allTestsFreeTitle: string;
  allTestsFreeDesc: string;
  practiceBtn: string;
  unlimitedBadge: string;
  recommendedTests: string;
  all: string;
  start: string;
  questionsCount: string;
  blocksCount: string;
  mistakesTitle: string;
  mistakesDesc: string;
  testCategoriesPractice: string;
  bulkParserDesc: string;
  dailyBonusAlreadyClaimed: string;
  dailyBonusClaimedSuccess: string;

  // TestList & Sequential Blocks
  refreshTestsFromCloud: string;
  allTestsTab: string;
  myTestsTab: string;
  allUnis: string;
  myUni: string;
  communityTestBadge: string;
  myTestBadge: string;
  authorLabel: string;
  editBtn: string;
  deleteBtn: string;
  testBlocksLabel: string;
  lockedStatus: string;
  bestScoreLabel: string;
  pointsLabel: string;
  deleteTestModalTitle: string;
  deleteTestModalPrompt: string;
  deleteConfirmBtn: string;
  deletingStatus: string;
  understandBtn: string;
  myTestsEmptyTitle: string;
  myTestsEmptyDesc: string;

  // Leaderboard
  leaderboardSubtitle: string;
  rankPlace: string;
  correctAnswersShort: string;
  youAreLeading: string;
  nextRankAccReq: string;
  nextRankPointsReq: string;
  scopeUnis: string;
  scopeRegion: string;
  scopeUzbekistan: string;
  metricPoints: string;
  metricAccuracySpeed: string;
  metricWeekly: string;
  accuracyLabel: string;
  studentsUnit: string;
  activeParticipants: string;
  fromStudents: string;
  fromStudentsCount: string;
  noUniRankingYet: string;
  noUniRankingDesc: string;
  unisAndCentersRanking: string;
  institutionsCount: string;
  hoursShort: string;
  emptyUnisTitle: string;
  emptyUnisDesc: string;
  unisRankingTitle: string;
  unisCountLabel: string;
  allUnisListTitle: string;
  activeStudentsLabel: string;
  emptyStudentsTitle: string;
  emptyStudentsDesc: string;
  allStudentsListTitle: string;
  youBadge: string;
  daysUnit: string;
  registeredDateLabel: string;
  totalTimeSpent: string;
  nextRankGoalText: string;
  targetRankGoalText: string;
  top20Badge: string;
  top20Subtitle: string;
  studentsRatingTab: string;
  universitiesRatingTab: string;
  scopeUzbekistanShort: string;
  scopeRegionShort: string;
  scopeOtmShort: string;
  testsCountSuffix: string;
  uzbekistanCountry: string;

  // Profile
  profileTitle: string;
  profileSubtitle: string;
  securityVerified: string;
  freeModeTitle: string;
  freeModeDesc: string;
  activeStatus: string;
  myResultsCardTitle: string;
  myResultsCardDesc: string;
  viewBtn: string;
  offerCardTitle: string;
  offerCardDesc: string;
  readBtn: string;
  adminLoginBtn: string;
  adminControlPanel: string;
  editDataTitle: string;
  updateAvatarLabel: string;
  nameLabel: string;
  surnameLabel: string;
  regionLabel: string;
  uniLabel: string;
  studyTypeLabel: string;
  courseLabel: string;
  saveChangesBtn: string;
  officialVersion: string;
  editProfileBtn: string;

  // TestRunner
  confirmExitTitle: string;
  confirmExitDesc: string;
  continueBtn: string;
  exitBtn: string;

  // SearchableUniversitySelect
  selectUniPlaceholder: string;
  selectUniModalTitle: string;
  alphabeticalOrderDesc: string;
  searchUniInputPlaceholder: string;
  addCustomUniPrompt: string;
  uniNotFound: string;
  uniNotFoundTip: string;
  addAsCustomBtn: string;
  retryBtn: string;
  networkErrorNotice: string;
  emptyDatabasePrompt: string;

  // Settings
  settingsTitle: string;
  soundEffectsTitle: string;
  soundEffectsDesc: string;
  vibrationTitle: string;
  vibrationDesc: string;

  // Semester & Academic Year
  semesterLabel: string;
  academicYearLabel: string;
  allSemesters: string;
  allAcademicYears: string;
  filterBySemester: string;
  filterByAcademicYear: string;
  semesterSelectPlaceholder: string;
  academicYearSelectPlaceholder: string;
  paywallLimitReachedTitle: string;
  paywallLimitReachedDesc: string;
  paywallTopUpBtn: string;
  paywallBackBtn: string;

  // Settings & Language & Theme
  languageTitle: string;
  languageDesc: string;
  langUz: string;
  langRu: string;
  langEn: string;
  themeTitle: string;
  themeDesc: string;
  themeLight: string;
  themeDark: string;

  // Onboarding Benefits
  onboardingVoucherBenefit: string;
  onboardingPracticeBenefit: string;
  onboardingSecurityBenefit: string;

  // Wallet
  walletBalanceTitle: string;
  walletHistoryTitle: string;
  walletVoucherActiveBanner: string;
  walletVoucherDesc: string;
  walletTariffsTitle: string;
  walletTariffsDesc: string;
  walletP2PTitle: string;
  walletP2PDesc: string;
  walletCardNumberLabel: string;
  walletCardHolderLabel: string;
  walletZeroCommission: string;
  walletCopyCardBtn: string;
  walletCardCopied: string;
  walletUploadReceiptTitle: string;
  walletUploadReceiptDesc: string;
  walletSendReceiptBtn: string;
  walletChooseReceiptFile: string;
  walletReceiptFileSelected: string;
}

export const translations: Record<Language, Translations> = {
  uz: {
    appName: 'YuksalQuiz',
    tagline: "Oliy ta'lim (HEMIS), xalqaro sertifikatlar (IELTS, TOPIK, SAT) va maktab fanlariga tayyorlanish uchun yagona test platformasi!",
    onboardingTitle: 'Talaba Profilini Yarating',
    onboardingSubtitle: "Reyting va natijalar uchun ma'lumotlaringizni kiriting",
    onboardingDesc: "Oliy ta'lim (HEMIS), xalqaro sertifikatlar (IELTS, TOPIK, SAT) va maktab fanlariga tayyorlanish uchun yagona test platformasi!",
    firstName: 'Ismingiz',
    lastName: 'Familiyangiz',
    region: 'Viloyatingiz',
    birthDate: "Tug'ilgan sana",
    gender: 'Jinsingiz',
    genderMale: 'Erkak',
    genderFemale: 'Ayol',
    studyType: "Ta'lim shakli",
    studyKunduzgi: 'Kunduzgi',
    studySirtqi: 'Sirtqi',
    studyKechki: 'Kechki',
    studyTibbiyot: 'Tibbiyot',
    academicYear: 'Bosqich / Kurs',
    courseUnit: '-kurs',
    selectAvatar: 'Avatarni tanlang',
    customAvatarsCount: '10 ta maxsus avatar',
    ofertaConsent: 'Men Ommaviy oferta shartlariga roziman (Virtual vaucher va bonuslar kartaga yechib olinmaydi)',
    ofertaLink: 'Ommaviy oferta',
    completeRegistration: "Ro'yxatdan o'tish",
    studentStatus: "Sizning maqomingiz:",
    statusStudent: "🎓 OTM talabasi",
    statusNotStudent: "📚 Talaba emasman",
    statusNotStudentSub: "Maktab, abituriyent yoki boshqa",
    selectUniError: "Iltimos, ro'yxatdan OTMni tanlang",
    nonStudentNote: "Barcha xalqaro sertifikatlar, abituriyent va umumiy fan testlari siz uchun ochiq! 🚀",
    saveProfile: 'Saqlash',
    editProfile: 'Tahrirlash',
    cancel: 'Bekor qilish',

    greeting: 'Assalomu alaykum,',
    dailyBonusTitle: 'Kunlik seriya bonusi',
    dailyBonusDesc: 'Har kuni ilovaga kiring va +1 tangaga ega bo\'ling!',
    claimDailyBonus: 'Olish (+1)',
    claimedToday: 'Bugun olindi',
    activeVoucherTitle: '20 000 so\'m vaucheringiz faol!',
    activeVoucherDesc: 'Istalgan ta\'lim obunasini ochish uchun 20 000 so\'m vaucher chegirmasidan foydalaning',
    activateOfferBtn: 'Obunani ko\'rish',
    coins: 'Tangalar',
    streak: 'Kun seriya',
    testsCompleted: 'Yechilgan',
    quickTest: 'Tezkor test',
    myProgress: 'Mening natijalarim',

    navHome: 'Asosiy',
    navTests: 'Testlar',
    navRating: 'Reyting',
    navWallet: 'Hamyon',
    navProfile: 'Profil',

    catHemis: "Oliy Ta'lim (HEMIS)",
    catCenter: "O'quv Markazi",
    catCert: 'Xalqaro Sertifikatlar',
    catApplicant: 'Abituriyent',
    catSchool: 'Maktab',
    allCategories: 'Barchasi',
    searchPlaceholder: 'Test yoki fan nomini izlang...',
    emptyCategoryTitle: 'Hozircha ushbu bo\'limda testlar mavjud emas',
    emptyCategoryDesc: 'Birinchi bo\'lib test yuklang va har bir yechim uchun +100 so\'m oling!',
    createTestBtn: 'Test yaratish',

    questionCounter: 'Savol:',
    timeRemaining: 'Vaqt:',
    finishTest: 'Testni yakunlash',
    testCompleted: 'Test yakunlandi!',
    correctAnswers: 'To\'g\'ri javoblar:',
    wrongAnswers: 'Xato javoblar:',
    totalScore: 'Umumiy ball:',
    earnedCoins: 'Yutilgan tangalar:',
    reviewAnswers: 'Javoblarni tahlil qilish',
    retakeTest: 'Qayta topshirish',
    backToTests: 'Testlar ro\'yxatiga qaytish',

    enterPasswordTitle: 'Yopiq test',
    enterPasswordPrompt: 'Ushbu testga kirish uchun maxsus parolni kiriting (masalan: TGFU2026)',
    passwordPlaceholder: 'Parolni kiriting...',
    unlockBtn: 'Kirish',
    wrongPassword: 'Parol noto\'g\'ri! Qayta urinib ko\'ring.',

    walletTitle: 'Talaba Hamyoni',
    walletSubtitle: "Balans, tariflar va tezkor to'lov",
    internalBalance: 'Hamyon balansi',
    voucherBalance: 'Vaucher balansi',
    authorEarnings: 'Mualliflik daromadi',
    guardrailNoticeTitle: 'Eslatma:',
    guardrailNoticeText: 'Hisobdagi vaucher va bonuslar faqat ilova ichidagi obunalarni faollashtirish uchun ishlatiladi. Kartaga yechib olish imkonsiz.',
    sub6Months: '6 oylik Premium obuna',
    sub1Year: '1 yillik Premium obuna',
    sub6MonthsDesc: 'Tanlangan semestr HEMIS va sertifikat testlariga to\'liq kirish',
    sub1YearDesc: 'Barcha yangi OTM va sertifikat testlariga bir yil kafolat',
    voucherApplied: '20 000 so\'m vaucher tejaldi',
    activateSub: 'Faollashtirish',
    referralTitle: 'Do\'stlarni taklif qilish tizimi',
    referralSubtitle: 'Har bir taklif qilingan talaba uchun +1 500 so\'m',
    referralBtn: 'Do\'stlarni taklif qilish (+1 500 so\'m)',
    copyLink: 'Nusxalash',
    linkCopied: 'Havola nusxalandi!',
    invitedFriends: 'Taklif qilingan do\'stlar soni',
    referralEarnings: 'Referaldan ishlangan mablag\'',
    topUpBtn: "Balansni to'ldirish",
    topUpModalTitle: "Hisobni to'ldirish",
    topUpModalDesc: "Kerakli miqdorni tanlang va qulay to'lov tizimi orqali hisobingizni to'ldiring",
    selectAmount: "To'lov miqdorini tanlang:",
    customAmountPlaceholder: "Boshqa miqdor (so'm)...",
    paymentMethod: "To'lov usulini tanlang:",
    payBtn: "Hisobni to'ldirish",
    insufficientBalanceShort: "Balans yetarli emas",
    neededAmount: "Yana kerak:",

    bulkCreateTitle: 'Ommaviy Test Yaratish (Parser)',
    bulkCreateDesc: 'Savollar bankini maxsus formatda joylashtiring va tizim avtomatik 25 talik bloklarga ajratadi',
    pasteLabel: 'Test matnini joylashtiring (==== va ++++ ajratgichlari bilan):',
    parseBtn: 'Matnni tahlil qilish (Parse)',
    parsedQuestionsCount: 'ta savol muvaffaqiyatli aniqlandi',
    savePackageBtn: 'Testlar paketini saqlash',
    fieldRequired: "Iltimos, ushbu maydonni to'ldiring",
    createTestModalTitle: "Yangi Test To'plami Yaratish",
    createTestModalDesc: "Test tuzing, muallif bo'ling va har bir yechimdan +100 so'm ishlang",
    categoryLabel: "Kategoriya (Yo'nalish):",
    testTitleLabel: "Fan / Test nomi:",
    universityLabel: "Universitet (OTM):",
    customUniPlaceholder: "Yangi OTM to'liq nomini kiriting...",
    departmentLabel: "Yo'nalish / Kafedra:",
    accessLabel: "Kirish huquqi (Access):",
    publicAccess: "Ochiq",
    privateAccess: "Yopiq",
    testPasswordLabel: "Maxfiy test paroli:",
    testPasswordPlaceholder: "Talabalar uchun parolni kiriting (masalan: TGFU2026)",
    authorRewardNotice: "Har 25 ta savol avtomatik alohida bloklarga bo'linadi. Muallif har bir to'liq yechilgan test uchun +100 so'm rag'bat oladi.",
    inputModeManual: "Bittalab kiritish",
    inputModeBulk: "Ommaviy nusxalash (Bulk)",
    bulkPlaceholder: "Savol matni\n====\n#To'g'ri variant javobi\n====\nNoto'g'ri variant 1\n====\nNoto'g'ri variant 2\n====\nNoto'g'ri variant 3\n++++\n\nKeyingi savol...\n====\n#To'g'ri variant\n====\nVariant 2\n++++",
    addQuestionBtn: "Yana bitta savol qo'shish",
    publishTestBtn: "Test to'plamini nashr qilish",
    questionNumber: "Savol",
    previousBtn: "Oldingisi",
    nextBtn: "Keyingisi",
    totalTime: "Umumiy vaqt",

    // Rank Titles
    rankMaster: 'Yuksalish Masteri',
    rankScholar: 'Bilimdon Talaba',
    rankActive: 'Faol Izlanuvchi',
    rankBeginner: "Boshlang'ich Talaba",

    // HomeDashboard
    allTestsFreeTitle: 'Barcha testlar 100% bepul!',
    allTestsFreeDesc: "Fanlar va imtihon bloklari bo'yicha mashqlarni erkin bajaring",
    practiceBtn: 'Mashq qilish',
    unlimitedBadge: 'Cheklovlarsiz',
    recommendedTests: 'Tavsiya etilgan testlar',
    all: 'Barchasi',
    start: 'Boshlash',
    questionsCount: 'savol',
    blocksCount: 'blok',
    mistakesTitle: 'Xatolar ustida ishlash',
    mistakesDesc: "Noto'g'ri yechilgan savollarni qayta ishlab chiqing",
    testCategoriesPractice: "OTM va fan bo'yicha mashq qiling",
    bulkParserDesc: "Fayl yoki matndan o'z testingizni qo'shing",
    dailyBonusAlreadyClaimed: 'Bugungi bonus allaqachon olingan. Ertaga yana tashrif buyuring!',
    dailyBonusClaimedSuccess: "Tabriklaymiz! +1 tanga hisobingizga qo'shildi",

    // TestList & Sequential Blocks
    refreshTestsFromCloud: 'Bulutdan testlarni yangilash',
    allTestsTab: 'Barcha testlar',
    myTestsTab: 'Mening testlarim',
    allUnis: 'Barcha OTMlar',
    myUni: 'Mening OTMim',
    communityTestBadge: 'Hamjamiyat testi',
    myTestBadge: 'Sizning testingiz',
    authorLabel: 'Muallif',
    editBtn: 'Tahrirlash',
    deleteBtn: "O'chirish",
    testBlocksLabel: 'Test bloklari:',
    lockedStatus: 'Qulflangan',
    bestScoreLabel: 'Eng yaxshi:',
    pointsLabel: 'ball',
    deleteTestModalTitle: "Testni o'chirish",
    deleteTestModalPrompt: "Haqiqatan ham ushbu testni butunlay o'chirmoqchimisiz? Ushbu amalni ortga qaytarib bo'lmaydi.",
    deleteConfirmBtn: "Ha, o'chirish",
    deletingStatus: "O'chirilmoqda...",
    understandBtn: 'Tushundim',
    myTestsEmptyTitle: 'Siz hali test yaratmagansiz',
    myTestsEmptyDesc: "O'zingiz yoki guruhingiz uchun yangi test yaratib, barcha talabalar bilan ulashing.",

    // Leaderboard
    leaderboardSubtitle: "OTMlar, viloyatlar va O'zbekiston bo'ylab eng faol bilimdonlar",
    rankPlace: "-o'rin",
    correctAnswersShort: "ta to'g'ri",
    youAreLeading: "Siz peshqadamsiz! O'rningizni saqlab qoling",
    nextRankAccReq: "Keyingi o'ringa chiqish uchun +{count}% aniqlik yoki tezroq vaqt kerak",
    nextRankPointsReq: "Keyingi o'ringa chiqish uchun yana {count} ball kerak",
    scopeUnis: 'OTMlar',
    scopeRegion: 'Viloyat',
    scopeUzbekistan: "O'zbekiston",
    metricPoints: 'Ballar',
    metricAccuracySpeed: 'Aniqlik',
    metricWeekly: 'Haftalik faol',
    accuracyLabel: 'aniqlik',
    studentsUnit: 'talaba',
    activeParticipants: 'faol ishtirokchi',
    fromStudents: 'talabadan',
    noUniRankingYet: 'Hozircha OTMlar reytingi shakllanmagan',
    noUniRankingDesc: "Barcha soxta ma'lumotlar tozalandi. Talabalar testlarni yechishni boshlagach, ularning oliygohlari ushbu reyting jadvalidan munosib o'rin oladi.",
    unisAndCentersRanking: "Oliygohlar va o'quv markazlari reytingi",
    institutionsCount: 'ta muassasa',
    fromStudentsCount: 'talabadan',
    hoursShort: 's',
    emptyUnisTitle: 'Hozircha OTMlar reytingi shakllanmagan',
    emptyUnisDesc: "Barcha soxta ma'lumotlar tozalandi. Talabalar testlarni yechishni boshlagach, ularning oliygohlari ushbu reyting jadvalidan munosib o'rin oladi.",
    unisRankingTitle: "Oliygohlar va o'quv markazlari reytingi",
    unisCountLabel: 'ta muassasa',
    allUnisListTitle: "Barcha OTM va Markazlar (4–{count} o'rinlar)",
    activeStudentsLabel: 'faol talaba',
    emptyStudentsTitle: "Reyting hali bo'sh",
    emptyStudentsDesc: "Birinchi testingizni yeching va reytingga kiring.",
    allStudentsListTitle: "Barcha ishtirokchilar (4–20 o'rinlar)",
    youBadge: 'Siz',
    daysUnit: 'kun',
    registeredDateLabel: "A'zo bo'lgan sana",
    totalTimeSpent: 'Sarflangan vaqt',
    nextRankGoalText: "Keyingi o'ringa chiqish uchun {count} ta test qoldi",
    targetRankGoalText: "{rank}-o'ringa chiqish uchun {count} ta to'g'ri test qoldi",
    top20Badge: 'TOP 20',
    top20Subtitle: "Eng yuqori natija ko'rsatgan 20 nafar bilimdon",
    studentsRatingTab: 'Talabalar reytingi',
    universitiesRatingTab: 'OTMlar reytingi',
    scopeUzbekistanShort: 'Respublika',
    scopeRegionShort: 'Viloyat',
    scopeOtmShort: 'Mening OTMim',
    testsCountSuffix: 'ta test',
    uzbekistanCountry: "O'zbekiston",

    // Profile
    profileTitle: 'Talaba Profili',
    profileSubtitle: "Shaxsiy ma'lumotlar va xavfsizlik sozlamalari",
    securityVerified: 'Profil xavfsizligi tasdiqlangan (Anti-Tamper SHA-256)',
    freeModeTitle: "100% Bepul Ta'lim Rejimi",
    freeModeDesc: 'Barcha imtihonlar va testlar cheklovlarsiz ochiq',
    activeStatus: 'Faol',
    myResultsCardTitle: 'Mening natijalarim va tahlillar',
    myResultsCardDesc: 'Yechilgan testlar, xatolar ustida ishlash va statistika',
    viewBtn: "Ko'rish",
    offerCardTitle: 'Ommaviy Oferta Shartnomasi',
    offerCardDesc: 'Foydalanuvchi qoidalari va vaucher talablari',
    readBtn: "O'qish",
    adminLoginBtn: 'Admin tizimiga kirish',
    adminControlPanel: 'Boshqaruv paneli →',
    editDataTitle: "Ma'lumotlarni o'zgartirish",
    updateAvatarLabel: 'Avatarni yangilash:',
    nameLabel: 'Ism:',
    surnameLabel: 'Familiya:',
    regionLabel: 'Viloyat:',
    uniLabel: "OTM / Ta'lim muassasasi:",
    studyTypeLabel: "Ta'lim shakli:",
    courseLabel: 'Kurs:',
    saveChangesBtn: "O'zgarishlarni saqlash",
    officialVersion: 'YuksalQuiz v1.0 • Rasmiy versiya',
    editProfileBtn: 'Profilni tahrirlash',

    // TestRunner
    confirmExitTitle: 'Testni tark etasizmi?',
    confirmExitDesc: 'Joriy natijalar saqlanmaydi va test bekor qilinadi.',
    continueBtn: 'Davom etish',
    exitBtn: 'Chiqish',

    // SearchableUniversitySelect
    selectUniPlaceholder: 'OTMni tanlang...',
    selectUniModalTitle: 'OTMni tanlang',
    alphabeticalOrderDesc: 'Alifbo tartibida saralangan',
    searchUniInputPlaceholder: 'OTM nomi yoki qisqartmasi (masalan: TATU, SamDU, TDIU)...',
    addCustomUniPrompt: "+ Yangi OTM (Ro'yxatda yo'q bo'lsa kiriting)",
    uniNotFound: "bo'yicha OTM topilmadi",
    uniNotFoundTip: "Qidiruv so'zini qisqartirib ko'ring yoki yangi OTM sifatida qo'shing.",
    addAsCustomBtn: "Yangi OTM sifatida qo'shish",
    retryBtn: "Qayta urinish",
    networkErrorNotice: "Internet aloqasi uzildi yoki server javob bermayapti",
    emptyDatabasePrompt: "Hozircha testlar mavjud emas. Yangi test yarating!",
    settingsTitle: "Sozlamalar",
    soundEffectsTitle: "Ovoz effektlari",
    soundEffectsDesc: "To'g'ri va xato javob tovushlari",
    vibrationTitle: "Vibratsiya",
    vibrationDesc: "Telegram WebApp tebranish signallari",

    semesterLabel: 'Semestr',
    academicYearLabel: "O'quv yili",
    allSemesters: 'Barcha semestrlar',
    allAcademicYears: "Barcha o'quv yillari",
    filterBySemester: "Semestr bo'yicha",
    filterByAcademicYear: "O'quv yili bo'yicha",
    semesterSelectPlaceholder: 'Semestrni tanlang',
    academicYearSelectPlaceholder: "O'quv yilini tanlang",
    paywallLimitReachedTitle: 'Kunlik bepul limit tugadi',
    paywallLimitReachedDesc: "Siz ushbu testni bugun 1 marta bepul topshirdingiz. Kunlik cheklovlarsiz barcha testlardan foydalanish uchun balansingizni to'ldiring.",
    paywallTopUpBtn: "Hisobni to'ldirish",
    paywallBackBtn: 'Orqaga qaytish',

    // Settings & Language & Theme
    languageTitle: 'Ilova tili',
    languageDesc: 'Interfeys va testlar uchun tilni tanlang',
    langUz: "O'zbekcha",
    langRu: 'Русский',
    langEn: 'English',
    themeTitle: 'Mavzu rejimi',
    themeDesc: "Kunduzgi yoki tungi ko'rinish",
    themeLight: "Yorug' (Kunduzgi)",
    themeDark: "Qorong'i (Tungi)",

    // Onboarding Benefits
    onboardingVoucherBenefit: "Har kuni 1 ta testni bepul topshirish imkoniyati",
    onboardingPracticeBenefit: 'Barcha testlar va fanlar bo\'yicha mashq qilish imkoniyati',
    onboardingSecurityBenefit: 'Rasmiy Ommaviy oferta va shifrlangan xotira',

    // Wallet
    walletBalanceTitle: 'Hamyon balansi',
    walletHistoryTitle: 'Tarix',
    walletVoucherActiveBanner: "20 000 so'm boshlang'ich vaucheringiz faol!",
    walletVoucherDesc: "Istalgan Premium obunani tanlang (3 oy, 6 oy yoki 1 yil) va 20 000 so'm chegirmadan foydalaning.",
    walletTariffsTitle: 'Tariflar va VIP Obuna',
    walletTariffsDesc: 'Barcha imkoniyatlar va testlar to\'liq ochiladi',
    walletP2PTitle: "Hisobni to'ldirish (P2P o'tkazma)",
    walletP2PDesc: "Rasmiy kartaga to'lov qiling va chekni yuklang. AI darhol tekshiradi.",
    walletCardNumberLabel: "To'lov uchun karta:",
    walletCardHolderLabel: 'Karta egasi:',
    walletZeroCommission: '0% Komissiya',
    walletCopyCardBtn: 'Karta raqamini nusxalash',
    walletCardCopied: 'Nusxalandi!',
    walletUploadReceiptTitle: "To'lov chekini yuklash",
    walletUploadReceiptDesc: "Click, Payme yoki bank ilovasidan olingan to'lov cheki rasmini tanlang",
    walletSendReceiptBtn: 'Kvitansiyani yuborish',
    walletChooseReceiptFile: 'Chek rasmini tanlash',
    walletReceiptFileSelected: 'Chek tanlandi',
  },

  ru: {
    appName: 'YuksalQuiz',
    tagline: 'Единая тестовая платформа для подготовки к вузам (HEMIS), международным сертификатам (IELTS, TOPIK, SAT) и школьным предметам!',
    onboardingTitle: 'Создайте профиль студента',
    onboardingSubtitle: 'Введите ваши данные для рейтинга и аналитики',
    onboardingDesc: 'Единая тестовая платформа для подготовки к вузам (HEMIS), международным сертификатам (IELTS, TOPIK, SAT) и школьным предметам!',
    firstName: 'Имя',
    lastName: 'Фамилия',
    region: 'Регион',
    birthDate: 'Дата рождения',
    gender: 'Пол',
    genderMale: 'Мужской',
    genderFemale: 'Женский',
    studyType: 'Форма обучения',
    studyKunduzgi: 'Дневное',
    studySirtqi: 'Заочное',
    studyKechki: 'Вечернее',
    studyTibbiyot: 'Медицинское',
    academicYear: 'Курс обучения',
    courseUnit: ' курс',
    selectAvatar: 'Выберите аватар',
    customAvatarsCount: '10 уникальных аватаров',
    ofertaConsent: 'Я принимаю условия Публичной оферты (Виртуальный ваучер и бонусы не подлежат выводу на карту)',
    ofertaLink: 'Публичная оферта',
    completeRegistration: 'Завершить регистрацию',
    studentStatus: 'Ваш статус:',
    statusStudent: '🎓 Студент вуза',
    statusNotStudent: '📚 Не студент',
    statusNotStudentSub: 'Школа, абитуриент или другое',
    selectUniError: 'Пожалуйста, выберите вуз из списка',
    nonStudentNote: 'Все тесты по международным сертификатам, абитуриентам и школьным предметам открыты для вас! 🚀',
    saveProfile: 'Сохранить',
    editProfile: 'Редактировать',
    cancel: 'Отмена',

    greeting: 'Здравствуйте,',
    dailyBonusTitle: 'Ежедневный бонус',
    dailyBonusDesc: 'Заходите каждый день и получайте +1 монету!',
    claimDailyBonus: 'Забрать (+1)',
    claimedToday: 'Получено сегодня',
    activeVoucherTitle: 'Ваш ваучер на 20 000 сум активен!',
    activeVoucherDesc: 'Используйте скидку 20 000 сум на любой план подписки',
    activateOfferBtn: 'Смотреть подписку',
    coins: 'Монеты',
    streak: 'Дней подряд',
    testsCompleted: 'Пройдено',
    quickTest: 'Быстрый тест',
    myProgress: 'Мой прогресс',

    navHome: 'Главная',
    navTests: 'Тесты',
    navRating: 'Рейтинг',
    navWallet: 'Кошелек',
    navProfile: 'Профиль',

    catHemis: 'Высшее образование (HEMIS)',
    catCenter: 'Учебные центры',
    catCert: 'Международные сертификаты',
    catApplicant: 'Абитуриент',
    catSchool: 'Школа',
    allCategories: 'Все',
    searchPlaceholder: 'Поиск по названию теста или предмета...',
    emptyCategoryTitle: 'В этом разделе пока нет тестов',
    emptyCategoryDesc: 'Создайте тест первым и получайте +100 сум за каждое прохождение!',
    createTestBtn: 'Создать тест',

    questionCounter: 'Вопрос:',
    timeRemaining: 'Время:',
    finishTest: 'Завершить тест',
    testCompleted: 'Тест завершен!',
    correctAnswers: 'Правильные ответы:',
    wrongAnswers: 'Неправильные ответы:',
    totalScore: 'Итоговый балл:',
    earnedCoins: 'Заработано монет:',
    reviewAnswers: 'Разбор ответов',
    retakeTest: 'Пройти снова',
    backToTests: 'К списку тестов',

    enterPasswordTitle: 'Закрытый тест',
    enterPasswordPrompt: 'Введите пароль для доступа к тесту (например: TGFU2026)',
    passwordPlaceholder: 'Введите пароль...',
    unlockBtn: 'Войти',
    wrongPassword: 'Неверный пароль! Попробуйте снова.',

    walletTitle: 'Кошелек студента',
    walletSubtitle: 'Баланс, тарифы и быстрая оплата',
    internalBalance: 'Баланс кошелька',
    voucherBalance: 'Баланс ваучера',
    authorEarnings: 'Доход автора',
    guardrailNoticeTitle: 'Внимание:',
    guardrailNoticeText: 'Ваучеры и бонусы используются только внутри приложения для активации подписок. Вывод на банковскую карту невозможен.',
    sub6Months: 'Подписка на 6 месяцев',
    sub1Year: 'Подписка на 1 год',
    sub6MonthsDesc: 'Полный доступ к выбранным тестам HEMIS и сертификатам',
    sub1YearDesc: 'Годовой неограниченный доступ ко всем тестам вузов и сертификатам',
    voucherApplied: 'Сэкономлено 20 000 сум по ваучеру',
    activateSub: 'Активировать',
    referralTitle: 'Реферальная программа',
    referralSubtitle: '+1 500 сум за каждого приглашенного студента',
    referralBtn: 'Пригласить друзей (+1 500 сум)',
    copyLink: 'Скопировать',
    linkCopied: 'Ссылка скопирована!',
    invitedFriends: 'Приглашено друзей',
    referralEarnings: 'Заработано на рефералах',
    topUpBtn: "Пополнить баланс",
    topUpModalTitle: "Пополнение счета",
    topUpModalDesc: "Выберите нужную сумму и пополните счет через удобную платежную систему",
    selectAmount: "Выберите сумму пополнения:",
    customAmountPlaceholder: "Другая сумма (сум)...",
    paymentMethod: "Выберите способ оплаты:",
    payBtn: "Пополнить счет",
    insufficientBalanceShort: "Недостаточно средств",
    neededAmount: "Еще требуется:",

    bulkCreateTitle: 'Массовое создание тестов (Парсер)',
    bulkCreateDesc: 'Вставьте банк вопросов в специальном формате, система автоматически разделит их на блоки по 25',
    pasteLabel: 'Вставьте текст теста (с разделителями ==== и ++++):',
    parseBtn: 'Анализировать текст (Parse)',
    parsedQuestionsCount: 'вопросов успешно распознано',
    savePackageBtn: 'Сохранить пакет тестов',
    fieldRequired: "Пожалуйста, заполните это поле",
    createTestModalTitle: "Создание нового сборника тестов",
    createTestModalDesc: "Создавайте тесты, становитесь автором и зарабатывайте +100 сум за каждое прохождение",
    categoryLabel: "Категория (Направление):",
    testTitleLabel: "Название предмета / теста:",
    universityLabel: "Университет (ВУЗ):",
    customUniPlaceholder: "Введите полное название нового вуза...",
    departmentLabel: "Направление / Кафедра:",
    accessLabel: "Права доступа:",
    publicAccess: "Открытый",
    privateAccess: "Закрытый",
    testPasswordLabel: "Секретный пароль теста:",
    testPasswordPlaceholder: "Введите пароль для студентов (напр: TGFU2026)",
    authorRewardNotice: "Каждые 25 вопросов автоматически делятся на блоки. Автор получает +100 сум за каждое прохождение.",
    inputModeManual: "По одному вопросу",
    inputModeBulk: "Массовая вставка (Bulk)",
    bulkPlaceholder: "Текст вопроса\n====\n#Правильный ответ\n====\nНеправильный вариант 1\n====\nНеправильный вариант 2\n====\nНеправильный вариант 3\n++++\n\nСледующий вопрос...\n====\n#Правильный ответ\n====\nВариант 2\n++++",
    addQuestionBtn: "Добавить еще вопрос",
    publishTestBtn: "Опубликовать сборник тестов",
    questionNumber: "Вопрос",
    previousBtn: "Предыдущий",
    nextBtn: "Следующий",
    totalTime: "Общее время",

    // Rank Titles
    rankMaster: 'Мастер Юксалиш',
    rankScholar: 'Эрудированный студент',
    rankActive: 'Активный исследователь',
    rankBeginner: 'Начинающий студент',

    // HomeDashboard
    allTestsFreeTitle: 'Все тесты на 100% бесплатны!',
    allTestsFreeDesc: 'Тренируйтесь по предметам и экзаменационным блокам свободно',
    practiceBtn: 'Тренироваться',
    unlimitedBadge: 'Без ограничений',
    recommendedTests: 'Рекомендуемые тесты',
    all: 'Все',
    start: 'Начать',
    questionsCount: 'вопр.',
    blocksCount: 'бл.',
    mistakesTitle: 'Работа над ошибками',
    mistakesDesc: 'Повторите вопросы, в которых были допущены ошибки',
    testCategoriesPractice: 'Практика по вузам и предметам',
    bulkParserDesc: 'Добавьте свой тест из файла или текста',
    dailyBonusAlreadyClaimed: 'Сегодняшний бонус уже получен. Заходите завтра!',
    dailyBonusClaimedSuccess: 'Поздравляем! +1 монета добавлена на ваш счет',

    // TestList & Sequential Blocks
    refreshTestsFromCloud: 'Обновить тесты из облака',
    allTestsTab: 'Все тесты',
    myTestsTab: 'Мои тесты',
    allUnis: 'Все ВУЗы',
    myUni: 'Мой ВУЗ',
    communityTestBadge: 'Тест сообщества',
    myTestBadge: 'Ваш тест',
    authorLabel: 'Автор',
    editBtn: 'Редактировать',
    deleteBtn: 'Удалить',
    testBlocksLabel: 'Блоки тестов:',
    lockedStatus: 'Заблокировано',
    bestScoreLabel: 'Лучший:',
    pointsLabel: 'баллов',
    deleteTestModalTitle: 'Удалить тест',
    deleteTestModalPrompt: 'Вы действительно хотите удалить этот тест? Это действие нельзя отменить.',
    deleteConfirmBtn: 'Да, удалить',
    deletingStatus: 'Удаление...',
    understandBtn: 'Понятно',
    myTestsEmptyTitle: 'Вы еще не создали ни одного теста',
    myTestsEmptyDesc: 'Создайте новый тест для себя или группы и делитесь со студентами.',

    // Leaderboard
    leaderboardSubtitle: 'Самые активные знатоки по ВУЗам, регионам и Узбекистану',
    rankPlace: '-е место',
    correctAnswersShort: 'правильных',
    youAreLeading: 'Вы лидер! Удерживайте 1-е место',
    nextRankAccReq: 'Для следующего места нужно +{count}% точности или лучшее время',
    nextRankPointsReq: 'Для следующего места нужно еще {count} баллов',
    scopeUnis: 'ВУЗы',
    scopeRegion: 'Регион',
    scopeUzbekistan: 'Узбекистан',
    metricPoints: 'Рейтинговые баллы',
    metricAccuracySpeed: '% и Скорость',
    metricWeekly: 'Активность',
    accuracyLabel: 'точность',
    studentsUnit: 'студентов',
    activeParticipants: 'активных участников',
    fromStudents: 'от студентов',
    noUniRankingYet: 'Рейтинг ВУЗов пока не сформирован',
    noUniRankingDesc: 'Рейтинг очищен от фиктивных данных. Как только студенты начнут проходить тесты, их вузы займут достойные места.',
    unisAndCentersRanking: 'Рейтинг вузов и учебных центров',
    institutionsCount: 'учреждений',
    fromStudentsCount: 'от студентов',
    hoursShort: 'ч',
    emptyUnisTitle: 'Рейтинг ВУЗов пока не сформирован',
    emptyUnisDesc: 'Рейтинг очищен от фиктивных данных. Как только студенты начнут проходить тесты, их вузы займут достойные места.',
    unisRankingTitle: 'Рейтинг вузов и учебных центров',
    unisCountLabel: 'учреждений',
    allUnisListTitle: 'Все ВУЗы и Центры (4–{count} места)',
    activeStudentsLabel: 'активных студентов',
    emptyStudentsTitle: 'Рейтинг пока пуст',
    emptyStudentsDesc: 'Пройдите первый тест и попадите в рейтинг.',
    allStudentsListTitle: 'Все участники (4–20 места)',
    youBadge: 'Вы',
    daysUnit: 'дн',
    registeredDateLabel: 'Дата регистрации',
    totalTimeSpent: 'Затраченное время',
    nextRankGoalText: 'Для перехода на следующее место осталось {count} тестов',
    targetRankGoalText: 'Для выхода на {rank}-е место осталось {count} правильных тестов',
    top20Badge: 'ТОП 20',
    top20Subtitle: '20 лучших знатоков с наивысшими результатами',
    studentsRatingTab: 'Рейтинг студентов',
    universitiesRatingTab: 'Рейтинг ВУЗов',
    scopeUzbekistanShort: 'Республика',
    scopeRegionShort: 'Регион',
    scopeOtmShort: 'Мой ВУЗ',
    testsCountSuffix: 'тестов',
    uzbekistanCountry: 'Узбекистан',

    // Profile
    profileTitle: 'Профиль студента',
    profileSubtitle: 'Личные данные и настройки безопасности',
    securityVerified: 'Безопасность профиля подтверждена (Anti-Tamper SHA-256)',
    freeModeTitle: '100% Бесплатный режим обучения',
    freeModeDesc: 'Все экзамены и тесты открыты без ограничений',
    activeStatus: 'Активен',
    myResultsCardTitle: 'Мои результаты и аналитика',
    myResultsCardDesc: 'Решенные тесты, работа над ошибками и статистика',
    viewBtn: 'Смотреть',
    offerCardTitle: 'Договор Публичной оферты',
    offerCardDesc: 'Правила пользователя и условия ваучера',
    readBtn: 'Читать',
    adminLoginBtn: 'Вход в панель администратора',
    adminControlPanel: 'Панель управления →',
    editDataTitle: 'Изменение данных',
    updateAvatarLabel: 'Обновить аватар:',
    nameLabel: 'Имя:',
    surnameLabel: 'Фамилия:',
    regionLabel: 'Регион:',
    uniLabel: 'ВУЗ / Учебное заведение:',
    studyTypeLabel: 'Форма обучения:',
    courseLabel: 'Курс:',
    saveChangesBtn: 'Сохранить изменения',
    officialVersion: 'YuksalQuiz v1.0 • Официальная версия',
    editProfileBtn: 'Редактировать профиль',

    // TestRunner
    confirmExitTitle: 'Выйти из теста?',
    confirmExitDesc: 'Текущие результаты не сохранятся, и тест будет отменен.',
    continueBtn: 'Продолжить',
    exitBtn: 'Выйти',

    // SearchableUniversitySelect
    selectUniPlaceholder: 'Выберите ВУЗ...',
    selectUniModalTitle: 'Выберите ВУЗ',
    alphabeticalOrderDesc: 'Сортировка по алфавиту',
    searchUniInputPlaceholder: 'Название ВУЗа или аббревиатура (напр: TATU, SamDU, TDIU)...',
    addCustomUniPrompt: '+ Новый ВУЗ (если нет в списке)',
    uniNotFound: 'ВУЗ не найден',
    uniNotFoundTip: 'Попробуйте изменить запрос или добавьте как новый ВУЗ.',
    addAsCustomBtn: 'Добавить как новый ВУЗ',
    retryBtn: 'Повторить попытку',
    networkErrorNotice: 'Соединение с интернетом потеряно или сервер не отвечает',
    emptyDatabasePrompt: 'Пока нет тестов. Создайте новый тест!',
    settingsTitle: 'Настройки',
    soundEffectsTitle: 'Звуковые эффекты',
    soundEffectsDesc: 'Звуки правильных и неверных ответов',
    vibrationTitle: 'Вибрация',
    vibrationDesc: 'Тактильный отклик Telegram WebApp',

    semesterLabel: 'Семестр',
    academicYearLabel: 'Учебный год',
    allSemesters: 'Все семестры',
    allAcademicYears: 'Все учебные годы',
    filterBySemester: 'По семестрам',
    filterByAcademicYear: 'По учебным годам',
    semesterSelectPlaceholder: 'Выберите семестр',
    academicYearSelectPlaceholder: 'Выберите учебный год',
    paywallLimitReachedTitle: 'Дневной бесплатный лимит исчерпан',
    paywallLimitReachedDesc: 'Вы прошли этот тест сегодня 1 раз бесплатно. Пополните баланс для безлимитного доступа ко всем тестам без ограничений.',
    paywallTopUpBtn: 'Пополнить баланс',
    paywallBackBtn: 'Вернуться назад',

    // Settings & Language & Theme
    languageTitle: 'Язык приложения',
    languageDesc: 'Выберите язык интерфейса и тестов',
    langUz: "O'zbekcha",
    langRu: 'Русский',
    langEn: 'English',
    themeTitle: 'Тема оформления',
    themeDesc: 'Светлый или темный режим',
    themeLight: 'Светлая (Дневная)',
    themeDark: 'Темная (Ночная)',

    // Onboarding Benefits
    onboardingVoucherBenefit: 'Возможность бесплатно сдавать 1 тест каждый день',
    onboardingPracticeBenefit: 'Возможность практиковаться по всем тестам и предметам',
    onboardingSecurityBenefit: 'Официальная Публичная оферта и защищенное хранилище',

    // Wallet
    walletBalanceTitle: 'Баланс кошелька',
    walletHistoryTitle: 'История',
    walletVoucherActiveBanner: 'Ваш стартовый ваучер на 20 000 сум активен!',
    walletVoucherDesc: 'Выберите любой Премиум тариф (3 месяца, 6 месяцев или 1 год) и получите скидку 20 000 сум.',
    walletTariffsTitle: 'Тарифы и VIP-подписка',
    walletTariffsDesc: 'Полный доступ ко всем тестам и расширенным возможностям',
    walletP2PTitle: 'Пополнение счета (P2P перевод)',
    walletP2PDesc: 'Оплатите на карту и прикрепите чек. AI проверит его автоматически.',
    walletCardNumberLabel: 'Карта для оплаты:',
    walletCardHolderLabel: 'Получатель:',
    walletZeroCommission: '0% Комиссия',
    walletCopyCardBtn: 'Скопировать номер карты',
    walletCardCopied: 'Скопировано!',
    walletUploadReceiptTitle: 'Загрузка чека об оплате',
    walletUploadReceiptDesc: 'Прикрепите скриншот или фото чека из Click, Payme или банка',
    walletSendReceiptBtn: 'Отправить квитанцию',
    walletChooseReceiptFile: 'Выбрать фото чека',
    walletReceiptFileSelected: 'Чек выбран',
  },

  en: {
    appName: 'YuksalQuiz',
    tagline: 'All-in-one test prep platform for universities (HEMIS), global certificates (IELTS, TOPIK, SAT), and school subjects!',
    onboardingTitle: 'Create Student Profile',
    onboardingSubtitle: 'Enter your academic details for leaderboard and analytics',
    onboardingDesc: 'All-in-one test prep platform for universities (HEMIS), global certificates (IELTS, TOPIK, SAT), and school subjects!',
    firstName: 'First Name',
    lastName: 'Last Name',
    region: 'Region',
    birthDate: 'Birth Date',
    gender: 'Gender',
    genderMale: 'Male',
    genderFemale: 'Female',
    studyType: 'Study Mode',
    studyKunduzgi: 'Full-time',
    studySirtqi: 'Part-time / Extramural',
    studyKechki: 'Evening',
    studyTibbiyot: 'Medical',
    academicYear: 'Academic Year',
    courseUnit: ' year',
    selectAvatar: 'Select Avatar',
    customAvatarsCount: '10 custom avatars',
    ofertaConsent: 'I agree to the Public Offer terms (Virtual vouchers and bonuses cannot be withdrawn to cards)',
    ofertaLink: 'Public Offer',
    completeRegistration: 'Complete Registration',
    studentStatus: 'Your status:',
    statusStudent: '🎓 University student',
    statusNotStudent: '📚 Not a student',
    statusNotStudentSub: 'School, applicant or other',
    selectUniError: 'Please select a university from the list',
    nonStudentNote: 'All international certificate, applicant, and school subject tests are open for you! 🚀',
    saveProfile: 'Save',
    editProfile: 'Edit',
    cancel: 'Cancel',

    greeting: 'Welcome,',
    dailyBonusTitle: 'Daily Streak Bonus',
    dailyBonusDesc: 'Open the app daily and collect +1 bonus coin!',
    claimDailyBonus: 'Claim (+1)',
    claimedToday: 'Claimed today',
    activeVoucherTitle: 'Your 20,000 UZS Voucher is Active!',
    activeVoucherDesc: 'Use your 20,000 UZS voucher discount on any subscription plan',
    activateOfferBtn: 'View Subscription',
    coins: 'Coins',
    streak: 'Day Streak',
    testsCompleted: 'Solved',
    quickTest: 'Quick Test',
    myProgress: 'My Progress',

    navHome: 'Home',
    navTests: 'Tests',
    navRating: 'Leaderboard',
    navWallet: 'Wallet',
    navProfile: 'Profile',

    catHemis: 'Higher Education (HEMIS)',
    catCenter: 'Learning Centers',
    catCert: 'Global Certificates',
    catApplicant: 'University Applicants',
    catSchool: 'School Subjects',
    allCategories: 'All',
    searchPlaceholder: 'Search tests or subjects...',
    emptyCategoryTitle: 'No tests available in this category yet',
    emptyCategoryDesc: 'Be the first to publish a test and earn +100 UZS per completion!',
    createTestBtn: 'Create Test',

    questionCounter: 'Question:',
    timeRemaining: 'Time:',
    finishTest: 'Finish Test',
    testCompleted: 'Test Completed!',
    correctAnswers: 'Correct answers:',
    wrongAnswers: 'Wrong answers:',
    totalScore: 'Total score:',
    earnedCoins: 'Coins earned:',
    reviewAnswers: 'Review Answers',
    retakeTest: 'Retake Test',
    backToTests: 'Back to Tests',

    enterPasswordTitle: 'Protected Test',
    enterPasswordPrompt: 'Enter the access passcode for this test (e.g., TGFU2026)',
    passwordPlaceholder: 'Enter passcode...',
    unlockBtn: 'Unlock',
    wrongPassword: 'Incorrect password! Please try again.',

    walletTitle: 'Student Wallet',
    walletSubtitle: 'Balance, plans and quick payment',
    internalBalance: 'Wallet Balance',
    voucherBalance: 'Voucher Balance',
    authorEarnings: 'Author Earnings',
    guardrailNoticeTitle: 'Notice:',
    guardrailNoticeText: 'In-app vouchers and bonuses are strictly used for subscription activations. Card withdrawals are unavailable.',
    sub6Months: '6-Month Premium Access',
    sub1Year: '1-Year Premium Access',
    sub6MonthsDesc: 'Full access to chosen HEMIS and certificate mock questions',
    sub1YearDesc: 'One-year guaranteed access to all new university and exam modules',
    voucherApplied: '20,000 UZS voucher saved',
    activateSub: 'Activate',
    referralTitle: 'Student Referral Program',
    referralSubtitle: '+1,500 UZS for each invited student',
    referralBtn: 'Invite Friends (+1,500 UZS)',
    copyLink: 'Copy Link',
    linkCopied: 'Link copied to clipboard!',
    invitedFriends: 'Invited friends count',
    referralEarnings: 'Earned from referrals',
    topUpBtn: 'Top Up Balance',
    topUpModalTitle: 'Top Up Account',
    topUpModalDesc: 'Select an amount and top up your account via convenient payment methods',
    selectAmount: 'Select top-up amount:',
    customAmountPlaceholder: 'Custom amount (UZS)...',
    paymentMethod: 'Select payment method:',
    payBtn: 'Top Up Account',
    insufficientBalanceShort: 'Insufficient funds',
    neededAmount: 'Needed more:',

    bulkCreateTitle: 'Bulk Test Creator (Parser)',
    bulkCreateDesc: 'Paste questions with custom delimiters; the system automatically segments banks > 25 into blocks',
    pasteLabel: 'Paste text with ==== and ++++ delimiters:',
    parseBtn: 'Parse Text',
    parsedQuestionsCount: 'questions identified successfully',
    savePackageBtn: 'Save Test Package',
    fieldRequired: "Please fill out this field",
    createTestModalTitle: "Create New Test Package",
    createTestModalDesc: "Create tests, become an author and earn +100 UZS per completion",
    categoryLabel: "Category (Track):",
    testTitleLabel: "Subject / Test Title:",
    universityLabel: "University (HEI):",
    customUniPlaceholder: "Enter full name of the university...",
    departmentLabel: "Department / Field:",
    accessLabel: "Access Control:",
    publicAccess: "Public",
    privateAccess: "Protected",
    testPasswordLabel: "Secret Test Passcode:",
    testPasswordPlaceholder: "Enter passcode for students (e.g. TGFU2026)",
    authorRewardNotice: "Every 25 questions are automatically split into blocks. Author earns +100 UZS per full test completion.",
    inputModeManual: "Manual Entry",
    inputModeBulk: "Bulk Parser",
    bulkPlaceholder: "Question text\n====\n#Correct answer\n====\nWrong option 1\n====\nWrong option 2\n====\nWrong option 3\n++++\n\nNext question...\n====\n#Correct answer\n====\nOption 2\n++++",
    addQuestionBtn: "Add Another Question",
    publishTestBtn: "Publish Test Package",
    questionNumber: "Question",
    previousBtn: "Previous",
    nextBtn: "Next",
    totalTime: "Total Time",

    // Rank Titles
    rankMaster: 'Yuksalish Master',
    rankScholar: 'Proficient Scholar',
    rankActive: 'Active Explorer',
    rankBeginner: 'Novice Student',

    // HomeDashboard
    allTestsFreeTitle: 'All tests are 100% free!',
    allTestsFreeDesc: 'Practice subject and exam modules without limits',
    practiceBtn: 'Practice Now',
    unlimitedBadge: 'Unlimited',
    recommendedTests: 'Recommended Tests',
    all: 'All',
    start: 'Start',
    questionsCount: 'q.',
    blocksCount: 'blocks',
    mistakesTitle: 'Work on Mistakes',
    mistakesDesc: 'Review and retake questions with incorrect answers',
    testCategoriesPractice: 'Practice by university and subject',
    bulkParserDesc: 'Add your own test from a file or text',
    dailyBonusAlreadyClaimed: 'Today\'s bonus is already claimed. Check back tomorrow!',
    dailyBonusClaimedSuccess: 'Congratulations! +1 coin added to your account',

    // TestList & Sequential Blocks
    refreshTestsFromCloud: 'Refresh tests from cloud',
    allTestsTab: 'All Tests',
    myTestsTab: 'My Tests',
    allUnis: 'All Universities',
    myUni: 'My University',
    communityTestBadge: 'Community Test',
    myTestBadge: 'Your Test',
    authorLabel: 'Author',
    editBtn: 'Edit',
    deleteBtn: 'Delete',
    testBlocksLabel: 'Test Blocks:',
    lockedStatus: 'Locked',
    bestScoreLabel: 'Best:',
    pointsLabel: 'pts',
    deleteTestModalTitle: 'Delete Test',
    deleteTestModalPrompt: 'Are you sure you want to permanently delete this test? This action cannot be undone.',
    deleteConfirmBtn: 'Yes, Delete',
    deletingStatus: 'Deleting...',
    understandBtn: 'Understood',
    myTestsEmptyTitle: 'You have not created any tests yet',
    myTestsEmptyDesc: 'Create a test for yourself or study group and share it with peers.',

    // Leaderboard
    leaderboardSubtitle: 'Top academic achievers across Universities, Regions, and Uzbekistan',
    rankPlace: 'th Place',
    correctAnswersShort: 'correct',
    youAreLeading: 'You are the leader! Keep your spot',
    nextRankAccReq: 'Need +{count}% accuracy or faster time to reach next rank',
    nextRankPointsReq: 'Need {count} more points to reach next rank',
    scopeUnis: 'Universities',
    scopeRegion: 'Region',
    scopeUzbekistan: 'Uzbekistan',
    metricPoints: 'Rating Points',
    metricAccuracySpeed: 'Accuracy & Speed',
    metricWeekly: 'Weekly Active',
    accuracyLabel: 'accuracy',
    studentsUnit: 'students',
    activeParticipants: 'active participants',
    fromStudents: 'from students',
    noUniRankingYet: 'University ranking is not yet established',
    noUniRankingDesc: 'All test data has been verified. As students complete tests, their universities will appear here.',
    unisAndCentersRanking: 'Universities and Learning Centers Ranking',
    institutionsCount: 'institutions',
    fromStudentsCount: 'from students',
    hoursShort: 'h',
    emptyUnisTitle: 'University ranking is not yet established',
    emptyUnisDesc: 'All test data has been verified. As students complete tests, their universities will appear here.',
    unisRankingTitle: 'Universities and Learning Centers Ranking',
    unisCountLabel: 'institutions',
    allUnisListTitle: 'All Universities & Centers (4–{count} Place)',
    activeStudentsLabel: 'active students',
    emptyStudentsTitle: 'The leaderboard is empty',
    emptyStudentsDesc: 'Complete your first test to join the leaderboard.',
    allStudentsListTitle: 'All Participants (4–20 Place)',
    youBadge: 'You',
    daysUnit: 'd',
    registeredDateLabel: 'Joined date',
    totalTimeSpent: 'Time spent',
    nextRankGoalText: '{count} tests remaining to reach next rank',
    targetRankGoalText: '{count} correct tests remaining to reach rank {rank}',
    top20Badge: 'TOP 20',
    top20Subtitle: 'Top 20 achievers with the highest scores',
    studentsRatingTab: 'Students',
    universitiesRatingTab: 'Universities',
    scopeUzbekistanShort: 'Uzbekistan',
    scopeRegionShort: 'Region',
    scopeOtmShort: 'My University',
    testsCountSuffix: 'tests',
    uzbekistanCountry: 'Uzbekistan',

    // Profile
    profileTitle: 'Student Profile',
    profileSubtitle: 'Personal details and security settings',
    securityVerified: 'Profile verified (Anti-Tamper SHA-256)',
    freeModeTitle: '100% Free Learning Mode',
    freeModeDesc: 'All tests and exam modules are unrestricted',
    activeStatus: 'Active',
    myResultsCardTitle: 'My Results & Analytics',
    myResultsCardDesc: 'Completed tests, mistake practice, and statistics',
    viewBtn: 'View',
    offerCardTitle: 'Public Offer Agreement',
    offerCardDesc: 'User guidelines and voucher policy',
    readBtn: 'Read',
    adminLoginBtn: 'Admin Login',
    adminControlPanel: 'Control Panel →',
    editDataTitle: 'Edit Information',
    updateAvatarLabel: 'Update Avatar:',
    nameLabel: 'First Name:',
    surnameLabel: 'Last Name:',
    regionLabel: 'Region:',
    uniLabel: 'University / Institution:',
    studyTypeLabel: 'Study Mode:',
    courseLabel: 'Course Year:',
    saveChangesBtn: 'Save Changes',
    officialVersion: 'YuksalQuiz v1.0 • Official Release',
    editProfileBtn: 'Edit Profile',

    // TestRunner
    confirmExitTitle: 'Leave Test?',
    confirmExitDesc: 'Current test progress will be discarded.',
    continueBtn: 'Continue',
    exitBtn: 'Exit',

    // SearchableUniversitySelect
    selectUniPlaceholder: 'Select University...',
    selectUniModalTitle: 'Select University',
    alphabeticalOrderDesc: 'Sorted alphabetically',
    searchUniInputPlaceholder: 'University name or acronym (e.g., TATU, SamDU, TDIU)...',
    addCustomUniPrompt: '+ New University (if not in list)',
    uniNotFound: 'No university found',
    uniNotFoundTip: 'Try shortening your query or add it as a new university.',
    addAsCustomBtn: 'Add as New University',
    retryBtn: 'Retry',
    networkErrorNotice: 'Network connection lost or server not responding',
    emptyDatabasePrompt: 'No tests available yet. Create a new test!',
    settingsTitle: 'Settings',
    soundEffectsTitle: 'Sound Effects',
    soundEffectsDesc: 'Chimes and buzzers for answers',
    vibrationTitle: 'Vibration',
    vibrationDesc: 'Telegram WebApp tactile feedback',

    semesterLabel: 'Semester',
    academicYearLabel: 'Academic Year',
    allSemesters: 'All semesters',
    allAcademicYears: 'All academic years',
    filterBySemester: 'By semester',
    filterByAcademicYear: 'By academic year',
    semesterSelectPlaceholder: 'Select semester',
    academicYearSelectPlaceholder: 'Select academic year',
    paywallLimitReachedTitle: 'Daily Free Limit Reached',
    paywallLimitReachedDesc: 'You have taken this test 1 time for free today. Top up your balance to get unlimited access to all tests without daily limits.',
    paywallTopUpBtn: 'Top Up Balance',
    paywallBackBtn: 'Go Back',

    // Settings & Language & Theme
    languageTitle: 'App Language',
    languageDesc: 'Select interface and quiz language',
    langUz: "O'zbekcha",
    langRu: 'Русский',
    langEn: 'English',
    themeTitle: 'Theme Mode',
    themeDesc: 'Light or dark appearance',
    themeLight: 'Light (Day)',
    themeDark: 'Dark (Night)',

    // Onboarding Benefits
    onboardingVoucherBenefit: 'Opportunity to take 1 test for free every day',
    onboardingPracticeBenefit: 'Unlimited practice across all tests and subjects',
    onboardingSecurityBenefit: 'Official Public Offer and encrypted storage',

    // Wallet
    walletBalanceTitle: 'Wallet balance',
    walletHistoryTitle: 'History',
    walletVoucherActiveBanner: 'Your 20,000 UZS starter voucher is active!',
    walletVoucherDesc: 'Choose any Premium plan (3 months, 6 months or 1 year) and apply your 20,000 UZS discount.',
    walletTariffsTitle: 'Plans & VIP Subscription',
    walletTariffsDesc: 'Unlock all tests and premium features',
    walletP2PTitle: 'Top Up Balance (P2P Transfer)',
    walletP2PDesc: 'Transfer to official card and upload receipt. AI verifies automatically.',
    walletCardNumberLabel: 'Card for payment:',
    walletCardHolderLabel: 'Account holder:',
    walletZeroCommission: '0% Fee',
    walletCopyCardBtn: 'Copy card number',
    walletCardCopied: 'Copied!',
    walletUploadReceiptTitle: 'Upload payment receipt',
    walletUploadReceiptDesc: 'Attach receipt screenshot from Click, Payme or bank app',
    walletSendReceiptBtn: 'Submit receipt',
    walletChooseReceiptFile: 'Choose receipt image',
    walletReceiptFileSelected: 'Receipt selected',
  },
};
