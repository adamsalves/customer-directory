import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ICustomerCard, ICustomerListResponse } from '#shared/types/customer'
import CustomersPage from './index.vue'

const items: ICustomerCard[] = Array.from({ length: 6 }, (_, index) => ({
  slug: `customer-${String(index)}`,
  name: `Customer ${String(index)}`,
  street: 'Rua Santa Catarina, 3833',
  city: 'Umuarama',
  state: 'Santa Catarina',
  uf: 'SC',
  postcode: '43646',
  picture: `https://example.com/${String(index)}.jpg`,
}))
const response: ICustomerListResponse = {
  items,
  total: 20,
  page: 2,
  perPage: 6,
  totalPages: 4,
}

// What the page asked the BFF for, one entry per request
let requests: URLSearchParams[] = []
let failing = false

registerEndpoint('/api/customers', (event) => {
  requests.push(new URL(event.path, 'http://localhost').searchParams)
  if (failing) throw createError({ statusCode: 502, statusMessage: 'Bad Gateway' })
  return response
})

const CARD = '[data-testid="customer-card__root--article"]'
const IMAGE = '[data-testid="customer-card__avatar--image"]'

// A page left mounted by an earlier test would refetch on the next test's navigation
enableAutoUnmount(afterEach)

beforeEach(() => {
  requests = []
  failing = false
})

describe('customers page', () => {
  it('renders the list heading', async () => {
    const wrapper = await mountSuspended(CustomersPage)

    expect(wrapper.get('[data-testid="customers__title--heading"]').text()).toBe(
      'Lista de clientes',
    )
  })

  it('opens with the Home > Usuários trail', async () => {
    const wrapper = await mountSuspended(CustomersPage)

    expect(wrapper.get('[data-testid="breadcrumb__item--link"]').text()).toBe('Home')
    expect(wrapper.get('[data-testid="breadcrumb__item--current"]').text()).toBe('Usuários')
  })

  it('asks the BFF for the page and the page size in the URL', async () => {
    await mountSuspended(CustomersPage, { route: '/customers?page=2&perPage=18' })

    expect(requests.map(String)).toEqual(['page=2&perPage=18'])
  })

  it('asks for the defaults when the URL is not canonical', async () => {
    await mountSuspended(CustomersPage, { route: '/customers?page=abc&perPage=7' })

    expect(requests.map(String)).toEqual(['page=1&perPage=9'])
  })

  it('renders one card per customer, in the order of the response', async () => {
    const wrapper = await mountSuspended(CustomersPage, { route: '/customers?page=2' })
    const names = wrapper
      .findAll('[data-testid="customer-card__name--heading"]')
      .map((name) => name.text())

    expect(wrapper.findAll(CARD)).toHaveLength(items.length)
    expect(names).toEqual(items.map((item) => item.name))
  })

  it('loads the first row of images eagerly and only the first with high priority', async () => {
    const wrapper = await mountSuspended(CustomersPage, { route: '/customers?page=2' })
    const images = wrapper.findAll(IMAGE)

    expect(images.map((image) => image.attributes('loading'))).toEqual([
      'eager',
      'eager',
      'eager',
      'eager',
      'lazy',
      'lazy',
    ])
    expect(images.map((image) => image.attributes('fetchpriority'))).toEqual([
      'high',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ])
  })

  // The error state belongs to #17. Until then a failed request renders no list.
  it('shows no cards when the request fails', async () => {
    failing = true
    const wrapper = await mountSuspended(CustomersPage, { route: '/customers?page=2' })

    expect(wrapper.find('[data-testid="customers__list--list"]').exists()).toBe(false)
    expect(wrapper.find(CARD).exists()).toBe(false)
  })

  it('refetches when the page in the URL changes', async () => {
    await mountSuspended(CustomersPage, { route: '/customers?page=2' })
    await useListQuery().setQuery({ page: 3, perPage: 9 })

    await vi.waitFor(() => {
      expect(requests.map(String)).toEqual(['page=2&perPage=9', 'page=3&perPage=9'])
    })
  })
})
