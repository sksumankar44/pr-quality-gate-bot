// Builds the system + user prompts for the AI reviewer. The team coding
// standards are injected as context so the review reflects YOUR conventions.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STANDARDS_PATH = path.resolve(__dirname, '../../standards/coding-standards.md');

let cachedStandards = null;
function loadStandards() {
  if (cachedStandards !== null) return cachedStandards;
  try {
    cachedStandards = fs.readFileSync(STANDARDS_PATH, 'utf8');
  } catch {
    cachedStandards = '(No custom coding standards file found.)';
  }
  return cachedStandards;
}

const SYSTEM_PROMPT = `You are a senior staff software engineer performing an automated pull request review.
You are precise, constructive, and concise. You only flag real, actionable issues — never invent problems.
You review the DIFF only (you cannot see the rest of the repo), so do not assume a bug just because a
function is not shown. If the diff looks clean, say so briefly instead of padding the review.

Focus areas, in priority order:
1. Bugs & logic errors (off-by-one, null/undefined, wrong conditions, race conditions).
2. Missing error handling (no try/catch around I/O, network, parsing, unawaited promises).
3. Security (hardcoded secrets/keys, SQL/command injection, missing input validation, unsafe eval, XSS).
4. Missing or weak input validation on external/user data.
5. Naming, readability, and dead code.

Apply the team's coding standards provided below.

Output format (GitHub/GitLab markdown):
- Start with a one-line verdict: "✅ Looks good" OR "⚠️ N issue(s) found".
- Then a markdown table with columns: Severity | File | Line/Area | Issue | Suggested fix.
  Severity is one of: 🔴 High, 🟡 Medium, 🔵 Low.
- For at most the top 2 issues, add a short fenced code block showing the corrected snippet.
- Keep the whole review under ~400 words. No filler, no praise sandwiches.`;

/**
 * @param {object} args
 * @param {string} args.diffText      compiled diff
 * @param {object} args.evt           normalized PR event
 * @param {boolean} args.truncated    whether the diff was trimmed
 * @returns {{ system: string, user: string }}
 */
export function buildReviewPrompt({ diffText, evt, truncated }) {
  const standards = loadStandards();

  const user = `## Team coding standards
${standards}

## Pull request
- Title: ${evt.title}
- Source branch: ${evt.branch}
- Target branch: ${evt.baseBranch}
${truncated ? '\n> NOTE: The diff was truncated to fit the context window; review what is shown.\n' : ''}
## Diff to review
${diffText}

Review the diff above following your instructions and the team standards.`;

  return { system: SYSTEM_PROMPT, user };
}
