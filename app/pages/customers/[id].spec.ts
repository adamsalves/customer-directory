import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ICustomer, ICustomerDetailResponse } from '#shared/types/customer'
import CustomerPage from './[id].vue'

const customer: ICustomer = {
  slug: 'alejandra-rodrigues',
  name: 'Alejandra Rodrigues',
  firstName: 'Alejandra',
  lastName: 'Rodrigues',
  street: 'Rua Santa Catarina, 3833',
  city: 'Umuarama',
  state: 'Santa Catarina',
  uf: 'SC',
  postcode: '43646',
  picture: 'https://randomuser.me/api/portraits/women/18.jpg',
  stateSlug: 'santa-catarina',
  title: 'Sra.',
  gender: 'female',
  email: 'alejandra.rodrigues@example.com',
  phone: '(09) 7033-7406',
  cell: '(54) 3190-3469',
  timezone: 'UTC+3:00 · Baghdad, Riyadh, Moscow, St. Petersburg',
  birthDate: '1974-05-16T14:46:15Z',
  registeredAt: '2013-03-06T16:09:16Z',
}
const response: ICustomerDetailResponse = { customer }

// What the page asked the BFF for, one entry per request. The test server mounts the endpoints
// under /_, which is no part of what the page asked.
let requests: string[] = []

function record(event: { path: string }) {
  requests.push(event.path.replace(/^\/_/, ''))
}

function answer(event: { path: string }) {
  record(event)
  return response
}

// One slug for each answer: the BFF has the customer, does not know the slug, or has no source to
// read, or sends nothing back
registerEndpoint('/api/customers/alejandra-rodrigues', answer)
registerEndpoint('/api/customers/no-such-customer', () => {
  throw createError({ statusCode: 404, statusMessage: 'Not Found' })
})
registerEndpoint('/api/customers/source-down', (event) => {
  record(event)
  throw createError({ statusCode: 502, statusMessage: 'Bad Gateway' })
})
// A 204: no error, and nothing to show
registerEndpoint('/api/customers/no-body', () => null)

const ARTICLE = '[data-testid="customer-detail__root--article"]'
const HERO = '[data-testid="customer-hero__root--section"]'
const NAME = '[data-testid="customer-hero__name--heading"]'

// A page left mounted by an earlier test would fetch again on the next test's navigation
enableAutoUnmount(afterEach)

// The page throws a fatal error and Nuxt turns it into the error page: `useError` holds what that
// page is given, and the server answers with its status. mountSuspended does not reject with the
// error, since the root handler of Nuxt takes a fatal one and stops it there; what rejects is the
// render that follows the failed setup, with no state, in a TypeError of its own.
async function errorOf(slug: string) {
  await mountSuspended(CustomerPage, { route: `/customers/${slug}` }).catch(() => undefined)
  return useError().value
}

beforeEach(() => {
  requests = []
})

afterEach(async () => {
  await clearError()
  vi.restoreAllMocks()
})

describe('customer page', () => {
  it('renders the hero of the customer the BFF gave, inside an article', async () => {
    const wrapper = await mountSuspended(CustomerPage, { route: '/customers/alejandra-rodrigues' })
    const article = wrapper.get(ARTICLE)

    expect(article.element.tagName).toBe('ARTICLE')
    expect(article.classes()).toEqual([expect.stringContaining('Article')])
    expect(article.get(HERO).get(NAME).text()).toBe('Alejandra Rodrigues')
  })

  it('names the article by the heading of the hero', async () => {
    const wrapper = await mountSuspended(CustomerPage, { route: '/customers/alejandra-rodrigues' })
    const labelledBy = wrapper.get(ARTICLE).attributes('aria-labelledby')

    expect(labelledBy).toBeTruthy()
    expect(wrapper.get(NAME).attributes('id')).toBe(labelledBy)
  })

  it('asks the BFF for the customer of the slug in the address', async () => {
    await mountSuspended(CustomerPage, { route: '/customers/alejandra-rodrigues' })

    expect(requests).toEqual(['/api/customers/alejandra-rodrigues'])
  })

  // Two statuses, so a page that always answers with one of them fails
  it.each([
    { slug: 'no-such-customer', status: 404, statusText: 'Not Found' },
    { slug: 'source-down', status: 502, statusText: 'Bad Gateway' },
  ])('shows the error page with the $status of the BFF', async (row) => {
    expect(await errorOf(row.slug)).toMatchObject({
      status: row.status,
      statusText: row.statusText,
    })
  })

  // ofetch repeats a GET that fails with a 5xx: the BFF would read the source twice and the error
  // page would be twice as late (ADR-0005)
  it('asks the BFF once when it fails', async () => {
    await errorOf('source-down')

    expect(requests).toEqual(['/api/customers/source-down'])
  })

  it('shows the error page with a 500 when the BFF answers with nothing to show', async () => {
    expect(await errorOf('no-body')).toMatchObject({ status: 500 })
  })
})
