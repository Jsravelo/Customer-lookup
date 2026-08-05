import { describe, it, expect } from 'vitest'
import { parseCsv, findColumn, parseTimestamp, cleanText } from '@/lib/slack-export'

describe('parseCsv', () => {
  it('parses simple rows', () => {
    expect(parseCsv('a,b,c\n1,2,3\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })

  it('handles quoted fields containing commas and newlines', () => {
    const rows = parseCsv('user,text\njorge,"hello, team\nsecond line"\n')
    expect(rows[1]).toEqual(['jorge', 'hello, team\nsecond line'])
  })

  it('handles escaped quotes', () => {
    expect(parseCsv('text\n"she said ""hi"""\n')[1]).toEqual(['she said "hi"'])
  })

  it('handles CRLF line endings', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })
})

describe('findColumn', () => {
  it('finds columns by flexible names, case-insensitively', () => {
    const header = ['Timestamp', 'Channel Name', 'Sender', 'Message']
    expect(findColumn(header, ['ts', 'timestamp'])).toBe(0)
    expect(findColumn(header, ['channel'])).toBe(1)
    expect(findColumn(header, ['user', 'sender'])).toBe(2)
    expect(findColumn(header, ['text', 'message'])).toBe(3)
    expect(findColumn(header, ['nonexistent'])).toBe(-1)
  })
})

describe('parseTimestamp', () => {
  it('accepts unix seconds', () => {
    expect(parseTimestamp('1753900000.000100')).toBeCloseTo(1753900000, 0)
  })
  it('accepts ISO dates', () => {
    expect(parseTimestamp('2026-07-01T12:00:00Z')).toBe(Date.parse('2026-07-01T12:00:00Z') / 1000)
  })
  it('returns 0 for garbage', () => {
    expect(parseTimestamp('not a date')).toBe(0)
  })
})

describe('cleanText', () => {
  const users = new Map([['U001', 'Jorge Ravelo']])

  it('resolves user mentions', () => {
    expect(cleanText('ping <@U001> please', users)).toBe('ping @Jorge Ravelo please')
  })
  it('unwraps mailto links (how customer emails appear in Slack)', () => {
    expect(cleanText('from <mailto:eric@vh.com|eric@vh.com>', users)).toBe('from eric@vh.com')
  })
  it('unwraps labeled URLs and entities', () => {
    expect(cleanText('see <https://x.com|the doc> &amp; more', users)).toBe(
      'see the doc (https://x.com) & more'
    )
  })
})
