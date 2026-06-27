// Helpers to turn the raw list of changed files into something we can reason
// about and feed to the AI within token limits.
import config from '../config.js';

/**
 * Filter files by configured extensions (if any) and drop empty/binary patches.
 */
export function filterFiles(files) {
  const exts = config.behaviour.reviewFileExtensions;
  return files.filter((f) => {
    if (!f.patch) return false; // binary or no textual diff
    if (exts.length === 0) return true;
    return exts.some((ext) => f.filename.toLowerCase().endsWith(ext.toLowerCase()));
  });
}

/**
 * Build a compact, readable diff string for the prompt, trimming to the
 * configured character budget so we never blow the model's context window.
 * @returns {{ text: string, truncated: boolean, includedFiles: number }}
 */
export function buildDiffText(files) {
  const budget = config.behaviour.maxDiffChars;
  let text = '';
  let truncated = false;
  let includedFiles = 0;

  for (const f of files) {
    const header = `\n### File: ${f.filename}  (${f.status}, +${f.additions}/-${f.deletions})\n`;
    const block = header + '```diff\n' + f.patch + '\n```\n';
    if (text.length + block.length > budget) {
      truncated = true;
      break;
    }
    text += block;
    includedFiles += 1;
  }

  return { text: text.trim(), truncated, includedFiles };
}

/** Summary line for logging / notifications. */
export function summarize(files) {
  const additions = files.reduce((a, f) => a + (f.additions || 0), 0);
  const deletions = files.reduce((a, f) => a + (f.deletions || 0), 0);
  return { fileCount: files.length, additions, deletions };
}
