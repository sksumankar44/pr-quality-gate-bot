// Groq — FREE, extremely fast inference on open models (Llama 3.3, etc.).
// OpenAI-compatible Chat Completions API.
// Docs: https://console.groq.com/docs/api-reference
import config from '../../config.js';

export async function groqReview({ system, user }) {
  const { apiKey, model } = config.ai.groq;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
    throw new Error(`Groq API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const out = data?.choices?.[0]?.message?.content || '';
  if (!out) throw new Error('Groq returned an empty response');
  return out.trim();
}
