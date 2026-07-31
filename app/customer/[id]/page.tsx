import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getContactById, getConversationsByContactId, countConversations } from '@/lib/intercom'
import { getFullLeadByEmail } from '@/lib/close'
import CustomerHeader from '@/components/CustomerHeader'
import ConversationsWithSearch from '@/components/ConversationsWithSearch'
import CloseCRMSection from '@/components/CloseCRMSection'
import AskClaude from '@/components/AskClaude'
import StatusStrip from '@/components/StatusStrip'
import BriefCard from '@/components/BriefCard'
import TimelinePanel from '@/components/TimelinePanel'
import { ConversationsSkeleton, CloseSkeleton } from '@/components/Skeleton'

// ─── Async sub-components (stream in via Suspense) ────────────────────────────

async function ConversationsPanel({ contactId }: { contactId: string }) {
  try {
    const conversations = await getConversationsByContactId(contactId, 20)
    return <ConversationsWithSearch conversations={conversations} />
  } catch (err) {
    console.error('[conversations-panel]', err)
    return (
      <div>
        <h2 className="mb-3 text-base font-semibold text-gray-900">Intercom Conversations</h2>
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Couldn&apos;t load conversations from Intercom. Check the Intercom access token.
        </p>
      </div>
    )
  }
}

async function ClosePanel({ email }: { email: string }) {
  try {
    const lead = await getFullLeadByEmail(email)
    return <CloseCRMSection lead={lead} />
  } catch (err) {
    console.error('[close-panel]', err)
    return (
      <div>
        <h2 className="mb-3 text-base font-semibold text-gray-900">Close CRM</h2>
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Couldn&apos;t load the Close CRM record. The Close API key is likely invalid or expired —
          update CLOSE_API_KEY in the environment settings.
        </p>
      </div>
    )
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: { id: string }
}

export default async function CustomerPage({ params }: PageProps) {
  let contact
  try {
    contact = await getContactById(params.id)
  } catch {
    notFound()
  }
  if (!contact) notFound()

  const totalConversations = await countConversations(params.id).catch(() => undefined)

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Nav bar */}
      <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/zenmaid-logo.svg" alt="ZenMaid" className="h-9 w-auto" />
          <div className="h-6 w-px bg-gray-200" />
          <p className="text-sm font-semibold text-gray-900">Customer Lookup</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <CustomerHeader contact={contact} totalConversations={totalConversations} />

      {contact.email && (
        <Suspense fallback={<div className="mb-6 h-12 animate-pulse rounded-lg bg-gray-100" />}>
          <StatusStrip contact={contact} />
        </Suspense>
      )}

      {contact.email && (
        <div className="mb-6 space-y-4">
          <BriefCard email={contact.email} contactId={params.id} />
          <AskClaude email={contact.email} contactId={params.id} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Conversations — streams in */}
        <div className="lg:col-span-2 xl:col-span-1">
          <Suspense fallback={
            <div>
              <h2 className="mb-3 text-base font-semibold text-gray-900">Intercom Conversations</h2>
              <ConversationsSkeleton />
            </div>
          }>
            <ConversationsPanel contactId={params.id} />
          </Suspense>
        </div>

        {/* Close CRM — streams in */}
        <div>
          <Suspense fallback={
            <div>
              <h2 className="mb-3 text-base font-semibold text-gray-900">Close CRM</h2>
              <CloseSkeleton />
            </div>
          }>
            {contact.email ? (
              <ClosePanel email={contact.email} />
            ) : (
              <CloseCRMSection lead={null} />
            )}
          </Suspense>
        </div>
      </div>

      {contact.email && (
        <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-xl bg-gray-100" />}>
          <TimelinePanel email={contact.email} contactId={params.id} />
        </Suspense>
      )}
      </main>

      <footer className="border-t border-gray-200 bg-white py-4 text-center">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/zenmaid-logo.svg" alt="ZenMaid" className="h-4 w-auto opacity-70" />
          <span>· Internal CS Tool</span>
        </div>
      </footer>
    </div>
  )
}
