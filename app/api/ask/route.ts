import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getBillingByEmail } from '@/lib/stripe'

export const maxDuration = 60

const client = new Anthropic()

const SYSTEM_PROMPT = `You are a billing assistant for ZenMaid's customer support team. You answer questions about a specific customer's Stripe billing data, which is provided to you as JSON.

ZenMaid pricing context: Pro plan = $39/mo base + $14 per seat. Pro Max plan = $49/mo base + $24 per seat. Amounts in the data are in cents.

Rules:
- Answer directly and concisely — the reader is a support agent mid-conversation with a customer.
- Convert cent amounts to dollars (e.g. 4900 → $49.00).
- If the data doesn't contain the answer, say so plainly. Never guess or invent billing details.
- Flag anything notable the agent should know (delinquent status, pending cancellation, active discounts).`

interface AskBody {
  email: string
  question: string
  history?: { role: 'user' | 'assistant'; content: string }[]
}

export async function POST(req: NextRequest) {
  const { email, question, history = [] } = (await req.json()) as AskBody

  if (!email || !question) {
    return NextResponse.json({ error: 'email and question are required' }, { status: 400 })
  }

  let billing
  try {
    billing = await getBillingByEmail(email)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stripe lookup failed'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  const context = billing
    ? `Customer billing data from Stripe (live):\n${JSON.stringify(billing, null, 2)}`
    : `No Stripe customer found for email ${email}. They may be on a trial, canceled long ago, or use a different billing email.`

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m): Anthropic.MessageParam => ({ role: m.role, content: m.content })),
    { role: 'user', content: `${context}\n\nQuestion: ${question}` },
  ]

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2000,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      messages,
    })

    const answer = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    return NextResponse.json({ answer, foundInStripe: Boolean(billing) })
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
