export type Region =
  | 'Toshkent shahri'
  | 'Toshkent viloyati'
  | 'Andijon'
  | 'Buxoro'
  | 'Farg\'ona'
  | 'Jizzax'
  | 'Xorazm'
  | 'Namangan'
  | 'Navoiy'
  | 'Qashqadaryo'
  | 'Samarqand'
  | 'Sirdaryo'
  | 'Surxondaryo'
  | 'Qoraqalpog\'iston';

export const UZBEKISTAN_REGIONS: Region[] = [
  'Toshkent shahri',
  'Toshkent viloyati',
  'Andijon',
  'Buxoro',
  'Farg\'ona',
  'Jizzax',
  'Xorazm',
  'Namangan',
  'Navoiy',
  'Qashqadaryo',
  'Samarqand',
  'Sirdaryo',
  'Surxondaryo',
  'Qoraqalpog\'iston',
];

export type StudyType = 'Kunduzgi' | 'Sirtqi' | 'Kechki' | 'Masofaviy' | 'Tibbiyot';
export type AcademicYear = 1 | 2 | 3 | 4 | 5 | 6;
export type Gender = 'male' | 'female';

export function getAvailableAcademicYears(studyType: StudyType): AcademicYear[] {
  switch (studyType) {
    case 'Sirtqi':
      return [1, 2, 3, 4, 5];
    case 'Tibbiyot':
      return [1, 2, 3, 4, 5, 6];
    case 'Kunduzgi':
    case 'Kechki':
    case 'Masofaviy':
    default:
      return [1, 2, 3, 4];
  }
}

export function getAvailableSemesters(studyType: StudyType): number[] {
  switch (studyType) {
    case 'Sirtqi':
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    case 'Tibbiyot':
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    case 'Kunduzgi':
    case 'Kechki':
    case 'Masofaviy':
    default:
      return [1, 2, 3, 4, 5, 6, 7, 8];
  }
}

export type MainCategory =
  | 'Oliy Ta\'lim (HEMIS)'
  | 'O\'quv Markazi'
  | 'Xalqaro Sertifikatlar (IELTS, TOPIK, SAT, TOEFL)'
  | 'Abituriyent'
  | 'Maktab';

export const MAIN_CATEGORIES: MainCategory[] = [
  'Oliy Ta\'lim (HEMIS)',
  'O\'quv Markazi',
  'Xalqaro Sertifikatlar (IELTS, TOPIK, SAT, TOEFL)',
  'Abituriyent',
  'Maktab',
];

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  region: Region;
  university?: string;
  birthDate: string;
  gender: Gender;
  studyType: StudyType;
  academicYear: AcademicYear;
  avatar: string;
  coins: number;
  streak: number;
  lastLoginDate: string;
  lastClaimedDailyDate?: string;
  completedTestsCount: number;
  isRegistered: boolean;
  acceptedOferta: boolean;
  walletBalance: number; // Internal UZS balance (author credits, referral bonuses)
  balance?: number; // Alias for walletBalance
  telegram_id?: string;
  telegramId?: string;
  voucherBalance: number; // 20 000 UZS starting voucher for any subscription
  authorEarnings: number; // Total UZS earned from created tests (+100 UZS per completion)
  referralCount: number;
  subscriptionPlan?: 'none' | '3_months' | '6_months' | '1_year';
  subscriptionExpiry?: string;
  subscriptionTier?: 'none' | '3_months' | '6_months' | '1_year' | string;
  subscriptionEnd?: string;
  isSubscribed?: boolean;
  has_paid?: boolean;
  paid_until?: string;
  registeredAt?: string;
  checksum?: string;
  username?: string;
  is_blocked?: boolean;
  isBlocked?: boolean;
  voucher_claimed?: boolean;
  voucherClaimed?: boolean;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}

