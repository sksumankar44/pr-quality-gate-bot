// Express app wiring. Captures the raw body (needed for GitHub HMAC) and
// mounts the webhook routes plus a health check.
import express from 'express';
import config from './config.js';
import logger from './logger.js';
import { githubRouter } from './routes/github.js';
import { gitlabRouter } from './routes/gitlab.js';

export function createServer() {
  const app = express();

  // Capture the raw body so we can verify webhook signatures, then JSON-parse.
  app.use(
    express.json({
      limit: '5mb',
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  // Health check — used by Render/uptime monitors.
  app.get('/', (_req, res) => res.json({ ok: true, service: 'pr-quality-gate-bot' }));
  app.get('/health', (_req, res) =>
    res.json({
      ok: true,
      aiProvider: config.ai.provider,
      github: config.github.enabled,
      gitlab: config.gitlab.enabled,
      jira: config.jira.enabled,
      notify: config.notify.provider,
    })
  );

  // Webhook endpoints.
  app.use('/webhook/github', githubRouter);
  app.use('/webhook/gitlab', gitlabRouter);

  // Fallback error handler.
  app.use((err, _req, res, _next) => {
    logger.error('Unhandled error', { err: String(err) });
    res.status(500).send('Internal error');
  });

  return app;
}

export default createServer;
