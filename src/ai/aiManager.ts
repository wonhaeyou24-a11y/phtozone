import type { AIProvider, AIImageInput } from './aiProvider';
import { claudeAdapter } from './providers/claudeAdapter';
import { openaiAdapter } from './providers/openaiAdapter';
import { geminiAdapter } from './providers/geminiAdapter';
import { toExportImage } from '../excel/imageExport';
import type { Photo } from '../types/photo';

export const AI_PROVIDERS: AIProvider[] = [claudeAdapter, openaiAdapter, geminiAdapter];

export function getProvider(id: string): AIProvider | undefined {
  return AI_PROVIDERS.find((p) => p.id === id);
}

async function toAIImage(photo: Photo): Promise<AIImageInput> {
  const exported = await toExportImage(photo.originalBlob);
  return { id: photo.photoId, dataUrl: exported?.dataUrl ?? '', fileName: photo.originalFileName };
}

export interface AIAnalysisOutcome {
  photoId: string; // group's before photo id, used as a stable key by callers
  aiScore: number;
  recommendedAfterPhotoId: string | null;
  reasoning: string;
}

/**
 * Runs one group's before/after candidates through the selected AI provider. Never throws to the
 * caller — network/parse failures come back as a result with an error message instead, so one
 * bad call doesn't stop a batch "AI 2차 분석" run over many groups (spec section 42).
 */
export async function runAIMatchAnalysis(
  providerId: string,
  apiKey: string,
  model: string,
  beforePhoto: Photo,
  candidatePhotos: Photo[],
  baseScore: number,
): Promise<{ ok: true; outcome: AIAnalysisOutcome } | { ok: false; error: string }> {
  const provider = getProvider(providerId);
  if (!provider) return { ok: false, error: `알 수 없는 AI Provider: ${providerId}` };
  if (candidatePhotos.length === 0) return { ok: false, error: '비교할 후 사진 후보가 없습니다.' };

  try {
    const beforeImage = await toAIImage(beforePhoto);
    const candidates = await Promise.all(candidatePhotos.map(toAIImage));
    const result = await provider.analyzeMatch({ beforeImage, candidates, baseScore }, apiKey, model);
    return {
      ok: true,
      outcome: {
        photoId: beforePhoto.photoId,
        aiScore: result.aiScore,
        recommendedAfterPhotoId: result.recommendedCandidateId,
        reasoning: result.reasoning,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'AI 분석 중 알 수 없는 오류가 발생했습니다.' };
  }
}
