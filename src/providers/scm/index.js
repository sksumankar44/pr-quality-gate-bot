// SCM factory — returns the right adapter (github | gitlab). Each adapter has
// the same interface: parseWebhook(req), getDiff(evt), postComment(evt, body).
import * as github from './github.js';
import * as gitlab from './gitlab.js';

const ADAPTERS = { github, gitlab };

export function getSCM(name) {
  const a = ADAPTERS[name];
  if (!a) throw new Error(`Unknown SCM "${name}"`);
  return a;
}

export { github, gitlab };
