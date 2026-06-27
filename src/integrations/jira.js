// Jira integration. Two levels of checking:
//   1) extractTicket()  — regex on the branch name (always available, no API).
//   2) verifyTicket()   — live lookup via Jira REST API (optional; needs creds).
import config from '../config.js';
import logger from '../logger.js';

/**
 * Find a Jira ticket id (e.g. PROJ-123) in a string such as a branch name.
 * @returns {string|null} the ticket key, or null if none found.
 */
export function extractTicket(text) {
  if (!text) return null;
  const re = new RegExp(config.jira.ticketRegex);
  const m = text.match(re);
  return m ? m[0] : null;
}

/**
 * Verify a ticket actually exists in Jira (and return a little metadata).
 * Returns { exists: boolean, key, summary?, status?, error? }.
 * Safe to call even if Jira is disabled — returns { exists: null }.
 */
export async function verifyTicket(key) {
  if (!config.jira.enabled) return { exists: null, key };
  if (!key) return { exists: false, key };

  const { baseUrl, email, apiToken } = config.jira;
  if (!baseUrl || !email || !apiToken) {
    logger.warn('Jira enabled but credentials incomplete; skipping live lookup');
    return { exists: null, key };
  }

  const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
  const url = `${baseUrl}/rest/api/3/issue/${encodeURIComponent(key)}?fields=summary,status`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
    });
    if (res.status === 404) return { exists: false, key };
    if (!res.ok) {
      const t = await res.text();
      logger.error(`Jira lookup error ${res.status}: ${t}`);
      return { exists: null, key, error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    return {
      exists: true,
      key,
      summary: data?.fields?.summary,
      status: data?.fields?.status?.name,
    };
  } catch (err) {
    logger.error('Jira lookup failed', { err: String(err) });
    return { exists: null, key, error: String(err) };
  }
}
