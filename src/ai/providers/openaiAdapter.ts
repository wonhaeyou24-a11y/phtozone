import type { AIProvider, AIMatchRequest, AIMatchResponse } from '../aiProvider';
import { buildMatchPrompt, parseMatchResponse } from '../promptUtils';

/**
 * OpenAI Chat Completions (vision) adapter. Note: OpenAI's API does not send permissive CORS
 * headers for browser-origin requests, so this call will likely be blocked by the browser unless
 * proxied through a backend — exactly the case spec section 21 anticipates ("향후 서버리스/백엔드
 * Proxy 방식으로 보안 강화가 가능하도록 Adapter 구조로 설계한다"). The adapter itself needs no
 * changes when that proxy is introduced; only the fetch URL would point at the proxy instead.
 */
export const openaiAdapter: AIProvider = {
  id: 'openai',
  label: 'OpenAI',
  defaultModel: 'gpt-4o',

  async analyzeMatch(request: AIMatchRequest, apiKey: string, model: string): Promise<AIMatchResponse> {
    const allImages = [request.beforeImage, ...request.candidates];
    const content: unknown[] = [{ type: 'text', text: buildMatchPrompt(request.candidates, request.baseScore) }];
    for (const img of allImages) {
      content.push({ type: 'image_url', image_url: { url: img.dataUrl } });
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 512,
        messages: [{ role: 'user', content }],
      }),
    });

    if (!res.ok) throw new Error(`OpenAI API 오류 (${res.status}): ${await res.text()}`);
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? '';
    return parseMatchResponse(text, new Set(request.candidates.map((c) => c.id)));
  },
};
