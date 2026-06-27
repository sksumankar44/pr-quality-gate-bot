// OpenAI — paid. Kept for parity / drop-in switching.
// Docs: https://platform.openai.com/docs/api-reference/chat
import config from '../../config.js';

export async function openaiReview({ system, user }) {
  const { apiKey, model } = config.ai.openai;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 2048,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const out = data?.choices?.[0]?.message?.content || '';
  if (!out) throw new Error('OpenAI returned an empty response');
  return out.trim();
}
