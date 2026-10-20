// @vitest-environment node
import { once } from 'node:events'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { afterAll, describe, expect, it } from 'vitest'
import customers from '../../tests/fixtures/customers.json'

// ADR-0009: the built server reads a local copy of the fixture, never S3. NUXT_CUSTOMERS_URL
// points the runtime config at it. Every other path answers 404, so a URL that never reaches
// the server (it would fall back to S3) or a handler that ignores the runtime config fails here.
const SOURCE_PATH = '/frontend-challenge.json'

const source = createServer((request, response) => {
  if (request.url === SOURCE_PATH) {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify(customers))
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
})
