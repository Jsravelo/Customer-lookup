'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { HISTORY_PROMPT } from '@/lib/prompts'

// Auto-generated, cached customer brief. First visit generates and stores it;
// later visits load instantly with a Refresh option.

export default function BriefCard({ email, contactId }: { email: string; contactId: string }) {
  const [brief, setBrief] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const startedRef = useRef(false)

  const generate = useCallback(async () => {
    setGenerating(true)
    setError(null)
    setStatus('Working out where to look…')
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, contactId, question: HISTORY_PROMPT }),
      })
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Brief generation failed')
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let done = false
      let answer: string | null = null
      while (!done) {
        const chunk = await reader.read()
        done = chunk.done
        buffer += decoder.decode(chunk.value ?? new Uint8Array(), { stream: !done })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          const event = JSON.parse(line)
          if (event.type === 'status') setStatus(event.status)
          else if (event.type === 'answer') answer = event.answer
          else if (event.type === 'error') throw new Error(event.error)
        }
      }
      if (!answer) throw new Error('No brief produced — try Refresh')
      setBrief(answer)
      const saved = await fetch('/api/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, brief: answer }),
      }).then((r) => (r.ok ? r.json() : null))
      setUpdatedAt(saved?.updatedAt ?? new Date().toISOString())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setGenerating(false)
      setStatus(null)
    }
  }, [email, contactId])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    ;(async () => {
      try {
        const res = await fetch(`/api/brief?contactId=${encodeURIComponent(contactId)}`)
        const data = res.ok ? await res.json() : { brief: null }
        if (data.brief) {
          setBrief(data.brief)
          setUpdatedAt(data.updatedAt ?? null)
        } else {
          await generate()
        }
      } catch {
        await generate()
      }
    })()
  }, [contactId, generate])

  async function copyBrief() {
    if (!brief) return
    await navigator.clipboard.writeText(brief)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const freshness = updatedAt
    ? new Date(updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
        <h2 className="text-base font-semibold text-gray-900">Customer brief</h2>
        {freshness && <span className="text-xs text-gray-400">updated {freshness}</span>}
        <div className="ml-auto flex items-center gap-2">
          {brief && (
            <button onClick={copyBrief} className="rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50">
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          )}
          <button
            onClick={generate}
            disabled={generating}
            className="rounded-md bg-zen-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-zen-600 disabled:opacity-60"
          >
            {generating ? 'Generating…' : brief ? 'Refresh' : 'Generate'}
          </button>
        </div>
      </div>

      <div className="px-4 py-3">
        {generating && (
          <div className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-zen-500" />
            {status ?? 'Compiling the brief…'}
          </div>
        )}
        {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {brief && !generating && (
          <>
            <div className={`prose-chat text-sm text-gray-900 ${expanded ? '' : 'max-h-80 overflow-hidden'}`}>
              <ReactMarkdown>{brief}</ReactMarkdown>
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 text-xs font-medium text-zen-600 hover:text-zen-700"
            >
              {expanded ? 'Show less ▲' : 'Show full brief ▼'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
