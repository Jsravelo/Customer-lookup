import { NextRequest, NextResponse } from 'next/server'
import {
  searchContactsByEmail,
  searchContactsByName,
  getContactById,
} from '@/lib/intercom'
import { searchLeadByName } from '@/lib/close'
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

    // Name/company search — try both Intercom and Close in parallel
    if (candidates.length === 0) {
      const [intercomResults] = await Promise.all([
        searchContactsByName(trimmed),
        searchLeadByName(trimmed), // used to validate Close has a record, not returned here
      ])
      candidates = intercomResults
    }

    // Deduplicate by intercomId
    const seen = new Set<string>()
    const unique = candidates.filter((c) => {
      if (seen.has(c.intercomId)) return false
      seen.add(c.intercomId)
      return true
    })

    return NextResponse.json({ candidates: unique })
  } catch (err) {
    console.error('[search]', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
