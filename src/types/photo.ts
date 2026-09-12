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

  /** 64-bit difference-hash (dHash) of the image, as 16 hex chars. Used for structural similarity (spec section 7/8). */
  imageHash?: string;
  /** Normalized RGB color histogram (4x4x4 = 64 bins) for coarse color/structure comparison. */
  colorHistogram?: number[];
  imageAnalysisStatus: MetadataStatus;

  /** Object URL for the original file blob — used as the thumbnail until a resized one is generated. */
  thumbnail: string;
  /** The original, untouched file. Never modified; kept for re-analysis, IndexedDB persistence, and Excel export. */
  originalBlob: File;

  excluded: boolean;

  createdAt: string;

  /**
   * Set only for "before" photos extracted from an uploaded MODE B ledger Excel (spec section 27).
   * Absent for normally-uploaded photos.
   */
  excelSource?: {
    sheetName: string;
    sheetIndex: number;
    imageIndex: number;
    anchorCell: string;
    /** Column/row span the original "before" image covered — reused to size/place the inserted "after" image. */
    colSpan: number;
    rowSpan: number;
    pageIndex: number;
  };
}
