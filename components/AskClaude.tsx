'use client'

import { useState, useRef, useEffect } from 'react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'What plan are they on and how many seats?',
  'When is their next payment and how much?',
  'Do they have any discounts applied?',
  'Any failed or unpaid invoices?',
]

export default function AskClaude({ email }: { email: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function ask(question: string) {
    if (!question.trim() || loading) return
    setError(null)
    setInput('')
    const history = messages
    setMessages((prev) => [...prev, { role: 'user', content: question }])
    setLoading(true)

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, question, history }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Request failed')
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-orange-500 text-white text-xs font-bold">C</div>
        <h2 className="text-base font-semibold text-gray-900">Ask Claude about billing</h2>
        <span className="ml-auto text-xs text-gray-400">Live Stripe data</span>
      </div>

      <div className="max-h-96 overflow-y-auto px-4 py-3">
        {messages.length === 0 && !loading && (
          <div className="py-2">
            <p className="mb-2 text-sm text-gray-500">Ask anything about this customer&apos;s billing:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600 hover:border-orange-300 hover:bg-orange-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`mb-3 ${m.role === 'user' ? 'text-right' : ''}`}>
            <div
              className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm text-left ${
                m.role === 'user'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="mb-3">
            <div className="inline-block rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-500">
              Checking Stripe and thinking…
            </div>
          </div>
        )}

        {error && (
          <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          ask(input)
        }}
        className="flex gap-2 border-t border-gray-100 px-4 py-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Why was their last invoice higher than usual?"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </div>
  )
}
