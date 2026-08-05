import { describe, it, expect } from 'vitest'
import { isBotOnly, channelLabel, BOT_GREETING } from '@/lib/conversations'
import type { IntercomMessage } from '@/types/customer'

const msg = (over: Partial<IntercomMessage>): IntercomMessage => ({
  id: 'm1',
  type: 'comment',
  body: 'hello',
  authorType: 'user',
  authorName: null,
  createdAt: 1_750_000_000,
  attachments: [],
  ...over,
})

describe('isBotOnly', () => {
  it('true for customer + bot with no human reply', () => {
    expect(
      isBotOnly({ messages: [msg({ authorType: 'user' }), msg({ authorType: 'bot' })] })
    ).toBe(true)
  })

  it('false once a human teammate writes a comment', () => {
    expect(
      isBotOnly({
        messages: [
          msg({ authorType: 'user' }),
          msg({ authorType: 'bot' }),
          msg({ authorType: 'admin', authorName: 'Michee' }),
        ],
      })
    ).toBe(false)
  })

  it('ignores admin-authored non-comment parts like assignments (the Operator bug)', () => {
    expect(
      isBotOnly({
        messages: [
          msg({ authorType: 'bot' }),
          msg({ authorType: 'admin', type: 'assignment' as IntercomMessage['type'], body: 'assigned' }),
        ],
      })
    ).toBe(true)
  })

  it('treats bot-named admin authors (Operator, ZenBot, Fin) as bot', () => {
    expect(
      isBotOnly({
        messages: [
          msg({ authorType: 'admin', authorName: 'Operator' }),
          msg({ authorType: 'user' }),
        ],
      })
    ).toBe(true)
  })

  it('false for an unanswered customer-only conversation (no bot involved)', () => {
    expect(isBotOnly({ messages: [msg({ authorType: 'user' })] })).toBe(false)
  })

  it('ignores empty-body comments', () => {
    expect(
      isBotOnly({ messages: [msg({ authorType: 'bot' }), msg({ authorType: 'admin', body: '' })] })
    ).toBe(true)
  })
})

describe('channelLabel', () => {
  it("maps Intercom's 'conversation' channel to Chat (the 'conversation conversation' bug)", () => {
    expect(channelLabel('conversation')).toBe('Chat')
  })
  it('maps known channels and capitalizes unknown ones', () => {
    expect(channelLabel('email')).toBe('Email')
    expect(channelLabel('phone_call')).toBe('Phone')
    expect(channelLabel('whatsapp')).toBe('Whatsapp')
  })
})

describe('BOT_GREETING', () => {
  it('matches the ZenBot opener', () => {
    expect(BOT_GREETING.test('Hi there! This is ZenBot 🤖 I’m here to answer your questions')).toBe(true)
    expect(BOT_GREETING.test('My booking form is broken')).toBe(false)
  })
})
