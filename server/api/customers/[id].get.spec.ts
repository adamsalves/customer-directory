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

  // Eleutério is the 11th by name: Deolindo before, Gilda after, and Marilene nearby in the same
  // state, Tocantins. The total is the context the empty query leaves, the whole list.
  it('answers the context of the empty query of the list', async () => {
    const body = await $fetch('/api/customers/eleuterio-almeida')

    expect(body).toMatchObject({
      position: 11,
      total: 20,
      prev: { slug: 'deolindo-dacunha' },
      next: { slug: 'gilda-pires' },
      related: [{ slug: 'marilene-darocha' }],
    })
  })

  // The order of the address turns the neighbors of the detail; the related side keeps its own
  it('inverts the neighbors with the order the address asks for', async () => {
    const body = await $fetch('/api/customers/eleuterio-almeida?sort=name-desc')

    expect(body).toMatchObject({
      position: 10,
      prev: { slug: 'gilda-pires' },
      next: { slug: 'deolindo-dacunha' },
      related: [{ slug: 'marilene-darocha' }],
    })
  })

  it('counts the position in the context the states of the address leave', async () => {
    // The 2 of Tocantins, Eleutério first of them by name
    const body = await $fetch('/api/customers/eleuterio-almeida?states=tocantins')

    expect(body).toMatchObject({
      position: 1,
      total: 2,
      prev: null,
      next: { slug: 'marilene-darocha' },
    })
  })

  // The search of the address finds only Quévin: Abraim is out, and the context falls back to all
  // 20 in the order of the name. The related one is from wherever the customer is, not from the
  // 1 the query leaves.
  it('falls back to every customer when the address leaves the customer out', async () => {
    const body = await $fetch('/api/customers/abraim-dacosta?search=quevin')

    expect(body).toMatchObject({
      position: 1,
      total: 20,
      prev: null,
      next: { slug: 'alcindo-dasneves' },
      related: [{ slug: 'gilda-pires' }],
    })
  })

  it('falls back the same way when a filter of the states does', async () => {
    // Minas Gerais has Abraim in it; Santa Catarina has nobody of the trail of this address
    const body = await $fetch('/api/customers/abraim-dacosta?states=santa-catarina')

    expect(body).toMatchObject({
      position: 1,
      total: 20,
      prev: null,
      next: { slug: 'alcindo-dasneves' },
    })
  })

  // A repeated key comes as an array (`states=tocantins&states=tocantins`), and the parser, the
  // one of the list, takes no array of states: no state at all, and the context is the whole list,
  // not the 2 of Tocantins. Any other key (`extra=1`) the parser has no use for: the states stay.
  it('reads the repeated key of the address like the list does', async () => {
    // fetch and json: the typed routes of $fetch do not compare a key written twice, as a string
    // they do not reach the route matcher
    const repeatedStatesUrl: string =
      '/api/customers/eleuterio-almeida?states=tocantins&states=tocantins'
    const response = await fetch(repeatedStatesUrl)
    const body: unknown = await response.json()
    expect(body).toMatchObject({ position: 11, total: 20 })
    const ignored = await $fetch('/api/customers/eleuterio-almeida?states=tocantins&extra=1')
    expect(ignored).toMatchObject({
      position: 1,
      total: 2,
    })
  })

  // One page of the list or another: not a part of the context the detail counts
  it('answers the same to any page in the address of the list', async () => {
    const plain = await $fetch('/api/customers/eleuterio-almeida')
    const paged = await $fetch('/api/customers/eleuterio-almeida?page=99&perPage=54')

    expect(paged).toStrictEqual(plain)
  })
})
