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
  // failing source would still answer 200.
  // fetch and not $fetch: $fetch retries a GET on 5xx. The server may retry the source too, so
  // sourceHits is not asserted here.
  it.each([
    { name: 'the source answers 403', failure: 'forbidden' },
    { name: 'the payload is not a list of customers', failure: 'malformed' },
  ] as const)('answers 502 when $name and there is no cached copy', async ({ failure }) => {
    sourceFailure = failure
    try {
      const response = await fetch('/api/customers')

      expect(response.status).toBe(502)
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
    // The 10th customer. His email is "quévin.cavalcanti@…", so the slug has no accent (ADR-0006).
    expect(body).toHaveProperty('items[0].slug', 'quevin-cavalcanti')
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

  // One cached list for every query: a key per URL would refetch, and with swr never expire
  it('reads the source once for different queries', async () => {
    await $fetch('/api/customers?page=3')
    await $fetch('/api/customers?perPage=27')

    expect(sourceHits).toBe(1)
  })
})
