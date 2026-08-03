import {
  cachedBilling,
  cachedConversations,
  cachedLead,
  cachedFathom,
  cachedSlack,
} from '@/lib/cached'

// One chronological feed across all five sources, server-rendered.

interface TimelineEvent {
  ts: number // unix seconds
  source: 'Intercom' | 'Stripe' | 'Close' | 'Fathom' | 'Slack'
  title: string
  detail?: string
}

const SOURCE_STYLES: Record<TimelineEvent['source'], string> = {
  Intercom: 'bg-zen-100 text-zen-800',
  Stripe: 'bg-purple-100 text-purple-800',
  Close: 'bg-emerald-100 text-emerald-800',
  Fathom: 'bg-blue-100 text-blue-800',
  Slack: 'bg-yellow-100 text-yellow-800',
}

const fmtDate = (ts: number) =>
  new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const money = (cents: number, currency: string) =>
  `$${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`

export default async function TimelinePanel({
  email,
  contactId,
}: {
  email: string
  contactId: string
}) {
  const [billing, conversations, lead, fathom, slack] = await Promise.all([
    cachedBilling(email),
    cachedConversations(contactId),
    cachedLead(email),
    cachedFathom(email),
    cachedSlack(email),
  ])

  const events: TimelineEvent[] = []

  const CHANNEL_LABELS: Record<string, string> = {
    conversation: 'Chat',
    chat: 'Chat',
    email: 'Email',
    phone_call: 'Phone',
    sms: 'SMS',
  }
  for (const c of conversations) {
    const isBotGreeting = /this is zenbot|i'?m here to answer your questions/i.test(c.preview)
    const channel = CHANNEL_LABELS[c.channel] ?? c.channel.charAt(0).toUpperCase() + c.channel.slice(1)
    events.push({
      ts: c.createdAt,
      source: 'Intercom',
      title: c.subject || (isBotGreeting ? 'ZenBot chat' : `${channel} conversation`),
      detail: `${c.preview}${c.state === 'open' ? ' · (still open)' : ''}`,
    })
  }

  if (billing) {
    for (const i of billing.invoices) {
      events.push({
        ts: Math.floor(new Date(i.created).getTime() / 1000),
        source: 'Stripe',
        title: `Invoice ${i.number ?? ''} — ${money(i.amountDue, i.currency)} (${i.status})`,
      })
    }
    for (const ch of billing.charges) {
      if (ch.status === 'failed' || ch.refunded || ch.disputed) {
        events.push({
          ts: Math.floor(new Date(ch.created).getTime() / 1000),
          source: 'Stripe',
          title: ch.disputed
            ? `⚠️ Disputed charge — ${money(ch.amount, ch.currency)}`
            : ch.refunded
            ? `Refund — ${money(ch.amountRefunded, ch.currency)}`
            : `Failed charge — ${money(ch.amount, ch.currency)}`,
          detail: ch.failureMessage ?? undefined,
        })
      }
    }
  }

  if (lead) {
    for (const a of lead.activities) {
      events.push({
        ts: Math.floor(new Date(a.date).getTime() / 1000),
        source: 'Close',
        title: `${a.type}${a.direction ? ` (${a.direction})` : ''}${a.subject ? ` — ${a.subject}` : ''}`,
        detail: (a.body ?? a.note ?? '').slice(0, 160) || undefined,
      })
    }
  }

  if (fathom) {
    for (const call of fathom) {
      events.push({
        ts: Math.floor(new Date(call.date).getTime() / 1000),
        source: 'Fathom',
        title: `📞 ${call.title}${call.durationMinutes ? ` (${call.durationMinutes} min)` : ''}`,
        detail: call.summary ? call.summary.replace(/[#*]/g, '').slice(0, 200) : undefined,
      })
    }
  }

  if (slack) {
    for (const m of slack) {
      events.push({
        ts: Math.floor(new Date(m.date).getTime() / 1000),
        source: 'Slack',
        title: `#${m.channel} — ${m.from}`,
        detail: m.text.slice(0, 200),
      })
    }
  }

  const sorted = events
    .filter((e) => !isNaN(e.ts) && e.ts > 0)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 150)

  if (sorted.length === 0) return null

  const missing: string[] = []
  if (slack === null) missing.push('Slack')
  if (fathom === null) missing.push('Fathom')

  return (
    <section className="mt-6">
      <h2 className="mb-3 text-base font-semibold text-gray-900">
        Unified timeline
        <span className="ml-2 text-xs font-normal text-gray-400">
          {sorted.length} events across all sources{missing.length ? ` · ${missing.join(' & ')} not connected` : ''}
        </span>
      </h2>
      <div className="max-h-[500px] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <ul className="divide-y divide-gray-50">
          {sorted.map((e, i) => (
            <li key={i} className="flex items-start gap-3 px-4 py-2.5">
              <span className="w-20 shrink-0 pt-0.5 text-xs text-gray-400">{fmtDate(e.ts)}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${SOURCE_STYLES[e.source]}`}>
                {e.source}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{e.title}</p>
                {e.detail && <p className="truncate text-xs text-gray-500">{e.detail}</p>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
