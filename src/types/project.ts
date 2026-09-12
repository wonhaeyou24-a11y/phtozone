// Core domain types. Fields follow the project spec sections 37 (Project), 13 (Group).
// Photo/MatchResult fields will grow in later steps (EXIF, image analysis, matching).

export type ExcelMode = 'A' | 'B';

export interface Project {
  projectId: string;
  projectName: string;
  workLocation: string;
  workDate: string;
  workDescription: string;

  excelMode: ExcelMode;
  excelTemplate?: string;

  createdAt: string;
  updatedAt: string;
}

export type ReviewStatus =
  | 'HIGH_CONFIDENCE'
  | 'NEEDS_REVIEW'
  | 'UNMATCHED'
  | 'MANUAL'
  | 'FINALIZED';

/** Immutable snapshot of the original automatic result, preserved even after manual edits (spec section 19). */
export interface GroupAutoSnapshot {
  beforePhotoIds: string[];
  afterPhotoIds: string[];
  representativeBeforePhotoId?: string;
  representativeAfterPhotoId?: string;
  matchScore?: number;
  matchMethod?: string;
}

export interface Group {
  groupId: string;
  projectId: string;

  photoIds: string[];
  beforePhotoIds: string[];
  afterPhotoIds: string[];

  representativeBeforePhotoId?: string;
  representativeAfterPhotoId?: string;

  matchScore?: number;
  baseScore?: number;
  aiScore?: number;
  /** True once AI 2차 분석 has run on this group (spec section 22), regardless of the outcome. */
  aiAnalyzed?: boolean;
  finalScore?: number | 'MANUAL';

  matchMethod?: string;

  /** Captured once at group creation; never mutated by later manual edits. */
  autoResult?: GroupAutoSnapshot;

  /**
   * MODE B only: overrides where the "after" photo gets inserted in the original Excel, when the
   * default "immediately right of the before photo" heuristic doesn't match this template's layout
   * (spec section 43: user can manually point at the correct "후" region).
   */
  afterInsertAnchor?: string;

  reviewStatus: ReviewStatus;
  manualOverride: boolean;
  locked: boolean;

  createdAt: string;
  updatedAt: string;
}
