'use client'

import Link from 'next/link'
import type { TopicResult, TopicStats } from '@/types/customer'

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
  stats?: TopicStats | null
}

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-center shadow-sm">
      <p className="text-xl font-bold text-zen-800">{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{label}</p>
    </div>
  )
}

const SEVERITY_STYLES: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  moderate: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
}

function monthYear(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export default function TopicResults({ results, keyword, stats }: Props) {
  // Trend mode: a themes report over everything recent — no customer list
  if (stats?.mode === 'trend') {
    return (
      <div className="mt-6 w-full max-w-2xl">
        <div className="mb-3 flex gap-3">
          <StatCard value={stats.matchedConversations} label="Conversations analyzed" />
          <StatCard value={stats.uniqueCustomers} label="Customers involved" />
          <StatCard value={stats.rawMentions} label={`Total in last ${stats.windowDays} days`} />
        </div>
        <div className="rounded-lg border border-zen-100 bg-zen-50 px-4 py-3">
          <div className="mb-2 flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zen-700">
              What customers have been talking about
            </p>
            {stats.earliest && stats.latest && (
              <span className="ml-auto text-xs text-zen-600">
                {monthYear(stats.earliest)} – {monthYear(stats.latest)}
              </span>
            )}
          </div>
          {stats.issueSummary && (
            <p className="text-sm leading-relaxed text-zen-800">{stats.issueSummary}</p>
          )}
          {stats.themes.length > 0 && (
            <ul className="mt-2 space-y-1">
              {stats.themes.map((t) => (
                <li key={t} className="flex gap-2 text-sm text-zen-800">
                  <span className="text-zen-500">•</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          )}
          {stats.truncated && (
            <p className="mt-2 text-xs text-zen-600">
              Analyzed the {stats.matchedConversations} most recent of {stats.rawMentions} conversations in this window.
            </p>
          )}
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Tip: to dig into any theme, search it directly — e.g. "customers complaining about payroll".
        </p>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="mt-6 w-full max-w-2xl rounded-xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm">
        <p className="text-gray-500">No matching customers found for <strong>"{keyword}"</strong>.</p>
        <p className="mt-1 text-sm text-gray-400">Try describing the topic differently or more broadly.</p>
      </div>
    )
  }

  return (
    <div className="mt-6 w-full max-w-2xl">
      {stats && (
        <>
          <div className="mb-3 flex gap-3">
            <StatCard value={stats.matchedConversations} label="Matching conversations" />
            <StatCard value={stats.uniqueCustomers} label="Customers affected" />
            <StatCard value={`~${stats.rawMentions}`} label="All-time keyword mentions" />
          </div>
          {(stats.issueSummary || stats.impactSummary) && (
            <div className="mb-3 rounded-lg border border-zen-100 bg-zen-50 px-4 py-3">
              <div className="mb-2 flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-zen-700">Issue report</p>
                {stats.severity && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${SEVERITY_STYLES[stats.severity] ?? ''}`}>
                    {stats.severity} severity
                  </span>
                )}
                {stats.earliest && stats.latest && (
                  <span className="ml-auto text-xs text-zen-600">
                    {monthYear(stats.earliest)} – {monthYear(stats.latest)}
                  </span>
                )}
              </div>

              {stats.issueSummary && (
                <p className="text-sm leading-relaxed text-zen-800">{stats.issueSummary}</p>
              )}

              {stats.themes.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {stats.themes.map((t) => (
                    <li key={t} className="flex gap-2 text-sm text-zen-800">
                      <span className="text-zen-500">•</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              )}

              {stats.severityReason && (
                <p className="mt-2 text-xs text-zen-700 italic">{stats.severityReason}</p>
              )}

              {stats.impactSummary && (
                <div className="mt-3 border-t border-zen-100 pt-2.5">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zen-700">
                    Paste-ready for other teams
                  </p>
                  <p className="text-sm leading-relaxed text-zen-800">{stats.impactSummary}</p>
                </div>
              )}

              {stats.truncated && (
                <p className="mt-1.5 text-xs text-zen-600">
                  Based on the {stats.matchedConversations} most recent matches — total volume is higher (see keyword mentions).
                </p>
              )}
            </div>
          )}
        </>
      )}
      <p className="mb-3 text-sm text-gray-500">
        <strong>{results.length}</strong> customer{results.length > 1 ? 's' : ''} match <strong>"{keyword}"</strong> — sorted by most conversations
      </p>
      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {results.map((r) => (
          <li key={r.intercomId}>
            <Link
              href={`/customer/${r.intercomId}`}
              className="flex items-center gap-4 px-4 py-3 hover:bg-zen-50 transition-colors"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zen-100 text-sm font-semibold text-zen-800">
                {initials(r.name, r.email)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-gray-900">{r.name ?? r.email ?? '(unknown)'}</p>
                <p className="truncate text-sm text-gray-500">
                  {[r.email, r.company].filter(Boolean).join(' · ')}
                </p>
                {r.reason ? (
                  <p className="mt-0.5 truncate text-xs text-zen-600">{r.reason}</p>
                ) : r.matchingSubjects.length > 0 ? (
                  <p className="mt-0.5 truncate text-xs text-gray-400 italic">
                    "{r.matchingSubjects[0]}"
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <span className="inline-flex items-center rounded-full bg-zen-100 px-2 py-0.5 text-xs font-semibold text-zen-800">
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
