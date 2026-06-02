'use client'

import { useState, useMemo } from 'react'
import type { IntercomConversation } from '@/types/customer'
import ConversationCard from './ConversationCard'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchesQuery(c: IntercomConversation, query: string): boolean {
  if (!query.trim()) return true
  const q = query.toLowerCase()
  if (c.subject?.toLowerCase().includes(q)) return true
  if (c.preview.toLowerCase().includes(q)) return true
  if (c.tags.some((t) => t.toLowerCase().includes(q))) return true
  if (c.messages.some((m) => m.body.toLowerCase().includes(q))) return true
  return false
}

function analyzeTopics(conversations: IntercomConversation[]) {
  const tagCounts: Record<string, number> = {}
  const subjectCounts: Record<string, number> = {}

  conversations.forEach((c) => {
    c.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1
    })
    if (c.subject) {
      const normalized = c.subject.trim()
      if (normalized) subjectCounts[normalized] = (subjectCounts[normalized] || 0) + 1
    }
  })

  const recurringTags = Object.entries(tagCounts)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])

  const recurringSubjects = Object.entries(subjectCounts)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])

  return { recurringTags, recurringSubjects }
}

// ─── Recurring topics panel ───────────────────────────────────────────────────

function RecurringTopics({
  conversations,
  onTopicClick,
}: {
  conversations: IntercomConversation[]
  onTopicClick: (topic: string) => void
}) {
  const { recurringTags, recurringSubjects } = useMemo(
    () => analyzeTopics(conversations),
    [conversations]
  )

  const hasAny = recurringTags.length > 0 || recurringSubjects.length > 0

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-800">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
        </svg>
        Recurring topics
      </p>
      {!hasAny ? (
        <p className="text-xs text-amber-700">No recurring topics detected in the last 20 conversations.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {recurringTags.map(([tag, count]) => (
            <button
              key={tag}
              onClick={() => onTopicClick(tag)}
              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-200 transition-colors"
              title={`Click to filter conversations by "${tag}"`}
            >
              {tag}
              <span className="rounded-full bg-amber-300 px-1.5 text-amber-900">{count}×</span>
            </button>
          ))}
          {recurringSubjects.map(([subject, count]) => (
            <button
              key={subject}
              onClick={() => onTopicClick(subject)}
              className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-900 hover:bg-orange-200 transition-colors"
              title={`Click to filter conversations by "${subject}"`}
            >
              {subject}
              <span className="rounded-full bg-orange-300 px-1.5 text-orange-900">{count}×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ConversationsWithSearch({
  conversations,
}: {
  conversations: IntercomConversation[]
}) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(
    () => conversations.filter((c) => matchesQuery(c, query)),
    [conversations, query]
  )

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
        <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3-3-3z" />
        </svg>
        Intercom Conversations
        <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-500">
          {conversations.length}
        </span>
      </h2>

      {/* Recurring topics */}
      <RecurringTopics
        conversations={conversations}
        onTopicClick={(topic) => setQuery(topic)}
      />

      {/* Search input */}
      <div className="relative mb-3">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations... (e.g. 'booking form', 'promised', 'refund')"
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-9 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Results count when filtering */}
      {query && (
        <p className="mb-2 text-xs text-gray-500">
          {filtered.length === 0
            ? 'No conversations match'
            : `${filtered.length} of ${conversations.length} conversations match`}
        </p>
      )}

      {/* Conversation list */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-400">
          {query ? `No conversations mention "${query}"` : 'No conversations found.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <ConversationCard key={c.id} conversation={c} searchQuery={query} />
          ))}
        </div>
      )}
    </section>
  )
}
