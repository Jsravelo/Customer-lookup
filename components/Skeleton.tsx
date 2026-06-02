export function ConversationsSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 rounded-lg bg-gray-100" />
      ))}
    </div>
  )
}

export function CloseSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse space-y-3">
      <div className="h-4 w-1/3 rounded bg-gray-100" />
      <div className="h-3 w-2/3 rounded bg-gray-100" />
      <div className="h-3 w-1/2 rounded bg-gray-100" />
    </div>
  )
}
