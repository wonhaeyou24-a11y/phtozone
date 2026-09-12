import type { Photo } from '../types/photo';
import { DEFAULT_MATCH_CONFIG, type MatchConfig } from './config';
import type { ConfidenceLevel, MatchResult } from './types';
import { scoreGpsDistance, scoreGpsAccuracy, scoreTime, scoreHeading, scoreFilename } from './metadataMatcher';
import { scoreImageFeature, scoreColorStructure } from './imageMatcher';

function classifyConfidence(
  score: number,
  evidenceCoverage: number,
  config: MatchConfig,
): { level: ConfidenceLevel; label: string } {
  const { high, recommended, review } = config.confidenceThresholds;
  const raw =
    score >= high
      ? { level: 'HIGH' as const, label: '🟢 높은 신뢰도' }
      : score >= recommended
        ? { level: 'RECOMMENDED' as const, label: '🟡 추천' }
        : score >= review
          ? { level: 'REVIEW' as const, label: '🟠 검토 필요' }
          : { level: 'UNMATCHED' as const, label: '🔴 미매칭' };

  // Thin evidence (e.g. only a matching timestamp, nothing else) shouldn't read as trustworthy
  // just because the little data available happened to line up perfectly.
  if (evidenceCoverage < config.minEvidenceCoverage && (raw.level === 'HIGH' || raw.level === 'RECOMMENDED')) {
    return { level: 'REVIEW', label: '🟠 검토 필요 (근거 부족)' };
  }
  return raw;
}

/**
 * Compares two photos and scores how likely they show the same location/subject.
 * Combines metadata (GPS/time/heading/filename) and image-feature factors (spec section 8).
 * Factors with no data on either photo are excluded from both the score and its 100-point base,
 * rather than counted as zero — a photo with no GPS is judged on what evidence it does have,
 * not penalized for missing evidence it never had (spec section 9: "GPS가 없으면 다른 분석 방법으로 판단").
 */
export function compare(photoA: Photo, photoB: Photo, config: MatchConfig = DEFAULT_MATCH_CONFIG): MatchResult {
  const factors = [
    scoreGpsDistance(photoA, photoB, config),
    scoreGpsAccuracy(photoA, photoB, config),
    scoreTime(photoA, photoB, config),
    scoreHeading(photoA, photoB, config),
    scoreImageFeature(photoA, photoB, config),
    scoreColorStructure(photoA, photoB, config),
    scoreFilename(photoA, photoB, config),
  ];

  const applicable = factors.filter((f) => f.applicable);
  const totalMax = applicable.reduce((sum, f) => sum + f.maxScore, 0);
  const totalScore = applicable.reduce((sum, f) => sum + f.score, 0);
  const baseScore = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  const fullWeightTotal = Object.values(config.weights).reduce((sum, w) => sum + w, 0);
  const evidenceCoverage = fullWeightTotal > 0 ? totalMax / fullWeightTotal : 0;

  const { level, label } = classifyConfidence(baseScore, evidenceCoverage, config);
  const matchMethod = applicable.length > 0 ? applicable.map((f) => f.key.toUpperCase()).join(',') : 'NONE';

  return { baseScore, confidence: level, confidenceLabel: label, factors, matchMethod, evidenceCoverage };
}
