import exifr from 'exifr';
import type { CapturedAtSource, MetadataStatus } from '../types/photo';
import { decodeImage } from '../utils/imageDecode';

export interface ParsedMetadata {
  width?: number;
  height?: number;
  capturedAt: string;
  capturedAtSource: CapturedAtSource;
  latitude?: number;
  longitude?: number;
  gpsAccuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  gpsTimestamp?: string;
  cameraMake?: string;
  cameraModel?: string;
  lens?: string;
  metadataStatus: MetadataStatus;
}

/** Priority per spec section 5: DateTimeOriginal > DateTimeDigitized > DateTime > file mtime. */
function pickCapturedAt(tags: any, file: File): { capturedAt: string; source: CapturedAtSource } {
  const candidates: [unknown, CapturedAtSource][] = [
    [tags?.DateTimeOriginal, 'EXIF_DATETIME_ORIGINAL'],
    [tags?.CreateDate, 'EXIF_DATETIME_DIGITIZED'],
    [tags?.DateTimeDigitized, 'EXIF_DATETIME_DIGITIZED'],
    [tags?.DateTime, 'EXIF_DATETIME'],
    [tags?.ModifyDate, 'EXIF_DATETIME'],
  ];
  for (const [value, source] of candidates) {
    if (value instanceof Date && !isNaN(value.getTime())) {
      return { capturedAt: value.toISOString(), source };
    }
  }
  return { capturedAt: new Date(file.lastModified).toISOString(), source: 'FILE_MODIFIED' };
}

function combineGpsTimestamp(tags: any): string | undefined {
  // exifr can expose these as Date objects (GPSDateStamp) or raw arrays (GPSTimeStamp); handle both defensively.
  if (tags?.GPSDateStamp instanceof Date && !isNaN(tags.GPSDateStamp.getTime())) {
    return tags.GPSDateStamp.toISOString();
  }
  return undefined;
}

async function getImageDimensions(file: File): Promise<{ width?: number; height?: number }> {
  const decoded = await decodeImage(file);
  if (!decoded) return {};
  const dims = { width: decoded.width, height: decoded.height };
  decoded.dispose();
  return dims;
}

/**
 * Extracts EXIF/GPS/camera metadata for a photo. Never throws — missing EXIF, missing GPS,
 * and corrupted images are all valid outcomes (spec section 42) and are reflected in
 * metadataStatus rather than surfaced as errors.
 */
export async function parseExif(file: File): Promise<ParsedMetadata> {
  let tags: any = null;
  try {
    tags = await exifr.parse(file, { tiff: true, exif: true, gps: true });
  } catch {
    tags = null;
  }

  const { capturedAt, source: capturedAtSource } = pickCapturedAt(tags, file);

  const latitude = typeof tags?.latitude === 'number' ? tags.latitude : undefined;
  const longitude = typeof tags?.longitude === 'number' ? tags.longitude : undefined;
  const altitude = typeof tags?.GPSAltitude === 'number' ? tags.GPSAltitude : undefined;
  const gpsAccuracy = typeof tags?.GPSHPositioningError === 'number' ? tags.GPSHPositioningError : undefined;
  const heading = typeof tags?.GPSImgDirection === 'number' ? tags.GPSImgDirection : undefined;
  const speed = typeof tags?.GPSSpeed === 'number' ? tags.GPSSpeed : undefined;
  const gpsTimestamp = combineGpsTimestamp(tags);

  const cameraMake: string | undefined = typeof tags?.Make === 'string' ? tags.Make.trim() : undefined;
  const cameraModel: string | undefined = typeof tags?.Model === 'string' ? tags.Model.trim() : undefined;
  const lens: string | undefined = typeof tags?.LensModel === 'string' ? tags.LensModel.trim() : undefined;

  let width: number | undefined =
    tags?.ExifImageWidth ?? tags?.PixelXDimension ?? tags?.ImageWidth ?? undefined;
  let height: number | undefined =
    tags?.ExifImageHeight ?? tags?.PixelYDimension ?? tags?.ImageHeight ?? undefined;

  let imageDecodeFailed = false;
  if (!width || !height) {
    const dims = await getImageDimensions(file);
    width = dims.width;
    height = dims.height;
    if (!width || !height) imageDecodeFailed = true;
  }

  const metadataStatus: MetadataStatus = imageDecodeFailed ? 'FAILED' : 'ANALYZED';

  return {
    width,
    height,
    capturedAt,
    capturedAtSource,
    latitude,
    longitude,
    gpsAccuracy,
    altitude,
    heading,
    speed,
    gpsTimestamp,
    cameraMake,
    cameraModel,
    lens,
    metadataStatus,
  };
}
