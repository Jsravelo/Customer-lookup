# Customer Lookup

Internal CS tool for ZenMaid — look up any customer by email, name, Intercom ID, or company and see their full history from Intercom and Close CRM on one page.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Add credentials
```bash
cp .env.local.example .env.local
```
Then edit `.env.local` and fill in:
- `INTERCOM_ACCESS_TOKEN` — from Intercom Developer Hub → Your App → Authentication
- `CLOSE_API_KEY` — from Close Settings → API & Webhooks

### 3. Run locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Railway

1. Push this repo to GitHub
2. In Railway: **New Project → Deploy from GitHub repo** → select this repo
3. Go to **Variables** and add:
   - `INTERCOM_ACCESS_TOKEN`
   - `CLOSE_API_KEY`
4. Railway will auto-detect Next.js and deploy. Share the generated URL with your team.

---

## How it works

- **Search page** — enter any identifier and hit Search
  - If one result: jumps directly to the profile
  - If multiple: shows a list to pick from
- **Profile page** — loads in two stages:
  1. Customer header appears immediately (name, email, company, stats)
  2. Intercom conversations + Close CRM data stream in as they load
- All API calls happen server-side; your API keys are never sent to the browser

## Future additions (optional)
- Password protection — add `middleware.ts` with a cookie-based shared password
- Stripe billing section — once Stripe API access is available
- AI Q&A chat panel — once Anthropic API access is available
