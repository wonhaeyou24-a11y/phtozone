// Photo domain type — field list follows spec section 6 exactly.
// Grows further in later steps: image-feature fields (Step 5), match-related fields (Step 6+).

export type MetadataStatus = 'PENDING' | 'ANALYZED' | 'FAILED';

export type CapturedAtSource =
  | 'EXIF_DATETIME_ORIGINAL'
  | 'EXIF_DATETIME_DIGITIZED'
  | 'EXIF_DATETIME'
  | 'FILE_CREATED'
  | 'FILE_MODIFIED';

export interface Photo {
  photoId: string;
  projectId: string;

  originalFileName: string;
  mimeType: string;
  fileSize: number;
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

  /** Object URL for the original file blob — used as the thumbnail until Step 5 generates a resized one. */
  thumbnail: string;
  /** The original, untouched file. Never modified; kept for re-analysis, IndexedDB persistence, and Excel export. */
  originalBlob: File;

  excluded: boolean;

  createdAt: string;
}
