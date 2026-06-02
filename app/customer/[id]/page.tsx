import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getContactById } from '@/lib/intercom'
import { getConversationsByContactId } from '@/lib/intercom'
import { getFullLeadByEmail } from '@/lib/close'
import CustomerHeader from '@/components/CustomerHeader'
import IntercomTimeline from '@/components/IntercomTimeline'
import CloseCRMSection from '@/components/CloseCRMSection'
import { ConversationsSkeleton, CloseSkeleton } from '@/components/Skeleton'

// ─── Async sub-components (stream in via Suspense) ────────────────────────────

async function ConversationsPanel({ contactId }: { contactId: string }) {
  const conversations = await getConversationsByContactId(contactId, 20)
  return <IntercomTimeline conversations={conversations} />
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

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
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
  )
}
