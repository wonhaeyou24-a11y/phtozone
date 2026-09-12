// Match Engine weights/thresholds — spec section 8 explicitly forbids hardcoding these as
// magic numbers scattered through the scoring logic; they must live in one adjustable place
// (spec section 45's future settings screen will read/write this same config).

export interface MatchWeights {
  gpsDistance: number;
  gpsAccuracy: number;
  time: number;
  heading: number;
  imageFeature: number;
  colorStructure: number;
  filename: number;
}

export interface MatchConfig {
  weights: MatchWeights;
  /** Distance (m) at/beyond which the GPS-distance factor scores 0. User-adjustable per spec section 9. */
  gpsDistanceThresholdMeters: number;
  /** GPS accuracy (m) at/below which accuracy is considered "양호" (full score). */
  gpsAccuracyGoodMeters: number;
  /** GPS accuracy (m) at/above which accuracy scores 0. */
  gpsAccuracyPoorMeters: number;
  /** Days apart at/beyond which the time factor scores 0. */
  timeDiffToleranceDays: number;
  /** Degrees apart at/beyond which the heading factor scores 0. */
  headingToleranceDegrees: number;
  /** Recommendation grade thresholds (spec section 47), on the final 0-100 baseScore. */
  confidenceThresholds: {
    high: number;
    recommended: number;
    review: number;
  };
  /**
   * Minimum fraction of the full weight total (gpsDistance+gpsAccuracy+time+heading+imageFeature+
   * colorStructure+filename) that must be applicable for a HIGH/RECOMMENDED grade to be trusted.
   * Below this, confidence is capped at REVIEW even if the (thin-evidence) baseScore is high —
   * e.g. a photo with only a matching timestamp and nothing else shouldn't read as "높은 신뢰도".
   */
  minEvidenceCoverage: number;
}

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  weights: {
    gpsDistance: 30,
    gpsAccuracy: 10,
    time: 15,
    heading: 10,
    imageFeature: 25,
    colorStructure: 5,
    filename: 5,
  },
  gpsDistanceThresholdMeters: 5,
  gpsAccuracyGoodMeters: 5,
  gpsAccuracyPoorMeters: 20,
  timeDiffToleranceDays: 180,
  headingToleranceDegrees: 45,
  confidenceThresholds: {
    high: 90,
    recommended: 75,
    review: 60,
  },
  minEvidenceCoverage: 0.3,
};
