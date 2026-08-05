import type { IntercomMessage } from '@/types/customer'

// Shared conversation-classification logic (used by the Intercom panel and
// the unified timeline).

// Intercom credits bot outbound to an "Operator"/bot-named admin identity
export const BOT_NAMES = /\b(zenbot|fin|operator|workflow)\b/i

export const BOT_GREETING = /this is zenbot|i'?m here to answer your questions/i

/**
 * A conversation the bot handled alone — ZenBot/Fin replied and no human
 * teammate ever wrote a message. Only real comments count: assignments and
 * attribute changes carry admin authorship without human involvement.
 */
export function isBotOnly(c: { messages: IntercomMessage[] }): boolean {
  const comments = c.messages.filter((m) => m.type === 'comment' && m.body)
  const botComment = (m: IntercomMessage) =>
    m.authorType === 'bot' || (m.authorType === 'admin' && BOT_NAMES.test(m.authorName ?? ''))
  const humanComment = (m: IntercomMessage) =>
    m.authorType === 'admin' && !BOT_NAMES.test(m.authorName ?? '')
  return comments.some(botComment) && !comments.some(humanComment)
}

const CHANNEL_LABELS: Record<string, string> = {
  conversation: 'Chat',
  chat: 'Chat',
  email: 'Email',
  phone_call: 'Phone',
  sms: 'SMS',
}

/** Human-readable channel name ('conversation' is Intercom's chat channel). */
export function channelLabel(channel: string): string {
  return CHANNEL_LABELS[channel] ?? channel.charAt(0).toUpperCase() + channel.slice(1)
}
