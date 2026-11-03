// @vitest-environment node
import { once } from 'node:events'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { $fetch, fetch, setup } from '@nuxt/test-utils/e2e'
import { afterAll, describe, expect, it } from 'vitest'
import customers from '../../tests/fixtures/customers.json'

// ADR-0009: the built server reads a local copy of the fixture, never S3. NUXT_CUSTOMERS_URL
// points the runtime config at it. Every other path answers 404, so a URL that never reaches
// the server (it would fall back to S3) or a handler that ignores the runtime config fails here.
const SOURCE_PATH = '/frontend-challenge.json'
let sourceHits = 0
// What the source answers in place of the fixture: a 403 (what S3 gives for a file that does not
// exist) or a 200 whose body is not the list. It starts down: setup() waits for the server with a
// GET / that renders /customers, which would read the source and fill the cache before any test.
let sourceFailure: 'forbidden' | 'malformed' | undefined = 'forbidden'

const source = createServer((request, response) => {
  if (request.url === SOURCE_PATH) {
    sourceHits += 1
    if (sourceFailure === 'forbidden') {
      response.writeHead(403)
      response.end()
      return
    }
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(sourceFailure === 'malformed' ? '{"foo":1}' : JSON.stringify(customers))
    return
  }
  response.writeHead(404)
  response.end()
})
source.listen(0, '127.0.0.1')
await once(source, 'listening')

function sourceUrl(address: AddressInfo | string | null): string {
  if (typeof address !== 'object' || address === null) {
    throw new Error('the fixture server has no TCP address')
  }
  return `http://127.0.0.1:${String(address.port)}${SOURCE_PATH}`
}

await setup({ build: true, server: true, env: { NUXT_CUSTOMERS_URL: sourceUrl(source.address()) } })

afterAll(async () => {
  source.close()
  source.closeAllConnections()
  await once(source, 'close')
})

describe('GET /api/customers', () => {
  // First on purpose, with the source still down from the start: "no cache" only lasts until the
  // first success fills the single cache entry. From then on the cache serves that copy, so a
  // failing source would still answer 200. The detail reads the same cache, so it is asked here too.
  // fetch and not $fetch: $fetch retries a GET on 5xx. The server may retry the source too, so
  // sourceHits is not asserted here.
  it.each([
    { name: 'the source answers 403', failure: 'forbidden' },
    { name: 'the payload is not a list of customers', failure: 'malformed' },
  ] as const)('answers 502 when $name and there is no cached copy', async ({ failure }) => {
    sourceFailure = failure
    try {
      for (const path of ['/api/customers', '/api/customers/eleuterio-almeida']) {
        const response = await fetch(path)

        expect(response.status, path).toBe(502)
      }
    } finally {
      sourceFailure = undefined
      // The next tests count the reads of the source from zero
      sourceHits = 0
    }
  })

  it('serves the requested page of the normalized fixture', async () => {
    const body: unknown = await $fetch('/api/customers?page=2')

    expect(body).toMatchObject({ total: 20, page: 2, perPage: 9, totalPages: 3 })
    expect(body).toHaveProperty('items.length', 9)
    // The 10th customer by name, the default order
    expect(body).toHaveProperty('items[0].slug', 'deolindo-dacunha')
  })

  it('reads perPage from the query', async () => {
    const body: unknown = await $fetch('/api/customers?page=2&perPage=18')

    expect(body).toMatchObject({ total: 20, page: 2, perPage: 18, totalPages: 2 })
    expect(body).toHaveProperty('items.length', 2)
  })

  // The key `search` goes through getQuery and parseListQuery, and the total follows the match
  it('reads search from the query and filters before paginating', async () => {
    const body: unknown = await $fetch('/api/customers?search=quevin')

    expect(body).toMatchObject({ total: 1, page: 1, perPage: 9, totalPages: 1 })
    expect(body).toHaveProperty('items.length', 1)
    // His email is "quévin.cavalcanti@…", so the slug has no accent (ADR-0006)
    expect(body).toHaveProperty('items[0].slug', 'quevin-cavalcanti')
  })

  // getQuery decodes the accent and both forms of a space before the search folds them
  it.each([
    { search: 'ELEUT%C3%89RIO', slug: 'eleuterio-almeida' },
    { search: 'girao+rosa', slug: 'girao-darosa' },
    { search: 'rosa%20girao', slug: 'girao-darosa' },
  ])('decodes search=$search from the URL', async ({ search, slug }) => {
    const body: unknown = await $fetch(`/api/customers?search=${search}`)

    expect(body).toMatchObject({ total: 1, items: [{ slug }] })
  })

  // getQuery decodes the comma written either way. Women of MG or SC: 2 of the 4 customers of the
  // two states, and 2 of the 7 women.
  it.each(['minas-gerais,santa-catarina', 'minas-gerais%2Csanta-catarina'])(
    'reads states=%s and gender from the query',
    async (states) => {
      const body: unknown = await $fetch(`/api/customers?states=${states}&gender=female`)

      expect(body).toMatchObject({
        total: 2,
        items: [{ slug: 'alejandra-rodrigues' }, { slug: 'gilda-pires' }],
        facets: {
          states: { 'minas-gerais': 1, 'santa-catarina': 1, 'sao-paulo': 0 },
          gender: { all: 4, female: 2, male: 2 },
        },
      })
    },
  )

  // The key `sort` goes through getQuery and parseListQuery. The 4 customers of MG and SC come by
  // surname in an order that neither their name nor the source gives.
  it('reads sort from the query', async () => {
    const body: unknown = await $fetch(
      '/api/customers?states=minas-gerais,santa-catarina&sort=last',
    )

    expect(body).toMatchObject({
      total: 4,
      items: [
        { slug: 'abraim-dacosta' },
        { slug: 'apolo-nunes' },
        { slug: 'gilda-pires' },
        { slug: 'alejandra-rodrigues' },
      ],
    })
  })

  // One cached list for every query: a key per URL would refetch, and with swr never expire
  it('reads the source once for different queries', async () => {
    await $fetch('/api/customers?page=3')
    await $fetch('/api/customers?perPage=27')

    expect(sourceHits).toBe(1)
  })
})

