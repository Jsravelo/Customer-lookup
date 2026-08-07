// Slack search — requires a user token (xoxp) with the search:read scope,
// because Slack's search.messages API does not work with bot tokens.

const BASE = 'https://slack.com/api'

export interface SlackMessage {
  text: string
  from: string
  channel: string
  date: string
  permalink: string
}

/**
 * Returns null when Slack is not configured at all. Prefers the live API
 * (SLACK_USER_TOKEN); falls back to a local workspace export folder
 * (SLACK_EXPORT_DIR or ./slack-export) for offline testing.
 */
export async function searchSlack(query: string, count = 30): Promise<SlackMessage[] | null> {
  const token = process.env.SLACK_USER_TOKEN
  if (!token) {
    const { findExportDir, searchSlackExport } = await import('./slack-export')
    const dir = findExportDir()
    if (!dir) return null
    return searchSlackExport(dir, query, count)
  }

  const params = new URLSearchParams({
    query,
    count: String(count),
    sort: 'timestamp',
    sort_dir: 'desc',
  })
  const res = await fetch(`${BASE}/search.messages?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  const data = await res.json()
  if (!data.ok) throw new Error(`Slack error: ${data.error}`)

  interface RawMatch {
    text?: string
    username?: string
    user?: string
    channel?: {
      name?: string
      is_channel?: boolean
      is_private?: boolean
      is_im?: boolean
      is_mpim?: boolean
      is_group?: boolean
    }
    ts: string
    permalink?: string
  }

  // SECURITY: the user token searches with the visibility of whoever
  // installed the Slack app, but the whole team uses this tool. Only surface
  // PUBLIC channels — never DMs, group DMs, or private channels, even though
  // the token holder can see them.
  const isPublicChannel = (m: RawMatch) =>
    m.channel?.is_channel === true &&
    !m.channel.is_private &&
    !m.channel.is_im &&
    !m.channel.is_mpim &&
    !m.channel.is_group

  return ((data.messages?.matches ?? []) as RawMatch[]).filter(isPublicChannel).map((m) => ({
    text: (m.text ?? '').slice(0, 1200),
    from: m.username ?? m.user ?? 'unknown',
    channel: m.channel?.name ?? 'unknown',
    date: new Date(parseFloat(m.ts) * 1000).toISOString().slice(0, 10),
    permalink: m.permalink ?? '',
  }))
}
