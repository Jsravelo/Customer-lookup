import { NextRequest, NextResponse } from 'next/server'
import {
  searchContactsByEmail,
  searchContactsByName,
  getContactById,
} from '@/lib/intercom'
import type { SearchCandidate } from '@/types/customer'

export async function POST(req: NextRequest) {
  const { query } = await req.json()

  if (!query || typeof query !== 'string') {
    return NextResponse.json({ error: 'query is required' }, { status: 400 })
  }

  const trimmed = query.trim()

  try {
    let candidates: SearchCandidate[] = []

    // Intercom ID — numeric string, direct lookup
    if (/^\d+$/.test(trimmed)) {
      try {
        const contact = await getContactById(trimmed)
        candidates = [
          {
            intercomId: contact.id,
            name: contact.name,
            email: contact.email,
            company: contact.company?.name ?? null,
          },
        ]
      } catch {
        // not a valid Intercom ID, fall through to name search
      }
    }

    // Email search
    if (candidates.length === 0 && trimmed.includes('@')) {
      candidates = await searchContactsByEmail(trimmed)
    }

    // Name/company search
    if (candidates.length === 0) {
      candidates = await searchContactsByName(trimmed)
    }

    // Deduplicate by intercomId
    const seen = new Set<string>()
    const unique = candidates.filter((c) => {
      if (seen.has(c.intercomId)) return false
      seen.add(c.intercomId)
      return true
    })

    // Intercom often holds duplicate contact records for one person (e.g. an
    // orphan created at signup alongside the real account-linked record).
    // Collapse same-email results, preferring: linked ZenMaid account >
    // role 'user' > most recently seen.
    const score = (c: SearchCandidate) =>
      (c.hasAccount ? 4 : 0) + (c.role === 'user' ? 2 : 0) + (c.lastSeenAt ? 1 : 0)
    const byEmail = new Map<string, SearchCandidate>()
    const noEmail: SearchCandidate[] = []
    for (const c of unique) {
      const key = c.email?.toLowerCase()
      if (!key) {
        noEmail.push(c)
        continue
      }
      const prev = byEmail.get(key)
      if (
        !prev ||
        score(c) > score(prev) ||
        (score(c) === score(prev) && (c.lastSeenAt ?? 0) > (prev.lastSeenAt ?? 0))
      ) {
        byEmail.set(key, c)
      }
    }
    const deduped = [...Array.from(byEmail.values()), ...noEmail]

    return NextResponse.json({ candidates: deduped })
  } catch (err) {
    console.error('[search]', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
