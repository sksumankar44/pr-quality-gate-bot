// GitHub SCM adapter. Works for github.com (company + personal) and GitHub
// Enterprise Server (set GITHUB_API_BASE). Uses the REST API via fetch.
import config from '../../config.js';
import logger from '../../logger.js';

const PR_ACTIONS = new Set(['opened', 'reopened', 'synchronize', 'ready_for_review']);

function headers() {
  return {
    Authorization: `Bearer ${config.github.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'pr-quality-gate-bot',
  };
}

/**
 * Normalize a GitHub webhook payload into our common PR event shape.
 * Returns null if the event is not a PR action we care about.
 */
export function parseWebhook(req) {
  const event = req.headers['x-github-event'];
  if (event !== 'pull_request') return null;

  const p = req.body;
  if (!PR_ACTIONS.has(p.action)) return null;
  if (p.pull_request?.draft) return null; // skip drafts

  const [owner, repo] = p.repository.full_name.split('/');
  return {
    scm: 'github',
    owner,
    repo,
    repoFullName: p.repository.full_name,
    prNumber: p.pull_request.number,
    title: p.pull_request.title,
    branch: p.pull_request.head.ref,
    baseBranch: p.pull_request.base.ref,
    sha: p.pull_request.head.sha,
    url: p.pull_request.html_url,
    author: p.pull_request.user?.login,
    action: p.action,
  };
}

/**
 * Fetch the changed files (with patch/diff) for a PR.
 * Returns [{ filename, status, additions, deletions, patch }]
 */
export async function getDiff(evt) {
  const files = [];
  let page = 1;
  // GitHub paginates the files endpoint (100 per page).
  while (true) {
    const url = `${config.github.apiBase}/repos/${evt.owner}/${evt.repo}/pulls/${evt.prNumber}/files?per_page=100&page=${page}`;
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub getDiff error ${res.status}: ${text}`);
    }
    const batch = await res.json();
    files.push(
      ...batch.map((f) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch || '', // binary files have no patch
      }))
    );
    if (batch.length < 100) break;
    page += 1;
    if (page > 20) break; // safety cap on very large PRs
  }
  return files;
}

/**
 * Post a general comment on the PR (issue comment endpoint).
 */
export async function postComment(evt, body) {
  const url = `${config.github.apiBase}/repos/${evt.owner}/${evt.repo}/issues/${evt.prNumber}/comments`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub postComment error ${res.status}: ${text}`);
  }
  logger.info('Posted GitHub comment', { repo: evt.repoFullName, pr: evt.prNumber });
  return res.json();
}

export default { parseWebhook, getDiff, postComment };
