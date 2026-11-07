// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { ICustomer, ICustomerCard } from '#shared/types/customer'
import type { IListQuery } from '#shared/utils/listQuery'
import customers from '../../tests/fixtures/customers.json'
import { detailContext } from './detailContext'
import { normalizeCustomer } from './normalizeCustomer'
import { parseRawCustomers } from './parseRawCustomers'

// The 20 fixture customers through the same two steps as the real source
const all = parseRawCustomers(customers).map((raw) => normalizeCustomer(raw))

const slugsOf = (list: { slug: string }[]) => list.map(({ slug }) => slug)
const namesOf = (list: { name: string }[]) => list.map(({ name }) => name)

const query = (overrides: Partial<IListQuery> = {}): IListQuery => ({
  page: 1,
  perPage: 9,
  search: '',
  states: [],
  gender: 'all',
  sort: 'name',
  ...overrides,
})

const customerOf = (slug: string): ICustomer => {
  const customer = all.find((candidate) => candidate.slug === slug)
  if (customer === undefined) throw new Error(`the fixture has no ${slug}`)
  return customer
}

// A customer named for the test (the rest is the first of the fixture), from the state given: the
// related side needs more customers in one state than the fixture has in any of them
const made = (slug: string, name: string, stateSlug: string): ICustomer => {
  const [template] = all
  const space = name.indexOf(' ')
  if (template === undefined || space < 0) throw new Error(`the name ${name} has no surname`)
  return {
    ...template,
    slug,
    firstName: name.slice(0, space),
    lastName: name.slice(space + 1),
    name,
    stateSlug,
  }
}

// Where Abraim da Costa stands, and who stands beside it, in the 20 of the fixture now adrift: its
// search is one that finds only Quévin, so every order falls back to the whole list. Written by
// hand from the orders of the fixture (the same data the comparators sort), not worked out with
// them.
const FALLBACK_ORDERS: {
  sort: IListQuery['sort']
  // Of each card, the slug is the one the table pins; the rest the card keeps to itself
  expected: {
    position: number
    total: number
    prev: Pick<ICustomerCard, 'slug'> | null
    next: Pick<ICustomerCard, 'slug'> | null
  }
}[] = [
  {
    sort: 'name',
    expected: { position: 1, total: 20, prev: null, next: { slug: 'alcindo-dasneves' } },
  },
  {
    sort: 'name-desc',
    expected: { position: 20, total: 20, prev: { slug: 'alcindo-dasneves' }, next: null },
  },
  {
    sort: 'last',
    expected: {
      position: 4,
      total: 20,
      prev: { slug: 'quevin-cavalcanti' },
      next: { slug: 'armando-dacruz' },
    },
  },
  {
    sort: 'young',
    expected: {
      position: 3,
      total: 20,
      prev: { slug: 'alcindo-dasneves' },
      next: { slug: 'quevin-cavalcanti' },
    },
  },
  {
    sort: 'old',
    expected: {
      position: 18,
      total: 20,
      prev: { slug: 'quevin-cavalcanti' },
      next: { slug: 'alcindo-dasneves' },
    },
  },
  {
    sort: 'recent',
    expected: {
      position: 7,
      total: 20,
      prev: { slug: 'alejandra-rodrigues' },
      next: { slug: 'ariela-nunes' },
    },
  },
]

describe('detailContext out of the context of the query', () => {
  it.each(FALLBACK_ORDERS)(
    'falls back to all of them in the order of sort=$sort',
    ({ sort, expected }) => {
      const abraim = customerOf('abraim-dacosta')
      const result = detailContext(all, abraim, query({ search: 'quevin', sort }))

      expect(result).toMatchObject(expected)
      expect(result.related).toHaveLength(1)
    },
  )

  it('falls back when a filter of the states leaves nothing in the context', () => {
    // Tocantins has 2 and São Paulo has none: Eleutério is the 10th oldest of the 20
    const result = detailContext(
      all,
      customerOf('eleuterio-almeida'),
      query({ states: ['sao-paulo'], sort: 'old' }),
    )

    expect(result).toMatchObject({ position: 10, total: 20 })
  })
})

describe('detailContext in the context of the query', () => {
  // The women of the fixture are 7: Alda, Alejandra, Ariela, Gilda, Marilene, Melânia, Odélia.
  // Marilene is the 14th of the 20, so a position counted in the fall-back list would be 14, and
  // the total 20.
  it('counts the position in the list the query leaves', () => {
    const result = detailContext(all, customerOf('marilene-darocha'), query({ gender: 'female' }))

    expect(result).toMatchObject({
      position: 5,
      total: 7,
      prev: { name: 'Gilda Pires' },
      next: { name: 'Melânia Jesus' },
    })
  })

  it('starts a filter open on position 1 without a neighbor before', () => {
    const result = detailContext(all, customerOf('alda-barbosa'), query({ gender: 'female' }))

    expect(result).toMatchObject({
      position: 1,
      total: 7,
      prev: null,
      next: { name: 'Alejandra Rodrigues' },
    })
  })

  it('serves the whole card around itself', () => {
    // The two of Tocantins: Eleutério first, Marilene second, whichever the related side cuts
    const result = detailContext(
      all,
      customerOf('eleuterio-almeida'),
      query({ states: ['tocantins'] }),
    )

    expect(result.position).toBe(1)
    expect(result.total).toBe(2)
    expect(result.prev).toBeNull()
    expect(result.next).toStrictEqual({
      slug: 'marilene-darocha',
      name: 'Marilene da Rocha',
      street: 'Rua Dois, 5632',
      city: 'Eunápolis',
      state: 'Tocantins',
      uf: 'TO',
      postcode: '98976',
      picture: 'https://randomuser.me/api/portraits/women/31.jpg',
    })
  })

  it('leaves no next on the last of the context', () => {
    const result = detailContext(all, customerOf('quevin-cavalcanti'), query())

    expect(result).toMatchObject({
      position: 20,
      total: 20,
      prev: { name: 'Odélia Moura' },
      next: null,
    })
  })

  it('inverts the end of the context with the order reversed', () => {
    expect(
      detailContext(all, customerOf('quevin-cavalcanti'), query({ sort: 'name-desc' })),
    ).toMatchObject({
      position: 1,
      prev: null,
      next: { name: 'Odélia Moura' },
    })
    expect(
      detailContext(all, customerOf('abraim-dacosta'), query({ sort: 'name-desc' })),
    ).toMatchObject({
      position: 20,
      prev: { name: 'Alcindo das Neves' },
      next: null,
    })
  })

  it('has neither neighbor when the context is only itself', () => {
    const result = detailContext(
      all,
      customerOf('eleuterio-almeida'),
      query({ search: 'eleuterio' }),
    )

    expect(result).toMatchObject({ position: 1, total: 1, prev: null, next: null })
    expect(namesOf(result.related)).toStrictEqual(['Marilene da Rocha'])
  })
})

