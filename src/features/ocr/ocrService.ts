import { createWorker } from 'tesseract.js';

export interface OcrResult {
  candidate: number | null;
  rawText: string;
  confidence: number;
}

let sharedWorker: any = null;
let isInitializingWorker = false;

async function getOcrWorker(onProgress?: (progress: number) => void) {
  if (sharedWorker) return sharedWorker;
  if (isInitializingWorker) {
    // Wait brief moment
    await new Promise((r) => setTimeout(r, 300));
    if (sharedWorker) return sharedWorker;
  }

  isInitializingWorker = true;
  try {
    const worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress && typeof m.progress === 'number') {
          onProgress(Math.round(m.progress * 100));
        }
      },
    });

    await worker.setParameters({
      tessedit_char_whitelist: '0123456789.,',
    });

    sharedWorker = worker;
    isInitializingWorker = false;
    return sharedWorker;
  } catch (err) {
    isInitializingWorker = false;
    console.error('Failed to create Tesseract worker:', err);
    throw err;
  }
}

/**
 * Extracts the most probable meter reading number from raw OCR text
 */
export function parseMeterReading(rawText: string, expectedNearbyValue?: number | null): number | null {
  if (!rawText || !rawText.trim()) return null;

  // Clean obvious noise
  const clean = rawText
    .replace(/[oO]/g, '0')
    .replace(/[lI|]/g, '1')
    .replace(/[sS]/g, '5')
    .trim();

  // Try finding standard floating point numbers like 30945.20 or 30,945.20
  const normalized = clean.replace(/,/g, '');
  const matches = normalized.match(/\b\d+(\.\d{1,3})?\b/g);

  if (!matches || matches.length === 0) {
    // Fallback: extract all digits
    const digitsOnly = clean.replace(/[^\d.]/g, '');
    const num = parseFloat(digitsOnly);
    return isNaN(num) ? null : num;
  }

  // Parse candidate numbers
  const candidates: number[] = matches
    .map((m) => parseFloat(m))
    .filter((n) => !isNaN(n) && n > 0);

  if (candidates.length === 0) return null;

  // If we have an expected value (like opening meter e.g. 30,000), pick the closest plausible candidate
  if (expectedNearbyValue !== undefined && expectedNearbyValue !== null && expectedNearbyValue > 0) {
    // Filter candidates that are either close or slightly greater
    const plausible = candidates.filter((c) => {
      // Must be within reasonable range (not 10x smaller or 100x bigger)
      return c >= expectedNearbyValue * 0.8 && c <= expectedNearbyValue + 50000;
    });

    if (plausible.length > 0) {
      // Pick the closest candidate >= expectedNearbyValue
      const forwardCandidates = plausible.filter((c) => c >= expectedNearbyValue);
      if (forwardCandidates.length > 0) {
        return forwardCandidates.sort((a, b) => a - b)[0];
      }
      return plausible[0];
    }
  }

  // Otherwise, take the candidate with highest decimal precision or largest realistic length
  return candidates.sort((a, b) => b - a)[0];
}

export async function recognizeMeterImage(
  imageDataUrl: string,
  expectedOpeningValue?: number | null,
  onProgress?: (progress: number) => void
): Promise<OcrResult> {
  try {
    const worker = await getOcrWorker(onProgress);
    const result = await worker.recognize(imageDataUrl);
    const text = result.data.text || '';
    const confidence = Math.round(result.data.confidence || 0);

    const candidate = parseMeterReading(text, expectedOpeningValue);

    return {
      candidate,
      rawText: text.trim(),
      confidence,
    };
  } catch (err: any) {
    console.warn('OCR error during recognition, falling back:', err);
    return {
      candidate: null,
      rawText: err?.message || 'OCR recognition failed',
      confidence: 0,
    };
  }
}
