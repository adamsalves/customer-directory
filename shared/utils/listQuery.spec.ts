// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { prototypePage } from '../../tests/prototypePage'
import type { IListQuery } from './listQuery'
import {
  DEFAULT_PER_PAGE,
  MAX_SEARCH_LENGTH,
  PER_PAGE_OPTIONS,
  parseListQuery,
  sameListState,
  serializeListQuery,
} from './listQuery'

// Not a canonical positive integer string. The arrays matter: a single-element array and a
// number both stringify into something that looks valid, so only a type check rejects them.
const NOT_A_PAGE: unknown[] = [
  '0',
  '-1',
  '2.5',
  'abc',
  '02',
  '',
  ' 2',
  '+2',
  '1e1',
  ['2'],
  ['2', '3'],
  2,
  true,
  null,
]

const NOT_A_PER_PAGE: unknown[] = [
  '10',
  '0',
  '-9',
  '55',
  '',
  'abc',
  '18.0',
  '018',
  ' 18',
  '0x12',
  '1.8e1',
  ['18'],
  ['18', '27'],
  18,
  true,
  null,
]

// Not a string. A single-element array and a number both stringify into something that looks like
// a search, so only a type check rejects them.
const NOT_A_SEARCH: unknown[] = [['ariela'], ['ariela', 'nunes'], [], 42, 0, true, null, undefined]

// Canonical searches: no space at the ends. The words are split by the search itself, so the ones
// inside stay
const SEARCHES = ['ariela', 'ELEUTÉRIO', 'álda', 'girao  rosa']

// Objects, because `it.each` spreads a case that is an array into the callback arguments
const asCases = (values: unknown[]) => values.map((value) => ({ value }))

const queries: IListQuery[] = [
  ...PER_PAGE_OPTIONS.flatMap((perPage) =>
    [1, 2, 10].map((page) => ({ page, perPage, search: '' })),
  ),
  ...SEARCHES.map((search) => ({ page: 3, perPage: 18, search })),
]

