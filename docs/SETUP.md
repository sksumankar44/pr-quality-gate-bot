# Setup Guide

Step-by-step wiring for each integration. Do the AI + one SCM first to get a
working bot, then add the rest.

---

## 0. Prerequisites

- Node.js **18.17+** installed (`node -v`).
- The repo cloned locally, then:
  ```bash
  npm install
  cp .env.example .env      # PowerShell: Copy-Item .env.example .env
  ```
- A public URL for your server. For local testing use a tunnel:
  ```bash
  npx localtunnel --port 3000      # or ngrok http 3000 / cloudflared
  ```
  For production, use your Render URL (see [DEPLOYMENT.md](DEPLOYMENT.md)).

Your webhook URLs will be:
- GitHub → `https://<your-host>/webhook/github`
- GitLab → `https://<your-host>/webhook/gitlab`

---

## 1. Pick & configure the AI (free)

### Option A — Google Gemini (recommended, free)
1. Go to <https://aistudio.google.com/app/apikey> and create an API key.
2. In `.env`:
   ```env
   AI_PROVIDER=gemini
   GEMINI_API_KEY=your-key
   GEMINI_MODEL=gemini-2.0-flash
   ```

### Option B — Groq (free, very fast)
1. Get a key at <https://console.groq.com/keys>.
2. In `.env`:
   ```env
   AI_PROVIDER=groq
   GROQ_API_KEY=your-key
   GROQ_MODEL=llama-3.3-70b-versatile
   ```

### Option C / D — OpenAI or Claude (paid)
Set `AI_PROVIDER=openai` + `OPENAI_API_KEY`, or `AI_PROVIDER=claude` +
`ANTHROPIC_API_KEY`. Models default sensibly; override with `*_MODEL`.

> Tip: tune the actual review rules in
> [`standards/coding-standards.md`](../standards/coding-standards.md).

---

## 2. GitHub (company and/or personal)

The same setup works for `github.com` and GitHub Enterprise Server (set
`GITHUB_API_BASE`). You can connect personal and company orgs at once — just add
the webhook to each repo/org and use a token that can access them.

### 2a. Create a token
1. <https://github.com/settings/tokens> → **Generate new token**.
   - **Fine-grained** (recommended): grant the target repos
     *Pull requests: Read & write* and *Contents: Read*.
   - **Classic**: select the `repo` scope.
2. Put it in `.env`:
   ```env
   GITHUB_ENABLED=true
   GITHUB_TOKEN=ghp_xxx
   GITHUB_WEBHOOK_SECRET=make-up-a-long-random-string
   ```

### 2b. Add the webhook
Per repo: **Settings → Webhooks → Add webhook** (or org-level for all repos).
- **Payload URL**: `https://<your-host>/webhook/github`
- **Content type**: `application/json`
- **Secret**: the same value as `GITHUB_WEBHOOK_SECRET`
- **Events**: *Let me select individual events* → check **Pull requests** only.
- Save. GitHub sends a `ping`; the bot replies `pong`.

### 2c. Test
Open a PR (ideally on a branch like `feature/PROJ-1-test`). Within seconds a
`🤖 PR Quality Gate` comment appears.

---

## 3. GitLab (company)

Works on `gitlab.com` and self-hosted. Set `GITLAB_API_BASE` to your instance's
API root (e.g. `https://gitlab.mycompany.com/api/v4`).

### 3a. Create a token
Project or Personal **Access Token** with the **`api`** scope:
`<gitlab>/-/user_settings/personal_access_tokens`.
```env
GITLAB_ENABLED=true
GITLAB_TOKEN=glpat-xxx
GITLAB_WEBHOOK_SECRET=make-up-a-long-random-string
GITLAB_API_BASE=https://gitlab.mycompany.com/api/v4
```

### 3b. Add the webhook
Project → **Settings → Webhooks → Add new webhook**:
- **URL**: `https://<your-host>/webhook/gitlab`
- **Secret token**: same as `GITLAB_WEBHOOK_SECRET`
- **Trigger**: check **Merge request events**.
- Add webhook, then **Test → Merge request events** to fire a sample.

> Self-hosted GitLab may block outbound webhooks to external URLs by default —
> an admin can allow it under *Admin → Settings → Network → Outbound requests*.

---

## 4. Jira (optional)

Without Jira creds the bot still does the **branch-name regex check**. Add creds
to also **verify the ticket exists** and show its summary/status.

1. Create an API token: <https://id.atlassian.com/manage-profile/security/api-tokens>.
2. In `.env`:
   ```env
   JIRA_ENABLED=true
   JIRA_BASE_URL=https://your-company.atlassian.net
   JIRA_EMAIL=you@company.com
   JIRA_API_TOKEN=your-token
   # Adjust if your keys aren't like PROJ-123:
   JIRA_TICKET_REGEX=[A-Z][A-Z0-9]+-\d+
   ```
3. For **Jira Data Center / Server** (self-hosted), the same REST v3 path is
   used; if your instance only supports a personal access token, put it in
   `JIRA_API_TOKEN` and the email may be ignored by your auth setup.

---

## 5. Notifications (Teams now, Slack later)

### Microsoft Teams (your current tool)
1. In the target Teams channel: **… → Workflows / Connectors → Incoming Webhook**
   (newer tenants: create a Power Automate flow *"When a Teams webhook request is
   received"* that posts an Adaptive Card). Copy the generated URL.
2. In `.env`:
   ```env
   NOTIFY_PROVIDER=teams
   TEAMS_WEBHOOK_URL=https://...webhook.office.com/...
   ```

### Slack (when you switch)
1. Create an Incoming Webhook: <https://api.slack.com/messaging/webhooks>.
2. In `.env`:
   ```env
   NOTIFY_PROVIDER=slack
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
   ```

Set `NOTIFY_PROVIDER=none` to disable notifications entirely.

---

## 6. Run & verify

```bash
npm start
# health:
curl http://localhost:3000/health
```

`/health` echoes which integrations are active. Then open a PR/MR and watch the
logs — you'll see `Starting review` → `AI review complete` → `Posted ... comment`.

---

## 7. Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| `401 Invalid signature` (GitHub) | `GITHUB_WEBHOOK_SECRET` ≠ secret in webhook UI |
| `401 Invalid token` (GitLab) | `GITLAB_WEBHOOK_SECRET` ≠ webhook "Secret token" |
| No comment appears | Check the SCM webhook's **Recent Deliveries** for the response; check server logs |
| `GEMINI_API_KEY is not set` | Set the key for your selected `AI_PROVIDER` |
| AI error 429 / quota | Free tier limit hit — wait, or switch provider |
| `getDiff error 403/404` | Token lacks scope or can't see the repo/project |
| Huge PR, partial review | Expected — raise `MAX_DIFF_CHARS` if needed |
| Bot reviews drafts | Drafts/WIP are skipped by design; mark PR ready |
