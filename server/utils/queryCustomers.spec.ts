// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { BRAZILIAN_STATES } from '#shared/utils/brazilianStates'
import type { IListQuery } from '#shared/utils/listQuery'
import customers from '../../tests/fixtures/customers.json'
import { normalizeCustomer } from './normalizeCustomer'
import { parseRawCustomers } from './parseRawCustomers'
import { queryCustomers } from './queryCustomers'

// The 20 fixture customers through the same two steps as the real source
const all = parseRawCustomers(customers).map((raw) => normalizeCustomer(raw))

const slugsOf = (items: { slug: string }[]) => items.map(({ slug }) => slug)

// A query with no search and no filter; each test sets what it exercises
const query = (overrides: Partial<IListQuery> = {}): IListQuery => ({
  page: 1,
  perPage: 9,
  search: '',
  states: [],
  gender: 'all',
  ...overrides,
})

// The 27 states at 0, and the same with the counts given
const NO_STATES = Object.fromEntries(BRAZILIAN_STATES.map(({ slug }) => [slug, 0]))
const stateCounts = (counts: Record<string, number>) => ({ ...NO_STATES, ...counts })

const MG_SC = ['minas-gerais', 'santa-catarina']

describe('queryCustomers', () => {
  it('returns the first page with the totals', () => {
    const result = queryCustomers(all, query())

    expect(result).toMatchObject({ total: 20, page: 1, perPage: 9, totalPages: 3 })
    expect(slugsOf(result.items)).toStrictEqual(slugsOf(all.slice(0, 9)))
  })

  it('starts page 2 at the 10th customer', () => {
    const result = queryCustomers(all, query({ page: 2 }))

    expect(result).toMatchObject({ total: 20, page: 2, perPage: 9, totalPages: 3 })
    expect(result.items).toHaveLength(9)
    expect(result.items[0]?.slug).toBe(all[9]?.slug)
    expect(slugsOf(result.items)).toStrictEqual(slugsOf(all.slice(9, 18)))
  })

  it('ends on a partial page', () => {
    const result = queryCustomers(all, query({ page: 3 }))

    expect(result.page).toBe(3)
    expect(slugsOf(result.items)).toStrictEqual(slugsOf(all.slice(18)))
    expect(result.items).toHaveLength(2)
  })

  it('clamps a page past the end to the last one', () => {
    const result = queryCustomers(all, query({ page: 99 }))

    expect(result.page).toBe(3)
    expect(result.items).toHaveLength(2)
  })

  it('does not count an empty trailing page when the total is an exact multiple', () => {
    const result = queryCustomers(all.slice(0, 18), query({ page: 3 }))

    expect(result).toMatchObject({ total: 18, page: 2, totalPages: 2 })
    expect(result.items).toHaveLength(9)
  })

  it('uses the page size of the query', () => {
    const result = queryCustomers(all, query({ page: 2, perPage: 18 }))

    expect(result).toMatchObject({ total: 20, page: 2, perPage: 18, totalPages: 2 })
    expect(slugsOf(result.items)).toStrictEqual(slugsOf(all.slice(18)))
  })

  it.each([1, 5])('returns page 1 of 1 for an empty list asked for page %s', (page) => {
    expect(queryCustomers([], query({ page }))).toStrictEqual({
      items: [],
      total: 0,
      page: 1,
      perPage: 9,
      totalPages: 1,
      facets: { states: NO_STATES, gender: { all: 0, female: 0, male: 0 } },
    })
  })

  it('maps each customer to the card fields', () => {
    const [first] = queryCustomers(all, query()).items

    expect(first).toStrictEqual({
      slug: 'alejandra-rodrigues',
      name: 'Alejandra Rodrigues',
      street: 'Rua Santa Catarina, 3833',
      city: 'Umuarama',
      state: 'Santa Catarina',
      uf: 'SC',
      postcode: '43646',
      picture: 'https://randomuser.me/api/portraits/women/18.jpg',
    })
  })

  it('leaves the rest of the customer out of every item', () => {
    const { items } = queryCustomers(all, query())

    expect(items).toHaveLength(9)
    for (const item of items) {
      expect(Object.keys(item).sort()).toStrictEqual([
        'city',
        'name',
        'picture',
        'postcode',
        'slug',
        'state',
        'street',
        'uf',
      ])
    }
  })
})

