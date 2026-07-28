import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getBillingByEmail } from '@/lib/stripe'
import { listConversationSummaries, getConversationById } from '@/lib/intercom'
import { getFullLeadByEmail } from '@/lib/close'
import { searchSlack } from '@/lib/slack'
import { getFathomCalls } from '@/lib/fathom'

export const maxDuration = 60

const client = new Anthropic()

const SYSTEM_PROMPT = `You are a customer support assistant for ZenMaid's team. You answer questions about one specific customer, using live data you fetch with tools:

- get_stripe_billing — live Stripe: subscriptions, invoices, charges, disputes, refunds, failed payments.
- list_conversations — the customer's Intercom support conversation history (summaries, newest first).
- read_conversation — full transcript of one Intercom conversation.
- get_close_crm — Close CRM sales record: lead status, opportunities, notes, calls, SMS.
- search_slack — internal team Slack: bug escalations, data upload requests, call notes, feature requests, and other internal discussion about customers. The team references customers by email address, so search the email first; a follow-up search by name or business name can catch more.
- get_fathom_calls — recorded calls with this customer from Fathom, including AI-generated call summaries with dates and durations.

ZenMaid pricing context: Pro plan = $39/mo base + $14 per seat. Pro Max plan = $49/mo base + $24 per seat. Stripe amounts are in cents.

Rules:
- Pick the right source for the question. Billing → Stripe. "Has the customer ever had an issue with / asked about / complained about X" → list conversations, then read the ones whose subject/preview look relevant. Sales history / notes → Close. Internal escalations, reported bugs, data uploads → Slack. Recorded calls and what was discussed on them → Fathom (Slack may also reference calls).
- For a full customer summary, check Intercom, Stripe, Close, Slack AND Fathom.
- For history questions, read enough conversations to answer confidently — don't stop at the first match, but don't read all of them either.
- Answer directly and concisely — the reader is a support agent mid-conversation with a customer. Cite dates when referencing past conversations or charges.
- Convert cent amounts to dollars (e.g. 4900 → $49.00).
- If the data doesn't contain the answer, say so plainly. Never guess or invent details.
- Flag anything notable the agent should know (delinquent status, pending cancellation, repeated complaints about the same thing).`

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_stripe_billing',
    description:
      "Fetch the customer's live Stripe billing data: subscriptions (plan, seats, status, discounts), last 10 invoices, and last 50 charges with disputed/refunded/failed flags. Includes fuzzy matching when the Stripe billing email differs from their ZenMaid email.",
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_conversations',
    description:
      "List the customer's Intercom support conversations, newest first. Returns id, dates, channel, state, subject, a short preview, and tags for each. Use read_conversation to get the full transcript of any that look relevant.",
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'read_conversation',
    description: 'Read the full message transcript of one Intercom conversation by its id.',
    input_schema: {
      type: 'object',
      properties: {
        conversation_id: { type: 'string', description: 'Intercom conversation id from list_conversations' },
      },
      required: ['conversation_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_close_crm',
    description:
      "Fetch the customer's Close CRM sales record: lead status, opportunities, and recent activities (notes, calls, SMS, emails).",
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_fathom_calls',
    description:
      "Fetch this customer's recorded calls from Fathom: title, date, duration, participants, and the AI-generated call summary. Matched by the customer's email/domain on the calendar invite.",
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'search_slack',
    description:
      "Search the ZenMaid team's internal Slack for messages about this customer — bug escalations, data upload requests, call notes, feature requests. The team usually references customers by email address. Defaults to searching the customer's email; pass a query to search their name, business name, or email plus a topic.",
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: "Slack search query. Omit to search the customer's email address.",
        },
      },
      additionalProperties: false,
    },
  },
]

const day = (unix: number) => new Date(unix * 1000).toISOString().slice(0, 10)

