import type { IntercomConversation } from '@/types/customer'
import ConversationCard from './ConversationCard'

interface Props {
  conversations: IntercomConversation[]
}

export default function IntercomTimeline({ conversations }: Props) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
        <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3-3-3z" />
        </svg>
        Intercom Conversations
        <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-500">
          {conversations.length}
        </span>
      </h2>

      {conversations.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-400">
          No conversations found.
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => (
            <ConversationCard key={c.id} conversation={c} />
          ))}
        </div>
      )}
    </section>
  )
}
