// ─── Intercom ────────────────────────────────────────────────────────────────

export interface IntercomContact {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  createdAt: number | null
  lastSeenAt: number | null
  avatar: string | null
  company: {
    id: string
    name: string
  } | null
  customAttributes: Record<string, string | number | boolean | null>
}

export interface IntercomMessage {
  id: string
  type: 'comment' | 'note' | 'assignment' | 'open' | 'close'
  body: string
  authorType: 'user' | 'admin' | 'bot'
  authorName: string | null
  createdAt: number
  attachments: { name: string; url: string }[]
}

export interface IntercomConversation {
  id: string
  createdAt: number
  updatedAt: number
  state: 'open' | 'closed' | 'snoozed'
  source: 'email' | 'chat' | 'api' | 'twitter' | 'facebook' | 'sms' | 'instagram' | 'whatsapp' | 'phone_call' | 'other'
  subject: string | null
  assignedTo: string | null
  tags: string[]
  preview: string
  messages: IntercomMessage[]
}

// ─── Close CRM ───────────────────────────────────────────────────────────────

export interface CloseActivity {
  id: string
  type: 'Call' | 'Email' | 'Note' | 'Meeting' | 'Task' | 'SMS'
  date: string
  note?: string
  subject?: string
  direction?: 'inbound' | 'outbound'
  duration?: number
  outcome?: string
  status?: string
  createdBy: string | null
}

export interface CloseOpportunity {
  id: string
  name: string
  status: string
  value: number | null
  valuePeriod: string | null
  closedDate: string | null
  updatedAt: string
}

export interface CloseLead {
  id: string
  name: string
  status: string
  url: string | null
  description: string | null
  opportunities: CloseOpportunity[]
  activities: CloseActivity[]
}

// ─── Search results ───────────────────────────────────────────────────────────

export interface SearchCandidate {
  intercomId: string
  name: string | null
  email: string | null
  company: string | null
}

// ─── Unified profile ─────────────────────────────────────────────────────────

export interface CustomerProfile {
  contact: IntercomContact
  conversations: IntercomConversation[]
  closeLead: CloseLead | null
}
