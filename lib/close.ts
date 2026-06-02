import type { CloseLead, CloseActivity, CloseOpportunity } from '@/types/customer'

const BASE = 'https://api.close.com/api/v1'

function headers() {
  const key = process.env.CLOSE_API_KEY ?? ''
  const encoded = Buffer.from(`${key}:`).toString('base64')
  return {
    Authorization: `Basic ${encoded}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: headers() })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Close ${res.status}: ${text}`)
  }
  return res.json()
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function searchLeadByEmail(email: string): Promise<string | null> {
  const raw = await get<{ data: { id: string }[] }>(
    `/lead/?query=${encodeURIComponent(`email:"${email}"`)}&_fields=id&_limit=1`
  )
  return raw.data[0]?.id ?? null
}

export async function searchLeadByName(name: string): Promise<string | null> {
  const raw = await get<{ data: { id: string }[] }>(
    `/lead/?query=${encodeURIComponent(name)}&_fields=id&_limit=1`
  )
  return raw.data[0]?.id ?? null
}

// ─── Lead ─────────────────────────────────────────────────────────────────────

interface RawOpportunity {
  id: string
  note: string
  status_label: string
  value: number | null
  value_period: string | null
  date_won: string | null
  date_updated: string
}

interface RawLead {
  id: string
  display_name: string
  status_label: string
  url: string | null
  description: string | null
  opportunities: RawOpportunity[]
}

function mapOpportunity(raw: RawOpportunity): CloseOpportunity {
  return {
    id: raw.id,
    name: raw.note,
    status: raw.status_label,
    value: raw.value,
    valuePeriod: raw.value_period,
    closedDate: raw.date_won,
    updatedAt: raw.date_updated,
  }
}

export async function getLeadById(leadId: string): Promise<Omit<CloseLead, 'activities'>> {
  const raw = await get<RawLead>(`/lead/${leadId}/`)
  return {
    id: raw.id,
    name: raw.display_name,
    status: raw.status_label,
    url: raw.url,
    description: raw.description,
    opportunities: (raw.opportunities ?? []).map(mapOpportunity),
  }
}

// ─── Activities ───────────────────────────────────────────────────────────────

interface RawActivity {
  id: string
  _type: string
  date_created: string
  note?: string
  subject?: string
  direction?: string
  duration?: number
  status?: string
  disposition?: string
  created_by_name?: string
  user_name?: string
}

function mapActivity(raw: RawActivity): CloseActivity {
  const type = raw._type.replace('Activity.', '') as CloseActivity['type']
  return {
    id: raw.id,
    type,
    date: raw.date_created,
    note: raw.note,
    subject: raw.subject,
    direction: raw.direction as CloseActivity['direction'],
    duration: raw.duration,
    outcome: raw.disposition ?? raw.status,
    status: raw.status,
    createdBy: raw.created_by_name ?? raw.user_name ?? null,
  }
}

export async function getActivitiesByLeadId(leadId: string): Promise<CloseActivity[]> {
  const raw = await get<{ data: RawActivity[] }>(
    `/activity/?lead_id=${leadId}&_limit=50&_order_by=-date_created`
  )
  return (raw.data ?? []).map(mapActivity)
}

// ─── Full lead fetch ──────────────────────────────────────────────────────────

export async function getFullLeadByEmail(email: string): Promise<CloseLead | null> {
  const leadId = await searchLeadByEmail(email)
  if (!leadId) return null

  const [lead, activities] = await Promise.all([
    getLeadById(leadId),
    getActivitiesByLeadId(leadId),
  ])

  return { ...lead, activities }
}
