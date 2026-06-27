// Notification factory. NOTIFY_PROVIDER = teams | slack | none.
// You use Teams today; flip one env var to move to Slack later — no code change.
import config from '../../config.js';
import { notifyTeams } from './teams.js';
import { notifySlack } from './slack.js';

/**
 * Send a notification through the configured provider. Never throws — a failed
 * notification must not break the review flow.
 * @param {{title: string, text: string, url?: string}} msg
 */
export async function notify(msg) {
  try {
    switch (config.notify.provider) {
      case 'teams':
        return await notifyTeams(msg);
      case 'slack':
        return await notifySlack(msg);
      case 'none':
      default:
        return; // notifications disabled
    }
  } catch {
    // swallow — already logged inside provider
  }
}
