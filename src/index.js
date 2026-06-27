// Entry point. Starts the HTTP server and logs the active configuration.
import config from './config.js';
import logger from './logger.js';
import { createServer } from './server.js';

const app = createServer();

app.listen(config.port, () => {
  logger.info('PR Quality Gate Bot started', {
    port: config.port,
    aiProvider: config.ai.provider,
    github: config.github.enabled,
    gitlab: config.gitlab.enabled,
    jira: config.jira.enabled,
    notify: config.notify.provider,
  });
  logger.info('Webhook endpoints', {
    github: `POST /webhook/github`,
    gitlab: `POST /webhook/gitlab`,
    health: `GET /health`,
  });
});

// Make sure unexpected errors are logged, not silently swallowed.
process.on('unhandledRejection', (reason) =>
  logger.error('Unhandled promise rejection', { reason: String(reason) })
);
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { err: String(err) });
});
