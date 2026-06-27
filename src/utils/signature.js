// Webhook authenticity helpers. Both compare in constant time to avoid timing attacks.
import crypto from 'node:crypto';

/**
 * Verify a GitHub webhook using the X-Hub-Signature-256 header.
 * GitHub sends:  sha256=<hex hmac of the raw body using the shared secret>
 */
export function verifyGithubSignature(rawBody, signatureHeader, secret) {
  if (!secret) return true; // no secret configured -> skip (not recommended for prod)
  if (!signatureHeader) return false;
  const expected =
    'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqual(signatureHeader, expected);
}

/**
 * Verify a GitLab webhook. GitLab sends the secret verbatim in X-Gitlab-Token.
 */
export function verifyGitlabToken(tokenHeader, secret) {
  if (!secret) return true; // no secret configured -> skip
  if (!tokenHeader) return false;
  return safeEqual(tokenHeader, secret);
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
