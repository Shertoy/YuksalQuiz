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

export type StudyType = 'Kunduzgi' | 'Sirtqi' | 'Kechki' | 'Tibbiyot';
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
    default:
      return [1, 2, 3, 4];
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
  voucherBalance: number; // 35 000 UZS starting voucher
  authorEarnings: number; // Total UZS earned from created tests (+100 UZS per completion)
  referralCount: number;
  subscriptionPlan?: 'none' | '6_months' | '1_year';
  subscriptionExpiry?: string;
  checksum?: string;
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
  'O\'zbekiston Milliy Universiteti (O\'zMU)',
  'Toshkent Axborot Texnologiyalari Universiteti (TATU)',
  'Islom Karimov nomidagi TDTU',
  'Toshkent Davlat Iqtisodiyot Universiteti (TDIU)',
  'O\'zbekiston Davlat Jahon Tillari Universiteti (O\'zDJTU)',
  'Toshkent Tibbiyot Akademiyasi (TMA)',
  'Samarqand Davlat Universiteti (SamDU)',
  'Farg\'ona Davlat Universiteti (FarDU)',
  'Jahon Iqtisodiyoti va Diplomatiya Universiteti (JIDU)',
  'Toshkent Moliya Instituti (TMI)',
  'Toshkent Davlat Yuridik Universiteti (TDYU)',
  'Turin Politexnika Universiteti (TTPU)',
  'Inha Universiteti (IUT)',
  'Webster Universiteti',
  'Toshkent Kimyo Texnologiya Instituti (TKTI)',
  'Buxoro Davlat Universiteti (BuxDU)',
  'Andijon Davlat Universiteti (ADU)',
  'Urganch Davlat Universiteti (UrDU)',
  'Qoraqalpoq Davlat Universiteti (QDU)',
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
}

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
  avatar: string;
  academicYear: AcademicYear;
  coins: number;
  testsCompleted: number;
  weeklyActiveHours: number;
  correctAnswersCount?: number;
  bestTime?: string;
  bestTimeSeconds?: number;
  accuracyPercentage?: number;
  totalQuestionsAttempted?: number;
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

export interface Announcement {
  id: string;
  title: string;
  message: string;
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
