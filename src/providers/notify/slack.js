// Slack notifications via an Incoming Webhook.
// Setup: https://api.slack.com/messaging/webhooks
import config from '../../config.js';
import logger from '../../logger.js';

export async function notifySlack({ title, text, url }) {
  const webhook = config.notify.slackWebhookUrl;
  if (!webhook) {
    logger.warn('SLACK_WEBHOOK_URL not set; skipping Slack notification');
    return;
  }

  const blocks = [
    { type: 'section', text: { type: 'mrkdwn', text: `*${title}*\n${text}` } },
  ];
  if (url) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Open PR / MR' },
          url,
        },
      ],
    });
  }

  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `${title}\n${text}`, blocks }),
  });
  if (!res.ok) {
    const t = await res.text();
    logger.error(`Slack notify failed ${res.status}: ${t}`);
  }
}
