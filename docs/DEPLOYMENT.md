# Deployment Guide

This bot is a **long-running web server** that receives webhooks. That detail
decides where you can host it for free.

## ⚠️ Why not Netlify / Vercel (static or pure-serverless)?

- **Netlify** hosts static sites + short serverless functions. It can't run a
  persistent Express server, and our background review can exceed function time
  limits. Not a good fit.
- **Vercel** functions *can* receive the webhook, but the review work (AI call +
  comment posting) can outlast the function and the platform may kill it.
  Workable with effort, but not the smooth path.
- **Render / Railway / Fly.io** run a normal Node web service — exactly what we
  want. **Render has a free web-service tier**, so that's the recommended host.

> The one Render free-tier caveat: the service **sleeps after ~15 min idle** and
> takes a few seconds to wake on the next webhook. That's fine for PR reviews
> (a few seconds' delay). To avoid sleep, use a paid instance or ping `/health`
> on a schedule.

---

## Option 1 — Render (recommended, free)

### Via the included Blueprint (`render.yaml`)
1. Push this project to a GitHub repo.
2. In Render: **New + → Blueprint**, select the repo. Render reads `render.yaml`.
3. After it provisions, open the service → **Environment** and fill the secret
   vars (marked `sync:false`): `GEMINI_API_KEY`, `GITHUB_TOKEN`,
   `GITHUB_WEBHOOK_SECRET`, and any GitLab/Jira/notify values you use.
4. Deploy. Your URL is `https://<service-name>.onrender.com`.
5. Set your webhooks to:
   - `https://<service-name>.onrender.com/webhook/github`
   - `https://<service-name>.onrender.com/webhook/gitlab`

### Manual (without the Blueprint)
**New + → Web Service** → connect repo →
- Runtime: **Node**
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/health`
- Add the env vars from `.env.example`.

---

## Option 2 — Railway

1. **New Project → Deploy from GitHub repo.**
2. Railway auto-detects Node and runs `npm start`.
3. Add env vars under **Variables**.
4. Generate a public domain under **Settings → Networking** and use it for the
   webhook URLs.

---

## Option 3 — Fly.io

```bash
fly launch            # creates fly.toml; choose an app name & region
fly secrets set GEMINI_API_KEY=... GITHUB_TOKEN=... GITHUB_WEBHOOK_SECRET=...
fly deploy
```
Set the internal port to `3000` (or set `PORT` via `fly secrets`). Use the
`https://<app>.fly.dev/webhook/...` URLs.

---

## Option 4 — Docker (any VM / self-host)

A minimal image (create `Dockerfile`):

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t pr-quality-gate-bot .
docker run -d -p 3000:3000 --env-file .env --name pr-bot pr-quality-gate-bot
```

Put it behind a reverse proxy (Caddy/Nginx) for HTTPS, then use the public URL
for webhooks.

---

## Post-deploy checklist

- [ ] `GET /health` returns the expected active integrations.
- [ ] Secrets set in the host's env (never committed).
- [ ] `GITHUB_WEBHOOK_SECRET` / `GITLAB_WEBHOOK_SECRET` match the webhook config.
- [ ] Webhook **Recent Deliveries** show `202 Accepted`.
- [ ] Open a test PR/MR → bot comment appears.
- [ ] (Render free) aware of cold-start delay, or add an uptime ping.

---

## Operational notes

- **Logs** are structured JSON — pipe to your platform's log viewer.
- **Scaling**: a single instance handles many repos; reviews run in-process in
  the background. If volume grows, add a Redis-backed queue (see
  [DESIGN.md](DESIGN.md) §9).
- **Rotating keys**: change the env var and redeploy — no code change.
