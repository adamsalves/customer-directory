// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import customers from '../../tests/fixtures/customers.json'
import { normalizeCustomer } from './normalizeCustomer'
import { parseRawCustomers } from './parseRawCustomers'
import { queryCustomers } from './queryCustomers'

// The 20 fixture customers through the same two steps as the real source
const all = parseRawCustomers(customers).map((raw) => normalizeCustomer(raw))

const slugsOf = (items: { slug: string }[]) => items.map(({ slug }) => slug)

describe('queryCustomers', () => {
  it('returns the first page with the totals', () => {
    const result = queryCustomers(all, { page: 1, perPage: 9, search: '' })

    expect(result).toMatchObject({ total: 20, page: 1, perPage: 9, totalPages: 3 })
    expect(slugsOf(result.items)).toStrictEqual(slugsOf(all.slice(0, 9)))
  })

  it('starts page 2 at the 10th customer', () => {
    const result = queryCustomers(all, { page: 2, perPage: 9, search: '' })

    expect(result).toMatchObject({ total: 20, page: 2, perPage: 9, totalPages: 3 })
    expect(result.items).toHaveLength(9)
    expect(result.items[0]?.slug).toBe(all[9]?.slug)
    expect(slugsOf(result.items)).toStrictEqual(slugsOf(all.slice(9, 18)))
  })

  it('ends on a partial page', () => {
    const result = queryCustomers(all, { page: 3, perPage: 9, search: '' })

    expect(result.page).toBe(3)
    expect(slugsOf(result.items)).toStrictEqual(slugsOf(all.slice(18)))
    expect(result.items).toHaveLength(2)
  })

  it('clamps a page past the end to the last one', () => {
    const result = queryCustomers(all, { page: 99, perPage: 9, search: '' })

    expect(result.page).toBe(3)
    expect(result.items).toHaveLength(2)
  })

  it('does not count an empty trailing page when the total is an exact multiple', () => {
    const result = queryCustomers(all.slice(0, 18), { page: 3, perPage: 9, search: '' })

    expect(result).toMatchObject({ total: 18, page: 2, totalPages: 2 })
    expect(result.items).toHaveLength(9)
  })

  it('uses the page size of the query', () => {
    const result = queryCustomers(all, { page: 2, perPage: 18, search: '' })

    expect(result).toMatchObject({ total: 20, page: 2, perPage: 18, totalPages: 2 })
    expect(slugsOf(result.items)).toStrictEqual(slugsOf(all.slice(18)))
  })

  it.each([1, 5])('returns page 1 of 1 for an empty list asked for page %s', (page) => {
    expect(queryCustomers([], { page, perPage: 9, search: '' })).toStrictEqual({
      items: [],
      total: 0,
      page: 1,
      perPage: 9,
      totalPages: 1,
    })
  })

  it('maps each customer to the card fields', () => {
    const [first] = queryCustomers(all, { page: 1, perPage: 9, search: '' }).items

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
    const { items } = queryCustomers(all, { page: 1, perPage: 9, search: '' })

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
  const find = (search: string, page = 1) => queryCustomers(all, { page, perPage: 9, search })

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
