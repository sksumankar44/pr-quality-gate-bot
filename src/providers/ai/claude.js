// Anthropic Claude — paid, very high quality reviews.
// Docs: https://docs.anthropic.com/en/api/messages
import config from '../../config.js';

export async function claudeReview({ system, user }) {
  const { apiKey, model } = config.ai.claude;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      temperature: 0.2,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const out = (data?.content || []).map((b) => b.text || '').join('');
  if (!out) throw new Error('Claude returned an empty response');
  return out.trim();
}
