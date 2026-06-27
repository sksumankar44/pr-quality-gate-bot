# 🤖 PR Quality Gate Bot

An AI-powered quality gate for pull/merge requests. When a PR is opened or
updated, the bot fetches the diff, sends it to an AI model with your team's
coding standards as context, and posts a structured review comment catching
**bugs, missing error handling, hardcoded values, and security issues** — before
a human ever looks at it. It also checks the branch for a **Jira ticket** and
whether **tests were added**, and can ping **Teams or Slack**.

Built in **Node.js**, provider-agnostic, and deployable free on **Render**.

```
PR opened ─▶ webhook ─▶ fetch diff ─▶ AI review ─▶ post comment
                                  └─▶ Jira check ─┘
                                  └─▶ tests check ┘
                                  └─▶ Teams/Slack notify
```

---

## ✨ What makes this flexible

| Concern        | What you get                                                                 |
|----------------|------------------------------------------------------------------------------|
| **SCM**        | GitHub **and** GitLab at the same time (company + personal GitHub too).       |
| **AI**         | Pluggable: **Gemini (free)**, **Groq (free)**, OpenAI, Claude — switch via 1 env var. |
| **Jira**       | Branch-name ticket check + optional live verification that the ticket exists. |
| **Chat**       | Teams now; Slack ready to switch on — pluggable, one env var.                 |
| **Hosting**    | Free on Render. Also runs on Railway, Fly.io, a VM, or Docker.               |
| **Deps**       | Only `express` + `dotenv`. Everything else is the Node standard library.      |

### Which free AI should I use? (your question answered)

> *"Can I use some better free AI than OpenAI?"* — **Yes.**

- **Google Gemini** *(default, recommended)* — genuinely free tier, generous
  daily limits, excellent at code review. Get a key at
  [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
- **Groq** — free, *extremely* fast, runs strong open models (Llama 3.3 70B,
  etc.). Great when you want speed. Key at
  [console.groq.com/keys](https://console.groq.com/keys).
- **OpenAI** / **Anthropic Claude** — supported as paid options if you ever want them.

You're not locked in — set `AI_PROVIDER=gemini|groq|openai|claude` and the rest
of the code is identical. Free-tier limits change over time, so check the
provider's pricing page; the bot's per-PR usage is small (one request per PR).

---

## 🚀 Quick start (local)

```bash
# 1. Install (Node 18.17+ required)
npm install

# 2. Configure
cp .env.example .env        # on Windows PowerShell: Copy-Item .env.example .env
#   then edit .env: set AI_PROVIDER + the matching API key, and GITHUB_TOKEN

# 3. Run
npm start                   # or: npm run dev  (auto-reload)

# 4. Verify
#   open http://localhost:3000/health
```

To receive webhooks on your laptop, expose the port with a tunnel:

```bash
npx localtunnel --port 3000      # or use ngrok / cloudflared
```

Then point your GitHub/GitLab webhook at `https://<tunnel-url>/webhook/github`.

Full step-by-step (tokens, webhook config, screenshots-worth of detail) is in
**[docs/SETUP.md](docs/SETUP.md)**.

---

## 📚 Documentation

- **[docs/SETUP.md](docs/SETUP.md)** — connect GitHub, GitLab, Jira, Teams/Slack step by step.
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** — deploy free on Render (and why not Netlify).
- **[docs/DESIGN.md](docs/DESIGN.md)** — architecture, data flow, and design decisions.

---

## 🧩 How it works (the flow)

1. **Trigger** — GitHub/GitLab sends a webhook the moment a PR/MR is opened or updated.
2. **Verify** — the bot validates the webhook signature/token (rejects forgeries).
3. **Fetch diff** — calls the SCM API to get the changed files + patches.
4. **Build prompt** — compiles the diff + your `standards/coding-standards.md`.
5. **AI review** — sends it to your chosen provider, gets back a structured review.
6. **Post comment** — a single consolidated comment on the PR/MR with:
   - the AI review table (severity · file · issue · suggested fix),
   - a Jira ticket check result,
   - a tests-added check result.
7. **Notify** — optional Teams/Slack message linking to the PR.

The webhook is **ACK'd in milliseconds** and the review runs in the background,
so GitHub/GitLab never time out.

---

## ⚙️ Configuration

Everything is driven by environment variables — see **[.env.example](.env.example)**
for the annotated list. The essentials:

| Variable              | Purpose                                              |
|-----------------------|------------------------------------------------------|
| `AI_PROVIDER`         | `gemini` (default) / `groq` / `openai` / `claude`    |
| `GEMINI_API_KEY`      | your free Gemini key (or the key for your provider)  |
| `GITHUB_TOKEN`        | PAT with repo + PR write access                      |
| `GITHUB_WEBHOOK_SECRET` | shared secret, also set in the GitHub webhook UI   |
| `GITLAB_*`            | enable + token + secret for company GitLab           |
| `JIRA_*`              | enable + creds to verify tickets live                |
| `NOTIFY_PROVIDER`     | `teams` / `slack` / `none`                            |

**Customize the review:** edit [standards/coding-standards.md](standards/coding-standards.md).
Whatever you put there is enforced on every PR.

---

## 🧪 Tests

```bash
npm test     # runs the built-in node:test suite (no extra deps)
```

---

## 🔐 Security notes

- Webhook signatures (GitHub HMAC-SHA256) and tokens (GitLab) are verified in
  constant time; unverified requests get `401`.
- Secrets only ever live in environment variables — never commit `.env`.
- The bot needs write scope only on PRs/MRs (to comment). Grant least privilege.

---

## License

MIT — see below. Use it freely for company and personal repos.
