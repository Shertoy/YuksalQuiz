import { TestPackage, TestBlock, TestAttempt } from '../types';

/**
 * Checks if a specific block in a test package is unlocked for the user.
 * 
 * Rules:
 * 1. Part 1 (blockIndex === 0) is ALWAYS unlocked.
 * 2. If the block object explicitly has isLocked === false, it is unlocked.
 * 3. Check if previous block was passed:
 *    - prevBlock.isPassed === true
 *    - prevBlock.bestScore >= passingScore
 *    - user has a passing attempt in testAttempts for the previous block
 */
export function isBlockUnlocked(
  pkg: TestPackage,
  blockIndex: number,
  testAttempts: TestAttempt[] = []
): boolean {
  if (blockIndex <= 0) return true;
  if (!pkg || !Array.isArray(pkg.blocks) || blockIndex >= pkg.blocks.length) return false;

  const currentBlock = pkg.blocks[blockIndex];
  if (currentBlock && currentBlock.isLocked === false) {
    return true;
  }

  // Check previous block
  const prevBlock = pkg.blocks[blockIndex - 1];
  if (!prevBlock) return true;

  if (prevBlock.isPassed) return true;

  const passingScore =
    prevBlock.passingScore || Math.max(1, Math.ceil((prevBlock.questions?.length || 25) * 0.7));

  if (prevBlock.bestScore !== undefined && prevBlock.bestScore >= passingScore) {
    return true;
  }

  // Check user's test attempts for previous block
  const prevAttempts = (testAttempts || []).filter(
    (a) =>
      a.testPackageId === pkg.id &&
      (a.blockId === prevBlock.id || a.blockTitle === prevBlock.title)
  );

  if (prevAttempts.some((a) => a.isPassed || a.score >= passingScore)) {
    return true;
  }

  const maxAttemptScore =
    prevAttempts.length > 0 ? Math.max(...prevAttempts.map((a) => a.score)) : 0;

  return maxAttemptScore >= passingScore;
}

/**
 * Reconciles a test package with the student's local attempts and progress,
 * ensuring unlocked blocks and passing scores are never overwritten by cloud downloads.
 */
export function reconcilePackageWithProgress(
  pkg: TestPackage,
  localPkg?: TestPackage,
  testAttempts: TestAttempt[] = []
): TestPackage {
  if (!pkg || !Array.isArray(pkg.blocks)) return pkg;

  const localBlocksMap = new Map((localPkg?.blocks || []).map((b) => [b.id, b]));

  const updatedBlocks: TestBlock[] = pkg.blocks.map((block, idx) => {
    const blockQuestions = block.questions || [];
    const passingScore =
      block.passingScore || Math.max(1, Math.ceil(blockQuestions.length * 0.7));

    const localBlock = localBlocksMap.get(block.id) || localPkg?.blocks?.[idx];

    // Find all attempts for this block
    const blockAttempts = (testAttempts || []).filter(
      (a) =>
        a.testPackageId === pkg.id &&
        (a.blockId === block.id || a.blockTitle === block.title)
    );

    const maxAttemptScore =
      blockAttempts.length > 0
        ? Math.max(...blockAttempts.map((a) => a.score))
        : 0;

    const bestScore = Math.max(
      block.bestScore || 0,
      localBlock?.bestScore || 0,
      maxAttemptScore
    );

    const isPassed = Boolean(
      block.isPassed ||
      localBlock?.isPassed ||
      bestScore >= passingScore ||
      blockAttempts.some((a) => a.isPassed || a.score >= passingScore)
    );

    return {
      ...block,
      passingScore,
      bestScore,
      isPassed,
      // Default to locked for idx > 0, sequentially determined below
      isLocked: idx === 0 ? false : true,
    };
  });

  // Sequential unlock pass
  for (let i = 1; i < updatedBlocks.length; i++) {
    const prevBlock = updatedBlocks[i - 1];
    const localBlock = localBlocksMap.get(updatedBlocks[i].id) || localPkg?.blocks?.[i];

    if (
      prevBlock.isPassed ||
      (localBlock && localBlock.isLocked === false) ||
      isBlockUnlocked({ ...pkg, blocks: updatedBlocks }, i, testAttempts)
    ) {
      updatedBlocks[i].isLocked = false;
    } else {
      updatedBlocks[i].isLocked = true;
    }
  }

  return {
    ...pkg,
    blocks: updatedBlocks,
  };
}
