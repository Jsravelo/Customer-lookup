'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// Per-browser "recently viewed" — stored in localStorage, so each teammate
// gets their own private list with no backend involved.

export interface RecentCustomer {
  id: string
  name: string | null
  email: string | null
  ts: number
}

const KEY = 'cl_recent_customers'
const MAX = 8

export function recordRecentCustomer(entry: Omit<RecentCustomer, 'ts'>) {
  try {
    const list: RecentCustomer[] = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    const next = [
      { ...entry, ts: Date.now() },
      ...list.filter((r) => r.id !== entry.id),
    ].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // localStorage unavailable — skip silently
  }
}

function initials(name: string | null, email: string | null): string {
  if (name) return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
  return (email?.[0] ?? '?').toUpperCase()
}

export default function RecentCustomers() {
  const [recents, setRecents] = useState<RecentCustomer[]>([])

  useEffect(() => {
    try {
      setRecents(JSON.parse(localStorage.getItem(KEY) ?? '[]'))
    } catch {
      // ignore
    }
  }, [])

  if (recents.length === 0) return null

  return (
    <div className="mt-8">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Recently viewed</p>
        <button
          onClick={() => {
            localStorage.removeItem(KEY)
            setRecents([])
          }}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Clear
        </button>
      </div>
      <ul className="divide-y divide-gray-50 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {recents.map((r) => (
          <li key={r.id}>
            <Link
              href={`/customer/${r.id}`}
              className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-zen-50"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zen-100 text-xs font-semibold text-zen-800">
                {initials(r.name, r.email)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-gray-900">
                  {r.name ?? r.email ?? '(unknown)'}
                </span>
                {r.email && <span className="block truncate text-xs text-gray-500">{r.email}</span>}
              </span>
              <svg className="h-4 w-4 shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
