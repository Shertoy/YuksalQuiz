/**
 * Client-side Image Compression Utility using HTML5 Canvas.
 * Compresses receipts to <= 300 KB (307,200 bytes) without losing text readability.
 */

export interface CompressionResult {
  file: File;
  blob: Blob;
  base64: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
}

/**
 * Compresses an image file client-side down to a target maximum size (default 300 KB).
 * Preserves high legibility for transaction codes, card numbers, and timestamps.
 */
export async function compressReceiptImage(
  file: File,
  maxSizeBytes: number = 300 * 1024
): Promise<CompressionResult> {
  // Safety fallback for non-image or non-browser environments
  if (typeof window === 'undefined' || !file.type.startsWith('image/')) {
    return {
      file,
      blob: file,
      base64: '',
      originalSize: file.size,
      compressedSize: file.size,
      width: 0,
      height: 0,
    };
  }

  // 1. Read file as Data URL
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });

  // 2. Load into Image element to read dimensions
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (e) => reject(e);
    image.src = dataUrl;
  });

  const originalWidth = img.naturalWidth || img.width || 1200;
  const originalHeight = img.naturalHeight || img.height || 1600;

  // Maximum dimension constraint: 1600px is optimal for receipts (all numbers stay crystal clear)
  let targetWidth = originalWidth;
  let targetHeight = originalHeight;
  const MAX_DIM = 1600;

  if (targetWidth > MAX_DIM || targetHeight > MAX_DIM) {
    if (targetWidth > targetHeight) {
      targetHeight = Math.round((targetHeight * MAX_DIM) / targetWidth);
      targetWidth = MAX_DIM;
    } else {
      targetWidth = Math.round((targetWidth * MAX_DIM) / targetHeight);
      targetHeight = MAX_DIM;
    }
  }

  // 3. Render onto Canvas
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D konteksti mavjud emas');
  }

  // Fill pure white background (handles transparent PNG receipts)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // Canvas toBlob helper
  const getBlob = (quality: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob muvaffaqiyatsiz bo\'ldi'));
        },
        'image/jpeg',
        quality
      );
    });
  };

  // Convert Blob to Base64 data URL
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(blob);
    });
  };

  // 4. Stepped quality reduction until blob size <= maxSizeBytes
  const qualitySteps = [0.88, 0.78, 0.68, 0.58, 0.48, 0.38];
  let finalBlob: Blob | null = null;

  for (const q of qualitySteps) {
    const candidate = await getBlob(q);
    finalBlob = candidate;
    if (candidate.size <= maxSizeBytes) {
      break;
    }
  }

  // If still above 300 KB on high-density photos, scale dimensions down to 1200px
  if (finalBlob && finalBlob.size > maxSizeBytes && (targetWidth > 1200 || targetHeight > 1200)) {
    const scaleFactor = 0.75;
    const secondCanvas = document.createElement('canvas');
    secondCanvas.width = Math.round(targetWidth * scaleFactor);
    secondCanvas.height = Math.round(targetHeight * scaleFactor);
    const secondCtx = secondCanvas.getContext('2d');
    if (secondCtx) {
      secondCtx.fillStyle = '#FFFFFF';
      secondCtx.fillRect(0, 0, secondCanvas.width, secondCanvas.height);
      secondCtx.drawImage(canvas, 0, 0, secondCanvas.width, secondCanvas.height);
      for (const q of [0.75, 0.60, 0.45]) {
        const candidate = await new Promise<Blob>((resolve, reject) => {
          secondCanvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('toBlob scale error'))),
            'image/jpeg',
            q
          );
        });
        finalBlob = candidate;
        if (candidate.size <= maxSizeBytes) break;
      }
    }
  }

  if (!finalBlob) {
    finalBlob = await getBlob(0.7);
  }

  const finalBase64 = await blobToBase64(finalBlob);

  const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
  const compressedFile = new File([finalBlob], cleanName, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });

  return {
    file: compressedFile,
    blob: finalBlob,
    base64: finalBase64,
    originalSize: file.size,
    compressedSize: finalBlob.size,
    width: targetWidth,
    height: targetHeight,
  };
}

/**
 * Format raw byte size into human readable string (KB, MB).
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (!bytes || bytes <= 0) return '0 KB';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
