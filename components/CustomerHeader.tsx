import Link from 'next/link'
import type { IntercomContact } from '@/types/customer'

interface Props {
  contact: IntercomContact
  totalConversations?: number
}

function initials(name: string | null, email: string | null): string {
  if (name) {
    return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
  }
  return (email?.[0] ?? '?').toUpperCase()
}

function formatDate(ts: number | null): string {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function CustomerHeader({ contact, totalConversations }: Props) {
  return (
    <div className="mb-6">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-500">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to search
      </Link>

      <div className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* Avatar */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-600 text-xl font-bold text-white">
          {initials(contact.name, contact.email)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-gray-900 truncate">
            {contact.name ?? contact.email ?? 'Unknown customer'}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
            {contact.email && (
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {contact.email}
              </span>
            )}
            {contact.phone && (
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {contact.phone}
              </span>
            )}
            {contact.company && (
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {contact.company.name}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex shrink-0 gap-6 text-center">
          <div>
            <p className="text-xl font-semibold text-gray-900">{totalConversations ?? '—'}</p>
            <p className="text-xs text-gray-500 mt-0.5">Conversations</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{formatDate(contact.lastSeenAt)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Last seen</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{formatDate(contact.createdAt)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Customer since</p>
          </div>
        </div>
      </div>
    </div>
  )
}
