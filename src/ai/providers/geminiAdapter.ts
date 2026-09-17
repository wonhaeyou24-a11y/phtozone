import type { AIProvider, AIMatchRequest, AIMatchResponse } from '../aiProvider';
import { buildMatchPrompt, parseMatchResponse, stripDataUrlPrefix } from '../promptUtils';

/** Google Gemini generateContent adapter — the API key is passed as a query parameter, per Google's own client-side usage pattern. */
export const geminiAdapter: AIProvider = {
  id: 'gemini',
  label: 'Google Gemini',
  defaultModel: 'gemini-3.8-flash',
  models: [
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-pro-preview',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-flash-latest',
  ],

  async analyzeMatch(request: AIMatchRequest, apiKey: string, model: string): Promise<AIMatchResponse> {
    const allImages = [request.beforeImage, ...request.candidates];
    const parts: unknown[] = [{ text: buildMatchPrompt(request.candidates, request.baseScore) }];
    for (const img of allImages) {
      const { base64, mimeType } = stripDataUrlPrefix(img.dataUrl);
      parts.push({ inline_data: { mime_type: mimeType, data: base64 } });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts }] }),
    });

    if (!res.ok) throw new Error(`Gemini API 오류 (${res.status}): ${await res.text()}`);
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return parseMatchResponse(text, new Set(request.candidates.map((c) => c.id)));
  },
};
