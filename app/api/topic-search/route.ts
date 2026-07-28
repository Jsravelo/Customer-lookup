import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { TopicResult } from '@/types/customer'

export const maxDuration = 60

const BASE = 'https://api.intercom.io'
const client = new Anthropic()

function headers() {
  return {
    Authorization: `Bearer ${process.env.INTERCOM_ACCESS_TOKEN}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Intercom-Version': '2.11',
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

// ─── Stage 1: Claude expands the natural-language query into search terms ────

const EXPAND_SCHEMA = {
  type: 'object',
  properties: {
    search_terms: {
      type: 'array',
      items: { type: 'string' },
      description: 'Short keywords/phrases likely to appear in matching customer messages',
    },
    intent: {
      type: 'string',
      description: 'One sentence: what makes a conversation a true match for this query',
    },
  },
  required: ['search_terms', 'intent'],
  additionalProperties: false,
} as const

async function expandQuery(query: string): Promise<{ search_terms: string[]; intent: string }> {
  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 4000,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: EXPAND_SCHEMA } },
    system:
      'You help search a cleaning-business SaaS (ZenMaid) support inbox. Given a support agent\'s natural-language query, produce 5-10 short search terms (1-3 words each) that customers would actually type in messages about this topic — include synonyms, common misspellings are not needed. Also state the intent: what a conversation must actually be about to count as a match (e.g. a complaint vs a mere mention).',
    messages: [{ role: 'user', content: query }],
  })
  const text = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text ?? '{}'
  return JSON.parse(text)
}

// ─── Stage 2: keyword recall from Intercom ────────────────────────────────────

interface Candidate {
  id: string
  subject: string | null
  preview: string
  updatedAt: number
  contactIds: string[]
}

async function findCandidates(
  terms: string[]
): Promise<{ candidates: Candidate[]; rawMentions: number; totalFound: number }> {
  const byId = new Map<string, Candidate>()
  let rawMentions = 0

  const searches = terms.slice(0, 10).flatMap((term) =>
    (['source.subject', 'source.body'] as const).map(async (field) => {
      const res = await fetch(`${BASE}/conversations/search`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          query: { field, operator: '~', value: term },
          sort: { field: 'updated_at', order: 'descending' },
          pagination: { per_page: 40 },
        }),
      })
      if (!res.ok) return
      const data = await res.json()
      // total_count = all-time conversations matching this keyword; keep the
      // largest single-term count as a floor for raw topic volume
      rawMentions = Math.max(rawMentions, data.total_count ?? 0)
      for (const conv of data.conversations ?? []) {
        if (byId.has(conv.id)) continue
        byId.set(conv.id, {
          id: conv.id,
          subject: conv.source?.subject || null,
          preview: stripHtml(conv.source?.body ?? '').slice(0, 250),
          updatedAt: conv.updated_at ?? 0,
          contactIds: (conv.contacts?.contacts ?? []).map((c: { id: string }) => c.id).filter(Boolean),
        })
      }
    })
  )
  await Promise.all(searches)

  const totalFound = byId.size
  const candidates = Array.from(byId.values())
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 100)
  return { candidates, rawMentions, totalFound }
}

// ─── Stage 3: Claude filters candidates by actual relevance ──────────────────

const FILTER_SCHEMA = {
  type: 'object',
  properties: {
    matches: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          conversation_id: { type: 'string' },
          reason: { type: 'string', description: 'Max 12 words: why this matches' },
        },
        required: ['conversation_id', 'reason'],
        additionalProperties: false,
      },
    },
    issue_summary: {
      type: 'string',
      description:
        '2-3 plain-language sentences describing what customers are actually experiencing or asking for on this topic, based on the matching conversations.',
    },
    themes: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Top 3-6 recurring variants of the issue, each with a rough share of the matches, e.g. "Calendar loads slowly or times out (~a third of matches)".',
    },
    severity: {
      type: 'string',
      enum: ['low', 'moderate', 'high', 'critical'],
      description:
        'How big a deal this is: low = occasional questions, moderate = recurring friction, high = blocks workflows or frequent complaints, critical = churn threats / revenue at risk.',
    },
    severity_reason: {
      type: 'string',
      description: 'One sentence justifying the severity rating with concrete signals from the data.',
    },
    impact_summary: {
      type: 'string',
      description:
        '2-4 sentences a support lead can paste when another department asks "how big of a deal is this": how common the issue is, common themes/variants, and severity signals (churn threats, blocked workflows). Ground every claim in the candidate data.',
    },
  },
  required: ['matches', 'issue_summary', 'themes', 'severity', 'severity_reason', 'impact_summary'],
  additionalProperties: false,
} as const

interface TopicReport {
  issueSummary: string
  themes: string[]
  severity: 'low' | 'moderate' | 'high' | 'critical'
  severityReason: string
  impactSummary: string
}

async function filterByIntent(
  query: string,
  intent: string,
  candidates: Candidate[]
): Promise<{ reasons: Map<string, string>; report: TopicReport }> {
  const list = candidates.map((c) => ({
    id: c.id,
    date: new Date(c.updatedAt * 1000).toISOString().slice(0, 10),
    subject: c.subject,
    preview: c.preview,
  }))

  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 8000,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: FILTER_SCHEMA } },
    system:
      'You filter customer support conversations for a support agent\'s search. You are given the agent\'s query, the match intent, and candidate conversations (date, subject, opening message preview). Return only conversations that genuinely match the intent — e.g. for "complained about X", the customer must express a problem or frustration with X, not merely mention it. When a preview is too vague to tell, lean toward including it. Also write an impact_summary the agent can send to other departments: quantify (N of the candidates reviewed match), name the recurring themes, and note severity signals like churn threats or blocked workflows.',
    messages: [
      {
        role: 'user',
        content: `Query: ${query}\nMatch intent: ${intent}\n\nCandidates:\n${JSON.stringify(list)}`,
      },
    ],
  })
  const text =
    response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text ?? '{}'
  const parsed = JSON.parse(text) as {
    matches: { conversation_id: string; reason: string }[]
    issue_summary: string
    themes: string[]
    severity: TopicReport['severity']
    severity_reason: string
    impact_summary: string
  }
  return {
    reasons: new Map((parsed.matches ?? []).map((m) => [m.conversation_id, m.reason])),
    report: {
      issueSummary: parsed.issue_summary ?? '',
      themes: parsed.themes ?? [],
      severity: parsed.severity ?? 'low',
      severityReason: parsed.severity_reason ?? '',
      impactSummary: parsed.impact_summary ?? '',
    },
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { keyword } = await req.json()

  if (!keyword || typeof keyword !== 'string' || keyword.trim().length < 2) {
    return NextResponse.json({ error: 'keyword must be at least 2 characters' }, { status: 400 })
  }
  const query = keyword.trim()

  try {
    // 1. Understand the query
    let terms: string[] = []
    let intent = query
    try {
      const expanded = await expandQuery(query)
      terms = expanded.search_terms
      intent = expanded.intent
    } catch {
      terms = query.split(/\s+/).filter((w) => w.length >= 2)
    }

    // 2. Broad keyword recall
    const { candidates, rawMentions, totalFound } = await findCandidates(terms)
    if (candidates.length === 0) {
      return NextResponse.json({ results: [], keyword: query, stats: null })
    }

    // 3. AI relevance filter — on failure, fall back to keeping everything
    let reasons: Map<string, string>
    let report: TopicReport | null = null
    try {
      const filtered = await filterByIntent(query, intent, candidates)
      reasons = filtered.reasons
      report = filtered.report
    } catch (err) {
      console.error('[topic-search] filter failed, returning unfiltered', err)
      reasons = new Map(candidates.map((c) => [c.id, '']))
    }
    const matched = candidates.filter((c) => reasons.has(c.id))

    // 4. Group by contact and enrich
    const contactConvs = new Map<string, Candidate[]>()
    for (const conv of matched) {
      for (const cid of conv.contactIds) {
        const arr = contactConvs.get(cid) ?? []
        arr.push(conv)
        contactConvs.set(cid, arr)
      }
    }

    const enriched: (TopicResult | null)[] = await Promise.all(
      Array.from(contactConvs.entries()).map(async ([contactId, convs]): Promise<TopicResult | null> => {
        try {
          const res = await fetch(`${BASE}/contacts/${contactId}`, { headers: headers() })
          if (!res.ok) return null
          const c = await res.json()
          const newest = convs.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b))
          return {
            intercomId: contactId,
            name: c.name ?? null,
            email: c.email ?? null,
            company: c.companies?.data?.[0]?.name ?? null,
            conversationCount: convs.length,
            latestConversationDate: newest.updatedAt,
            matchingSubjects: convs.map((v) => v.subject).filter((s): s is string => !!s),
            reason: reasons.get(newest.id) || undefined,
          }
        } catch {
          return null
        }
      })
    )
    const results = enriched.filter((r): r is TopicResult => r !== null)

    results.sort(
      (a, b) => b.conversationCount - a.conversationCount || b.latestConversationDate - a.latestConversationDate
    )

    const dates = matched.map((c) => c.updatedAt).filter(Boolean)
    const stats = {
      matchedConversations: matched.length,
      uniqueCustomers: results.length,
      rawMentions,
      earliest: dates.length ? Math.min(...dates) : null,
      latest: dates.length ? Math.max(...dates) : null,
      truncated: totalFound > candidates.length,
      issueSummary: report?.issueSummary || null,
      themes: report?.themes ?? [],
      severity: report?.severity ?? null,
      severityReason: report?.severityReason || null,
      impactSummary: report?.impactSummary || null,
    }

    return NextResponse.json({ results, keyword: query, stats })
  } catch (err) {
    console.error('[topic-search]', err)
    return NextResponse.json({ error: 'Topic search failed' }, { status: 500 })
  }
}
