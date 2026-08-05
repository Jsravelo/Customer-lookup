import { describe, it, expect } from 'vitest'
import { dedupeCandidates, scoreCandidate } from '@/lib/search-utils'

const c = (over: Partial<Parameters<typeof scoreCandidate>[0]> & { intercomId: string }) => ({
  email: 'person@example.com',
  role: 'user',
  hasAccount: false,
  lastSeenAt: null,
  ...over,
})

describe('dedupeCandidates', () => {
  it('collapses same-email duplicates to one result', () => {
    const result = dedupeCandidates([c({ intercomId: 'a' }), c({ intercomId: 'b' })])
    expect(result).toHaveLength(1)
  })

  it('prefers the record linked to a ZenMaid account (the two-Rebeccas bug)', () => {
    const orphan = c({ intercomId: 'orphan', hasAccount: false, lastSeenAt: null })
    const real = c({ intercomId: 'real', hasAccount: true, lastSeenAt: 1_754_000_000 })
    expect(dedupeCandidates([orphan, real])[0].intercomId).toBe('real')
    expect(dedupeCandidates([real, orphan])[0].intercomId).toBe('real')
  })

  it('prefers role user over lead when neither has an account', () => {
    const lead = c({ intercomId: 'lead', role: 'lead' })
    const user = c({ intercomId: 'user', role: 'user' })
    expect(dedupeCandidates([lead, user])[0].intercomId).toBe('user')
  })

  it('breaks ties by most recently seen', () => {
    const older = c({ intercomId: 'older', lastSeenAt: 100 })
    const newer = c({ intercomId: 'newer', lastSeenAt: 200 })
    expect(dedupeCandidates([older, newer])[0].intercomId).toBe('newer')
  })

  it('groups emails case-insensitively', () => {
    const a = c({ intercomId: 'a', email: 'Person@Example.com' })
    const b = c({ intercomId: 'b', email: 'person@example.com' })
    expect(dedupeCandidates([a, b])).toHaveLength(1)
  })

  it('keeps distinct emails and email-less candidates', () => {
    const result = dedupeCandidates([
      c({ intercomId: 'a', email: 'a@x.com' }),
      c({ intercomId: 'b', email: 'b@x.com' }),
      c({ intercomId: 'c', email: null }),
      c({ intercomId: 'd', email: null }),
    ])
    expect(result).toHaveLength(4)
  })
})
