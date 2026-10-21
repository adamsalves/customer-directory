import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ICustomerCard, ICustomerListResponse } from '#shared/types/customer'
import { DEFAULT_PER_PAGE } from '#shared/utils/listQuery'
import { RESULTS_ID } from '~/utils/resultsScroll'
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
let release: (() => void) | undefined
let gate: Promise<void> | undefined
let failing = false

registerEndpoint('/api/customers', async (event) => {
  requests.push(new URL(event.path, 'http://localhost').searchParams)
  await gate
  if (failing) throw createError({ statusCode: 502, statusMessage: 'Bad Gateway' })
  return response
})

const CARD = '[data-testid="customer-card__root--article"]'
const IMAGE = '[data-testid="customer-card__avatar--image"]'
const NAV = '[data-testid="pagination__root--nav"]'

// A page left mounted by an earlier test would refetch on the next test's navigation
enableAutoUnmount(afterEach)

beforeEach(() => {
  requests = []
  release = undefined
  gate = undefined
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

  // A page change scrolls back to the element with this id, whether it is the list or its skeleton
  it('marks the list as the results the page change scrolls to', async () => {
    const wrapper = await mountSuspended(CustomersPage, { route: '/customers?page=2' })

    expect(wrapper.get('[data-testid="customers__list--list"]').attributes('id')).toBe(RESULTS_ID)
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

  it('shows busy skeletons instead of the cards while the next page loads', async () => {
    const wrapper = await mountSuspended(CustomersPage, { route: '/customers' })
    expect(wrapper.find('[data-testid="customers__skeleton--list"]').exists()).toBe(false)
    gate = new Promise((resolve) => {
      release = resolve
    })

    // Not the default page size: the skeleton count stays at 9 whatever perPage asks for
    await navigateTo('/customers?page=2&perPage=18')
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="customers__skeleton--list"]').exists()).toBe(true)
    })
    const skeletons = wrapper.get('[data-testid="customers__skeleton--list"]')

    expect(skeletons.attributes('id')).toBe(RESULTS_ID)
    expect(skeletons.attributes('aria-busy')).toBe('true')
    expect(skeletons.attributes('aria-label')).toBe('Carregando clientes')
    expect(skeletons.findAll('li')).toHaveLength(DEFAULT_PER_PAGE)
    expect(wrapper.find(CARD).exists()).toBe(false)

    release?.()
    await vi.waitFor(() => {
      expect(wrapper.findAll(CARD)).toHaveLength(items.length)
    })
    expect(wrapper.find('[data-testid="customers__skeleton--list"]').exists()).toBe(false)
  })

  // The BFF answers a page past the end with the last one (page 2 of 4 in this mock), so the
  // nav marks what it answered with, not the 999 of the URL
  it('marks the page the BFF answered with, not the one in the URL', async () => {
    const wrapper = await mountSuspended(CustomersPage, { route: '/customers?page=999' })

    expect(wrapper.get('[data-testid="pagination__current--number"]').text()).toBe('2')
    expect(wrapper.get('[data-testid="pagination__full--list"]').findAll('li')).toHaveLength(
      response.totalPages,
    )
  })

  // The link or the select just used keeps the focus only if it is not unmounted
  it('keeps the pagination mounted while the next page loads', async () => {
    const wrapper = await mountSuspended(CustomersPage, { route: '/customers' })
    const nav = wrapper.get(NAV).element
    gate = new Promise((resolve) => {
      release = resolve
    })

    await navigateTo('/customers?page=2')
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="customers__skeleton--list"]').exists()).toBe(true)
    })

    expect(wrapper.get(NAV).element).toBe(nav)
    release?.()
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="customers__skeleton--list"]').exists()).toBe(false)
    })
    expect(wrapper.get(NAV).element).toBe(nav)
  })

  // The error state belongs to #17. Until then a failed request renders no list and, above all,
  // no skeleton: its aria-busy would announce a load that never ends.
  it('shows neither cards nor skeletons when the request fails', async () => {
    failing = true
    const wrapper = await mountSuspended(CustomersPage, { route: '/customers?page=2' })

    expect(wrapper.find('[data-testid="customers__list--list"]').exists()).toBe(false)
    expect(wrapper.find(CARD).exists()).toBe(false)
    expect(wrapper.find('[data-testid="customers__skeleton--list"]').exists()).toBe(false)
  })

  it('refetches when the page in the URL changes', async () => {
    await mountSuspended(CustomersPage, { route: '/customers?page=2' })
    await useListQuery().setQuery({ page: 3, perPage: 9 })

    await vi.waitFor(() => {
      expect(requests.map(String)).toEqual(['page=2&perPage=9', 'page=3&perPage=9'])
    })
  })
})
