'use client'

import { useState } from 'react'
import SearchBar from '@/components/SearchBar'
import SearchResults from '@/components/SearchResults'
import type { SearchCandidate } from '@/types/customer'

export default function HomePage() {
  const [candidates, setCandidates] = useState<SearchCandidate[]>([])
  const [loading, setLoading] = useState(false)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Customer Lookup</h1>
        <p className="mt-2 text-gray-500">Search by email, name, Intercom ID, or company</p>
      </div>

      <SearchBar onResults={setCandidates} onLoading={setLoading} />

      {loading && (
        <div className="mt-6 flex items-center gap-2 text-sm text-gray-400">
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Searching...
        </div>
      )}

      {!loading && <SearchResults candidates={candidates} />}

      {!loading && candidates.length === 0 && (
        <p className="mt-8 text-xs text-gray-400">
          Tip: Use an exact email for the fastest results
        </p>
      )}
    </main>
  )
}
