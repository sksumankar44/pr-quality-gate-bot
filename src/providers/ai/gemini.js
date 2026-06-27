// Google Gemini — the recommended FREE default.
// Docs: https://ai.google.dev/api/generate-content
import config from '../../config.js';

export async function geminiReview({ system, user }) {
  const { apiKey, model } = config.ai.gemini;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    // Gemini supports a dedicated system instruction.
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const out = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  if (!out) throw new Error('Gemini returned an empty response');
  return out.trim();
}