export interface TestBlock {
  id: string;
  blockNumber: number;
  title: string; // e.g. "Test 1", "Test 2"
  questions: Question[];
  passingScore: number; // e.g. 18 out of 25 (or 70%)
  isLocked: boolean;
  bestScore?: number;
  isPassed?: boolean;
  semester?: number;
  academicYear?: string;
}

export type DepartmentType =
  | 'Iqtisodiyot va Moliya'
  | 'Menejment va Boshqaruv'
  | 'Marketing va Savdo'
  | 'Axborot Texnologiyalari'
  | 'Tibbiyot va Farmatsevtika'
  | 'Gumanitar va Xorijiy tillar'
  | 'Huquqshunoslik'
  | 'Muhandislik va Texnika'
  | 'Pedagogika va Psixologiya'
  | 'Aniq va Tabiiy fanlar';

export const DEPARTMENTS: DepartmentType[] = [
  'Iqtisodiyot va Moliya',
  'Menejment va Boshqaruv',
  'Marketing va Savdo',
  'Axborot Texnologiyalari',
  'Tibbiyot va Farmatsevtika',
  'Gumanitar va Xorijiy tillar',
  'Huquqshunoslik',
  'Muhandislik va Texnika',
  'Pedagogika va Psixologiya',
  'Aniq va Tabiiy fanlar',
];

