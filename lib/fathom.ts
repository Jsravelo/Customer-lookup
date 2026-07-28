// Fathom call recordings — https://developers.fathom.ai
// Requires FATHOM_API_KEY (Fathom → User Settings → API Access).
// Keys are scoped to the user: they see meetings you recorded or that were
// shared with you/your team.

const BASE = 'https://api.fathom.ai/external/v1'

const FREE_MAIL = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com',
  'live.com', 'msn.com', 'me.com', 'mail.com', 'proton.me', 'protonmail.com',
  'comcast.net', 'verizon.net', 'att.net', 'sbcglobal.net', 'bellsouth.net', 'cox.net',
])

export interface FathomCall {
  title: string
  date: string
  durationMinutes: number | null
  url: string
  invitees: string[]
  summary: string | null
}

interface RawMeeting {
  title?: string
  meeting_title?: string
  created_at?: string
  recording_start_time?: string
  recording_end_time?: string
  url?: string
  share_url?: string
  calendar_invitees?: { email?: string }[]
  default_summary?: string | { markdown_formatted?: string; template_name?: string } | null
}

function mapMeeting(m: RawMeeting): FathomCall {
  const start = m.recording_start_time ? Date.parse(m.recording_start_time) : NaN
  const end = m.recording_end_time ? Date.parse(m.recording_end_time) : NaN
  const summaryRaw =
    typeof m.default_summary === 'string'
      ? m.default_summary
      : m.default_summary?.markdown_formatted ?? null
  return {
    title: m.meeting_title || m.title || 'Untitled call',
    date: (m.recording_start_time ?? m.created_at ?? '').slice(0, 10),
    durationMinutes:
      !isNaN(start) && !isNaN(end) ? Math.round((end - start) / 60000) : null,
    url: m.share_url || m.url || '',
    invitees: (m.calendar_invitees ?? []).map((i) => i.email ?? '').filter(Boolean),
    summary: summaryRaw ? summaryRaw.slice(0, 2500) : null,
  }
}

/** Returns null when Fathom is not configured (no FATHOM_API_KEY). */
export async function getFathomCalls(email: string): Promise<FathomCall[] | null> {
  const key = process.env.FATHOM_API_KEY
  if (!key) return null

  const domain = email.toLowerCase().split('@')[1] ?? ''
  const businessDomain = domain && !FREE_MAIL.has(domain)

  const wanted: FathomCall[] = []
  let cursor: string | null = null
  // Business domains can be filtered server-side; free-mail addresses require
  // paging through recent meetings and matching invitees client-side.
  const maxPages = businessDomain ? 3 : 8

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({ include_summary: 'true' })
    if (businessDomain) params.append('calendar_invitees_domains[]', domain)
    if (cursor) params.set('cursor', cursor)

    const res = await fetch(`${BASE}/meetings?${params}`, {
      headers: { 'X-Api-Key': key },
      cache: 'no-store',
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Fathom ${res.status}: ${text.slice(0, 200)}`)
    }
    const data = await res.json()
    const items: RawMeeting[] = data.items ?? data.meetings ?? []

    for (const m of items) {
      const call = mapMeeting(m)
      const inviteeMatch = call.invitees.some(
        (i) => i.toLowerCase() === email.toLowerCase() ||
          (businessDomain && i.toLowerCase().endsWith(`@${domain}`))
      )
      if (inviteeMatch) wanted.push(call)
    }

    cursor = data.next_cursor ?? data.cursor ?? null
    if (!cursor) break
  }

  return wanted
}