describe('detailContext related', () => {
  // 7 of São Paulo, written in no order of name: the fixture has none of this state, and the cut
  // is of the name, not of the list. Ana is the third of them.
  const saoPauloCustomers = [
    made('zeca-souza', 'Zeca Souza', 'sao-paulo'),
    made('ulisses-tavares', 'Ulisses Tavares', 'sao-paulo'),
    made('ana-branco', 'Ana Branco', 'sao-paulo'),
    made('bruno-duarte', 'Bruno Duarte', 'sao-paulo'),
    made('bia-esteves', 'Bia Esteves', 'sao-paulo'),
    made('rafa-gomes', 'Rafa Gomes', 'sao-paulo'),
    made('ciro-lima', 'Ciro Lima', 'sao-paulo'),
  ]
  const [ana] = saoPauloCustomers.slice(2, 3)
  if (ana === undefined) throw new Error('the list has no ana-branco')

  it('gathers the others of the same state by name', () => {
    // Minas Gerais has Abraim da Costa and Gilda Pires, Santa Catarina Alejandra and Apolo
    expect(namesOf(detailContext(all, customerOf('gilda-pires'), query()).related)).toStrictEqual([
      'Abraim da Costa',
    ])
    expect(slugsOf(detailContext(all, customerOf('apolo-nunes'), query()).related)).toStrictEqual([
      'alejandra-rodrigues',
    ])
  })

  // 8 of the states carry one customer each in the fixture, Acre among them
  it('gives no related one from a state with only the customer', () => {
    expect(detailContext(all, customerOf('deolindo-dacunha'), query()).related).toStrictEqual([])
  })

  it('counts no customer from a state outside the 27', () => {
    // Abraim travels to a state the table has none of: it stays in the list, and alone there
    const odd = all.map((customer) =>
      customer.slug === 'abraim-dacosta' ? { ...customer, stateSlug: 'atlantis' } : customer,
    )
    const [abraim] = odd.filter((customer) => customer.slug === 'abraim-dacosta')
    if (abraim === undefined) throw new Error('the list has no abraim-dacosta')

    const result = detailContext(odd, abraim, query())

    expect(result).toMatchObject({ position: 1, total: 20 })
    expect(result.related).toStrictEqual([])
  })

  it('still groups by its own state outside the 27', () => {
    const atlantis = [
      made('zeca-souza', 'Zeca Souza', 'atlantis'),
      made('ana-branco', 'Ana Branco', 'atlantis'),
    ]
    const [zeca] = atlantis
    if (zeca === undefined) throw new Error('the list is empty')

    const result = detailContext([...all, ...atlantis], zeca, query())

    expect(slugsOf(result.related)).toStrictEqual(['ana-branco'])
  })

  it('cuts the related ones of a crowded state to the first 4 by name', () => {
    expect(namesOf(detailContext(saoPauloCustomers, ana, query()).related)).toStrictEqual([
      'Bia Esteves',
      'Bruno Duarte',
      'Ciro Lima',
      'Rafa Gomes',
    ])
    // Never the order of the address: a later order turns the neighbors of the detail, not this
    expect(
      namesOf(detailContext(saoPauloCustomers, ana, query({ sort: 'name-desc' })).related),
    ).toStrictEqual(['Bia Esteves', 'Bruno Duarte', 'Ciro Lima', 'Rafa Gomes'])
  })

  it('keeps the related ones when the address leaves the customer out', () => {
    expect(
      namesOf(
        detailContext(saoPauloCustomers, ana, query({ search: 'quevin', sort: 'young' })).related,
      ),
    ).toStrictEqual(['Bia Esteves', 'Bruno Duarte', 'Ciro Lima', 'Rafa Gomes'])
  })
})

describe('detailContext inputs', () => {
  it('leaves the list it is given as it was', () => {
    const given = [...all]

    detailContext(
      given,
      customerOf('abraim-dacosta'),
      query({ sort: 'name-desc', gender: 'female' }),
    )

    expect(slugsOf(given)).toStrictEqual(slugsOf(all))
  })

  // The context comes out of the list itself: which page the address asks for is not one of the
  // keys of it
  it('answers the same to any page in the address', () => {
    const marilene = customerOf('marilene-darocha')
    const paged = detailContext(all, marilene, query({ page: 99, perPage: 54 }))

    expect(paged).toStrictEqual(detailContext(all, marilene, query()))
  })
})
