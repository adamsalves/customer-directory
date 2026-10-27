// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { prototypePage } from '../../tests/prototypePage'
import { BRAZILIAN_STATES } from './brazilianStates'
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

// Not a string. A repeated key comes as an array, and a one-element array stringifies into a list
// that looks valid, so only a type check rejects it.
const NOT_A_STATE_LIST: unknown[] = [['bahia'], ['bahia', 'acre'], [], 42, 0, true, null, undefined]

// Not a slug of the table: the comparison is exact, and an object lookup would let the names of
// Object.prototype through
const NOT_A_STATE = [
  '',
  ',',
  ' ',
  'BAHIA',
  ' bahia',
  'atlantis',
  'ba',
  'são-paulo',
  'bahia;acre',
  '__proto__',
  'constructor',
]

// 'all' is no exception: it is the default, so it is the value that stays out of the URL
const NOT_A_GENDER: unknown[] = [
  '',
  'FEMALE',
  ' male',
  'other',
  'male,female',
  ['male'],
  ['male', 'female'],
  [],
  1,
  null,
  undefined,
]

const SLUGS = BRAZILIAN_STATES.map(({ slug }) => slug)

// Objects, because `it.each` spreads a case that is an array into the callback arguments
const asCases = (values: unknown[]) => values.map((value) => ({ value }))

// The list state with nothing set; each test overrides what it exercises
const defaults: IListQuery = { page: 1, perPage: 9, search: '', states: [], gender: 'all' }

const queries: IListQuery[] = [
  ...PER_PAGE_OPTIONS.flatMap((perPage) =>
    [1, 2, 10].map((page) => ({ ...defaults, page, perPage })),
  ),
  ...SEARCHES.map((search) => ({ ...defaults, page: 3, perPage: 18, search })),
  ...[['acre'], ['bahia', 'sao-paulo'], ['minas-gerais', 'santa-catarina', 'tocantins']].map(
    (states) => ({ ...defaults, states }),
  ),
  ...(['female', 'male'] as const).map((gender) => ({ ...defaults, gender })),
  {
    page: 2,
    perPage: 27,
    search: 'álda',
    states: ['minas-gerais', 'santa-catarina'],
    gender: 'male',
  },
]

