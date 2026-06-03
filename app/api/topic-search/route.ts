import { NextRequest, NextResponse } from 'next/server'
import type { TopicResult } from '@/types/customer'

const BASE = 'https://api.intercom.io'

function headers() {
  return {
    Authorization: `Bearer ${process.env.INTERCOM_ACCESS_TOKEN}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Intercom-Version': '2.11',
  }
}

export async function POST(req: NextRequest) {
  const { keyword } = await req.json()

  if (!keyword || typeof keyword !== 'string' || keyword.trim().length < 2) {
    return NextResponse.json({ error: 'keyword must be at least 2 characters' }, { status: 400 })
  }

  const kw = keyword.trim()
  // Split multi-word queries so "checklist print" finds conversations mentioning either word
  const searchTerms = kw.split(/\s+/).filter((w) => w.length >= 2)

  try {
    const contactMap = new Map<string, TopicResult>()

    const processConversations = async (res: Response) => {
      if (!res.ok) return
      const data = await res.json()
      const conversations = data.conversations ?? []

      for (const conv of conversations) {
        const contacts = conv.contacts?.contacts ?? []
        const subject = conv.source?.subject ?? null
        const updatedAt = conv.updated_at ?? 0

        for (const c of contacts) {
          const contactId = c.id
          if (!contactId) continue

          if (contactMap.has(contactId)) {
            const existing = contactMap.get(contactId)!
            existing.conversationCount++
            if (updatedAt > existing.latestConversationDate) {
              existing.latestConversationDate = updatedAt
            }
            if (subject && !existing.matchingSubjects.includes(subject)) {
              existing.matchingSubjects.push(subject)
            }
          } else {
            try {
              const contactRes = await fetch(`${BASE}/contacts/${contactId}`, { headers: headers() })
              if (!contactRes.ok) continue
              const contactData = await contactRes.json()
              const company = contactData.companies?.data?.[0]?.name ?? null

              contactMap.set(contactId, {
                intercomId: contactId,
                name: contactData.name ?? null,
                email: contactData.email ?? null,
                company,
                conversationCount: 1,
                latestConversationDate: updatedAt,
                matchingSubjects: subject ? [subject] : [],
              })
            } catch {
              // skip this contact
            }
          }
        }
      }
    }

    // Search each word separately (subject + body) so "checklist print" finds
    // conversations mentioning checklist OR print, not just the exact phrase
    const fetches: Promise<void>[] = []
    for (const term of searchTerms) {
      const subjectRes = fetch(`${BASE}/conversations/search`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          query: { field: 'source.subject', operator: '~', value: term },
          sort: { field: 'updated_at', order: 'descending' },
          pagination: { per_page: 50 },
        }),
      })
      const bodyRes = fetch(`${BASE}/conversations/search`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          query: { field: 'source.body', operator: '~', value: term },
          sort: { field: 'updated_at', order: 'descending' },
          pagination: { per_page: 50 },
        }),
      })
      fetches.push(subjectRes.then((r) => processConversations(r)))
      fetches.push(bodyRes.then((r) => processConversations(r)))
    }
    await Promise.all(fetches)

    const results = Array.from(contactMap.values())
      .sort((a, b) => b.conversationCount - a.conversationCount || b.latestConversationDate - a.latestConversationDate)

    return NextResponse.json({ results, keyword: kw })
  } catch (err) {
    console.error('[topic-search]', err)
    return NextResponse.json({ error: 'Topic search failed' }, { status: 500 })
  }
}
