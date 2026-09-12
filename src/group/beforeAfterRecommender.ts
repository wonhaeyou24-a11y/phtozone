import type { Photo } from '../types/photo';

export interface BeforeAfterSplit {
  beforePhotoIds: string[];
  afterPhotoIds: string[];
  representativeBeforePhotoId?: string;
  representativeAfterPhotoId?: string;
}

/**
 * Recommends which photos in a group are "before" vs "after" using capture time
 * (spec section 11: earlier -> before, later -> after). When there's a clear time gap between
 * two clusters (e.g. a "before" site visit and a later "after" visit), split there — this handles
 * groups with several photos on each side (spec section 13), not just exactly one before/one after.
 * Falls back to an even time-order split when timestamps are too close to show a clear gap.
 * This is only a starting recommendation — the user can swap/reassign at any point (sections 11, 17).
 */
export function recommendBeforeAfter(photos: Photo[]): BeforeAfterSplit {
  if (photos.length < 2) {
    // Not enough photos to distinguish before/after; leave unassigned for the user to place.
    return { beforePhotoIds: [], afterPhotoIds: [] };
  }

  const sorted = [...photos].sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());

  let splitIndex = Math.ceil(sorted.length / 2);
  let maxGap = -1;
  for (let i = 1; i < sorted.length; i++) {
    const gap = new Date(sorted[i].capturedAt).getTime() - new Date(sorted[i - 1].capturedAt).getTime();
    if (gap > maxGap) {
      maxGap = gap;
      splitIndex = i;
    }
  }

  const before = sorted.slice(0, splitIndex);
  const after = sorted.slice(splitIndex);

  return {
    beforePhotoIds: before.map((p) => p.photoId),
    afterPhotoIds: after.map((p) => p.photoId),
    representativeBeforePhotoId: before[0]?.photoId,
    representativeAfterPhotoId: after[0]?.photoId,
  };
}
