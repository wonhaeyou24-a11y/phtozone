import type { Photo } from '../types/photo';
import type { MatchConfig } from './config';
import type { MatchFactorScore } from './types';
import { haversineDistanceMeters } from '../utils/geo';

export function scoreGpsDistance(a: Photo, b: Photo, config: MatchConfig): MatchFactorScore {
  const max = config.weights.gpsDistance;
  if (a.latitude === undefined || a.longitude === undefined || b.latitude === undefined || b.longitude === undefined) {
    return { key: 'gpsDistance', label: 'GPS 거리', applicable: false, score: 0, maxScore: max, detail: 'GPS 없음' };
  }
  const distance = haversineDistanceMeters(a.latitude, a.longitude, b.latitude, b.longitude);
  const ratio = Math.max(0, 1 - distance / config.gpsDistanceThresholdMeters);
  const score = Math.round(max * ratio);
  return { key: 'gpsDistance', label: 'GPS 거리', applicable: true, score, maxScore: max, detail: `${distance.toFixed(1)}m` };
}

export function scoreGpsAccuracy(a: Photo, b: Photo, config: MatchConfig): MatchFactorScore {
  const max = config.weights.gpsAccuracy;
  if (a.gpsAccuracy === undefined && b.gpsAccuracy === undefined) {
    return { key: 'gpsAccuracy', label: 'GPS 정확도', applicable: false, score: 0, maxScore: max, detail: '정보 없음' };
  }
  const worst = Math.max(a.gpsAccuracy ?? 0, b.gpsAccuracy ?? 0);
  const { gpsAccuracyGoodMeters: good, gpsAccuracyPoorMeters: poor } = config;
  const ratio = worst <= good ? 1 : worst >= poor ? 0 : 1 - (worst - good) / (poor - good);
  const score = Math.round(max * ratio);
  const label = ratio >= 0.8 ? '양호' : ratio >= 0.4 ? '보통' : '낮음';
  return {
    key: 'gpsAccuracy',
    label: 'GPS 정확도',
    applicable: true,
    score,
    maxScore: max,
    detail: `${label} (±${worst.toFixed(0)}m)`,
  };
}

export function scoreTime(a: Photo, b: Photo, config: MatchConfig): MatchFactorScore {
  const max = config.weights.time;
  const diffMs = Math.abs(new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const ratio = Math.max(0, 1 - diffDays / config.timeDiffToleranceDays);
  const score = Math.round(max * ratio);
  const detail = diffDays < 1 ? `${Math.round(diffMs / (1000 * 60 * 60))}시간 차이` : `${Math.round(diffDays)}일 차이`;
  return { key: 'time', label: '촬영시간', applicable: true, score, maxScore: max, detail };
}

export function scoreHeading(a: Photo, b: Photo, config: MatchConfig): MatchFactorScore {
  const max = config.weights.heading;
  if (a.heading === undefined || b.heading === undefined) {
    return { key: 'heading', label: '촬영방향', applicable: false, score: 0, maxScore: max, detail: '정보 없음' };
  }
  let diff = Math.abs(a.heading - b.heading) % 360;
  if (diff > 180) diff = 360 - diff;
  const ratio = Math.max(0, 1 - diff / config.headingToleranceDegrees);
  const score = Math.round(max * ratio);
  return { key: 'heading', label: '촬영방향', applicable: true, score, maxScore: max, detail: `${diff.toFixed(0)}° 차이` };
}

export function scoreFilename(a: Photo, b: Photo, config: MatchConfig): MatchFactorScore {
  const max = config.weights.filename;
  const ratio = filenameSimilarity(a.originalFileName, b.originalFileName);
  const score = Math.round(max * ratio);
  const label = ratio > 0.66 ? '유사' : ratio > 0.33 ? '약간 유사' : '다름';
  return { key: 'filename', label: '파일명', applicable: true, score, maxScore: max, detail: label };
}

/** Parses a trailing numeric sequence off a filename, e.g. "IMG_001" -> { prefix: "img_", num: 1 }. */
function parseFilename(name: string): { prefix: string; num: number | null } {
  const base = name.replace(/\.[^.]+$/, '');
  const match = base.match(/^(.*?)(\d+)$/);
  return match ? { prefix: match[1].toLowerCase(), num: parseInt(match[2], 10) } : { prefix: base.toLowerCase(), num: null };
}

/** Strips before/after-style markers so "BEFORE_001" and "AFTER_001" are still recognized as a pair (spec section 12). */
function stripBeforeAfterMarker(prefix: string): string {
  return prefix.replace(/^(before|after|pre|post|전|후)[_\-\s]*/i, '');
}

function filenameSimilarity(nameA: string, nameB: string): number {
  const a = parseFilename(nameA);
  const b = parseFilename(nameB);
  const normA = stripBeforeAfterMarker(a.prefix);
  const normB = stripBeforeAfterMarker(b.prefix);

  if (a.num !== null && b.num !== null && normA === normB) {
    const diff = Math.abs(a.num - b.num);
    return diff === 0 ? 1 : Math.max(0, 1 - diff / 20);
  }
  if (a.prefix === b.prefix) return 0.5;

  const minLen = Math.min(a.prefix.length, b.prefix.length);
  let common = 0;
  while (common < minLen && a.prefix[common] === b.prefix[common]) common++;
  const maxLen = Math.max(a.prefix.length, b.prefix.length);
  return maxLen > 0 ? common / maxLen : 0;
}
