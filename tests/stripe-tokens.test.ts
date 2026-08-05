import { describe, it, expect } from 'vitest'
import { candidateTokens } from '@/lib/stripe'

describe('candidateTokens (Stripe fuzzy-match fallback)', () => {
  it('uses the business domain (the eric@virginiahousekeepers.com case)', () => {
    expect(candidateTokens('eric@virginiahousekeepers.com')).toContain('virginiahousekeepers')
  })

  it('never searches by free-mail domains', () => {
    expect(candidateTokens('dellsmaidcleaning@gmail.com')).not.toContain('gmail')
  })

  it('uses a distinctive local part on free-mail addresses', () => {
    expect(candidateTokens('dellsmaidcleaning@gmail.com')).toContain('dellsmaidcleaning')
  })

  it('skips generic local parts like info@', () => {
    const tokens = candidateTokens('info@acmecleaningco.com')
    expect(tokens).not.toContain('info')
    expect(tokens).toContain('acmecleaningco')
  })

  it('skips short local parts that would over-match', () => {
    expect(candidateTokens('eric@virginiahousekeepers.com')).not.toContain('eric')
  })

  it('returns nothing useful for short free-mail addresses', () => {
    expect(candidateTokens('bob@gmail.com')).toEqual([])
  })
})
