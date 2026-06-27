// GitHub webhook route. Verifies the signature, normalizes the event, and
// kicks off the review asynchronously (we ACK fast so GitHub doesn't time out).
import express from 'express';
import config from '../config.js';
import logger from '../logger.js';
import { verifyGithubSignature } from '../utils/signature.js';
import * as github from '../providers/scm/github.js';
import { reviewPullRequest } from '../core/reviewer.js';

export const githubRouter = express.Router();

githubRouter.post('/', (req, res) => {
  if (!config.github.enabled) return res.status(503).send('GitHub integration disabled');

  // Signature check against the raw body captured in server.js.
  const sig = req.headers['x-hub-signature-256'];
  if (!verifyGithubSignature(req.rawBody, sig, config.github.webhookSecret)) {
    logger.warn('GitHub signature verification failed');
    return res.status(401).send('Invalid signature');
  }

  // GitHub "ping" event when the webhook is first created.
  if (req.headers['x-github-event'] === 'ping') {
    return res.status(200).send('pong');
  }

  const evt = github.parseWebhook(req);
  if (!evt) return res.status(200).send('Ignored (not a reviewable PR event)');

  // Acknowledge immediately, then process in the background.
  res.status(202).send('Accepted');
  reviewPullRequest(evt, github).catch((err) =>
    logger.error('GitHub review failed', { err: String(err), repo: evt.repoFullName, pr: evt.prNumber })
  );
});

export default githubRouter;
