# Design & Architecture

This document explains how the PR Quality Gate Bot is structured, the data flow,
and why the key decisions were made.

---

## 1. Goals

- **One service, many SCMs** — GitHub (company + personal) and GitLab (company)
  handled by the same running server.
- **Swap the AI freely** — no vendor lock-in; default to a strong *free* model.
- **Swap the chat tool freely** — Teams today, Slack tomorrow, both optional.
- **Resilient** — a failure in one check (AI, Jira, notify) never aborts the rest.
- **Cheap to run** — minimal dependencies, fits a free hosting tier.

---

## 2. High-level flow

```
                         ┌──────────────────────────────────────────┐
   GitHub PR / GitLab MR │                                          │
   opened or updated     ▼                                          │
   ───────────────▶  Webhook  ──▶ verify signature/token            │
                         │                                          │
                         ▼                                          │
                    parseWebhook  ──▶ normalized event {scm, repo,  │
                         │                prNumber, branch, ...}     │
                         ▼                                          │
                 ┌──── reviewer.reviewPullRequest ────┐             │
                 │                                     │             │
                 │  1. scm.getDiff()                   │             │
                 │  2. AI review  ──▶ runAIReview()    │── provider ─┘
                 │  3. Jira check ──▶ extract+verify   │── Jira API
                 │  4. tests check                     │
                 │  5. scm.postComment()  (one comment)│── SCM API
                 │  6. notify()  (Teams/Slack)         │── chat webhook
                 └─────────────────────────────────────┘
```

The webhook handler **acknowledges immediately (HTTP 202)** and runs the review
asynchronously, so the SCM's webhook delivery never times out.

---

## 3. Module map

```
src/
├── index.js              # process entry: start server, global error handlers
├── server.js             # express app, raw-body capture, route mounting, health
├── config.js             # single source of truth for all env config
├── logger.js             # tiny JSON logger (no dependency)
│
├── routes/
│   ├── github.js         # POST /webhook/github  (verify → parse → review async)
│   └── gitlab.js         # POST /webhook/gitlab
│
├── core/                 # SCM-agnostic business logic
│   ├── reviewer.js       # orchestrates the whole review (the "conductor")
│   ├── diffParser.js     # filter files, build token-bounded diff text
│   ├── promptBuilder.js  # system+user prompt, injects coding standards
│   └── testCheck.js      # heuristic: were test files added?
│
├── providers/            # swappable integrations, each behind a small interface
│   ├── ai/               # review({system,user}) -> string
│   │   ├── index.js      #   factory keyed by AI_PROVIDER
│   │   ├── gemini.js  groq.js  openai.js  claude.js
│   │   ├── scm/          # parseWebhook / getDiff / postComment
│   │   │   ├── index.js  github.js  gitlab.js
│   │   └── notify/       # notify({title,text,url})
│   │       ├── index.js  teams.js  slack.js
│   │
├── integrations/
│   └── jira.js           # extractTicket() + verifyTicket()
└── utils/
    └── signature.js      # GitHub HMAC + GitLab token verification
```

### The three "provider" abstractions

Each abstraction is just a folder of files that share one tiny interface and a
factory that picks the implementation from config. This is what gives you the
flexibility you asked for.

| Abstraction | Interface | Implementations | Selected by |
|-------------|-----------|-----------------|-------------|
| **AI**      | `review({system, user}) → string` | gemini, groq, openai, claude | `AI_PROVIDER` |
| **SCM**     | `parseWebhook(req)`, `getDiff(evt)`, `postComment(evt, body)` | github, gitlab | per-endpoint |
| **Notify**  | `notify({title, text, url})` | teams, slack, none | `NOTIFY_PROVIDER` |

To add, say, **Bitbucket** or a **DeepSeek** model later, you write one file
implementing the interface and register it in the factory — nothing else changes.

---

## 4. The normalized event

Both GitHub and GitLab payloads are mapped into one shape so `reviewer.js`
doesn't care which SCM it's talking to:

```js
{
  scm: 'github' | 'gitlab',
  owner, repo,          // github
  projectId,            // gitlab
  repoFullName,         // "org/repo"
  prNumber,             // PR number / MR iid
  title, branch, baseBranch, sha, url, author, action
}
```

---

## 5. Diff handling & token budget

- GitHub returns structured file objects with `patch`; GitLab returns a `diff`
  string per file — both are normalized to `{filename, status, additions,
  deletions, patch}`.
- `diffParser.buildDiffText()` concatenates patches **up to `MAX_DIFF_CHARS`**
  and marks the review as `truncated` if it had to stop. This protects against
  huge PRs blowing the model's context window (and your free quota).
- Binary files and (optionally) non-matching extensions are filtered out.

---

## 6. Checks beyond the AI review

- **Jira** (`integrations/jira.js`): a regex finds the ticket id in the branch
  name (or title). If `JIRA_ENABLED=true`, it additionally calls the Jira REST
  API to confirm the ticket exists and fetch its summary/status. Three outcomes:
  found+valid, found-but-missing-in-Jira, or not-found → reminder.
- **Tests** (`core/testCheck.js`): pattern-matches common test conventions
  across JS/TS, Python, Go, Java, Ruby, C#. If code changed but no test file was
  touched, the comment nudges the author.

All checks are **best-effort and isolated** — wrapped so one failure logs and
continues.

---

## 7. Security model

- **Inbound**: GitHub webhooks are verified with HMAC-SHA256 over the raw body
  (`X-Hub-Signature-256`); GitLab with a constant-time token compare
  (`X-Gitlab-Token`). Failures → `401`, nothing is processed.
- **Outbound**: tokens/keys come only from env vars. The SCM token needs just
  enough scope to read diffs and write comments.
- **Raw body**: captured in `express.json({verify})` because HMAC must run over
  the exact bytes GitHub signed, before JSON parsing.

---

## 8. Failure handling

| Failure                        | Behaviour                                              |
|--------------------------------|-------------------------------------------------------|
| AI provider error/quota        | Review section says so; Jira + tests checks still post |
| Jira lookup fails              | Falls back to "ticket detected" (no hard block)        |
| Notification fails             | Logged, swallowed — never affects the PR comment       |
| Huge diff                      | Truncated to budget, flagged in the prompt             |
| Non-PR / draft / WIP event     | Ignored with `200` so the SCM stops retrying           |

---

## 9. Extension ideas

- **Inline review comments** (line-level) instead of one summary comment —
  GitHub's review API and GitLab's discussions API both support positions.
- **Status check / merge gate** — set a commit status that blocks merge until
  the bot is satisfied.
- **Per-repo standards** — load a `.pr-gate.md` from the repo itself.
- **Caching by SHA** — skip re-review if the head SHA hasn't changed.
- **Queue** (BullMQ/Redis) if you outgrow in-process background processing.