describe('queryCustomers with a search', () => {
  // The default page size, so a page is 9 customers
  const find = (search: string, page = 1) => queryCustomers(all, query({ page, search }))

  it.each(['', ' ', '   ', '\t \n'])('keeps every customer for the blank search %j', (search) => {
    const result = find(search)

    expect(result).toMatchObject({ total: 20, page: 1, totalPages: 3 })
    expect(slugsOf(result.items)).toStrictEqual(slugsOf(all.slice(0, 9)))
  })

  // The most common request (no search at all). Folding the 20 names would change nothing, and it
  // would run on every call: only the search itself is folded.
  it.each(['', ' ', '\t \n'])('folds no name for the blank search %j', (search) => {
    const normalize = vi.spyOn(String.prototype, 'normalize')

    find(search)
    const calls = normalize.mock.calls.length
    normalize.mockRestore()

    expect(calls).toBe(1)
  })

  it.each(['eleuterio', 'ELEUTÉRIO', ' Eleutério '])(
    'finds Eleutério Almeida with %j',
    (search) => {
      const result = find(search)

      expect(result.total).toBe(1)
      expect(slugsOf(result.items)).toStrictEqual(['eleuterio-almeida'])
    },
  )

  it('ignores an accent that only the search has', () => {
    expect(slugsOf(find('álda').items)).toStrictEqual(['alda-barbosa'])
  })

  // What some keyboards type: one full-width character per letter
  it.each(['ＥＬＥＵＴＥＲＩＯ', 'ｅｌｅｕｔéｒｉｏ'])(
    'reads the full-width search %j as plain letters',
    (search) => {
      expect(slugsOf(find(search).items)).toStrictEqual(['eleuterio-almeida'])
    },
  )

  it('matches words that are not next to each other in the name', () => {
    expect(slugsOf(find('girao rosa').items)).toStrictEqual(['girao-darosa'])
  })

  it('matches inside a word, not only at its start', () => {
    expect(slugsOf(find('unes').items)).toStrictEqual(['ariela-nunes', 'apolo-nunes'])
  })

  it('lists every match, in the order of the list', () => {
    const result = find('nunes')

    expect(result).toMatchObject({ total: 2, page: 1, totalPages: 1 })
    expect(slugsOf(result.items)).toStrictEqual(['ariela-nunes', 'apolo-nunes'])
  })

  it.each(['ariela nunes', 'nunes ariela'])('needs every word, in any order: %j', (search) => {
    const result = find(search)

    expect(result.total).toBe(1)
    expect(slugsOf(result.items)).toStrictEqual(['ariela-nunes'])
  })

  it.each([1, 5])('returns page 1 of 1 when no name has every word, asked for page %s', (page) => {
    expect(find('ariela rosa', page)).toStrictEqual({
      items: [],
      total: 0,
      page: 1,
      perPage: 9,
      totalPages: 1,
      facets: { states: NO_STATES, gender: { all: 0, female: 0, male: 0 } },
    })
  })

  // "da" is in 10 of the 20 names: the matches fill 2 pages, the whole list 3. Filtering after the
  // slice would show on page 2 only the 3 that sit among customers 10 to 18.
  it('paginates the matches, not the whole list', () => {
    const second = find('da', 2)

    expect(find('da')).toMatchObject({ total: 10, page: 1, totalPages: 2 })
    expect(find('da').items).toHaveLength(9)
    expect(second).toMatchObject({ total: 10, page: 2, totalPages: 2 })
    expect(slugsOf(second.items)).toStrictEqual(['melchior-dacunha'])
  })

  it('clamps a page past the end to the last page of the matches', () => {
    expect(find('da', 3)).toMatchObject({ total: 10, page: 2, totalPages: 2 })
    expect(find('nunes', 5)).toMatchObject({ total: 2, page: 1, totalPages: 1 })
  })
})

// The fixture has no customer in SP, RJ or BA. MG, SC, PR, TO, MT and DF have 2 each, and 13 of the
// 20 are men.
describe('queryCustomers with filters', () => {
  const find = (overrides: Partial<IListQuery>) => queryCustomers(all, query(overrides))

  it('lists the customers of a state', () => {
    const result = find({ states: ['minas-gerais'] })

    expect(result).toMatchObject({ total: 2, page: 1, totalPages: 1 })
    expect(slugsOf(result.items)).toStrictEqual(['gilda-pires', 'abraim-dacosta'])
  })

  it('lists the customers of any of the states, in the order of the list', () => {
    const result = find({ states: MG_SC })

    expect(result.total).toBe(4)
    expect(slugsOf(result.items)).toStrictEqual([
      'alejandra-rodrigues',
      'apolo-nunes',
      'gilda-pires',
      'abraim-dacosta',
    ])
  })

  it('lists the women', () => {
    const result = find({ gender: 'female' })

    expect(result.total).toBe(7)
    expect(slugsOf(result.items)).toStrictEqual([
      'alejandra-rodrigues',
      'alda-barbosa',
      'marilene-darocha',
      'ariela-nunes',
      'melania-jesus',
      'gilda-pires',
      'odelia-moura',
    ])
  })

  // MG and SC have 4 customers and there are 7 women, 2 of them in both. One filter alone gives 4
  // or 7, and a query that took either gives 9.
  it('needs the state and the gender together', () => {
    const result = find({ states: MG_SC, gender: 'female' })

    expect(result.total).toBe(2)
    expect(slugsOf(result.items)).toStrictEqual(['alejandra-rodrigues', 'gilda-pires'])
  })

  // "da" is in 10 names. Of those, 4 are in MG or TO and 7 are men: the 3 filters give 2.
  it('needs the search, the states and the gender together', () => {
    const result = find({ search: 'da', states: ['minas-gerais', 'tocantins'], gender: 'male' })

    expect(result.total).toBe(2)
    expect(slugsOf(result.items)).toStrictEqual(['eleuterio-almeida', 'abraim-dacosta'])
  })

  // 13 men fill a page of 9 and a page of 4: cutting the page before the filter would show others
  it('paginates the matches, not the whole list', () => {
    const second = find({ gender: 'male', page: 2 })

    expect(find({ gender: 'male' }).items).toHaveLength(9)
    expect(second).toMatchObject({ total: 13, page: 2, totalPages: 2 })
    expect(slugsOf(second.items)).toStrictEqual([
      'neuton-novaes',
      'abraim-dacosta',
      'deolindo-dacunha',
      'melchior-dacunha',
    ])
  })

  it('clamps a page past the end to the last page of the matches', () => {
    expect(find({ gender: 'male', page: 99 })).toMatchObject({ total: 13, page: 2, totalPages: 2 })
    expect(find({ states: MG_SC, page: 5 })).toMatchObject({ total: 4, page: 1, totalPages: 1 })
  })
})

