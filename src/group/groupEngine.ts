import type { Photo } from '../types/photo';
import type { Group, ReviewStatus } from '../types/project';
import { compare } from '../matching/matchEngine';
import { DEFAULT_MATCH_CONFIG, type MatchConfig } from '../matching/config';
import type { ConfidenceLevel } from '../matching/types';
import { recommendBeforeAfter } from './beforeAfterRecommender';

export interface PairMatch {
  photoIdA: string;
  photoIdB: string;
  baseScore: number;
  confidence: ConfidenceLevel;
}

export interface AutoGroupResult {
  groups: Group[];
  unmatchedPhotoIds: string[];
  pairMatches: PairMatch[];
}

/**
 * Clusters photos into groups using pairwise Match Engine scores (spec sections 7-13):
 * any two photos scoring above the "review" confidence threshold are linked, and connected
 * photos (via any chain of links) form one group — so a group isn't limited to exactly 2 photos
 * (spec section 13: "한 위치에 사진이 2장만 있다는 가정을 하지 않는다").
 * A photo connected to nothing stays unmatched rather than becoming a 1-photo group.
 */
export function autoGroupPhotos(
  photos: Photo[],
  projectId: string,
  config: MatchConfig = DEFAULT_MATCH_CONFIG,
): AutoGroupResult {
  const photoById = new Map(photos.map((p) => [p.photoId, p]));

  const pairMatches: PairMatch[] = [];
  for (let i = 0; i < photos.length; i++) {
    for (let j = i + 1; j < photos.length; j++) {
      const result = compare(photos[i], photos[j], config);
      // A pair only links two photos into a group when there's *enough* corroborating evidence —
      // a thin-evidence pair (e.g. only matching timestamps, no GPS/image data) must never bridge
      // two otherwise-unrelated photos into one group via transitive union-find merging.
      if (result.confidence !== 'UNMATCHED' && result.evidenceCoverage >= config.minEvidenceCoverage) {
        pairMatches.push({
          photoIdA: photos[i].photoId,
          photoIdB: photos[j].photoId,
          baseScore: result.baseScore,
          confidence: result.confidence,
        });
      }
    }
  }

  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let root = parent.get(x) ?? x;
    while (parent.has(root) && parent.get(root) !== root) root = parent.get(root)!;
    parent.set(x, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const photo of photos) parent.set(photo.photoId, photo.photoId);
  for (const pair of pairMatches) union(pair.photoIdA, pair.photoIdB);

  const clusters = new Map<string, string[]>();
  for (const photo of photos) {
    const root = find(photo.photoId);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root)!.push(photo.photoId);
  }

  const now = new Date().toISOString();
  const groups: Group[] = [];
  const unmatchedPhotoIds: string[] = [];

  for (const photoIds of clusters.values()) {
    if (photoIds.length < 2) {
      unmatchedPhotoIds.push(...photoIds);
      continue;
    }

    const idSet = new Set(photoIds);
    const relevantPairs = pairMatches.filter((p) => idSet.has(p.photoIdA) && idSet.has(p.photoIdB));
    const avgScore =
      relevantPairs.length > 0
        ? Math.round(relevantPairs.reduce((sum, p) => sum + p.baseScore, 0) / relevantPairs.length)
        : 0;

    const groupPhotos = photoIds.map((id) => photoById.get(id)!).filter(Boolean);
    const split = recommendBeforeAfter(groupPhotos);

    groups.push({
      groupId: crypto.randomUUID(),
      projectId,
      photoIds,
      beforePhotoIds: split.beforePhotoIds,
      afterPhotoIds: split.afterPhotoIds,
      representativeBeforePhotoId: split.representativeBeforePhotoId,
      representativeAfterPhotoId: split.representativeAfterPhotoId,
      matchScore: avgScore,
      baseScore: avgScore,
      matchMethod: 'AUTO',
      autoResult: {
        beforePhotoIds: split.beforePhotoIds,
        afterPhotoIds: split.afterPhotoIds,
        representativeBeforePhotoId: split.representativeBeforePhotoId,
        representativeAfterPhotoId: split.representativeAfterPhotoId,
        matchScore: avgScore,
        matchMethod: 'AUTO',
      },
      reviewStatus: classifyGroupStatus(avgScore, config),
      manualOverride: false,
      locked: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  return { groups, unmatchedPhotoIds, pairMatches };
}

function classifyGroupStatus(score: number, config: MatchConfig): ReviewStatus {
  const { recommended, review } = config.confidenceThresholds;
  if (score >= recommended) return 'HIGH_CONFIDENCE';
  if (score >= review) return 'NEEDS_REVIEW';
  return 'UNMATCHED';
}
