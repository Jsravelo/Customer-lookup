# Changelog

All notable changes to the Customer Lookup tool. Versions follow [semver](https://semver.org):
major = breaking/architectural change, minor = new feature, patch = fix.

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
