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

  try {
    // Search conversations by subject containing keyword
    const subjectRes = await fetch(`${BASE}/conversations/search`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        query: {
          field: 'source.subject',
          operator: '~',
          value: kw,
        },
        sort: { field: 'updated_at', order: 'descending' },
        pagination: { per_page: 50 },
      }),
    })

    // Also try body search (may or may not be supported depending on plan)
    const bodyRes = await fetch(`${BASE}/conversations/search`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        query: {
          field: 'source.body',
          operator: '~',
          value: kw,
        },
        sort: { field: 'updated_at', order: 'descending' },
        pagination: { per_page: 50 },
      }),
    })

    const contactMap = new Map<string, TopicResult>()

    async function processConversations(res: Response) {
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
            // Fetch contact details
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

    await Promise.all([
      processConversations(subjectRes),
      processConversations(bodyRes),
    ])

    const results = Array.from(contactMap.values())
      .sort((a, b) => b.conversationCount - a.conversationCount || b.latestConversationDate - a.latestConversationDate)

    return NextResponse.json({ results, keyword: kw })
  } catch (err) {
    console.error('[topic-search]', err)
    return NextResponse.json({ error: 'Topic search failed' }, { status: 500 })
  }
}
