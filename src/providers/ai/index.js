// AI provider factory. All providers expose the same async interface:
//   review({ system, user }) -> string   (the review text / markdown)
// Switch providers by setting AI_PROVIDER in .env — nothing else changes.
import config from '../../config.js';
import { geminiReview } from './gemini.js';
import { groqReview } from './groq.js';
import { openaiReview } from './openai.js';
import { claudeReview } from './claude.js';

const PROVIDERS = {
  gemini: geminiReview,
  groq: groqReview,
  openai: openaiReview,
  claude: claudeReview,
};

export function getAIProvider(name = config.ai.provider) {
  const fn = PROVIDERS[name];
  if (!fn) {
    throw new Error(
      `Unknown AI_PROVIDER "${name}". Use one of: ${Object.keys(PROVIDERS).join(', ')}`
    );
  }
  return fn;
}

/**
 * Run a review through the configured provider.
 * @param {{system: string, user: string}} prompt
 * @returns {Promise<string>}
 */
export async function runAIReview(prompt) {
  const provider = getAIProvider();
  return provider(prompt);
}
