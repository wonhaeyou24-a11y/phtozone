import type { Photo } from '../types/photo';
import type { Group } from '../types/project';
import { recommendBeforeAfter } from './beforeAfterRecommender';

type Side = 'before' | 'after';

function touch(
  group: Group,
): Pick<Group, 'manualOverride' | 'matchMethod' | 'reviewStatus' | 'finalScore' | 'updatedAt'> {
  return {
    manualOverride: true,
    matchMethod: 'MANUAL',
    reviewStatus: group.locked ? group.reviewStatus : 'MANUAL',
    // Spec section 49: a manual edit always wins — record it as such rather than leaving the
    // score reading as if it were still the automatic (or AI) recommendation.
    finalScore: 'MANUAL',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Locks in a group as final (spec section 20). Locked groups are protected from automatic
 * re-grouping/AI re-analysis (enforced in groupStore.runAutoGrouping) and from further manual
 * edits until explicitly unlocked — finalizing is meant to be a deliberate, protective action.
 */
export function finalizeGroup(group: Group): Group {
  return { ...group, locked: true, reviewStatus: 'FINALIZED', updatedAt: new Date().toISOString() };
}

export function unlockGroup(group: Group): Group {
  return { ...group, locked: false, reviewStatus: 'MANUAL', updatedAt: new Date().toISOString() };
}

/** Overrides where the "after" photo gets inserted in the original MODE B Excel (spec section 43). */
export function setAfterInsertAnchor(group: Group, anchor: string | undefined): Group {
  if (group.locked) return group;
  return { ...group, afterInsertAnchor: anchor, ...touch(group) };
}

/**
 * Records an AI 2차 분석 result without disturbing the rule-based baseScore (spec section 22:
 * "baseScore/aiScore/finalScore" stay separate). Skipped on locked groups (spec section 20) and
 * on groups the user has already manually finalized — AI runs are a suggestion, never an override.
 */
export function applyAIResult(group: Group, aiScore: number): Group {
  if (group.locked || group.finalScore === 'MANUAL') return group;
  return {
    ...group,
    aiScore,
    aiAnalyzed: true,
    finalScore: aiScore,
    updatedAt: new Date().toISOString(),
  };
}

/** Changes which photo is the representative before/after shot (spec section 14, 17). */
export function setRepresentative(group: Group, side: Side, photoId: string): Group {
  if (group.locked) return group;
  const key = side === 'before' ? 'representativeBeforePhotoId' : 'representativeAfterPhotoId';
  return { ...group, [key]: photoId, ...touch(group) };
}

/** Swaps the before/after assignment within a group (spec section 11, 17). */
export function swapBeforeAfter(group: Group): Group {
  if (group.locked) return group;
  return {
    ...group,
    beforePhotoIds: group.afterPhotoIds,
    afterPhotoIds: group.beforePhotoIds,
    representativeBeforePhotoId: group.representativeAfterPhotoId,
    representativeAfterPhotoId: group.representativeBeforePhotoId,
    ...touch(group),
  };
}

/**
 * Removes one photo from a group. Returns null only if the group would become completely empty —
 * callers should treat that as "disband the group". A group with photos on only one side (e.g. a
 * MODE B "before" photo whose "after" match just got removed) is kept rather than disbanded: for
 * MODE B this is exactly what lets that page keep showing up in the matching UI to be re-matched,
 * instead of silently falling back into the general unmatched pool with its Excel-origin context lost.
 */
export function removePhotoFromGroup(group: Group, photoId: string): Group | null {
  if (group.locked) return group;
  const photoIds = group.photoIds.filter((id) => id !== photoId);
  if (photoIds.length === 0) return null;

  const beforePhotoIds = group.beforePhotoIds.filter((id) => id !== photoId);
  const afterPhotoIds = group.afterPhotoIds.filter((id) => id !== photoId);

  return {
    ...group,
    photoIds,
    beforePhotoIds,
    afterPhotoIds,
    representativeBeforePhotoId:
      group.representativeBeforePhotoId === photoId ? beforePhotoIds[0] : group.representativeBeforePhotoId,
    representativeAfterPhotoId:
      group.representativeAfterPhotoId === photoId ? afterPhotoIds[0] : group.representativeAfterPhotoId,
    ...touch(group),
  };
}

/** Adds a previously-unmatched photo into an existing group on the given side (spec section 17, 18). */
export function addPhotoToGroup(group: Group, photo: Photo, side: Side): Group {
  if (group.locked || group.photoIds.includes(photo.photoId)) return group;

  const photoIds = [...group.photoIds, photo.photoId];
  const beforePhotoIds = side === 'before' ? [...group.beforePhotoIds, photo.photoId] : group.beforePhotoIds;
  const afterPhotoIds = side === 'after' ? [...group.afterPhotoIds, photo.photoId] : group.afterPhotoIds;

  return {
    ...group,
    photoIds,
    beforePhotoIds,
    afterPhotoIds,
    representativeBeforePhotoId: group.representativeBeforePhotoId ?? beforePhotoIds[0],
    representativeAfterPhotoId: group.representativeAfterPhotoId ?? afterPhotoIds[0],
    ...touch(group),
  };
}

/** Combines two groups into one (spec section 17: "그룹 합치기"). Keeps groupA's id. */
export function mergeGroups(groupA: Group, groupB: Group): Group {
  if (groupA.locked || groupB.locked) return groupA;
  const photoIds = [...new Set([...groupA.photoIds, ...groupB.photoIds])];
  const beforePhotoIds = [...new Set([...groupA.beforePhotoIds, ...groupB.beforePhotoIds])];
  const afterPhotoIds = [...new Set([...groupA.afterPhotoIds, ...groupB.afterPhotoIds])];

  return {
    ...groupA,
    photoIds,
    beforePhotoIds,
    afterPhotoIds,
    representativeBeforePhotoId: groupA.representativeBeforePhotoId ?? beforePhotoIds[0],
    representativeAfterPhotoId: groupA.representativeAfterPhotoId ?? afterPhotoIds[0],
    ...touch(groupA),
  };
}

/**
 * Splits the given photos out of a group into their own new group (spec section 17: "그룹 분리").
 * Returns the shrunk original group (or null if it would drop below 2 photos — disband it) and the
 * new group (or null if fewer than 2 photos were split out — those photos become unmatched instead).
 */
export function splitGroup(
  group: Group,
  photoIdsToSplit: string[],
  photosById: Map<string, Photo>,
): { remaining: Group | null; created: Group | null } {
  if (group.locked) return { remaining: group, created: null };
  const splitSet = new Set(photoIdsToSplit);
  const remainingPhotoIds = group.photoIds.filter((id) => !splitSet.has(id));

  const remaining =
    remainingPhotoIds.length < 2
      ? null
      : {
          ...group,
          photoIds: remainingPhotoIds,
          beforePhotoIds: group.beforePhotoIds.filter((id) => !splitSet.has(id)),
          afterPhotoIds: group.afterPhotoIds.filter((id) => !splitSet.has(id)),
          representativeBeforePhotoId: splitSet.has(group.representativeBeforePhotoId ?? '')
            ? group.beforePhotoIds.find((id) => !splitSet.has(id))
            : group.representativeBeforePhotoId,
          representativeAfterPhotoId: splitSet.has(group.representativeAfterPhotoId ?? '')
            ? group.afterPhotoIds.find((id) => !splitSet.has(id))
            : group.representativeAfterPhotoId,
          ...touch(group),
        };

  if (photoIdsToSplit.length < 2) {
    return { remaining, created: null };
  }

  const splitPhotos = photoIdsToSplit.map((id) => photosById.get(id)).filter((p): p is Photo => !!p);
  const split = recommendBeforeAfter(splitPhotos);
  const now = new Date().toISOString();
  const created: Group = {
    groupId: crypto.randomUUID(),
    projectId: group.projectId,
    photoIds: photoIdsToSplit,
    beforePhotoIds: split.beforePhotoIds,
    afterPhotoIds: split.afterPhotoIds,
    representativeBeforePhotoId: split.representativeBeforePhotoId,
    representativeAfterPhotoId: split.representativeAfterPhotoId,
    matchScore: group.matchScore,
    baseScore: group.baseScore,
    matchMethod: 'MANUAL',
    reviewStatus: 'MANUAL',
    manualOverride: true,
    locked: false,
    createdAt: now,
    updatedAt: now,
  };

  return { remaining, created };
}

/** Creates a brand-new group from a set of previously-unmatched photos (spec section 17: "그룹 생성"). */
export function createGroupFromPhotos(projectId: string, photos: Photo[]): Group {
  const split = recommendBeforeAfter(photos);
  const now = new Date().toISOString();
  return {
    groupId: crypto.randomUUID(),
    projectId,
    photoIds: photos.map((p) => p.photoId),
    beforePhotoIds: split.beforePhotoIds,
    afterPhotoIds: split.afterPhotoIds,
    representativeBeforePhotoId: split.representativeBeforePhotoId,
    representativeAfterPhotoId: split.representativeAfterPhotoId,
    matchMethod: 'MANUAL',
    reviewStatus: 'MANUAL',
    manualOverride: true,
    locked: false,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Creates a one-page MODE B group for a single Excel-extracted "before" photo, with no "after"
 * photo yet (spec section 27: one Excel page -> one photo -> one future group; the after side is
 * filled in later by the MODE B matching UI, Step 16).
 */
export function createGroupForBeforePhoto(projectId: string, beforePhoto: Photo): Group {
  const now = new Date().toISOString();
  return {
    groupId: crypto.randomUUID(),
    projectId,
    photoIds: [beforePhoto.photoId],
    beforePhotoIds: [beforePhoto.photoId],
    afterPhotoIds: [],
    representativeBeforePhotoId: beforePhoto.photoId,
    matchMethod: 'EXCEL_IMPORT',
    reviewStatus: 'UNMATCHED',
    manualOverride: false,
    locked: false,
    createdAt: now,
    updatedAt: now,
  };
}
