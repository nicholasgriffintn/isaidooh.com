# isaidooh.com 🎵

> A completely innocent puzzle website. Nothing suspicious here.

## What is this

A sliding tile puzzle game deployed on Cloudflare Workers. Totally normal. Just a fun brain teaser for smart people who definitely won't get got.

## Local development

```bash
pnpm install
pnpm db:migrate:local
pnpm dev
```

## Leaderboard database

Scores are stored in Cloudflare D1. Create the database once, then add the returned `database_id` to `wrangler.json` if Wrangler requires it for your account:

```bash
pnpm wrangler d1 create isaidooh-leaderboard
pnpm db:migrate:remote
```

## Deploy

Deploys automatically via GitHub Actions on push to `main`. The workflow applies D1 migrations before deploying the Worker.

You'll need these secrets in your GitHub repo:

| Secret | Where to find it |
|--------|-----------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → right sidebar |

Or deploy manually:

```bash
pnpm deploy
```

## Custom domain

Point `isaidooh.com` to your Worker in the Cloudflare dashboard under **Workers & Pages → Custom Domains**.

## Tech stack

- Cloudflare Workers (static asset serving via KV)
- Vanilla HTML/CSS/JS — zero dependencies at runtime
- Wrangler v4
- GitHub Actions for CI/CD