export const TOP_UNIVERSITIES = [
  "Abu Ali Ibn Sino nomidagi Buxoro Davlat Tibbiyot Instituti (BuxDTI)",
  "Abu Rayhon Beruniy nomidagi Urganch Davlat Universiteti (UrDU)",
  "Ajiniyoz nomidagi Nukus Davlat Pedagogika Instituti",
  "Alfraganus Universiteti (Alfraganus University)",
  "Alisher Navoiy nomidagi Toshkent davlat o'zbek tili va adabiyoti universiteti",
  "Amity Universiteti Toshkent",
  "Andijon Davlat Pedagogika Instituti",
  "Andijon Davlat Tibbiyot Instituti (ADTI)",
  "Andijon Davlat Chet Tillari Instituti",
  "Andijon Iqtisodiyot va Qurilish Instituti",
  "Andijon Mashinasozlik Instituti (AndMI)",
  "Andijon Qishloq Xo'jaligi va Agrotexnologiyalar Instituti",
  "Angren Universiteti",
  "Berdaq nomidagi Qoraqalpoq Davlat Universiteti (QDU)",
  "Britaniya Menejment Universiteti (BMU)",
  "Buxoro Davlat Pedagogika Instituti",
  "Buxoro Davlat Universiteti (BuxDU)",
  "Buxoro Innovatsiyalar Universiteti",
  "Buxoro Muhandislik-Texnologiya Instituti (BMTI)",
  "Buxoro Tabiiy Resurslarni Boshqarish Instituti",
  "Cambridge International University",
  "Central Asian University (CAU / sobiq Akfa Universiteti)",
  "Davlat Soliq Qo'mitasi huzuridagi Fiskal Institut",
  "Denov Tadbirkorlik va Pedagogika Instituti",
  "EMU Universiteti (European Medical University)",
  "Farg'ona Davlat Universiteti (FarDU)",
  "Farg'ona Jamoat Salomatligi Tibbiyot Instituti",
  "Farg'ona Politexnika Instituti (FarPI)",
  "G.V. Plexanov nomidagi REU Toshkent filiali",
  "Geologiya Fanlari Universiteti",
  "Guliston Davlat Pedagogika Instituti",
  "Guliston Davlat Universiteti (GulDU)",
  "Huquqni Muhofaza Qilish Akademiyasi",
  "I.M. Gubkin nomidagi Rossiya Davlat Neft va Gaz Universiteti filiali",
  "Impuls Tibbiyot Instituti",
  "Ipak yo'li' turizm va madaniy meros xalqaro universiteti",
  "Iqtisodiyot va Pedagogika Universiteti (UEP)",
  "Islom Karimov nomidagi Toshkent davlat texnika universiteti (TDTU)",
  "IT Park Universiteti",
  "Jahon Iqtisodiyoti va Diplomatiya Universiteti (JIDU)",
  "Jamoat Xavfsizligi Universiteti",
  "Jizzax Davlat Pedagogika Universiteti (JDPU)",
  "Jizzax Politexnika Instituti (JPI)",
  "Jizzax Xalqaro Universiteti",
  "Kamoliddin Behzod nomidagi Milliy rassomlik va dizayn instituti",
  "Koreya Xalqaro Universiteti (KIUF Farg'ona)",
  "M.V. Lomonosov nomidagi MGU Toshkent filiali",
  "MEPhI Milliy Tadqiqot Yadro Universiteti Toshkent filiali",
  "MGIMO Toshkent filiali",
  "Millat Umidi Universiteti",
  "Muhammad al-Xorazmiy nomidagi Toshkent axborot texnologiyalari universiteti (TATU)",
  "Namangan Davlat Pedagogika Instituti",
  "Namangan Davlat Universiteti (NamDU)",
  "Namangan Davlat Chet Tillari Instituti",
  "Namangan Muhandislik-Qurilish Instituti (NamMQI)",
  "Namangan Muhandislik-Texnologiya Instituti (NamMTI)",
  "Namangan To'qimachilik Sanoati Instituti",
  "Navoiy Davlat Konchilik va Texnologiyalar Universiteti (NDKTU)",
  "Navoiy Davlat Pedagogika Instituti",
  "Nizomiy nomidagi Toshkent davlat pedagogika universiteti (TDPU)",
  "Nordic International University (Shimoliy Xalqaro Universiteti)",
  "Osiyo Xalqaro Universiteti (Buxoro)",
  "Oxus Universiteti (Oxus University)",
  "Oziq-ovqat Texnologiyasi va Muhandisligi Xalqaro Instituti",
  "PDP Universiteti (PDP University)",
  "ProUni (Professional University)",
  "Puchon Universiteti (BUT)",
  "Qarshi Davlat Universiteti (QarDU)",
  "Qarshi Irrigatsiya va Agrotexnologiyalar Instituti",
  "Qarshi Muhandislik-Iqtisodiyot Instituti (QMII)",
  "Qoraqalpog'iston Qishloq Xo'jaligi va Agrotexnologiyalar Instituti",
  "Qoraqalpog'iston Tibbiyot Instituti",
  "Qo'qon Davlat Pedagogika Instituti (QDPI)",
  "Qo'qon Universiteti (Kokand University)",
  "Renessans Ta'lim Universiteti (Renaissance University)",
  "Samarqand Davlat Arxitektura-Qurilish Universiteti (SamDAQU)",
  "Samarqand Davlat Tibbiyot Universiteti (SamDTU)",
  "Samarqand Davlat Veterinariya Meditsinasi Universiteti (SamDVMCHBU)",
  "Samarqand Davlat Chet Tillar Instituti (SamDCHTI)",
  "Samarqand Iqtisodiyot va Servis Instituti (SamISI)",
  "Singapur Menejmentni Rivojlantirish Instituti (MDIS Tashkent)",
  "STARS International University",
  "TEAM Universiteti",
  "Termiz Agrotexnologiyalar va Innovatsion Rivojlanish Instituti",
  "Termiz Davlat Pedagogika Instituti",
  "Termiz Davlat Universiteti (TerDU)",
  "Termiz Iqtisodiyot va Servis Universiteti",
  "TMC Instituti (TMC Institute)",
  "Toshkent Amaliy Fanlar Universiteti (UTAS)",
  "Toshkent Arxitektura-Qurilish Universiteti (TAQU)",
  "Toshkent Davlat Agrar Universiteti (TDAU)",
  "Toshkent Davlat Iqtisodiyot Universiteti (TDIU)",
  "Toshkent davlat stomatologiya instituti (TDSI)",
  "Toshkent Davlat Transport Universiteti (TDTU)",
  "Toshkent Davlat Yuridik Universiteti (TDYU)",
  "Toshkent davlat sharqshunoslik universiteti (TDSHU)",
  "Toshkent farmatsevtika instituti (ToshFI)",
  "Toshkent Gumanitar Fanlar Universiteti (TGFU)",
  "Toshkent irrigatsiya va qishloq xo'jaligini mexanizatsiyalash muhandislari instituti (TIQXMMI)",
  "Toshkent Kimyo Xalqaro Universiteti (KIUT / sobiq Yeoju)",
  "Toshkent Kimyo-Texnologiya Instituti (TKTI)",
  "Toshkent Moliya Instituti (TMI)",
  "Toshkent pediatriya tibbiyot instituti (ToshPTI)",
  "Toshkent Tibbiyot Akademiyasi (TMA)",
  "Toshkent To'qimachilik va Yengil Sanoat Instituti (TTYESI)",
  "Toshkent shahridagi Inha Universiteti (IUT)",
  "Toshkent shahridagi Xalqaro Vestminster Universiteti (WIUT)",
  "Turin Politexnika Universiteti (TTPU)",
  "Urganch Davlat Pedagogika Instituti",
  "Webster Universiteti (Toshkent va Samarqand)",
  "Yangi O'zbekiston Universiteti (New Uzbekistan University)",
  "Zahiriddin Muhammad Bobur nomidagi Andijon Davlat Universiteti (ADU)",
  "O'zbekiston Davlat Jahon Tillari Universiteti (O'zDJTU)",
  "O'zbekiston Davlat Jismoniy Tarbiya va Sport Universiteti",
  "O'zbekiston Davlat Konservatoriyasi",
  "O'zbekiston Davlat San'at va Madaniyat Instituti",
  "O'zbekiston Davlat Xoreografiya Akademiyasi",
  "O'zbekiston Jurnalistika va Ommaviy Kommunikatsiyalar Universiteti",
  "O'zbekiston Milliy Universiteti (O'zMU)",
  "O'zbekiston Xalqaro Islomshunoslik Akademiyasi",
  "O'zbekiston-Finlyandiya Pedagogika Instituti",
  "Shahrisabz Davlat Pedagogika Instituti",
  "Shahrisabz Innovatsion Universiteti",
  "Sharof Rashidov nomidagi Samarqand Davlat Universiteti (SamDU)",
  "Chirchiq Davlat Pedagogika Universiteti (CHDPU)",
];

