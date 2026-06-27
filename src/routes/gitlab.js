// GitLab webhook route. Verifies the secret token, normalizes the MR event,
// and processes the review in the background after a fast ACK.
import express from 'express';
import config from '../config.js';
import logger from '../logger.js';
import { verifyGitlabToken } from '../utils/signature.js';
import * as gitlab from '../providers/scm/gitlab.js';
import { reviewPullRequest } from '../core/reviewer.js';

export const gitlabRouter = express.Router();

gitlabRouter.post('/', (req, res) => {
  if (!config.gitlab.enabled) return res.status(503).send('GitLab integration disabled');

  const token = req.headers['x-gitlab-token'];
  if (!verifyGitlabToken(token, config.gitlab.webhookSecret)) {
    logger.warn('GitLab token verification failed');
    return res.status(401).send('Invalid token');
  }

  const evt = gitlab.parseWebhook(req);
  if (!evt) return res.status(200).send('Ignored (not a reviewable MR event)');

  res.status(202).send('Accepted');
  reviewPullRequest(evt, gitlab).catch((err) =>
    logger.error('GitLab review failed', { err: String(err), repo: evt.repoFullName, mr: evt.prNumber })
  );
});

export default gitlabRouter;
