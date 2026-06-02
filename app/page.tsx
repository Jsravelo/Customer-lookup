'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SearchResults from '@/components/SearchResults'
import TopicResults from '@/components/TopicResults'
import type { SearchCandidate } from '@/types/customer'
import type { TopicResult } from '@/types/customer'

type Mode = 'customer' | 'topic'

export default function HomePage() {
  const [mode, setMode] = useState<Mode>('customer')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<SearchCandidate[]>([])
  const [topicResults, setTopicResults] = useState<TopicResult[] | null>(null)
  const [searchedKeyword, setSearchedKeyword] = useState('')
  const router = useRouter()

  function switchMode(m: Mode) {
    setMode(m)
    setQuery('')
    setError(null)
    setCandidates([])
    setTopicResults(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setError(null)
    setCandidates([])
    setTopicResults(null)
    setLoading(true)

    try {
      if (mode === 'customer') {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: query.trim() }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Search failed'); return }
        const list: SearchCandidate[] = data.candidates ?? []
        if (list.length === 1) { router.push(`/customer/${list[0].intercomId}`); return }
        setCandidates(list)
        if (list.length === 0) setError('No customers found. Try a different search.')
      } else {
        const res = await fetch('/api/topic-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword: query.trim() }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Search failed'); return }
        setTopicResults(data.results ?? [])
        setSearchedKeyword(data.keyword ?? query.trim())
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            {/* ZenMaid logo mark */}
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 text-white font-bold text-sm">
              Z
            </div>
            <div>
              <p className="text-xs font-medium text-green-700 leading-none">ZenMaid</p>
              <p className="text-sm font-semibold text-gray-900 leading-tight">Customer Lookup</p>
            </div>
          </div>
          <p className="hidden sm:block text-xs text-gray-400">Internal CS Tool</p>
        </div>
      </header>

      {/* Main */}
      <main className="flex flex-1 flex-col items-center px-4 py-12">
        <div className="w-full max-w-2xl">

          {/* Hero */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              What do you need to find?
            </h1>
            <p className="mt-2 text-gray-500 text-sm leading-relaxed max-w-md mx-auto">
              Look up a specific customer to see their full conversation history, or search across all customers to find who has asked about a particular feature or topic.
            </p>
          </div>

          {/* Mode toggle */}
          <div className="mb-6 flex rounded-xl bg-white border border-gray-200 p-1 shadow-sm">
            <button
              onClick={() => switchMode('customer')}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                mode === 'customer'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Find a Customer
            </button>
            <button
              onClick={() => switchMode('topic')}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                mode === 'topic'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Who Asked About...
            </button>
          </div>

          {/* Context hint */}
          <div className="mb-4 rounded-lg bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-800">
            {mode === 'customer' ? (
              <p>
                <strong>Find a Customer</strong> — enter their email, full name, Intercom ID, or company name.
                Opens their Intercom conversation history and Close CRM record side by side.
              </p>
            ) : (
              <p>
                <strong>Who Asked About...</strong> — type a feature, topic, or phrase (e.g. "booking form", "payroll", "recurring").
                Returns all customers who have mentioned it in their support conversations.
              </p>
            )}
          </div>

          {/* Search form */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                mode === 'customer'
                  ? 'Email, name, Intercom ID, or company...'
                  : 'Feature or topic (e.g. "booking form", "payroll")...'
              }
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-500 active:bg-green-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {loading ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : 'Search'}
            </button>
          </form>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          {/* Results */}
          {!loading && mode === 'customer' && <SearchResults candidates={candidates} />}
          {!loading && mode === 'topic' && topicResults !== null && (
            <TopicResults results={topicResults} keyword={searchedKeyword} />
          )}

          {/* Empty state tip */}
          {!loading && candidates.length === 0 && topicResults === null && !error && (
            <p className="mt-8 text-center text-xs text-gray-400">
              Tip: Use an exact email address for the fastest customer lookup
            </p>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-4 text-center">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-green-600 text-white font-bold text-xs">
            Z
          </div>
          <span>Powered by ZenMaid · Internal CS Tool</span>
        </div>
      </footer>
    </div>
  )
}