export interface TestPackage {
  id: string;
  title: string;
  category: MainCategory;
  university: string;
  isCustomUniversity?: boolean;
  isPendingReview?: boolean;
  department: DepartmentType;
  isPublic: boolean;
  password?: string;
  totalQuestions: number;
  blocks: TestBlock[];
  createdAt: string;
  authorId: string;
  authorName: string;
  isCommunityCreated?: boolean;
  authorWalletBalance?: number;
  creator_id?: string | number;
  creatorId?: string | number;
  semester?: number;
  course_year?: number;
  courseYear?: number;
  faculty?: string;
  academicYear?: string;
  studyType?: StudyType;
  study_type?: StudyType;
}

export const AVAILABLE_SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export const AVAILABLE_ACADEMIC_YEARS = [
  '2023-2024',
  '2024-2025',
  '2025-2026',
  '2026-2027',
  '2027-2028',
] as const;

export interface UserAnswerRecord {
  questionId: string;
  questionText: string;
  options: string[];
  selectedOption: number;
  correctOptionIndex: number;
  isCorrect: boolean;
  explanation?: string;
}

export interface TestAttempt {
  id: string;
  testPackageId: string;
  testPackageTitle: string;
  university: string;
  department: string;
  blockId: string;
  blockTitle: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeSpentSeconds: number;
  completedAt: string;
  isPassed: boolean;
  userAnswers: UserAnswerRecord[];
}

