import type { IntercomContact } from '@/types/customer'
import {
  cachedBilling,
  cachedConversations,
  cachedCompany,
  cachedLead,
  cachedFathom,
  cachedSlack,
} from '@/lib/cached'
import { classifyCallSignals } from '@/lib/calls'

// Stable workspace id from the Intercom API (/me → app.id_code)
const INTERCOM_APP_ID = '6b27cdb7860d5024f49af6dc8c64484ccbb3eaf9'

// At-a-glance facts + ZenMaid usage, rendered server-side with no AI involved.

function Chip({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'good' | 'warn' | 'bad' }) {
  const tones = {
    neutral: 'bg-white border-gray-200 text-gray-900',
    good: 'bg-zen-50 border-zen-100 text-zen-800',
    warn: 'bg-amber-50 border-amber-200 text-amber-900',
    bad: 'bg-red-50 border-red-200 text-red-800',
  }
  return (
    <div className={`rounded-lg border px-3 py-1.5 text-center shadow-sm ${tones[tone]}`}>
      <p className="text-sm font-semibold leading-tight">{value}</p>
      <p className="text-[11px] text-gray-500 leading-tight">{label}</p>
    </div>
  )
}

const money = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`

function num(attrs: Record<string, string | number | boolean | null>, key: string): number | null {
  const v = attrs[key]
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v !== '' && !isNaN(Number(v))) return Number(v)
  return null
}

export default async function StatusStrip({ contact }: { contact: IntercomContact }) {
  const email = contact.email
  const [billing, conversations, company, lead, fathom, slack] = await Promise.all([
    email ? cachedBilling(email) : null,
    cachedConversations(contact.id),
    cachedCompany(contact.id),
    email ? cachedLead(email) : null,
    email ? cachedFathom(email) : null,
    email ? cachedSlack(email) : null,
  ])

  const calls = classifyCallSignals(
    slack,
    fathom ? fathom.map((c) => c.date) : null,
    lead ? lead.activities.filter((a) => a.type === 'Call').map((a) => ({ date: a.date, duration: a.duration })) : null
  )

  // Direct links to the customer's record in each source system, styled with
  // each platform's brand color so they read as actions, not metadata
  const links = [
    {
      label: 'Intercom',
      href: `https://app.intercom.com/a/apps/${INTERCOM_APP_ID}/users/${contact.id}/all-conversations`,
      classes: 'bg-blue-50 text-blue-700 ring-blue-200 hover:bg-blue-100',
      dot: 'bg-blue-500',
    },
    {
      label: 'ZenMaid admin',
      // Sign-in-as link keyed by the ZenMaid account id (= Intercom company_id);
      // falls back to the admin search when no company is linked
      href: company?.companyId
        ? `https://app.zenmaid.com/admins/user_sign_in/${company.companyId}`
        : `https://app.zenmaid.com/admins/show?query=${encodeURIComponent(email ?? '')}`,
      classes: 'bg-zen-50 text-zen-700 ring-zen-200 hover:bg-zen-100',
      dot: 'bg-zen-500',
    },
    ...(billing
      ? [{
          label: 'Stripe',
          href: `https://dashboard.stripe.com/customers/${billing.customerId}`,
          classes: 'bg-purple-50 text-purple-700 ring-purple-200 hover:bg-purple-100',
          dot: 'bg-[#635BFF]',
        }]
      : []),
    ...(lead
      ? [{
          label: 'Close',
          href: `https://app.close.com/lead/${lead.id}/`,
          classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100',
          dot: 'bg-emerald-500',
        }]
      : []),
  ]
  // Usage metrics live on the company; fall back to contact attributes
  const attrs = { ...contact.customAttributes, ...(company?.attributes ?? {}) }

  const sub =
    billing?.subscriptions.find((s) => s.status === 'active' || s.status === 'trialing' || s.status === 'past_due') ??
    billing?.subscriptions[0]
  const mrrCents = sub
    ? sub.items.reduce((sum, it) => sum + (it.unitAmount ?? 0) * (it.quantity ?? 0), 0)
    : 0
  const openConvos = conversations.filter((c) => c.state === 'open').length
  const lastFailedCharge = billing?.charges.find((c) => c.status === 'failed')
  const tenureYears = contact.createdAt
    ? ((Date.now() / 1000 - contact.createdAt) / 31536000).toFixed(1)
    : null

  const declared = num(attrs, 'declared_cleaner_count')
  const active = num(attrs, 'size')
  const expansionGap = declared !== null && active !== null && declared - active >= 2

  const usage: { label: string; key: string }[] = [
    { label: 'Active cleaners', key: 'size' },
    { label: 'Declared cleaners', key: 'declared_cleaner_count' },
    { label: 'Customers', key: 'customers' },
    { label: 'Recurring customers', key: 'recurring_customers' },
    { label: 'Services', key: 'services' },
    { label: 'Payrolls run', key: 'payrolls' },
    { label: 'Web sessions', key: 'web_sessions' },
  ]
  const usageChips = usage
    .map((u) => ({ ...u, value: num(attrs, u.key) }))
    .filter((u): u is typeof u & { value: number } => u.value !== null)

  const lastInvoice = billing?.invoices[0]

  return (
    <div className="mb-6">
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
        <span className="text-xs font-semibold text-gray-500">Verify in</span>
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ring-1 ring-inset transition ${l.classes}`}
          >
            <span className={`h-2 w-2 rounded-full ${l.dot}`} />
            {l.label}
            <svg className="h-3.5 w-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {sub && <Chip label="Plan" value={sub.planName || '—'} tone={sub.status === 'active' || sub.status === 'trialing' ? 'good' : 'warn'} />}
        {sub && <Chip label="Status" value={sub.status} tone={sub.status === 'active' ? 'good' : sub.status === 'trialing' ? 'neutral' : 'bad'} />}
        {sub && sub.quantity > 0 && <Chip label="Seats" value={String(sub.quantity)} />}
        {mrrCents > 0 ? (
          <Chip label="MRR" value={money(mrrCents)} />
        ) : lastInvoice && lastInvoice.amountDue > 0 ? (
          <Chip label="Last invoice" value={money(lastInvoice.amountDue)} />
        ) : null}
        {tenureYears && <Chip label="Years with us" value={tenureYears} />}
        <Chip label="Open conversations" value={String(openConvos)} tone={openConvos > 0 ? 'warn' : 'neutral'} />
        <Chip
          label={calls.held > 0 && calls.lastHeldDate ? `Calls held · last ${calls.lastHeldDate}` : 'Calls held'}
          value={calls.held > 0 ? String(calls.held) : 'None found'}
          tone={calls.held > 0 ? 'good' : 'neutral'}
        />
        {calls.booked > 0 && <Chip label="Calls booked" value={String(calls.booked)} />}
        {calls.noShows + calls.cancelled > 0 && (
          <Chip
            label="No-shows / cancelled calls"
            value={`${calls.noShows} · ${calls.cancelled}`}
            tone="warn"
          />
        )}
        {billing?.delinquent && <Chip label="Billing" value="Delinquent" tone="bad" />}
        {sub?.cancelAtPeriodEnd && <Chip label="Cancellation" value={`Scheduled ${sub.currentPeriodEnd}`} tone="bad" />}
        {lastFailedCharge && <Chip label="Failed charge" value={lastFailedCharge.created} tone="warn" />}
        {sub?.discount && <Chip label="Discount" value={sub.discount} tone="warn" />}
        {expansionGap && (
          <Chip label="Expansion opportunity" value={`${declared} declared / ${active} active`} tone="good" />
        )}
        {!billing && email && <Chip label="Stripe" value="Not found" tone="warn" />}
      </div>

      {usageChips.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">ZenMaid usage</span>
          {usageChips.map((u) => (
            <span key={u.key} className="rounded-full bg-white border border-gray-200 px-2.5 py-1 text-xs text-gray-700 shadow-sm">
              {u.label}: <strong>{u.value.toLocaleString()}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
