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

export type StudyType = 'Kunduzgi' | 'Sirtqi' | 'Kechki';
export type AcademicYear = 1 | 2 | 3 | 4;
export type Gender = 'male' | 'female';

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
  birthDate: string;
  gender: Gender;
  studyType: StudyType;
  academicYear: AcademicYear;
  avatar: string;
  coins: number;
  streak: number;
  lastLoginDate: string;
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
  isCurrentUser?: boolean;
}

export type TabType = 'home' | 'tests' | 'results' | 'leaderboard' | 'profile' | 'wallet';
