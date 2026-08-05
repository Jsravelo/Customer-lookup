const BASE = 'https://api.stripe.com/v1'

function headers() {
  const key = process.env.STRIPE_SECRET_KEY ?? ''
  return {
    Authorization: `Bearer ${key}`,
    Accept: 'application/json',
    'Stripe-Version': '2024-06-20',
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: headers(), cache: 'no-store' })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Stripe ${res.status}: ${text}`)
  }
  return res.json()
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StripeBilling {
  customerId: string
  email: string
  /** How the Stripe customer was matched when the exact email had no results */
  matchedBy: string
  searchedEmail: string
  name: string | null
  created: string
  balance: number
  currency: string | null
  delinquent: boolean
  subscriptions: StripeSubscription[]
  invoices: StripeInvoice[]
  charges: StripeCharge[]
}

export interface StripeCharge {
  id: string
  amount: number
  currency: string
  status: string
  created: string
  description: string | null
  disputed: boolean
  refunded: boolean
  amountRefunded: number
  failureMessage: string | null
}

export interface StripeSubscription {
  id: string
  status: string
  planName: string
  quantity: number
  unitAmount: number | null
  interval: string | null
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  canceledAt: string | null
  discount: string | null
  items: { planName: string; quantity: number; unitAmount: number | null }[]
}

export interface StripeInvoice {
  id: string
  number: string | null
  status: string | null
  amountDue: number
  amountPaid: number
  currency: string
  created: string
  hostedInvoiceUrl: string | null
}

// ─── Raw shapes ───────────────────────────────────────────────────────────────

interface RawPrice {
  unit_amount: number | null
  recurring: { interval: string } | null
  nickname: string | null
  product: string
}

interface RawSubItem {
  quantity: number
  price: RawPrice
  plan?: { nickname: string | null }
}

interface RawSubscription {
  id: string
  status: string
  current_period_end: number
  cancel_at_period_end: boolean
  canceled_at: number | null
  discount: { coupon: { name: string | null; percent_off: number | null; amount_off: number | null } } | null
  items: { data: RawSubItem[] }
}

interface RawInvoice {
  id: string
  number: string | null
  status: string | null
  amount_due: number
  amount_paid: number
  currency: string
  created: number
  hosted_invoice_url: string | null
}

interface RawCharge {
  id: string
  amount: number
  currency: string
  status: string
  created: number
  description: string | null
  disputed: boolean
  refunded: boolean
  amount_refunded: number
  failure_message: string | null
}

interface RawCustomer {
  id: string
  email: string
  name: string | null
  created: number
  balance: number
  currency: string | null
  delinquent: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ts = (unix: number | null) => (unix ? new Date(unix * 1000).toISOString().slice(0, 10) : '')

function describeDiscount(d: RawSubscription['discount']): string | null {
  if (!d?.coupon) return null
  const c = d.coupon
  if (c.percent_off) return `${c.name ?? 'Coupon'} (${c.percent_off}% off)`
  if (c.amount_off) return `${c.name ?? 'Coupon'} ($${(c.amount_off / 100).toFixed(2)} off)`
  return c.name
}

// Customers often use a different email in Stripe than in ZenMaid/Intercom
// (e.g. eric@virginiahousekeepers.com vs virginiahousekeepers@gmail.com), so
// when the exact email misses, fall back to searching by the distinctive part
// of the address — the business domain or a non-generic local part.

const FREE_PROVIDERS = new Set([
  'gmail', 'yahoo', 'hotmail', 'outlook', 'aol', 'icloud', 'live', 'msn', 'me',
  'mail', 'protonmail', 'proton', 'comcast', 'verizon', 'att', 'sbcglobal',
  'bellsouth', 'cox', 'charter', 'earthlink', 'ymail', 'rocketmail',
])

const GENERIC_LOCALS = new Set([
  'info', 'admin', 'contact', 'office', 'hello', 'support', 'billing',
  'sales', 'accounts', 'bookings', 'service', 'team', 'mail', 'email',
])

export function candidateTokens(email: string): string[] {
  const [local = '', domain = ''] = email.toLowerCase().split('@')
  const domainName = domain.split('.')[0]
  const tokens: string[] = []
  if (domainName.length >= 5 && !FREE_PROVIDERS.has(domainName)) tokens.push(domainName)
  if (local.length >= 6 && !GENERIC_LOCALS.has(local) && local !== domainName) tokens.push(local)
  return tokens
}

async function searchCustomers(query: string): Promise<RawCustomer[]> {
  const res = await get<{ data: RawCustomer[] }>(
    `/customers/search?query=${encodeURIComponent(query)}&limit=3`
  )
  return res.data
}

async function findCustomer(
  email: string
): Promise<{ customer: RawCustomer; matchedBy: string } | null> {
  const exact = await searchCustomers(`email:"${email}"`)
  if (exact[0]) return { customer: exact[0], matchedBy: 'exact email match' }

  for (const token of candidateTokens(email)) {
    const byEmail = await searchCustomers(`email~"${token}"`)
    if (byEmail[0]) {
      return {
        customer: byEmail[0],
        matchedBy: `fuzzy match — Stripe billing email (${byEmail[0].email}) contains "${token}"`,
      }
    }
    const byName = await searchCustomers(`name~"${token}"`)
    if (byName[0]) {
      return {
        customer: byName[0],
        matchedBy: `fuzzy match — Stripe customer name (${byName[0].name}) contains "${token}"`,
      }
    }
  }
  return null
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getBillingByEmail(email: string): Promise<StripeBilling | null> {
  const found = await findCustomer(email)
  if (!found) return null
  const { customer, matchedBy } = found

  const [subs, invoices, charges] = await Promise.all([
    get<{ data: RawSubscription[] }>(
      `/subscriptions?customer=${customer.id}&status=all&limit=10&expand[]=data.discount`
    ),
    get<{ data: RawInvoice[] }>(`/invoices?customer=${customer.id}&limit=10`),
    get<{ data: RawCharge[] }>(`/charges?customer=${customer.id}&limit=50`),
  ])

  // Resolve product IDs to human-readable names (e.g. "Pro Max Monthly")
  const productIds = Array.from(
    new Set(subs.data.flatMap((s) => s.items.data.map((it) => it.price.product)))
  )
  const productNames = new Map<string, string>()
  await Promise.all(
    productIds.map(async (id) => {
      try {
        const p = await get<{ id: string; name: string }>(`/products/${id}`)
        productNames.set(id, p.name)
      } catch {
        productNames.set(id, id)
      }
    })
  )

  return {
    customerId: customer.id,
    email: customer.email,
    matchedBy,
    searchedEmail: email,
    name: customer.name,
    created: ts(customer.created),
    balance: customer.balance,
    currency: customer.currency,
    delinquent: customer.delinquent,
    subscriptions: subs.data.map((s) => {
      const items = s.items.data.map((it) => ({
        planName:
          productNames.get(it.price.product) ?? it.price.nickname ?? it.plan?.nickname ?? it.price.product,
        quantity: it.quantity,
        unitAmount: it.price.unit_amount,
      }))
      const first = s.items.data[0]
      return {
        id: s.id,
        status: s.status,
        planName: items.map((i) => i.planName).join(' + '),
        quantity: first?.quantity ?? 0,
        unitAmount: first?.price.unit_amount ?? null,
        interval: first?.price.recurring?.interval ?? null,
        currentPeriodEnd: ts(s.current_period_end),
        cancelAtPeriodEnd: s.cancel_at_period_end,
        canceledAt: ts(s.canceled_at) || null,
        discount: describeDiscount(s.discount),
        items,
      }
    }),
    invoices: invoices.data.map((i) => ({
      id: i.id,
      number: i.number,
      status: i.status,
      amountDue: i.amount_due,
      amountPaid: i.amount_paid,
      currency: i.currency,
      created: ts(i.created),
      hostedInvoiceUrl: i.hosted_invoice_url,
    })),
    charges: charges.data.map((c) => ({
      id: c.id,
      amount: c.amount,
      currency: c.currency,
      status: c.status,
      created: ts(c.created),
      description: c.description,
      disputed: c.disputed,
      refunded: c.refunded,
      amountRefunded: c.amount_refunded,
      failureMessage: c.failure_message,
    })),
  }
}
