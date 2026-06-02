'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { SearchCandidate } from '@/types/customer'

interface Props {
  onResults: (candidates: SearchCandidate[]) => void
  onLoading: (loading: boolean) => void
}

export default function SearchBar({ onResults, onLoading }: Props) {
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setError(null)
    onLoading(true)

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Search failed')
        onResults([])
        return
      }

      const candidates: SearchCandidate[] = data.candidates ?? []

      if (candidates.length === 1) {
        router.push(`/customer/${candidates[0].intercomId}`)
        return
      }

      onResults(candidates)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      onLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Email, name, Intercom ID, or company..."
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-base shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          autoFocus
        />
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 active:bg-indigo-700 disabled:opacity-50"
        >
          Search
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  )
}
