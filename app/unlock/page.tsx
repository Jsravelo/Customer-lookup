'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function UnlockPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Wrong password')
      }
      router.replace('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f2f7f7] px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/zenmaid-logo.svg" alt="ZenMaid" className="mx-auto h-10 w-auto" />
        <h1 className="mt-4 text-lg font-semibold text-gray-900">Customer Lookup</h1>
        <p className="mt-1 text-sm text-gray-500">Enter the team password to continue</p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-zen-500 focus:outline-none focus:ring-2 focus:ring-zen-200"
          />
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-lg bg-zen-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zen-600 disabled:opacity-50"
          >
            {loading ? 'Unlocking…' : 'Unlock'}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </div>
    </div>
  )
}
