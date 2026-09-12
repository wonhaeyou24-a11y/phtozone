export type MatchFactorKey =
  | 'gpsDistance'
  | 'gpsAccuracy'
  | 'time'
  | 'heading'
  | 'imageFeature'
  | 'colorStructure'
  | 'filename';

/** One line of the score breakdown shown to the user (spec section 46: show *why* it matched). */
export interface MatchFactorScore {
  key: MatchFactorKey;
  label: string;
  /** False when neither photo had the data this factor needs (e.g. no GPS) — excluded from scoring, not penalized. */
  applicable: boolean;
  score: number;
  maxScore: number;
  detail: string;
}

export type ConfidenceLevel = 'HIGH' | 'RECOMMENDED' | 'REVIEW' | 'UNMATCHED';

export interface MatchResult {
  /** 0-100, normalized over only the applicable factors (spec section 9: "GPS가 없으면 다른 분석 방법으로 판단"). */
  baseScore: number;
  confidence: ConfidenceLevel;
  confidenceLabel: string;
  factors: MatchFactorScore[];
  /** Comma-joined list of factor keys that had data and contributed to the score. */
  matchMethod: string;
  /** Fraction (0-1) of the full weight total that had applicable data. Low = score rests on thin evidence. */
  evidenceCoverage: number;
}