describe('parseListQuery', () => {
  it('returns the defaults for an empty query', () => {
    expect(parseListQuery({})).toStrictEqual(defaults)
  })

  it.each(asCases([null, undefined, 'x', 42, []]))(
    'returns the defaults when the input is $value',
    ({ value }) => {
      expect(parseListQuery(value)).toStrictEqual(defaults)
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

  it.each([
    { name: 'one state', value: 'bahia', states: ['bahia'] },
    {
      name: 'two states',
      value: 'minas-gerais,santa-catarina',
      states: ['minas-gerais', 'santa-catarina'],
    },
    { name: 'all 27 states', value: SLUGS.join(','), states: SLUGS },
  ])('accepts $name', ({ value, states }) => {
    expect(parseListQuery({ states: value }).states).toStrictEqual(states)
  })

  // One list state however the URL spells it: "sao-paulo,bahia" is the example of the issue, and
  // the table lists Bahia first. Without this the page would see a new query, and refetch, on a
  // link that only reordered the states.
  it.each([
    'sao-paulo,bahia',
    'bahia,sao-paulo',
    'bahia,sao-paulo,bahia',
    ',bahia,,sao-paulo,',
    'atlantis,sao-paulo,bahia,sp',
  ])('reads states=%j as bahia and sao-paulo, in the order of the table', (value) => {
    expect(parseListQuery({ states: value }).states).toStrictEqual(['bahia', 'sao-paulo'])
  })

  // However long the value, the list ends at the 27 states
  it('keeps each state once, whatever the length of the value', () => {
    const states = Array.from({ length: 50 }, () => [...SLUGS].reverse().join(',')).join(',')

    expect(parseListQuery({ states }).states).toStrictEqual(SLUGS)
  })

  // A segment that is no slug goes alone: the slugs around it stay
  it.each(NOT_A_STATE)('drops states=%j', (value) => {
    expect(parseListQuery({ states: value }).states).toStrictEqual([])
    expect(parseListQuery({ states: `acre,${value},bahia` }).states).toStrictEqual([
      'acre',
      'bahia',
    ])
  })

  it.each(asCases(NOT_A_STATE_LIST))('falls back to no states for states=$value', ({ value }) => {
    expect(parseListQuery({ states: value }).states).toStrictEqual([])
  })

  it.each(['female', 'male', 'all'])('accepts gender=%s', (gender) => {
    expect(parseListQuery({ gender }).gender).toBe(gender)
  })

  it.each(asCases(NOT_A_GENDER))('falls back to all for gender=$value', ({ value }) => {
    expect(parseListQuery({ gender: value }).gender).toBe('all')
  })

  it('validates each key independently, under its own key', () => {
    expect(parseListQuery({ page: '3', perPage: '18' })).toStrictEqual({
      ...defaults,
      page: 3,
      perPage: 18,
    })
    expect(parseListQuery({ page: 'x', perPage: '18' })).toStrictEqual({
      ...defaults,
      perPage: 18,
    })
    expect(parseListQuery({ page: '3', perPage: 'x' })).toStrictEqual({ ...defaults, page: 3 })
    expect(parseListQuery({ page: 'x', perPage: 'x', search: 'ariela' })).toStrictEqual({
      ...defaults,
      search: 'ariela',
    })
    expect(parseListQuery({ page: '3', perPage: '18', search: ['ariela'] })).toStrictEqual({
      ...defaults,
      page: 3,
      perPage: 18,
    })
    expect(parseListQuery({ states: 'bahia', gender: 'other' })).toStrictEqual({
      ...defaults,
      states: ['bahia'],
    })
    expect(parseListQuery({ states: ['bahia'], gender: 'male' })).toStrictEqual({
      ...defaults,
      gender: 'male',
    })
  })

  it('ignores unknown keys, the pt-BR ones that ADR-0021 retired included', () => {
    expect(
      parseListQuery({
        pagina: '3',
        por: '18',
        busca: 'ariela',
        estados: 'bahia',
        genero: 'female',
        color: 'red',
      }),
    ).toStrictEqual(defaults)
  })

  it('offers the page sizes of the prototype', () => {
    const sizes = /const PER_PAGE = \[([^\]]*)\]/.exec(prototypePage())?.[1] ?? ''

    expect(sizes).not.toBe('')
    expect([...PER_PAGE_OPTIONS]).toStrictEqual(sizes.split(',').map(Number))
  })
})

describe('sameListState', () => {
  const query: IListQuery = {
    page: 2,
    perPage: 18,
    search: 'ana',
    states: ['bahia', 'sao-paulo'],
    gender: 'female',
  }

  it('is true for two parses of the same list state', () => {
    expect(
      sameListState(
        parseListQuery({
          page: '2',
          perPage: '18',
          search: ' ana',
          states: 'sao-paulo,bahia,bahia',
          gender: 'female',
        }),
        query,
      ),
    ).toBe(true)
  })

  it.each<{ name: string; other: IListQuery }>([
    { name: 'page', other: { ...query, page: 3 } },
    { name: 'perPage', other: { ...query, perPage: 27 } },
    { name: 'search', other: { ...query, search: 'anas' } },
    { name: 'states', other: { ...query, states: ['bahia'] } },
    { name: 'gender', other: { ...query, gender: 'male' } },
  ])('is false when $name differs', ({ other }) => {
    expect(sameListState(other, query)).toBe(false)
  })
})

describe('serializeListQuery', () => {
  it('leaves the defaults out of the URL', () => {
    expect(serializeListQuery(defaults)).toStrictEqual({})
  })

  it('keeps what differs from the defaults, as strings', () => {
    expect(serializeListQuery({ ...defaults, page: 2, perPage: 18 })).toStrictEqual({
      page: '2',
      perPage: '18',
    })
    expect(serializeListQuery({ ...defaults, page: 5 })).toStrictEqual({ page: '5' })
    expect(serializeListQuery({ ...defaults, perPage: 27 })).toStrictEqual({ perPage: '27' })
    expect(serializeListQuery({ ...defaults, search: 'ariela nunes' })).toStrictEqual({
      search: 'ariela nunes',
    })
    expect(serializeListQuery({ ...defaults, page: 2, perPage: 18, search: 'álda' })).toStrictEqual(
      { page: '2', perPage: '18', search: 'álda' },
    )
  })

  it('writes the states in one value, joined by commas', () => {
    expect(serializeListQuery({ ...defaults, states: ['bahia'] })).toStrictEqual({
      states: 'bahia',
    })
    expect(
      serializeListQuery({ ...defaults, states: ['bahia', 'sao-paulo', 'tocantins'] }),
    ).toStrictEqual({ states: 'bahia,sao-paulo,tocantins' })
  })

  it.each(['female', 'male'] as const)('keeps gender=%s', (gender) => {
    expect(serializeListQuery({ ...defaults, gender })).toStrictEqual({ gender })
  })

  it.each(queries)(
    'round-trips page $page, perPage $perPage, search "$search", states $states and gender $gender',
    (query) => {
      expect(parseListQuery(serializeListQuery(query))).toStrictEqual(query)
    },
  )
})