export interface MistakeItem {
  id: string;
  question: Question;
  testPackageId: string;
  testPackageTitle: string;
  blockTitle: string;
  university: string;
  department: string;
  lastFailedAt: string;
  failCount: number;
}

export interface LeaderboardUser {
  id: string;
  name: string;
  region: Region;
  university: string;
  gender?: Gender;
  avatar: string;
  academicYear: AcademicYear;
  coins: number;
  testsCompleted: number;
  weeklyActiveHours: number;
  correctAnswersCount?: number;
  scorePoints?: number;
  bestTime?: string;
  bestTimeSeconds?: number;
  totalTimeSpentSeconds?: number;
  totalTimeSpentFormatted?: string;
  accuracyPercentage?: number;
  totalQuestionsAttempted?: number;
  registeredAt?: string;
  isCurrentUser?: boolean;
}

export type LeaderboardScope = 'otm' | 'region' | 'uzbekistan';

export interface UniversityLeaderboardEntry {
  id: string;
  name: string;
  shortName: string;
  type: 'otm' | 'center';
  region: string;
  activeStudentsCount: number;
  averageAccuracy: number;
  averageTime: string;
  averageTimeSeconds: number;
  totalCorrectAnswers: number;
  totalScorePoints?: number;
}

export type AnnouncementTargetType = 'all' | 'university' | 'region' | 'user';

export interface AnnouncementReply {
  id: string;
  announcementId: string;
  announcementTitle: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userUniversity?: string;
  userRegion?: string;
  message: string;
  date: string;
  time: string;
  adminReply?: {
    message: string;
    date: string;
    time: string;
    adminName: string;
  };
}

export interface SupportMessage {
  id: string;
  user_id: string;
  user_name?: string;
  user_username?: string;
  message: string;
  reply?: string;
  sender: 'user' | 'ai' | 'admin';
  status: 'resolved_by_ai' | 'forwarded_to_admin' | 'replied_by_admin';
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  link?: string;
  date: string;
  time?: string;
  tag?: 'yangilik' | 'eslatma' | 'muhim';
  targetType?: AnnouncementTargetType;
  targetValue?: string; // university name, region name, or user id/name
  targetLabel?: string; // e.g. "Barchaga", "TATU talabalari", "Farg'ona viloyati", etc.
  isRead?: boolean;
}

export type TabType = 'home' | 'tests' | 'results' | 'leaderboard' | 'profile' | 'wallet';

export type TransactionType = 'deposit' | 'voucher' | 'referral' | 'coin' | 'author_reward';

export interface WalletTransaction {
  id: string;
  type: TransactionType;
  title: string;
  amount: number;
  unit: 'so\'m' | 'tanga';
  isPositive: boolean;
  date: string;
}

export type SubscriptionPlanType = '3_months' | '6_months' | '1_year';

export interface SubscriptionPrices {
  '3_months': number;
  '6_months': number;
  '1_year': number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  details: string;
  instructions?: string;
  isActive: boolean;
}

export interface Promocode {
  code: string;
  amount: number; // Summa (so'm) - balansga qo'shiladigan mablag'
  plan?: SubscriptionPlanType; // Ixtiyoriy tarif tavsiyasi
  isUsed: boolean;
  usedBy?: string;
  createdAt: string;
}

export interface ReceiptPayment {
  id: string;
  user_id: string;
  amount: number;
  receipt_image_url?: string;
  transaction_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  notes?: string;
}

export interface ReceiptVerificationResult {
  ok: boolean;
  status: 'approved' | 'pending' | 'rejected';
  transactionId?: string;
  amount?: number;
  paidUntil?: string;
  plan?: SubscriptionPlanType;
  paymentSystem?: string;
  paymentId?: string;
  reason?: string;
  message: string;
}


