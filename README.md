# Customer Lookup

Internal ZenMaid CS tool — one consolidated view of a customer across **Intercom, Stripe, Close CRM, Slack, and Fathom**, plus AI-powered topic intelligence ("who asked about X and how big a deal is it").

## Setup

```bash
npm install
```

Create `.env.local` (gitignored — never commit it) with:

| Variable | Required | Where to get it |
|---|---|---|
| `INTERCOM_ACCESS_TOKEN` | ✅ | Intercom Developer Hub → Your App → Authentication |
| `CLOSE_API_KEY` | ✅ | Close → Settings → API & Webhooks |
| `STRIPE_SECRET_KEY` | ✅ | Stripe Dashboard → Developers → API keys (restricted key is fine) |
| `ANTHROPIC_API_KEY` | ✅ | platform.claude.com → API keys |
| `FATHOM_API_KEY` | optional | Fathom → User Settings → API Access |
| `SLACK_USER_TOKEN` | optional | Slack app with `search:read` user scope (live Slack search) |
| `SITE_PASSWORD` | optional | Any value — activates the site-wide password gate |
| `BLOB_READ_WRITE_TOKEN` | optional | Vercel → Storage → Blob (shared brief cache) |

Slack can also run offline from a workspace export: unzip it into `./slack-export/` (gitignored). JSON exports and CSVs both work.

```bash
npm run dev   # http://localhost:3000
```

## Deployment

Production runs on **Vercel**. Pushing to `main` triggers a deploy via the GitHub Action deploy hook (`.github/workflows/deploy.yml`). Environment variables live in Vercel → Settings → Environment Variables; changing them requires a redeploy.

## Development workflow

Good-practice rules for changes to this repo:

1. **Branch, don't push to main.** `git checkout -b feat/short-name` (or `fix/...`, `chore/...`).
2. **Commit style:** `feat:` / `fix:` / `chore:` prefixes, imperative mood.
3. **Open a PR.** CI (`.github/workflows/ci.yml`) runs the full build + type check on every PR — red PR, no merge.
4. **Merge to main** → auto-deploys to production.
5. **Version it.** User-visible changes get a line in `CHANGELOG.md`; releases are tagged (`git tag v1.1.0 && git push --tags`). Major = breaking, minor = feature, patch = fix.

**Never commit:** `.env.local`, `slack-export/`, `.brief-cache/`, or any customer data files (CSV exports etc.). The `.gitignore` covers these — don't fight it. This repo is public.

## How it works

- **Search** — email, name, Intercom ID, or company; duplicate Intercom contacts are collapsed automatically (account-linked record wins).
- **Customer page** — status strip and usage metrics render instantly; the AI brief auto-generates once and is cached; conversations, CRM, and a unified cross-source timeline stream in below.
- **Ask Claude** — agentic chat that pulls live data from all five platforms per question, with live status and platform targeting ("only check Slack").
- **Who Asked About…** — natural-language topic search: AI expands the query, filters candidates by intent, and produces a severity-rated issue report with a paste-ready summary.
- All API calls run server-side; keys never reach the browser.
