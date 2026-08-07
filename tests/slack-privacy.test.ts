import { describe, it, expect } from 'vitest'
import { isPublicChannel } from '@/lib/slack'

// The whole team searches Slack through one person's token, so nothing
// beyond public channels may ever surface. These tests are the guarantee.
describe('isPublicChannel (Slack privacy guard)', () => {
  it('allows a plain public channel', () => {
    expect(isPublicChannel({ is_channel: true })).toBe(true)
    expect(isPublicChannel({ is_channel: true, is_private: false, is_im: false })).toBe(true)
  })

  it('blocks private channels', () => {
    expect(isPublicChannel({ is_channel: true, is_private: true })).toBe(false)
  })

  it('blocks direct messages', () => {
    expect(isPublicChannel({ is_im: true })).toBe(false)
    expect(isPublicChannel({ is_channel: true, is_im: true })).toBe(false)
  })

  it('blocks group DMs', () => {
    expect(isPublicChannel({ is_mpim: true })).toBe(false)
    expect(isPublicChannel({ is_channel: true, is_mpim: true })).toBe(false)
  })

  it('blocks legacy private groups', () => {
    expect(isPublicChannel({ is_group: true })).toBe(false)
    expect(isPublicChannel({ is_channel: true, is_group: true })).toBe(false)
  })

  it('denies by default when channel info is missing or ambiguous', () => {
    expect(isPublicChannel(undefined)).toBe(false)
    expect(isPublicChannel({})).toBe(false)
    // is_channel absent — not positively identified as public → drop
    expect(isPublicChannel({ is_private: false })).toBe(false)
  })
})
