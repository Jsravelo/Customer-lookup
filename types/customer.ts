// ─── Intercom ────────────────────────────────────────────────────────────────

export interface IntercomContact {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  /** ZenMaid user id (Intercom external_id) */
  externalId: string | null
  createdAt: number | null
  lastSeenAt: number | null
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
  body?: string
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
  /** Intercom role: 'user' | 'lead' */
  role?: string | null
  /** True when linked to a ZenMaid account (has external_id) */
  hasAccount?: boolean
  lastSeenAt?: number | null
}

// ─── Topic search ─────────────────────────────────────────────────────────────

export interface TopicResult {
  intercomId: string
  name: string | null
  email: string | null
  company: string | null
  conversationCount: number
  latestConversationDate: number
  matchingSubjects: string[]
  /** AI explanation of why this customer matches the query */
  reason?: string
}

export interface TopicStats {
  /** 'topic' = specific-subject search; 'trend' = "what's been discussed lately" */
  mode?: 'topic' | 'trend'
  /** Trend mode: the analyzed period in days */
  windowDays?: number | null
  matchedConversations: number
  uniqueCustomers: number
  /** All-time Intercom conversations mentioning the strongest related keyword */
  rawMentions: number
  earliest: number | null
  latest: number | null
  /** True when more candidates existed than were AI-reviewed */
  truncated: boolean
  issueSummary: string | null
  themes: string[]
  severity: 'low' | 'moderate' | 'high' | 'critical' | null
  severityReason: string | null
  impactSummary: string | null
}

// ─── Unified profile ─────────────────────────────────────────────────────────

export interface CustomerProfile {
  contact: IntercomContact
  conversations: IntercomConversation[]
  closeLead: CloseLead | null
}
