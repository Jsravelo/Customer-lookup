# Changelog

All notable changes to the Customer Lookup tool. Versions follow [semver](https://semver.org):
major = breaking/architectural change, minor = new feature, patch = fix.

## 1.4.0 — 2026-08-04

- **Added:** call activity in the status strip — calls held (with last call
  date), demo/optimization calls booked, and a warning chip for no-shows and
  cancellations. Combined from Fathom recordings, the Slack call-summary and
  demo-signup channels, and connected Close call logs, without double-counting
- **Security:** live Slack search restricted to public channels in code
  (deny-by-default), locked in with tests — DMs, group DMs, and private
  channels never surface even though the whole team searches through one token

## 1.3.0 — 2026-08-04

- **Added:** trend mode in "Who Asked About…" — questions like "what have
  customers been talking about the past month" now analyze all recent
  conversations and return a themed breakdown with counts, customers
  involved, and a report-ready summary (window parsed from the question)
- **Changed:** the home page headline and description now switch with the
  selected tab, and the topic tab explains all three question types
  (specific issue, volume, trends)

## 1.2.0 — 2026-08-04

- **Added:** "Recently viewed" list on the home page — your last 8 customers,
  stored per browser (each teammate sees their own)
- **Changed:** platform links are now a prominent brand-colored "Verify in"
  toolbar (Intercom blue, ZenMaid teal, Stripe purple, Close green) instead of
  blending in with the metadata chips
- **Changed:** the ZenMaid logo in the header now links back to search
- **Internal:** Vitest suite (32 tests) over dedupe, bot detection, CSV
  parsing, Stripe matching, and labels — runs in CI before every merge

## 1.1.0 — 2026-08-04

- **Added:** "Open in" deep links on every customer page — jump straight to
  the customer's Intercom profile, ZenMaid admin record, Stripe customer, and
  Close lead for direct verification
- **Removed:** Send-to-Slack button and its endpoint (risk of accidental
  sends); the Copy button remains

## 1.0.0 — 2026-08-04

First versioned release. Everything below shipped between June and August 2026.

### Customer lookup
- Search by email, name, Intercom ID, or company, with duplicate Intercom
  records collapsed (prefers the account-linked contact)
- Customer page: at-a-glance status strip (plan, seats, MRR, tenure, open
  conversations, delinquency/cancellation/failed-charge/discount flags,
  expansion-gap detection) and ZenMaid usage metrics
- Auto-generated, cached customer brief with Copy and Send-to-Slack
- Intercom conversations split into team-handled vs bot-only (ZenBot/Fin)
- Close CRM panel with opportunities and activity feed (full SMS bodies)
- Unified chronological timeline across Intercom, Stripe, Close, Fathom, Slack

### Ask Claude
- Agentic chat over five live sources: Stripe billing (with fuzzy email
  matching and dispute/refund history), Intercom conversations, Close CRM,
  Slack (live token or local workspace export), Fathom call recordings
- Live status streaming ("Searching Slack…") and strict platform targeting
  ("only check Slack")

### Topic intelligence ("Who Asked About…")
- Natural-language search by meaning, not keywords (AI query expansion +
  relevance filtering with per-customer match reasons)
- Issue report: severity rating, themes with shares, date range, stat cards,
  and a paste-ready impact summary for other departments

### Platform
- ZenMaid branding (palette from the webapp, Mulish, real logo, favicon)
- Site-wide password gate (active when SITE_PASSWORD is set)
- Vercel deployment via GitHub deploy hook; CI build check on every PR
