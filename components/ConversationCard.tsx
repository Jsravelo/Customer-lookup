'use client'

import React, { useState } from 'react'
import type { IntercomConversation } from '@/types/customer'

const CHANNEL_ICONS: Record<string, string> = {
  email: '✉️',
  chat: '💬',
  sms: '📱',
  whatsapp: '📲',
  instagram: '📸',
  facebook: '👤',
  twitter: '🐦',
  phone_call: '📞',
  api: '🔌',
  other: '💬',
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDuration(ts: number): string {
  const d = new Date(ts * 1000)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-yellow-900 rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

interface Props {
  conversation: IntercomConversation
  searchQuery?: string
}

export default function ConversationCard({ conversation: c, searchQuery = '' }: Props) {
  const [expanded, setExpanded] = useState(!!searchQuery)

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="mt-0.5 text-lg shrink-0" title={c.source}>
          {CHANNEL_ICONS[c.source]}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              c.state === 'open'
                ? 'bg-green-100 text-green-800'
                : c.state === 'snoozed'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {c.state}
            </span>
            {c.subject && (
              <span className="text-sm font-medium text-gray-900 truncate">{c.subject}</span>
            )}
            {c.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                {tag}
              </span>
            ))}
          </div>
          <p className="mt-1 text-sm text-gray-500 truncate">{highlight(c.preview || '(no preview)', searchQuery)}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-medium text-gray-900">{formatDuration(c.updatedAt)}</p>
          {c.assignedTo && (
            <p className="text-xs text-gray-400 mt-0.5">{c.assignedTo}</p>
          )}
        </div>
        <svg
          className={`mt-1 h-4 w-4 shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Expanded messages */}
      {expanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
          {c.messages.length === 0 && (
            <p className="px-4 py-3 text-sm text-gray-400">No messages in thread.</p>
          )}
          {c.messages.map((msg) => (
            <div
              key={msg.id}
              className={`px-4 py-3 text-sm ${
                msg.authorType === 'admin' ? 'bg-indigo-50' : msg.authorType === 'bot' ? 'bg-gray-50' : 'bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className={`font-medium ${
                  msg.authorType === 'admin' ? 'text-indigo-700' : msg.authorType === 'bot' ? 'text-gray-500' : 'text-gray-900'
                }`}>
                  {msg.authorName ?? (msg.authorType === 'admin' ? 'Support' : msg.authorType === 'bot' ? 'Bot' : 'Customer')}
                </span>
                <span className="text-xs text-gray-400 shrink-0">{formatDate(msg.createdAt)}</span>
              </div>
              {msg.type === 'assignment' ? (
                <p className="text-gray-400 italic">Conversation assigned</p>
              ) : msg.type === 'open' ? (
                <p className="text-green-600 italic">Conversation reopened</p>
              ) : msg.type === 'close' ? (
                <p className="text-gray-400 italic">Conversation closed</p>
              ) : (
                <p className="text-gray-700 whitespace-pre-wrap">{highlight(msg.body, searchQuery)}</p>
              )}
              {msg.attachments.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-2">
                  {msg.attachments.map((a) => (
                    <a key={a.url} href={a.url} target="_blank" rel="noreferrer"
                      className="text-xs text-indigo-600 underline hover:text-indigo-500">
                      📎 {a.name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
