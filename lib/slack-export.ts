// Search a local Slack workspace export (the ZIP you get from
// Workspace Settings → Import/Export Data, unzipped to a folder).
// Layout: users.json + one folder per channel containing YYYY-MM-DD.json files.
//
// Used automatically by searchSlack() when SLACK_USER_TOKEN is not set but an
// export folder exists — either at $SLACK_EXPORT_DIR or ./slack-export.

import fs from 'fs'
import path from 'path'
import type { SlackMessage } from './slack'

interface IndexedMessage {
  text: string
  from: string
  channel: string
  ts: number
}

let cache: { dir: string; stamp: number; messages: IndexedMessage[] } | null = null

function dirStamp(dir: string): number {
  // Changes when files are added/removed at the export root, so dropping a new
  // CSV in while the server runs is picked up without a restart.
  return fs.statSync(dir).mtimeMs + fs.readdirSync(dir).length
}

export function findExportDir(): string | null {
  const candidates = [process.env.SLACK_EXPORT_DIR, path.join(process.cwd(), 'slack-export')]
  for (const dir of candidates) {
    if (dir && fs.existsSync(dir) && fs.statSync(dir).isDirectory()) return dir
  }
  return null
}

const SKIP_SUBTYPES = new Set([
  'channel_join', 'channel_leave', 'channel_purpose', 'channel_topic',
  'channel_name', 'channel_archive', 'group_join', 'group_leave',
])

function loadUsers(dir: string): Map<string, string> {
  const map = new Map<string, string>()
  try {
    const users = JSON.parse(fs.readFileSync(path.join(dir, 'users.json'), 'utf8'))
    for (const u of users) {
      map.set(u.id, u.profile?.real_name || u.profile?.display_name || u.name || u.id)
    }
  } catch {
    // no users.json — fall back to raw ids
  }
  return map
}

export function cleanText(text: string, users: Map<string, string>): string {
  return text
    .replace(/<@([A-Z0-9]+)(\|[^>]*)?>/g, (_, id) => `@${users.get(id) ?? id}`)
    .replace(/<mailto:([^|>]+)(\|[^>]*)?>/g, '$1')
    .replace(/<(https?:[^|>]+)\|([^>]*)>/g, '$2 ($1)')
    .replace(/<(https?:[^>]+)>/g, '$1')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
}

// ─── CSV support ──────────────────────────────────────────────────────────────
// Accepts any *.csv dropped in the export folder. Handles quoted fields and
// flexible column names (text/message, user/sender, channel, ts/date/timestamp).

export function parseCsv(raw: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (inQuotes) {
      if (ch === '"') {
        if (raw[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field); field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && raw[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.length > 1 || row[0] !== '') rows.push(row)
      row = []
    } else field += ch
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}

export function findColumn(header: string[], names: string[]): number {
  const lower = header.map((h) => h.trim().toLowerCase())
  for (const n of names) {
    const idx = lower.findIndex((h) => h === n || h.includes(n))
    if (idx !== -1) return idx
  }
  return -1
}

export function parseTimestamp(value: string): number {
  const num = parseFloat(value)
  if (!isNaN(num) && num > 1_000_000_000 && String(Math.floor(num)).length >= 10) return num
  const parsed = Date.parse(value)
  return isNaN(parsed) ? 0 : parsed / 1000
}

function loadCsvMessages(dir: string, file: string, users: Map<string, string>): IndexedMessage[] {
  const rows = parseCsv(fs.readFileSync(path.join(dir, file), 'utf8'))
  if (rows.length < 2) return []
  const header = rows[0]
  const textCol = findColumn(header, ['text', 'message', 'msg', 'content', 'body'])
  const fromCol = findColumn(header, ['display name', 'real name', 'username', 'user', 'sender', 'author', 'name'])
  const channelCol = findColumn(header, ['channel', 'conversation'])
  const tsCol = findColumn(header, ['ts', 'timestamp', 'datetime', 'date', 'time', 'created'])
  if (textCol === -1) return []

  const messages: IndexedMessage[] = []
  for (const row of rows.slice(1)) {
    const text = row[textCol]
    if (!text) continue
    const rawFrom = fromCol !== -1 ? row[fromCol] : 'unknown'
    messages.push({
      text: cleanText(text, users),
      from: users.get(rawFrom) ?? rawFrom ?? 'unknown',
      channel: channelCol !== -1 ? row[channelCol] || 'unknown' : file.replace(/\.csv$/, ''),
      ts: tsCol !== -1 ? parseTimestamp(row[tsCol]) : 0,
    })
  }
  return messages
}

function loadExport(dir: string): IndexedMessage[] {
  const stamp = dirStamp(dir)
  if (cache && cache.dir === dir && cache.stamp === stamp) return cache.messages

  const users = loadUsers(dir)
  const messages: IndexedMessage[] = []

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.csv')) {
      try {
        messages.push(...loadCsvMessages(dir, entry.name, users))
      } catch {
        // skip malformed CSVs
      }
      continue
    }
    if (!entry.isDirectory()) continue
    const channel = entry.name
    const channelDir = path.join(dir, channel)
    for (const file of fs.readdirSync(channelDir)) {
      if (!file.endsWith('.json')) continue
      try {
        const days = JSON.parse(fs.readFileSync(path.join(channelDir, file), 'utf8'))
        for (const m of days) {
          if (m.type !== 'message' || !m.text) continue
          if (m.subtype && SKIP_SUBTYPES.has(m.subtype)) continue
          messages.push({
            text: cleanText(m.text, users),
            from: m.username ?? users.get(m.user) ?? m.user ?? 'unknown',
            channel,
            ts: parseFloat(m.ts) || 0,
          })
        }
      } catch {
        // skip malformed day files
      }
    }
  }

  messages.sort((a, b) => b.ts - a.ts)
  cache = { dir, stamp, messages }
  return messages
}

export function searchSlackExport(dir: string, query: string, count = 30): SlackMessage[] {
  const messages = loadExport(dir)
  const needles = query.toLowerCase().split(/\s+/).filter(Boolean)

  const hits: SlackMessage[] = []
  for (const m of messages) {
    const haystack = m.text.toLowerCase()
    if (!needles.every((n) => haystack.includes(n))) continue
    hits.push({
      text: m.text.slice(0, 1200),
      from: m.from,
      channel: m.channel,
      date: new Date(m.ts * 1000).toISOString().slice(0, 10),
      permalink: '',
    })
    if (hits.length >= count) break
  }
  return hits
}
