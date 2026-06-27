// The orchestrator. Given a normalized PR/MR event and its SCM adapter, it:
//   1. fetches the diff
//   2. runs the AI review and posts it as a comment
//   3. checks the branch for a Jira ticket (+ optional live verify)
//   4. checks whether tests were added
//   5. sends an optional Teams/Slack notification
// Each step is isolated so one failure doesn't sink the whole review.
import config from '../config.js';
import logger from '../logger.js';
import { runAIReview } from '../providers/ai/index.js';
import { notify } from '../providers/notify/index.js';
import { extractTicket, verifyTicket } from '../integrations/jira.js';
import { filterFiles, buildDiffText, summarize } from './diffParser.js';
import { buildReviewPrompt } from './promptBuilder.js';
import { checkTestsAdded } from './testCheck.js';

const BOT_HEADER = '🤖 **PR Quality Gate** — automated review';

export async function reviewPullRequest(evt, scm) {
  logger.info('Starting review', {
    scm: evt.scm,
    repo: evt.repoFullName,
    pr: evt.prNumber,
    branch: evt.branch,
  });

  // 1) Fetch + prepare the diff -------------------------------------------------
  const allFiles = await scm.getDiff(evt);
  const files = filterFiles(allFiles);
  const stats = summarize(allFiles);

  const notes = []; // collected secondary checks appended under the AI review

  // 2) AI review ----------------------------------------------------------------
  let aiSection;
  if (files.length === 0) {
    aiSection = '_No reviewable text changes were found in this diff (binary or filtered files only)._';
  } else {
    const { text, truncated, includedFiles } = buildDiffText(files);
    try {
      const prompt = buildReviewPrompt({ diffText: text, evt, truncated });
      const review = await runAIReview(prompt);
      aiSection = review;
      logger.info('AI review complete', {
        provider: config.ai.provider,
        files: includedFiles,
        truncated,
      });
    } catch (err) {
      logger.error('AI review failed', { err: String(err) });
      aiSection = `⚠️ The AI review could not be generated (\`${String(err.message || err)}\`). Other checks still ran below.`;
    }
  }

  // 3) Jira branch check --------------------------------------------------------
  let jiraNote = null;
  if (config.behaviour.checkJiraBranch) {
    jiraNote = await runJiraCheck(evt);
    if (jiraNote) notes.push(jiraNote.text);
  }

  // 4) Tests-added check --------------------------------------------------------
  if (config.behaviour.checkTestsAdded) {
    const { hasTests, hasCodeChanges, testFiles } = checkTestsAdded(allFiles);
    if (hasCodeChanges && !hasTests) {
      notes.push(
        '🧪 **No tests detected** — this change modifies code but adds no test files. Consider adding tests before merge.'
      );
    } else if (hasTests) {
      notes.push(`🧪 Tests detected: ${testFiles.length} test file(s) changed. 👍`);
    }
  }

  // 5) Compose + post a single consolidated comment ----------------------------
  const body = composeComment({ aiSection, notes, stats });
  await scm.postComment(evt, body);

  // 6) Notify (best-effort) -----------------------------------------------------
  await notify({
    title: `PR review posted: ${evt.repoFullName} #${evt.prNumber}`,
    text: `*${evt.title}* by ${evt.author || 'unknown'} on \`${evt.branch}\`.\n${
      jiraNote && !jiraNote.ok ? '⚠️ Jira ticket issue. ' : ''
    }${stats.fileCount} file(s), +${stats.additions}/-${stats.deletions}.`,
    url: evt.url,
  });

  logger.info('Review finished', { repo: evt.repoFullName, pr: evt.prNumber });
}

async function runJiraCheck(evt) {
  const ticket = extractTicket(evt.branch) || extractTicket(evt.title);
  if (!ticket) {
    return {
      ok: false,
      text:
        '📋 **Jira reminder** — no ticket id (e.g. `PROJ-123`) found in the branch name or title. ' +
        'Please link this change to a Jira ticket so work can be tracked (e.g. `feature/PROJ-42-short-desc`).',
    };
  }

  const result = await verifyTicket(ticket);
  if (result.exists === false) {
    return {
      ok: false,
      text: `📋 **Jira warning** — branch references \`${ticket}\` but that ticket was not found in Jira. Double-check the ticket id.`,
    };
  }
  if (result.exists === true) {
    const meta = result.summary ? ` — _${result.summary}_ (${result.status})` : '';
    return { ok: true, text: `📋 Jira ticket \`${ticket}\` linked${meta}. 👍` };
  }
  // exists === null -> regex matched but no live verification available
  return { ok: true, text: `📋 Jira ticket \`${ticket}\` detected in branch name. 👍` };
}

function composeComment({ aiSection, notes, stats }) {
  const parts = [
    BOT_HEADER,
    `<sub>${stats.fileCount} file(s) changed · +${stats.additions} / -${stats.deletions}</sub>`,
    '',
    aiSection,
  ];
  if (notes.length) {
    parts.push('', '---', '#### Quality gate checks', ...notes.map((n) => `- ${n}`));
  }
  parts.push(
    '',
    '<sub>Generated automatically. Treat as a first pass, not a replacement for human review.</sub>'
  );
  return parts.join('\n');
}

export default { reviewPullRequest };
