import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getContactById } from '@/lib/intercom'
import { getConversationsByContactId } from '@/lib/intercom'
import { getFullLeadByEmail } from '@/lib/close'
import CustomerHeader from '@/components/CustomerHeader'
import ConversationsWithSearch from '@/components/ConversationsWithSearch'
import CloseCRMSection from '@/components/CloseCRMSection'
import { ConversationsSkeleton, CloseSkeleton } from '@/components/Skeleton'

// ─── Async sub-components (stream in via Suspense) ────────────────────────────

async function ConversationsPanel({ contactId }: { contactId: string }) {
  const conversations = await getConversationsByContactId(contactId, 20)
  return <ConversationsWithSearch conversations={conversations} />
}

async function ClosePanel({ email }: { email: string }) {
  const lead = await getFullLeadByEmail(email)
  return <CloseCRMSection lead={lead} />
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

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Nav bar */}
      <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 text-white font-bold text-sm">Z</div>
          <div>
            <p className="text-xs font-medium text-green-700 leading-none">ZenMaid</p>
            <p className="text-sm font-semibold text-gray-900 leading-tight">Customer Lookup</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <CustomerHeader contact={contact} />

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
      </main>

      <footer className="border-t border-gray-200 bg-white py-4 text-center">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-green-600 text-white font-bold text-xs">Z</div>
          <span>Powered by ZenMaid · Internal CS Tool</span>
        </div>
      </footer>
    </div>
  )
}
