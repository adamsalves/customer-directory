// @vitest-environment node
import { once } from 'node:events'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { $fetch, fetch, setup } from '@nuxt/test-utils/e2e'
import { afterAll, describe, expect, it } from 'vitest'
import customers from '../../../tests/fixtures/customers.json'

// ADR-0009: the built server reads a local copy of the fixture, never S3 (as in customers.get.spec.ts).
// The source starts down (403, what S3 gives for a missing file): setup() waits for the server with
// a GET / that renders /customers, which would read the source and fill the cache before any test.
const SOURCE_PATH = '/frontend-challenge.json'
let sourceDown = true

const source = createServer((request, response) => {
  if (request.url !== SOURCE_PATH || sourceDown) {
    response.writeHead(request.url === SOURCE_PATH ? 403 : 404)
    response.end()
    return
  }
  response.writeHead(200, { 'content-type': 'application/json' })
  response.end(JSON.stringify(customers))
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

describe('GET /api/customers/[id]', () => {
  // First on purpose: "no cache" only lasts until the first success fills the single cache entry.
  // fetch and not $fetch: $fetch retries a GET on 5xx. The malformed payload is covered by the list,
  // which goes through the same loadCustomers.
  it('answers 502 when the source fails and there is no cached copy', async () => {
    try {
      const response = await fetch('/api/customers/eleuterio-almeida')

      expect(response.status).toBe(502)
    } finally {
      sourceDown = false
    }
  })

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
