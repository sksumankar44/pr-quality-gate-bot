// GitLab SCM adapter. Works for gitlab.com and self-hosted/company GitLab
// (set GITLAB_API_BASE). Uses the REST API v4 via fetch.
import config from '../../config.js';
import logger from '../../logger.js';

const MR_ACTIONS = new Set(['open', 'reopen', 'update']);

function headers() {
  return {
    'PRIVATE-TOKEN': config.gitlab.token,
    'User-Agent': 'pr-quality-gate-bot',
  };
}

/**
 * Normalize a GitLab Merge Request webhook into our common PR event shape.
 * Returns null if not a relevant MR action.
 */
export function parseWebhook(req) {
  const p = req.body;
  if (p.object_kind !== 'merge_request') return null;

  const attr = p.object_attributes || {};
  if (!MR_ACTIONS.has(attr.action)) return null;
  if (attr.work_in_progress) return null; // skip drafts/WIP

  // For "update" events, only proceed when new commits were pushed.
  if (attr.action === 'update' && !p.changes?.last_commit && !p.changes?.updated_at) {
    // best-effort: still allow, GitLab "update" fires for many reasons
  }

  return {
    scm: 'gitlab',
    projectId: p.project.id,
    repoFullName: p.project.path_with_namespace,
    prNumber: attr.iid, // GitLab uses internal id (iid) for MRs
    title: attr.title,
    branch: attr.source_branch,
    baseBranch: attr.target_branch,
    sha: attr.last_commit?.id,
    url: attr.url,
    author: p.user?.username,
    action: attr.action,
  };
}

/**
 * Fetch the changed files for an MR.
 * Returns [{ filename, status, additions, deletions, patch }]
 */
export async function getDiff(evt) {
  const url = `${config.gitlab.apiBase}/projects/${evt.projectId}/merge_requests/${evt.prNumber}/changes`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitLab getDiff error ${res.status}: ${text}`);
  }
  const data = await res.json();
  const changes = data.changes || [];
  return changes.map((c) => {
    const patch = c.diff || '';
    const additions = (patch.match(/^\+(?!\+\+)/gm) || []).length;
    const deletions = (patch.match(/^-(?!--)/gm) || []).length;
    let status = 'modified';
    if (c.new_file) status = 'added';
    else if (c.deleted_file) status = 'removed';
    else if (c.renamed_file) status = 'renamed';
    return {
      filename: c.new_path || c.old_path,
      status,
      additions,
      deletions,
      patch,
    };
  });
}

/**
 * Post a comment (note) on the MR.
 */
export async function postComment(evt, body) {
  const url = `${config.gitlab.apiBase}/projects/${evt.projectId}/merge_requests/${evt.prNumber}/notes`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitLab postComment error ${res.status}: ${text}`);
  }
  logger.info('Posted GitLab comment', { repo: evt.repoFullName, mr: evt.prNumber });
  return res.json();
}

export default { parseWebhook, getDiff, postComment };