describe('parseListQuery', () => {
  it('returns the defaults for an empty query', () => {
    expect(parseListQuery({})).toStrictEqual({ page: 1, perPage: 9, search: '' })
  })

  it.each(asCases([null, undefined, 'x', 42, []]))(
    'returns the defaults when the input is $value',
    ({ value }) => {
      expect(parseListQuery(value)).toStrictEqual({ page: 1, perPage: 9, search: '' })
    },
  )

  it.each(['1', '3', '10', '999'])('accepts page=%s', (page) => {
    expect(parseListQuery({ page }).page).toBe(Number(page))
  })

  it.each(asCases(NOT_A_PAGE))('falls back to page 1 for page=$value', ({ value }) => {
    expect(parseListQuery({ page: value }).page).toBe(1)
  })

  it.each(PER_PAGE_OPTIONS)('accepts perPage=%s', (perPage) => {
    expect(parseListQuery({ perPage: String(perPage) }).perPage).toBe(perPage)
  })

  it.each(asCases(NOT_A_PER_PAGE))('falls back to 9 for perPage=$value', ({ value }) => {
    expect(parseListQuery({ perPage: value }).perPage).toBe(DEFAULT_PER_PAGE)
  })

  it.each(SEARCHES)('keeps search=%j as it came', (search) => {
    expect(parseListQuery({ search }).search).toBe(search)
  })

  // "ana " and "ana" are one list state, and a blank search is the whole list
  it.each([
    { value: ' álda ', search: 'álda' },
    { value: '\tgirao  rosa\n', search: 'girao  rosa' },
    { value: ' ', search: '' },
    { value: ' \t\n', search: '' },
  ])('trims search=$value', ({ value, search }) => {
    expect(parseListQuery({ search: value }).search).toBe(search)
  })

  // Every word is checked against every name on each request, so the length has a ceiling
  it('cuts a search longer than MAX_SEARCH_LENGTH', () => {
    const search = 'a '.repeat(5000)

    expect(parseListQuery({ search }).search).toBe(search.slice(0, MAX_SEARCH_LENGTH - 1))
  })

  it('keeps a search of exactly MAX_SEARCH_LENGTH whole, after the trim', () => {
    const search = 'a'.repeat(MAX_SEARCH_LENGTH)

    expect(parseListQuery({ search: ` ${search} ` }).search).toBe(search)
  })

  // The cut lands on a space: the result has no space at the end, so it is canonical too
  it('trims the end of a cut search again', () => {
    const search = `${'a'.repeat(MAX_SEARCH_LENGTH - 1)} b`
    const parsed = parseListQuery({ search })

    expect(parsed.search).toBe('a'.repeat(MAX_SEARCH_LENGTH - 1))
    expect(parseListQuery(serializeListQuery(parsed))).toStrictEqual(parsed)
  })

  it.each(asCases(NOT_A_SEARCH))('falls back to an empty search for search=$value', ({ value }) => {
    expect(parseListQuery({ search: value }).search).toBe('')
  })

  it('validates page, perPage and search independently, each under its own key', () => {
    expect(parseListQuery({ page: '3', perPage: '18' })).toStrictEqual({
      page: 3,
      perPage: 18,
      search: '',
    })
    expect(parseListQuery({ page: 'x', perPage: '18' })).toStrictEqual({
      page: 1,
      perPage: 18,
      search: '',
    })
    expect(parseListQuery({ page: '3', perPage: 'x' })).toStrictEqual({
      page: 3,
      perPage: 9,
      search: '',
    })
    expect(parseListQuery({ page: 'x', perPage: 'x', search: 'ariela' })).toStrictEqual({
      page: 1,
      perPage: 9,
      search: 'ariela',
    })
    expect(parseListQuery({ page: '3', perPage: '18', search: ['ariela'] })).toStrictEqual({
      page: 3,
      perPage: 18,
      search: '',
    })
  })

  it('ignores unknown keys, the pt-BR ones that ADR-0021 retired included', () => {
    expect(parseListQuery({ pagina: '3', por: '18', busca: 'ariela', color: 'red' })).toStrictEqual(
      { page: 1, perPage: 9, search: '' },
    )
  })

  it('offers the page sizes of the prototype', () => {
    const sizes = /const PER_PAGE = \[([^\]]*)\]/.exec(prototypePage())?.[1] ?? ''

    expect(sizes).not.toBe('')
    expect([...PER_PAGE_OPTIONS]).toStrictEqual(sizes.split(',').map(Number))
  })
})

describe('sameListState', () => {
  const query: IListQuery = { page: 2, perPage: 18, search: 'ana' }

  it('is true for two parses of the same list state', () => {
    expect(sameListState(parseListQuery({ page: '2', perPage: '18', search: ' ana' }), query)).toBe(
      true,
    )
  })

  it.each([
    { name: 'page', other: { ...query, page: 3 } },
    { name: 'perPage', other: { ...query, perPage: 27 } },
    { name: 'search', other: { ...query, search: 'anas' } },
  ])('is false when $name differs', ({ other }) => {
    expect(sameListState(other, query)).toBe(false)
  })
})

describe('serializeListQuery', () => {
  it('leaves the defaults out of the URL', () => {
    expect(serializeListQuery({ page: 1, perPage: 9, search: '' })).toStrictEqual({})
  })

  it('keeps what differs from the defaults, as strings', () => {
    expect(serializeListQuery({ page: 2, perPage: 18, search: '' })).toStrictEqual({
      page: '2',
      perPage: '18',
    })
    expect(serializeListQuery({ page: 5, perPage: 9, search: '' })).toStrictEqual({ page: '5' })
    expect(serializeListQuery({ page: 1, perPage: 27, search: '' })).toStrictEqual({
      perPage: '27',
    })
    expect(serializeListQuery({ page: 1, perPage: 9, search: 'ariela nunes' })).toStrictEqual({
      search: 'ariela nunes',
    })
    expect(serializeListQuery({ page: 2, perPage: 18, search: 'álda' })).toStrictEqual({
      page: '2',
      perPage: '18',
      search: 'álda',
    })
  })

  it.each(queries)('round-trips page $page with perPage $perPage and search "$search"', (query) => {
    expect(parseListQuery(serializeListQuery(query))).toStrictEqual(query)
  })
})
