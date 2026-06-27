// Central configuration. Reads from environment (.env) and exposes a typed-ish
// config object. Keeping this in one place makes the rest of the code clean.
import dotenv from 'dotenv';
dotenv.config();

const bool = (v, fallback = false) =>
  v === undefined ? fallback : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());

const int = (v, fallback) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

const list = (v) =>
  (v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const config = {
  port: int(process.env.PORT, 3000),
  logLevel: process.env.LOG_LEVEL || 'info',

  ai: {
    provider: (process.env.AI_PROVIDER || 'gemini').toLowerCase(),
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    },
    claude: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
    },
  },

  github: {
    enabled: bool(process.env.GITHUB_ENABLED, true),
    token: process.env.GITHUB_TOKEN,
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
    apiBase: (process.env.GITHUB_API_BASE || 'https://api.github.com').replace(/\/$/, ''),
  },

  gitlab: {
    enabled: bool(process.env.GITLAB_ENABLED, false),
    token: process.env.GITLAB_TOKEN,
    webhookSecret: process.env.GITLAB_WEBHOOK_SECRET,
    apiBase: (process.env.GITLAB_API_BASE || 'https://gitlab.com/api/v4').replace(/\/$/, ''),
  },

  jira: {
    enabled: bool(process.env.JIRA_ENABLED, false),
    baseUrl: (process.env.JIRA_BASE_URL || '').replace(/\/$/, ''),
    email: process.env.JIRA_EMAIL,
    apiToken: process.env.JIRA_API_TOKEN,
    ticketRegex: process.env.JIRA_TICKET_REGEX || '[A-Z][A-Z0-9]+-\\d+',
  },

  notify: {
    provider: (process.env.NOTIFY_PROVIDER || 'none').toLowerCase(),
    teamsWebhookUrl: process.env.TEAMS_WEBHOOK_URL,
    slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
  },

  behaviour: {
    maxDiffChars: int(process.env.MAX_DIFF_CHARS, 60000),
    reviewFileExtensions: list(process.env.REVIEW_FILE_EXTENSIONS),
    checkJiraBranch: bool(process.env.CHECK_JIRA_BRANCH, true),
    checkTestsAdded: bool(process.env.CHECK_TESTS_ADDED, true),
  },
};

export default config;
