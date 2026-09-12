import type { Photo } from '../types/photo';
import type { MatchConfig } from './config';
import type { MatchFactorScore } from './types';
import { hammingDistance, histogramSimilarity } from '../photo/imageAnalyzer';

export function scoreImageFeature(a: Photo, b: Photo, config: MatchConfig): MatchFactorScore {
  const max = config.weights.imageFeature;
  if (!a.imageHash || !b.imageHash) {
    return { key: 'imageFeature', label: '이미지 특징', applicable: false, score: 0, maxScore: max, detail: '분석 안됨' };
  }
  const distance = hammingDistance(a.imageHash, b.imageHash);
  const ratio = Math.max(0, 1 - distance / 64);
  const score = Math.round(max * ratio);
  return {
    key: 'imageFeature',
    label: '이미지 특징',
    applicable: true,
    score,
    maxScore: max,
    detail: `유사도 ${(ratio * 100).toFixed(0)}%`,
  };
}

export function scoreColorStructure(a: Photo, b: Photo, config: MatchConfig): MatchFactorScore {
  const max = config.weights.colorStructure;
  if (!a.colorHistogram || !b.colorHistogram) {
    return { key: 'colorStructure', label: '구조/색상', applicable: false, score: 0, maxScore: max, detail: '분석 안됨' };
  }
  const similarity = histogramSimilarity(a.colorHistogram, b.colorHistogram);
  const score = Math.round(max * similarity);
  return {
    key: 'colorStructure',
    label: '구조/색상',
    applicable: true,
    score,
    maxScore: max,
    detail: `유사도 ${(similarity * 100).toFixed(0)}%`,
  };
}
