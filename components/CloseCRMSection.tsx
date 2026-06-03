'use client'

import { useState } from 'react'
import type { CloseLead, CloseActivity } from '@/types/customer'

interface Props {
  lead: CloseLead | null
}

const ACTIVITY_ICONS: Record<string, string> = {
  Call: '📞',
  Email: '✉️',
  Note: '📝',
  Meeting: '📅',
  Task: '✅',
  SMS: '📱',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function ActivityRow({ a }: { a: CloseActivity }) {
  const [expanded, setExpanded] = useState(false)
  const hasBody = !!(a.body || a.note)
  const isExpandable = a.type === 'Email' || a.type === 'Note'

  return (
    <div className="py-2">
      <button
        className={`w-full flex items-start gap-3 text-left ${isExpandable && hasBody ? 'cursor-pointer' : 'cursor-default'}`}
        onClick={() => { if (isExpandable && hasBody) setExpanded(!expanded) }}
      >
        <span className="mt-0.5 text-base shrink-0">{ACTIVITY_ICONS[a.type] ?? '•'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900">{a.type}</span>
            {a.direction && (
              <span className="text-xs text-gray-400">{a.direction}</span>
            )}
            {a.outcome && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{a.outcome}</span>
            )}
            {a.duration != null && (
              <span className="text-xs text-gray-400">{formatDuration(a.duration)}</span>
            )}
          </div>
          {a.subject && <p className="text-sm text-gray-700 font-medium truncate">{a.subject}</p>}
          {!expanded && (a.body || a.note) && (
            <p className="mt-0.5 text-sm text-gray-500 line-clamp-2">{a.body || a.note}</p>
          )}
          <p className="mt-0.5 text-xs text-gray-400">
            {formatDate(a.date)}{a.createdBy ? ` · ${a.createdBy}` : ''}
          </p>
        </div>
        {isExpandable && hasBody && (
          <svg
            className={`mt-1 h-4 w-4 shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </button>
      {expanded && (a.body || a.note) && (
        <div className="ml-7 mt-2 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-sm text-gray-700 whitespace-pre-wrap">
          {a.body || a.note}
        </div>
      )}
    </div>
  )
}

export default function CloseCRMSection({ lead }: Props) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
        <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Close CRM
      </h2>

      {!lead ? (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-400">
          No Close CRM record found for this customer.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Lead summary */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-gray-900">{lead.name}</p>
              {lead.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{lead.description}</p>
              )}
            </div>
            <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              {lead.status}
            </span>
          </div>

          {/* Opportunities */}
          {lead.opportunities.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Opportunities</p>
              <div className="space-y-1.5">
                {lead.opportunities.map((opp) => (
                  <div key={opp.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-gray-700">{opp.name || opp.status}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {opp.value != null && (
                        <span className="text-gray-500">
                          ${(opp.value / 100).toFixed(0)}/{opp.valuePeriod ?? 'mo'}
                        </span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        opp.status.toLowerCase().includes('won')
                          ? 'bg-green-100 text-green-800'
                          : opp.status.toLowerCase().includes('lost')
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {opp.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity feed */}
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Recent Activity
              <span className="ml-1 font-normal normal-case">({lead.activities.length})</span>
            </p>
            {lead.activities.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No recent activity.</p>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto -mx-4 px-4">
                {lead.activities.map((a) => (
                  <ActivityRow key={a.id} a={a} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
