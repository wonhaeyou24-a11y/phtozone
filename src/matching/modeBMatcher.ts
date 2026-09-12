import type { Photo } from '../types/photo';
import { compare } from './matchEngine';
import { DEFAULT_MATCH_CONFIG, type MatchConfig } from './config';
import type { MatchResult } from './types';

export interface ModeBCandidate {
  photo: Photo;
  result: MatchResult;
}

/**
 * Ranks candidate "after" photos against one "before" (Excel-extracted) photo, best match first
 * (spec section 29: MODE B reuses the same Match Engine as MODE A).
 */
export function rankAfterCandidates(
  beforePhoto: Photo,
  afterCandidates: Photo[],
  config: MatchConfig = DEFAULT_MATCH_CONFIG,
): ModeBCandidate[] {
  return afterCandidates
    .map((photo) => ({ photo, result: compare(beforePhoto, photo, config) }))
    .sort((a, b) => b.result.baseScore - a.result.baseScore);
}
