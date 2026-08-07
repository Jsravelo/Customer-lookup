import { describe, it, expect } from 'vitest'
import { classifyCallSignals } from '@/lib/calls'

const msg = (channel: string, text: string, date = '2026-03-24') => ({ channel, text, date })

describe('classifyCallSignals', () => {
  it('counts Fathom recordings as calls held', () => {
    const s = classifyCallSignals(null, ['2026-03-24', '2026-05-01'])
    expect(s.held).toBe(2)
    expect(s.lastHeldDate).toBe('2026-05-01')
  })

  it('counts Slack call summaries as calls held', () => {
    const s = classifyCallSignals(
      [msg('csx-call-summaries', 'Optimization call with Eric — went well')],
      null
    )
    expect(s.held).toBe(1)
  })

  it('does not double-count when Fathom and Slack cover the same call', () => {
    const s = classifyCallSignals(
      [msg('csx-call-summaries', 'Call summary for Eric')],
      ['2026-03-24']
    )
    expect(s.held).toBe(1)
  })

  it('detects no-shows in call channels', () => {
    const s = classifyCallSignals(
      [
        msg('csx-call-summaries', 'No-show: customer did not join the optimization call'),
        msg('csx-call-summaries', 'no show again for the 2:30 demo'),
      ],
      null
    )
    expect(s.noShows).toBe(2)
    expect(s.held).toBe(0)
  })

  it('detects cancellations and reschedules', () => {
    const s = classifyCallSignals(
      [msg('csx-notifs-demo-signup', 'Customer cancelled their demo call')],
      null
    )
    expect(s.cancelled).toBe(1)
    expect(s.booked).toBe(0)
  })

  it('counts bookings from signup channels', () => {
    const s = classifyCallSignals(
      [msg('csx-notifs-demo-signup', 'New Optimization Call booked for Mon Mar 24 10:45am ET')],
      null
    )
    expect(s.booked).toBe(1)
  })

  it('ignores non-call channels entirely', () => {
    const s = classifyCallSignals(
      [msg('cs-bug-reports', 'customer cancelled their subscription — no show stopper')],
      null
    )
    expect(s).toEqual({ held: 0, lastHeldDate: null, booked: 0, noShows: 0, cancelled: 0 })
  })

  it('handles null inputs', () => {
    expect(classifyCallSignals(null, null).held).toBe(0)
  })

  it('counts connected Close calls as held, skipping short dials', () => {
    const s = classifyCallSignals(null, null, [
      { date: '2026-02-01T15:00:00Z', duration: 600 },
      { date: '2026-02-03T15:00:00Z', duration: 5 }, // voicemail dial — ignored
      { date: '2026-02-05T15:00:00Z', duration: null }, // missed — ignored
    ])
    expect(s.held).toBe(1)
    expect(s.lastHeldDate).toBe('2026-02-01')
  })

  it('takes the largest source instead of summing overlapping systems', () => {
    const s = classifyCallSignals(
      [msg('csx-call-summaries', 'Call summary')],
      ['2026-03-24', '2026-05-01'],
      [{ date: '2026-03-24T15:00:00Z', duration: 1800 }]
    )
    expect(s.held).toBe(2) // Fathom has the most complete record here
  })
})
