import type { MetadataStatus } from '../types/photo';
import { decodeImage, type DecodedImage } from '../utils/imageDecode';

const HASH_SIZE = 8; // 8x8 -> 64-bit dHash
const HIST_LEVELS = 4; // 4 levels per channel -> 4*4*4 = 64 bins
const HIST_SAMPLE_SIZE = 32;

export interface ImageFeatures {
  imageHash?: string;
  colorHistogram?: number[];
  imageAnalysisStatus: MetadataStatus;
}

/**
 * Extracts a lightweight visual fingerprint used later by the match engine to judge
 * "did these two photos likely show the same location/subject?" (spec section 7).
 * Never throws — a corrupted/unreadable image just yields imageAnalysisStatus: 'FAILED'.
 */
export async function analyzeImage(file: File): Promise<ImageFeatures> {
  const decoded = await decodeImage(file);
  if (!decoded) return { imageAnalysisStatus: 'FAILED' };

  try {
    const imageHash = computeDHash(decoded);
    const colorHistogram = computeColorHistogram(decoded);
    return { imageHash, colorHistogram, imageAnalysisStatus: 'ANALYZED' };
  } catch {
    return { imageAnalysisStatus: 'FAILED' };
  } finally {
    decoded.dispose();
  }
}

/** Difference hash: for each row, compares adjacent pixel brightness. Robust to resize/minor lighting changes. */
function computeDHash(decoded: DecodedImage): string {
  const w = HASH_SIZE + 1;
  const h = HASH_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2d context unavailable');
  decoded.draw(ctx, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  const gray: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }

  let bits = '';
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < HASH_SIZE; x++) {
      bits += gray[y * w + x] < gray[y * w + x + 1] ? '1' : '0';
    }
  }

  let hex = '';
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

/** Coarse color distribution — catches cases dHash misses (e.g. same structure, very different colors). */
function computeColorHistogram(decoded: DecodedImage): number[] {
  const size = HIST_SAMPLE_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2d context unavailable');
  decoded.draw(ctx, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  const bins = new Array(HIST_LEVELS ** 3).fill(0);
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = Math.min(HIST_LEVELS - 1, Math.floor((data[i] / 256) * HIST_LEVELS));
    const g = Math.min(HIST_LEVELS - 1, Math.floor((data[i + 1] / 256) * HIST_LEVELS));
    const b = Math.min(HIST_LEVELS - 1, Math.floor((data[i + 2] / 256) * HIST_LEVELS));
    bins[r * HIST_LEVELS * HIST_LEVELS + g * HIST_LEVELS + b]++;
    total++;
  }
  return total > 0 ? bins.map((c) => c / total) : bins;
}

/** Hamming distance between two same-length hex dHashes (0 = identical, 64 = maximally different). */
export function hammingDistance(hexA: string, hexB: string): number {
  if (hexA.length !== hexB.length) return Number.POSITIVE_INFINITY;
  let dist = 0;
  for (let i = 0; i < hexA.length; i++) {
    let x = parseInt(hexA[i], 16) ^ parseInt(hexB[i], 16);
    while (x) {
      dist += x & 1;
      x >>= 1;
    }
  }
  return dist;
}

/** Histogram intersection similarity in [0, 1] — 1 means identical color distribution. */
export function histogramSimilarity(a: number[], b: number[]): number {
  let intersection = 0;
  for (let i = 0; i < a.length; i++) intersection += Math.min(a[i], b[i] ?? 0);
  return intersection;
}
