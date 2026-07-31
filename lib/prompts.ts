export const HISTORY_PROMPT = `Compile a complete history brief for this customer. Check all sources (Stripe, Intercom conversations, Close CRM, Slack, and Fathom calls where available) and cover:
1. Who they are — business, tenure, plan, seats, MRR.
2. Billing — current status, discounts, failed payments, refunds or disputes.
3. Support history — main things they've contacted us about, recurring issues.
4. Calls — recorded calls (Fathom) and what was discussed.
5. Internal — escalations, reported bugs, data uploads (from Slack/Close).
6. Open items — anything unresolved: unanswered questions, promised follow-ups we haven't delivered, bugs affecting them with no confirmed fix, pending data uploads. Be explicit when something looks dropped.
7. Anything an agent should know before replying — temperament, promises we've made, risk flags.
Use short sections with headers. Cite dates. If a source has nothing, say so in one line.`
