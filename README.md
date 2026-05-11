# isaidooh.com 🎵

> A completely innocent puzzle website. Nothing suspicious here.

## What is this

A sliding tile puzzle game deployed on Cloudflare Workers. Totally normal. Just a fun brain teaser for smart people who definitely won't get got.

## Local development

```bash
npm install
npm run dev
```

## Deploy

Deploys automatically via GitHub Actions on push to `main`.

You'll need these secrets in your GitHub repo:

| Secret | Where to find it |
|--------|-----------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → right sidebar |

Or deploy manually:

```bash
npm run deploy
```

## Custom domain

Point `isaidooh.com` to your Worker in the Cloudflare dashboard under **Workers & Pages → Custom Domains**.

## Tech stack

- Cloudflare Workers (static asset serving via KV)
- Vanilla HTML/CSS/JS — zero dependencies at runtime
- Wrangler v3
- GitHub Actions for CI/CD
