// Distills call activity for the status strip from three sources:
// - Fathom: recorded calls the customer attended
// - Slack call channels (call summaries / demo signups): bookings, summaries,
//   no-shows and cancellations posted by the team
// - Close: logged Call activities (connected calls only)

export interface CallSignals {
  /** Calls that actually happened (recorded in Fathom, or summarized in Slack) */
  held: number
  lastHeldDate: string | null
  /** Demo/optimization calls booked (from signup notification channels) */
  booked: number
  noShows: number
  cancelled: number
}

interface CallSlackMessage {
  channel: string
  text: string
  date: string
}

const CALL_CHANNEL = /call|demo/i
const SUMMARY_CHANNEL = /summar/i
const BOOKING_CHANNEL = /signup|sign-up|booking/i
const NO_SHOW = /no[\s-]?show/i
const CANCELLED = /cancel{1,2}(ed|led|ation)?|reschedul/i

export interface CloseCallActivity {
  date: string
  /** seconds; voicemail dials and missed calls are 0 or very short */
  duration?: number | null
}

/** A Close call counts as held when it actually connected for a while. */
const MIN_CONNECTED_SECONDS = 30

export function classifyCallSignals(
  slack: CallSlackMessage[] | null,
  fathomDates: string[] | null,
  closeCalls: CloseCallActivity[] | null = null
): CallSignals {
  const callMsgs = (slack ?? []).filter((m) => CALL_CHANNEL.test(m.channel))

  let noShows = 0
  let cancelled = 0
  let summaries = 0
  let booked = 0
  const heldDates: string[] = [...(fathomDates ?? [])]

  for (const m of callMsgs) {
    if (NO_SHOW.test(m.text)) {
      noShows++
    } else if (CANCELLED.test(m.text)) {
      cancelled++
    } else if (SUMMARY_CHANNEL.test(m.channel)) {
      summaries++
      heldDates.push(m.date)
    } else if (BOOKING_CHANNEL.test(m.channel)) {
      booked++
    }
  }

  const connectedCloseCalls = (closeCalls ?? []).filter(
    (c) => (c.duration ?? 0) >= MIN_CONNECTED_SECONDS
  )
  heldDates.push(...connectedCloseCalls.map((c) => c.date.slice(0, 10)))

  // Fathom recordings, Slack summaries, and Close call logs overlap (the same
  // call can appear in all three) — take the largest set, don't sum them
  const held = Math.max((fathomDates ?? []).length, summaries, connectedCloseCalls.length)
  const lastHeldDate = heldDates.length ? heldDates.sort().slice(-1)[0] : null

  return { held, lastHeldDate, booked, noShows, cancelled }
}
