// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { yearsSince } from './yearsSince'

type TCase = { when: string; born: string; now: string; years: number }

const BORN = '1974-05-16T14:46:15Z'

// The births are UTC dates. The rows that cross a day, a month or a year at UTC are the ones a
// local-time getter would get wrong: the specs run in America/Sao_Paulo (vitest.config.ts).
const cases: TCase[] = [
  { when: 'the day before the birthday', born: BORN, now: '2026-05-15T23:59:59Z', years: 51 },
  {
    when: 'the birthday, before the birth time',
    born: BORN,
    now: '2026-05-16T00:00:00Z',
    years: 52,
  },
  { when: 'the day after the birthday', born: BORN, now: '2026-05-17T00:00:00Z', years: 52 },
  { when: 'an earlier month with a later day', born: BORN, now: '2026-03-20T00:00:00Z', years: 51 },
  { when: 'a later month with an earlier day', born: BORN, now: '2026-08-01T00:00:00Z', years: 52 },
  {
    when: 'the UTC birthday in any local zone',
    born: '1970-03-30T23:55:08Z',
    now: '2026-03-30T00:00:00Z',
    years: 56,
  },
  { when: 'the first UTC day of the year', born: BORN, now: '2027-01-01T01:00:00Z', years: 52 },
  {
    when: 'a UTC new year birth, a day early',
    born: '1990-01-01T01:00:00Z',
    now: '2026-12-31T12:00:00Z',
    years: 36,
  },
  {
    when: 'a UTC new year birth, on the day',
    born: '1990-01-01T01:00:00Z',
    now: '2027-01-01T12:00:00Z',
    years: 37,
  },
]

describe('yearsSince', () => {
  it.each(cases)('counts $years years on $when', ({ born, now, years }) => {
    expect(yearsSince(born, new Date(now))).toBe(years)
  })
})
