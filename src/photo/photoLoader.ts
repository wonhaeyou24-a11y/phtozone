import type { Photo } from '../types/photo';

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

export function isSupportedImageFile(file: File): boolean {
  if (ACCEPTED_TYPES.has(file.type)) return true;
  // Some cameras/browsers leave `type` empty; fall back to extension.
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
}

/** Builds a Photo with metadataStatus PENDING; EXIF/GPS fields are filled in asynchronously afterwards. */
export function filesToPhotos(files: File[], projectId: string): Photo[] {
  const now = new Date().toISOString();
  return files.filter(isSupportedImageFile).map((file) => {
    const objectUrl = URL.createObjectURL(file);
    return {
      photoId: crypto.randomUUID(),
      projectId,
      originalFileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      capturedAt: new Date(file.lastModified).toISOString(),
      capturedAtSource: 'FILE_MODIFIED',
      metadataStatus: 'PENDING',
      imageAnalysisStatus: 'PENDING',
      thumbnail: objectUrl,
      originalBlob: file,
      excluded: false,
      createdAt: now,
    };
  });
}
