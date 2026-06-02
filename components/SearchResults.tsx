'use client'

import Link from 'next/link'
import type { SearchCandidate } from '@/types/customer'

interface Props {
  candidates: SearchCandidate[]
}

export default function SearchResults({ candidates }: Props) {
  if (candidates.length === 0) return null

  return (
    <div className="w-full max-w-2xl mt-4">
      <p className="mb-2 text-sm text-gray-500">{candidates.length} result{candidates.length > 1 ? 's' : ''} found — select a customer:</p>
      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white shadow-sm">
        {candidates.map((c) => (
          <li key={c.intercomId}>
            <Link
              href={`/customer/${c.intercomId}`}
              className="flex items-center gap-4 px-4 py-3 hover:bg-indigo-50 transition-colors"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                {initials(c.name)}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900">{c.name ?? '(no name)'}</p>
                <p className="truncate text-sm text-gray-500">
                  {[c.email, c.company].filter(Boolean).join(' · ')}
                </p>
              </div>
              <svg className="ml-auto h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function initials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}
