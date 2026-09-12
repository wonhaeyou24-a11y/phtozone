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
  finalScore?: number | 'MANUAL';

  matchMethod?: string;

  reviewStatus: ReviewStatus;
  manualOverride: boolean;
  locked: boolean;

  createdAt: string;
  updatedAt: string;
}
