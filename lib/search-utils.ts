// Collapsing duplicate Intercom contact records in search results.
// Intercom often holds several records for one person (e.g. an orphan created
// at signup alongside the real account-linked record).

export interface ScorableCandidate {
  intercomId: string
  email: string | null
  role?: string | null
  hasAccount?: boolean
  lastSeenAt?: number | null
}

/** Higher = more likely the person's real record. */
export function scoreCandidate(c: ScorableCandidate): number {
  return (c.hasAccount ? 4 : 0) + (c.role === 'user' ? 2 : 0) + (c.lastSeenAt ? 1 : 0)
}

/**
 * One result per email address — prefers linked ZenMaid account, then role
 * 'user', then most recently seen. Candidates without an email pass through.
 */
export function dedupeCandidates<T extends ScorableCandidate>(candidates: T[]): T[] {
  const byEmail = new Map<string, T>()
  const noEmail: T[] = []
  for (const c of candidates) {
    const key = c.email?.toLowerCase()
    if (!key) {
      noEmail.push(c)
      continue
    }
    const prev = byEmail.get(key)
    if (
      !prev ||
      scoreCandidate(c) > scoreCandidate(prev) ||
      (scoreCandidate(c) === scoreCandidate(prev) && (c.lastSeenAt ?? 0) > (prev.lastSeenAt ?? 0))
    ) {
      byEmail.set(key, c)
    }
  }
  return [...Array.from(byEmail.values()), ...noEmail]
}