describe('queryCustomers facets', () => {
  const facetsOf = (overrides: Partial<IListQuery>) => queryCustomers(all, query(overrides)).facets

  it('counts the states and the genders of the whole list when nothing is filtered', () => {
    expect(facetsOf({})).toStrictEqual({
      states: stateCounts({
        acre: 1,
        'distrito-federal': 2,
        'espirito-santo': 1,
        goias: 1,
        maranhao: 1,
        'mato-grosso': 2,
        'mato-grosso-do-sul': 1,
        'minas-gerais': 2,
        paraiba: 1,
        parana: 2,
        roraima: 1,
        'santa-catarina': 2,
        sergipe: 1,
        tocantins: 2,
      }),
      gender: { all: 20, female: 7, male: 13 },
    })
  })

  // SP, RJ and BA, the first the panel lists, have no customer in the fixture
  it('lists the 27 states, with 0 for the ones nobody is from', () => {
    const counts = facetsOf({}).states

    expect(Object.keys(counts)).toHaveLength(27)
    expect([counts['sao-paulo'], counts['rio-de-janeiro'], counts.bahia]).toStrictEqual([0, 0, 0])
  })

  // The 7 women: one each in MG and SC, 5 in other states. Counting the states picked would drop
  // those 5, and ignoring the gender would give MG and SC 2 each.
  it('counts the states for the search and the gender, not for the states', () => {
    expect(facetsOf({ states: MG_SC, gender: 'female' }).states).toStrictEqual(
      stateCounts({
        'santa-catarina': 1,
        parana: 1,
        tocantins: 1,
        goias: 1,
        'espirito-santo': 1,
        'minas-gerais': 1,
        'distrito-federal': 1,
      }),
    )
  })

  // The 4 customers of MG and SC: 2 women and 2 men. Counting the gender picked would leave no man,
  // and ignoring the states would give the 7 and 13 of the whole list.
  it('counts the genders for the search and the states, not for the gender', () => {
    expect(facetsOf({ states: MG_SC, gender: 'female' }).gender).toStrictEqual({
      all: 4,
      female: 2,
      male: 2,
    })
  })

  // "da" is in 10 names, 3 of them women: Alda (PR), Marilene (TO) and Gilda (MG)
  it('counts the search in both', () => {
    expect(facetsOf({ search: 'da', gender: 'female' })).toStrictEqual({
      states: stateCounts({ parana: 1, tocantins: 1, 'minas-gerais': 1 }),
      gender: { all: 10, female: 3, male: 7 },
    })
  })

  it('keeps the state counts and zeroes the genders when the states picked have no customer', () => {
    const { total, facets } = queryCustomers(all, query({ states: ['sao-paulo'] }))

    expect(total).toBe(0)
    expect(facets.states).toStrictEqual(facetsOf({}).states)
    expect(facets.gender).toStrictEqual({ all: 0, female: 0, male: 0 })
  })

  it('counts the whole list, not the page', () => {
    const { items, facets } = queryCustomers(all, query({ gender: 'male', page: 2 }))

    expect(items).toHaveLength(4)
    expect(facets.gender).toStrictEqual({ all: 20, female: 7, male: 13 })
    expect(Object.values(facets.states).reduce((sum, count) => sum + count, 0)).toBe(13)
  })

  // normalizeCustomer keeps a state outside the 27 as it came: the customer is in the list and in
  // `all`, and in no state
  it('counts a customer from a state outside the 27 in no state', () => {
    const odd = all.map((customer, index) =>
      index === 0 ? { ...customer, stateSlug: 'atlantis' } : customer,
    )
    const { total, facets } = queryCustomers(odd, query())

    expect(total).toBe(20)
    expect(facets.gender.all).toBe(20)
    expect(Object.keys(facets.states)).toHaveLength(27)
    expect(facets.states['santa-catarina']).toBe(1)
  })
})
