import type {
  IntercomContact,
  IntercomConversation,
  IntercomMessage,
  SearchCandidate,
} from '@/types/customer'

const BASE = 'https://api.intercom.io'

function headers() {
  return {
    Authorization: `Bearer ${process.env.INTERCOM_ACCESS_TOKEN}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Intercom-Version': '2.11',
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: headers() })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Intercom ${res.status}: ${text}`)
  }
  return res.json()
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Intercom ${res.status}: ${text}`)
  }
  return res.json()
}

// ─── Contact ─────────────────────────────────────────────────────────────────

function mapContact(raw: Record<string, unknown>): IntercomContact {
  const company = raw.companies as { data?: { id: string; name: string }[] } | null
  const firstCompany = company?.data?.[0] ?? null
  return {
    id: raw.id as string,
    name: (raw.name as string | null) ?? null,
    email: (raw.email as string | null) ?? null,
    phone: (raw.phone as string | null) ?? null,
    createdAt: (raw.created_at as number | null) ?? null,
    lastSeenAt: (raw.last_seen_at as number | null) ?? null,
    company: firstCompany ? { id: firstCompany.id, name: firstCompany.name } : null,
    customAttributes: (raw.custom_attributes as Record<string, string | number | boolean | null>) ?? {},
  }
}

export async function getContactById(id: string): Promise<IntercomContact> {
  const raw = await get<Record<string, unknown>>(`/contacts/${id}`)
  return mapContact(raw)
}

// ─── Search contacts ──────────────────────────────────────────────────────────

export async function searchContactsByEmail(email: string): Promise<SearchCandidate[]> {
  const raw = await post<{ data: Record<string, unknown>[] }>('/contacts/search', {
    query: { field: 'email', operator: '=', value: email },
    pagination: { per_page: 20 },
  })
  return raw.data.map((c) => ({
    intercomId: c.id as string,
    name: (c.name as string | null) ?? null,
    email: (c.email as string | null) ?? null,
    company: ((c.companies as { data?: { name: string }[] } | null)?.data?.[0]?.name) ?? null,
  }))
}

export async function searchContactsByName(name: string): Promise<SearchCandidate[]> {
  const raw = await post<{ data: Record<string, unknown>[] }>('/contacts/search', {
    query: { field: 'name', operator: '~', value: name },
    pagination: { per_page: 20 },
  })
  return raw.data.map((c) => ({
    intercomId: c.id as string,
    name: (c.name as string | null) ?? null,
    email: (c.email as string | null) ?? null,
    company: ((c.companies as { data?: { name: string }[] } | null)?.data?.[0]?.name) ?? null,
  }))
}

export async function searchContactsByPhone(phone: string): Promise<SearchCandidate[]> {
  const raw = await post<{ data: Record<string, unknown>[] }>('/contacts/search', {
    query: { field: 'phone', operator: '=', value: phone },
    pagination: { per_page: 20 },
  })
  return raw.data.map((c) => ({
    intercomId: c.id as string,
    name: (c.name as string | null) ?? null,
    email: (c.email as string | null) ?? null,
    company: ((c.companies as { data?: { name: string }[] } | null)?.data?.[0]?.name) ?? null,
  }))
}

// ─── Conversations ────────────────────────────────────────────────────────────

function channelSource(type: string): IntercomConversation['source'] {
  const map: Record<string, IntercomConversation['source']> = {
    email: 'email',
    chat: 'chat',
    api: 'api',
    twitter: 'twitter',
    facebook: 'facebook',
    sms: 'sms',
    instagram: 'instagram',
    whatsapp: 'whatsapp',
    phone_call: 'phone_call',
  }
  return map[type] ?? 'other'
}

function mapMessage(part: Record<string, unknown>): IntercomMessage {
  const author = part.author as { type: string; name?: string } | null
  return {
    id: part.id as string,
    type: part.part_type as IntercomMessage['type'],
    body: stripHtml((part.body as string | null) ?? ''),
    authorType: (author?.type ?? 'admin') as IntercomMessage['authorType'],
    authorName: author?.name ?? null,
    createdAt: part.created_at as number,
    attachments: ((part.attachments as { name: string; url: string }[]) ?? []),
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim()
}

export async function getConversationsByContactId(
  contactId: string,
  limit = 20
): Promise<IntercomConversation[]> {
  const raw = await post<{ conversations: Record<string, unknown>[] }>('/conversations/search', {
    query: {
      operator: 'AND',
      value: [
        { field: 'contact_ids', operator: 'IN', value: [contactId] },
      ],
    },
    sort: { field: 'updated_at', order: 'descending' },
    pagination: { per_page: limit },
  })

  const conversations = raw.conversations ?? []

  // Fetch full threads in parallel batches of 5
  const results: IntercomConversation[] = []
  for (let i = 0; i < conversations.length; i += 5) {
    const batch = conversations.slice(i, i + 5)
    const fetched = await Promise.all(
      batch.map((c) => getConversationById(c.id as string))
    )
    results.push(...fetched)
  }
  return results
}

export async function getConversationById(id: string): Promise<IntercomConversation> {
  const raw = await get<Record<string, unknown>>(`/conversations/${id}`)
  const source = raw.source as { type?: string; subject?: string; body?: string } | null
  const parts = ((raw.conversation_parts as { conversation_parts?: Record<string, unknown>[] } | null)?.conversation_parts) ?? []
  const assignee = raw.assignee as { name?: string } | null

  const allMessages: IntercomMessage[] = []
  if (source?.body) {
    allMessages.push({
      id: `${id}_source`,
      type: 'comment',
      body: stripHtml(source.body),
      authorType: 'user',
      authorName: null,
      createdAt: raw.created_at as number,
      attachments: [],
    })
  }
  allMessages.push(...parts.map(mapMessage))

  const preview = allMessages[0]?.body?.slice(0, 120) ?? ''

  return {
    id: id,
    createdAt: raw.created_at as number,
    updatedAt: raw.updated_at as number,
    state: raw.state as IntercomConversation['state'],
    source: channelSource(source?.type ?? ''),
    subject: source?.subject ?? null,
    assignedTo: assignee?.name ?? null,
    tags: ((raw.tags as { tags?: { name: string }[] } | null)?.tags ?? []).map((t) => t.name),
    preview,
    messages: allMessages,
  }
}
