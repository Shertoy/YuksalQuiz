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
    walletSubtitle: 'Hamyon balansi, vaucherlar va ta\'limiy obunalar',
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
    walletSubtitle: 'Баланс кошелька, ваучеры и образовательные подписки',
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
    walletSubtitle: 'Wallet balance, vouchers, and educational plans',
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
  },
};
