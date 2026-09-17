import type { AIProvider, AIMatchRequest, AIMatchResponse } from '../aiProvider';
import { buildMatchPrompt, parseMatchResponse, stripDataUrlPrefix } from '../promptUtils';

/**
 * Anthropic Messages API adapter. Uses the `anthropic-dangerous-direct-browser-access` header,
 * which Anthropic provides specifically so client-side apps like this one can call the API
 * directly with a user-supplied key (no backend needed for V1 — spec section 21).
 */
export const claudeAdapter: AIProvider = {
  id: 'claude',
  label: 'Anthropic Claude',
  defaultModel: 'claude-sonnet-5',
  models: [
    'claude-opus-5',
    'claude-sonnet-5',
    'claude-fable-5-1',
    'claude-haiku-4-5-20251001',
  ],

  async analyzeMatch(request: AIMatchRequest, apiKey: string, model: string): Promise<AIMatchResponse> {
    const allImages = [request.beforeImage, ...request.candidates];
    const content: unknown[] = [{ type: 'text', text: buildMatchPrompt(request.candidates, request.baseScore) }];
    for (const img of allImages) {
      const { base64, mimeType } = stripDataUrlPrefix(img.dataUrl);
      content.push({ type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } });
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 512,
        messages: [{ role: 'user', content }],
      }),
    });

    if (!res.ok) throw new Error(`Claude API 오류 (${res.status}): ${await res.text()}`);
    const data = await res.json();
    const text = data?.content?.[0]?.text ?? '';
    return parseMatchResponse(text, new Set(request.candidates.map((c) => c.id)));
  },
};