// After the list on purpose: the 502 cases need the cache empty, and the tests above fill it
describe('GET /api/customers/[id]', () => {
  // The 6th customer of the source and the 11th by name: neither the first of the list nor of the
  // default order. The slug has no accent and the email keeps it (ADR-0006). What the card leaves
  // out (email, phone, cell, timezone, the dates…) is the point: the detail is the full record.
  it('serves the full record of the customer with that slug', async () => {
    const body: unknown = await $fetch('/api/customers/eleuterio-almeida')

    expect(body).toMatchObject({
      customer: {
        slug: 'eleuterio-almeida',
        name: 'Eleutério Almeida',
        firstName: 'Eleutério',
        lastName: 'Almeida',
        street: 'Rua Amazonas, 8578',
        city: 'Balneário Camboriú',
        state: 'Tocantins',
        uf: 'TO',
        postcode: '28829',
        picture: 'https://randomuser.me/api/portraits/men/61.jpg',
        stateSlug: 'tocantins',
        title: 'Sr.',
        gender: 'male',
        email: 'eleutério.almeida@example.com',
        phone: '(44) 2047-8597',
        cell: '(86) 6471-7684',
        timezone: 'UTC-4:00 · Atlantic Time (Canada), Caracas, La Paz',
        birthDate: '1970-03-30T23:55:08Z',
        registeredAt: '2004-06-27T05:45:47Z',
      },
    })
    // Not fixed: the age is counted from today
    expect(body).toHaveProperty('customer.age', expect.any(Number))
  })

  // fetch and not $fetch, which throws on a 404. The slug has to be the whole one: "eleuterio" is the
  // start of a real slug and "eleuterio-almeida-2" starts with one, so a match by prefix or by
  // substring, in either direction, would find that customer instead of answering 404. A double
  // slash gives the handler an empty id, the start of every slug.
  it.each([
    { name: 'is not a customer', slug: 'no-such-customer' },
    { name: 'is empty (a double slash)', slug: '/' },
    { name: 'is only the start of a real slug', slug: 'eleuterio' },
    { name: 'is a real slug with more after it', slug: 'eleuterio-almeida-2' },
  ])('answers 404 when the slug $name', async ({ slug }) => {
    const response = await fetch(`/api/customers/${slug}`)

    expect(response.status).toBe(404)
    // Without a statusMessage in createError, Nitro writes "Server Error"
    expect(response.statusText).toBe('Not Found')
  })
})
