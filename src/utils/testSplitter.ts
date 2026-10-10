import { trNow } from '../i18n/useTranslation';
import { Question, TestBlock } from '../types';

/**
 * Calculates optimal splitting of questions into blocks of 20-25 questions.
 * Minimum target block size is 20, maximum target is 25.
 * E.g.:
 * - 150 questions -> 6 blocks of 25 ("Test 1", "Test 2", ... "Test 6")
 * - 110 questions -> 5 blocks of 22
 * - 25 questions -> 1 block of 25
 */
export function splitQuestionsIntoBlocks(questions: Question[]): TestBlock[] {
  const n = questions.length;
  if (n === 0) return [];

  if (n <= 25) {
    const passing = Math.max(1, Math.ceil(n * 0.7)); // 70% threshold
    return [
      {
        id: 'block-1',
        blockNumber: 1,
        title: 'Test 1',
        questions,
        passingScore: passing,
        isLocked: false,
      },
    ];
  }

  // Find optimal block count k
  // k_min: assuming max 25 per block
  // k_max: assuming min 20 per block
  const kMin = Math.ceil(n / 25);
  const kMax = Math.floor(n / 20);

  let numBlocks = kMin;
  if (kMin <= kMax) {
    // Check if any k in [kMin, kMax] divides n evenly
    let foundEven = false;
    for (let k = kMin; k <= kMax; k++) {
      if (n % k === 0) {
        numBlocks = k;
        foundEven = true;
        break;
      }
    }
    if (!foundEven) {
      numBlocks = kMin;
    }
  } else {
    // If n between 26 and 39 (where kMin=2 and kMax=1), use 2 blocks
    numBlocks = Math.max(2, kMin);
  }

  const baseSize = Math.floor(n / numBlocks);
  const remainder = n % numBlocks;

  const blocks: TestBlock[] = [];
  let currentIndex = 0;

  for (let i = 0; i < numBlocks; i++) {
    // Distribute remainder among first few blocks
    const blockSize = baseSize + (i < remainder ? 1 : 0);
    const blockQuestions = questions.slice(currentIndex, currentIndex + blockSize);
    currentIndex += blockSize;

    // Passing score is 70% (e.g. 18 out of 25)
    const passingScore = Math.max(1, Math.ceil(blockQuestions.length * 0.7));

    blocks.push({
      id: `block-${i + 1}`,
      blockNumber: i + 1,
      title: `Test ${i + 1}`,
      questions: blockQuestions,
      passingScore,
      isLocked: i !== 0, // Only block 1 unlocked initially
      bestScore: 0,
      isPassed: false,
    });
  }

  return blocks;
}

/**
 * Returns user-friendly explanation when a user fails to unlock the next test block.
 * Example: "Sizning natijangiz yetarli emas. 'Test 1' da yana 8 ta to'g'ri javob to'plang va keyingi testni oching."
 */
export function getUnlockRequirementsMessage(
  blockTitle: string,
  userScore: number,
  passingScore: number,
  nextBlockTitle?: string
): string {
  const diff = Math.max(1, passingScore - userScore);
  const cur = localizeBlockTitle(blockTitle);
  const next = nextBlockTitle ? localizeBlockTitle(nextBlockTitle) : '';
  return trNow(
    `Natija yetarli emas. "${cur}" blokida yana ${diff} ta to'g'ri javob to'plang va ${next ? `"${next}" blokini` : 'keyingi blokni'} oching.`,
    `Результата недостаточно. Наберите ещё ${diff} правильных ответов в блоке «${cur}», чтобы открыть ${next ? `«${next}»` : 'следующий блок'}.`,
    `Not enough to pass. Get ${diff} more correct answers in "${cur}" to unlock ${next ? `"${next}"` : 'the next block'}.`
  );
}

/** "1-qism" kabi blok nomlarini joriy tilga moslash (boshqa nomlar o'zgarmaydi) */
export function localizeBlockTitle(title: string): string {
  const m = String(title || '').trim().match(/^(\d+)-qism$/i);
  if (!m) return title;
  return trNow(`${m[1]}-qism`, `Часть ${m[1]}`, `Part ${m[1]}`);
}
