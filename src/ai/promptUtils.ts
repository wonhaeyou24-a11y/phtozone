import type { AIImageInput, AIMatchResponse } from './aiProvider';

export function buildMatchPrompt(candidates: AIImageInput[], baseScore: number): string {
  const list = candidates.map((c, i) => `${i + 1}. id="${c.id}" (파일명: ${c.fileName})`).join('\n');
  return [
    '당신은 건설 현장의 "전(before) 사진"과 "후(after) 사진"을 짝짓는 것을 돕는 보조 분석가입니다.',
    '첫 번째 이미지는 "전" 사진이고, 그 뒤로 이어지는 이미지들은 "후" 후보 사진들입니다.',
    '아래는 후보 목록과 각 이미지의 id입니다:',
    list,
    `참고로 규칙 기반 매칭 엔진이 계산한 1차 점수는 ${baseScore}점입니다.`,
    '같은 위치/시설물을 촬영한 것인지 이미지 내용을 직접 보고 판단해서, 가장 적합한 후보 하나를 고르세요.',
    '다른 설명 없이 아래 JSON 형식으로만 답하세요:',
    '{"recommendedCandidateId": "<가장 적합한 후보의 id, 없으면 null>", "aiScore": <0-100 정수>, "reasoning": "<한두 문장 근거>"}',
  ].join('\n');
}

/** Extracts and validates the {recommendedCandidateId, aiScore, reasoning} JSON out of a raw model reply. */
export function parseMatchResponse(text: string, validIds: Set<string>): AIMatchResponse {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI 응답에서 JSON을 찾을 수 없습니다.');
  const parsed = JSON.parse(match[0]);

  const recommendedCandidateId =
    typeof parsed.recommendedCandidateId === 'string' && validIds.has(parsed.recommendedCandidateId)
      ? parsed.recommendedCandidateId
      : null;
  const aiScore = Math.max(0, Math.min(100, Math.round(Number(parsed.aiScore) || 0)));
  const reasoning = typeof parsed.reasoning === 'string' ? parsed.reasoning : '';

  return { recommendedCandidateId, aiScore, reasoning };
}

/** Strips the "data:image/xxx;base64," prefix, leaving just the base64 payload. */
export function stripDataUrlPrefix(dataUrl: string): { base64: string; mimeType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) return { base64: dataUrl, mimeType: 'image/jpeg' };
  return { mimeType: match[1], base64: match[2] };
}
