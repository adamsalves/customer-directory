// @vitest-environment node
import { describe, expect, it } from 'vitest'
import customers from '../../tests/fixtures/customers.json'
import { normalizeCustomer } from './normalizeCustomer'
import { parseRawCustomers } from './parseRawCustomers'
import { queryCustomers } from './queryCustomers'

// The 20 fixture customers through the same two steps as the real source
const all = parseRawCustomers(customers).map((raw) => normalizeCustomer(raw))

const slugsOf = (items: { slug: string }[]) => items.map(({ slug }) => slug)

describe('queryCustomers', () => {
  it('returns the first page with the totals', () => {
    const result = queryCustomers(all, { page: 1, perPage: 9 })

    expect(result).toMatchObject({ total: 20, page: 1, perPage: 9, totalPages: 3 })
    expect(slugsOf(result.items)).toStrictEqual(slugsOf(all.slice(0, 9)))
  })

  it('starts page 2 at the 10th customer', () => {
    const result = queryCustomers(all, { page: 2, perPage: 9 })

    expect(result).toMatchObject({ total: 20, page: 2, perPage: 9, totalPages: 3 })
    expect(result.items).toHaveLength(9)
    expect(result.items[0]?.slug).toBe(all[9]?.slug)
    expect(slugsOf(result.items)).toStrictEqual(slugsOf(all.slice(9, 18)))
  })

  it('ends on a partial page', () => {
    const result = queryCustomers(all, { page: 3, perPage: 9 })

    expect(result.page).toBe(3)
    expect(slugsOf(result.items)).toStrictEqual(slugsOf(all.slice(18)))
    expect(result.items).toHaveLength(2)
  })

  it('clamps a page past the end to the last one', () => {
    const result = queryCustomers(all, { page: 99, perPage: 9 })

    expect(result.page).toBe(3)
    expect(result.items).toHaveLength(2)
  })

  it('does not count an empty trailing page when the total is an exact multiple', () => {
    const result = queryCustomers(all.slice(0, 18), { page: 3, perPage: 9 })

    expect(result).toMatchObject({ total: 18, page: 2, totalPages: 2 })
    expect(result.items).toHaveLength(9)
  })

  it('uses the page size of the query', () => {
    const result = queryCustomers(all, { page: 2, perPage: 18 })

    expect(result).toMatchObject({ total: 20, page: 2, perPage: 18, totalPages: 2 })
    expect(slugsOf(result.items)).toStrictEqual(slugsOf(all.slice(18)))
  })

  it.each([1, 5])('returns page 1 of 1 for an empty list asked for page %s', (page) => {
    expect(queryCustomers([], { page, perPage: 9 })).toStrictEqual({
      items: [],
      total: 0,
      page: 1,
      perPage: 9,
      totalPages: 1,
    })
  })

  it('maps each customer to the card fields', () => {
    const [first] = queryCustomers(all, { page: 1, perPage: 9 }).items

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
    const { items } = queryCustomers(all, { page: 1, perPage: 9 })

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
