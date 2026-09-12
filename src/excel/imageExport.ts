import { decodeImage } from '../utils/imageDecode';

const MAX_EXPORT_DIMENSION = 1000;
const EXPORT_JPEG_QUALITY = 0.85;

export interface ExportedImage {
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Downscales a photo for Excel embedding — the original file is never touched (spec section 39:
 * "Excel 출력용 이미지와 원본 이미지를 분리한다"). Keeps the workbook a manageable size even with
 * many high-resolution source photos (spec section 40).
 */
export async function toExportImage(file: File): Promise<ExportedImage | null> {
  const decoded = await decodeImage(file);
  if (!decoded) return null;

  const scale = Math.min(1, MAX_EXPORT_DIMENSION / Math.max(decoded.width, decoded.height));
  const width = Math.max(1, Math.round(decoded.width * scale));
  const height = Math.max(1, Math.round(decoded.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    decoded.dispose();
    return null;
  }
  decoded.draw(ctx, width, height);
  decoded.dispose();

  return { dataUrl: canvas.toDataURL('image/jpeg', EXPORT_JPEG_QUALITY), width, height };
}

/** Scales (naturalW, naturalH) to fit inside (boxW, boxH) without cropping or distorting. */
export function containFit(naturalW: number, naturalH: number, boxW: number, boxH: number) {
  const scale = Math.min(boxW / naturalW, boxH / naturalH);
  return { width: Math.max(1, Math.round(naturalW * scale)), height: Math.max(1, Math.round(naturalH * scale)) };
}
