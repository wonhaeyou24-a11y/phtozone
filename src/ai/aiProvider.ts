// AI Provider adapter interface (spec section 23) — the rest of the app depends only on this
// shape, never on a specific vendor's SDK/API, so adding a new provider never touches existing code.

export interface AIImageInput {
  id: string;
  /** Full data: URL (e.g. "data:image/jpeg;base64,...") */
  dataUrl: string;
  fileName: string;
}

export interface AIMatchRequest {
  beforeImage: AIImageInput;
  candidates: AIImageInput[];
  /** The Match Engine's existing score, given as context — the AI is a second opinion, not a replacement. */
  baseScore: number;
}

export interface AIMatchResponse {
  recommendedCandidateId: string | null;
  /** 0-100 */
  aiScore: number;
  reasoning: string;
}

export interface AIProvider {
  id: 'claude' | 'openai' | 'gemini';
  label: string;
  defaultModel: string;
  /** Known selectable model ids for this provider, shown as a dropdown in AI settings. */
  models: string[];
  analyzeMatch(request: AIMatchRequest, apiKey: string, model: string): Promise<AIMatchResponse>;
}
