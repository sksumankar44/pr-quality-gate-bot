// Microsoft Teams notifications via an Incoming Webhook (or Power Automate
// "When a webhook request is received" flow that posts an Adaptive Card).
// Setup: Teams channel -> ... -> Connectors / Workflows -> Incoming Webhook.
import config from '../../config.js';
import logger from '../../logger.js';

export async function notifyTeams({ title, text, url }) {
  const webhook = config.notify.teamsWebhookUrl;
  if (!webhook) {
    logger.warn('TEAMS_WEBHOOK_URL not set; skipping Teams notification');
    return;
  }

  // MessageCard format — broadly supported by Teams incoming webhooks.
  const card = {
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    summary: title,
    themeColor: '0078D7',
    title,
    text,
    potentialAction: url
      ? [
          {
            '@type': 'OpenUri',
            name: 'Open PR / MR',
            targets: [{ os: 'default', uri: url }],
          },
        ]
      : [],
  };

  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(card),
  });
  if (!res.ok) {
    const t = await res.text();
    logger.error(`Teams notify failed ${res.status}: ${t}`);
  }
}
