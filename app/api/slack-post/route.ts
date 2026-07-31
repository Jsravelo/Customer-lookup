import { NextRequest, NextResponse } from 'next/server'

// Posts a brief to Slack. Needs a BOT token with chat:write (much easier to
// approve than the search token — it can only post, not read) and a channel:
//   SLACK_BOT_TOKEN=xoxb-...
//   SLACK_BRIEF_CHANNEL=#customer-briefs   (or a channel ID like C0123456789)
export async function POST(req: NextRequest) {
  const token = process.env.SLACK_BOT_TOKEN
  const channel = process.env.SLACK_BRIEF_CHANNEL
  if (!token || !channel) {
    return NextResponse.json(
      { error: 'Slack posting not configured (SLACK_BOT_TOKEN + SLACK_BRIEF_CHANNEL)' },
      { status: 501 }
    )
  }

  const { text, title } = await req.json()
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 })

  const body = `${title ? `*${title}*\n\n` : ''}${text}`.slice(0, 39000)
  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, text: body, unfurl_links: false }),
  })
  const data = await res.json()
  if (!data.ok) {
    return NextResponse.json({ error: `Slack: ${data.error}` }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}
