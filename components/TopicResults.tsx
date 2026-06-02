'use client'

import Link from 'next/link'
import type { TopicResult } from '@/types/customer'

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function initials(name: string | null, email: string | null): string {
  if (name) return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
  return (email?.[0] ?? '?').toUpperCase()
}

interface Props {
  results: TopicResult[]
  keyword: string
}

export default function TopicResults({ results, keyword }: Props) {
  if (results.length === 0) {
    return (
      <div className="mt-6 w-full max-w-2xl rounded-xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm">
        <p className="text-gray-500">No customers found who mentioned <strong>"{keyword}"</strong>.</p>
        <p className="mt-1 text-sm text-gray-400">Try a broader keyword or check the spelling.</p>
      </div>
    )
  }

  return (
    <div className="mt-6 w-full max-w-2xl">
      <p className="mb-3 text-sm text-gray-500">
        <strong>{results.length}</strong> customer{results.length > 1 ? 's' : ''} mentioned <strong>"{keyword}"</strong> — sorted by most conversations
      </p>
      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {results.map((r) => (
          <li key={r.intercomId}>
            <Link
              href={`/customer/${r.intercomId}`}
              className="flex items-center gap-4 px-4 py-3 hover:bg-green-50 transition-colors"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-800">
                {initials(r.name, r.email)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-gray-900">{r.name ?? r.email ?? '(unknown)'}</p>
                <p className="truncate text-sm text-gray-500">
                  {[r.email, r.company].filter(Boolean).join(' · ')}
                </p>
                {r.matchingSubjects.length > 0 && (
                  <p className="mt-0.5 truncate text-xs text-gray-400 italic">
                    "{r.matchingSubjects[0]}"
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                  {r.conversationCount}×
                </span>
                <p className="mt-1 text-xs text-gray-400">{formatDate(r.latestConversationDate)}</p>
              </div>
              <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