async function runTool(
  name: string,
  input: Record<string, unknown>,
  ctx: { email: string; contactId: string | null }
): Promise<string> {
  switch (name) {
    case 'get_stripe_billing': {
      const billing = await getBillingByEmail(ctx.email)
      if (!billing) {
        return `No Stripe customer found for ${ctx.email} (exact and fuzzy search both empty). They may be on a trial, canceled long ago, or billed under an unrelated email.`
      }
      return JSON.stringify(billing)
    }

    case 'list_conversations': {
      if (!ctx.contactId) return 'No Intercom contact id available for this customer.'
      const convos = await listConversationSummaries(ctx.contactId)
      if (convos.length === 0) return 'This customer has no Intercom conversations.'
      return JSON.stringify(
        convos.map((c) => ({
          id: c.id,
          started: day(c.createdAt),
          lastActivity: day(c.updatedAt),
          state: c.state,
          channel: c.channel,
          subject: c.subject,
          preview: c.preview,
          tags: c.tags,
        }))
      )
    }

    case 'read_conversation': {
      const id = String(input.conversation_id ?? '')
      if (!id) return 'Error: conversation_id is required.'
      const convo = await getConversationById(id)
      return JSON.stringify({
        id: convo.id,
        date: day(convo.createdAt),
        subject: convo.subject,
        state: convo.state,
        assignedTo: convo.assignedTo,
        tags: convo.tags,
        messages: convo.messages.slice(0, 60).map((m) => ({
          date: day(m.createdAt),
          from: m.authorType === 'user' ? 'customer' : m.authorName ?? 'ZenMaid',
          text: m.body.slice(0, 1500),
        })),
      })
    }

    case 'get_close_crm': {
      const lead = await getFullLeadByEmail(ctx.email)
      if (!lead) return `No Close CRM lead found for ${ctx.email}.`
      return JSON.stringify({
        ...lead,
        activities: lead.activities.slice(0, 50).map((a) => ({
          ...a,
          body: a.body?.slice(0, 800),
        })),
      })
    }

    case 'get_fathom_calls': {
      const calls = await getFathomCalls(ctx.email)
      if (calls === null) {
        return 'Fathom is not connected yet (FATHOM_API_KEY is not configured). Tell the agent call recordings are unavailable; Slack may still reference calls.'
      }
      if (calls.length === 0) return `No Fathom calls found with ${ctx.email} (or their domain) on the invite.`
      return JSON.stringify(calls)
    }

    case 'search_slack': {
      const q = String(input.query ?? '').trim() || ctx.email
      const msgs = await searchSlack(q)
      if (msgs === null) {
        return 'Slack is not connected yet (SLACK_USER_TOKEN is not configured). Tell the agent Slack data is unavailable.'
      }
      if (msgs.length === 0) return `No Slack messages found for "${q}".`
      return JSON.stringify(msgs)
    }

    default:
      return `Error: unknown tool ${name}`
  }
}

interface AskBody {
  email: string
  contactId?: string
  question: string
  history?: { role: 'user' | 'assistant'; content: string }[]
}

export async function POST(req: NextRequest) {
  const { email, contactId = null, question, history = [] } = (await req.json()) as AskBody

  if (!email || !question) {
    return NextResponse.json({ error: 'email and question are required' }, { status: 400 })
  }

  const ctx = { email, contactId }
  const messages: Anthropic.MessageParam[] = [
    ...history.map((m): Anthropic.MessageParam => ({ role: m.role, content: m.content })),
    {
      role: 'user',
      content: `Customer: email ${email}${contactId ? `, Intercom contact id ${contactId}` : ''}.\n\nQuestion: ${question}`,
    },
  ]

  try {
    for (let i = 0; i < 8; i++) {
      const response = await client.messages.create({
        model: 'claude-opus-5',
        max_tokens: 8000,
        thinking: { type: 'adaptive' },
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      })

      if (response.stop_reason === 'refusal') {
        return NextResponse.json({
          answer: "I can't help with that question. Try rephrasing it, or ask about the customer's billing, conversations, or CRM history.",
        })
      }

      if (response.stop_reason !== 'tool_use') {
        const answer = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('')
        return NextResponse.json({ answer })
      }

      // Execute the requested tools and continue the loop
      messages.push({ role: 'assistant', content: response.content })

      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      )
      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUses.map(async (tu) => {
          let result: string
          let isError = false
          try {
            result = await runTool(tu.name, tu.input as Record<string, unknown>, ctx)
          } catch (err) {
            result = err instanceof Error ? err.message : 'Tool failed'
            isError = true
          }
          return {
            type: 'tool_result' as const,
            tool_use_id: tu.id,
            content: result,
            ...(isError ? { is_error: true } : {}),
          }
        })
      )
      messages.push({ role: 'user', content: toolResults })
    }

    return NextResponse.json(
      { error: 'Took too many steps to answer — try a more specific question.' },
      { status: 504 }
    )
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: 'Invalid ANTHROPIC_API_KEY' }, { status: 502 })
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'Claude is rate-limited, try again shortly' }, { status: 429 })
    }
    const msg = err instanceof Error ? err.message : 'Claude request failed'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
