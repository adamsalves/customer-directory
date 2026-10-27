import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ICustomerCard, ICustomerFacets, ICustomerListResponse } from '#shared/types/customer'
import { DEFAULT_PER_PAGE } from '#shared/utils/listQuery'
import PaginationNav from '~/components/PaginationNav/PaginationNav.vue'
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
// The page does not read the facets yet: the filter panel comes with #25
const facets: ICustomerFacets = { states: {}, gender: { all: 0, female: 0, male: 0 } }
const response: ICustomerListResponse = {
  items,
  total: 20,
  page: 2,
  perPage: 6,
  totalPages: 4,
  facets,
}
// What the BFF answers when nothing matches: a page 1 with no items, not an error
const noResults: ICustomerListResponse = {
  items: [],
  total: 0,
  page: 1,
  perPage: 6,
  totalPages: 1,
  facets,
}

// What the page asked the BFF for, one entry per request
let requests: URLSearchParams[] = []
let release: (() => void) | undefined
let gate: Promise<void> | undefined
let failing = false
let empty = false

registerEndpoint('/api/customers', async (event) => {
  requests.push(new URL(event.path, 'http://localhost').searchParams)
  await gate
  if (failing) throw createError({ statusCode: 502, statusMessage: 'Bad Gateway' })
  return empty ? noResults : response
})

const RESULTS = '[data-testid="customers__results--section"]'
const SKELETON = '[data-testid="customers__skeleton--list"]'
const LIST = '[data-testid="customers__list--list"]'
const CARD = '[data-testid="customer-card__root--article"]'
const IMAGE = '[data-testid="customer-card__avatar--image"]'
const NAV = '[data-testid="pagination__root--nav"]'
const ERROR = '[data-testid="error-state__message--alert"]'
const RETRY = '[data-testid="error-state__retry--button"]'
const EMPTY_TITLE = '[data-testid="empty-state__title--heading"]'
const EMPTY_HINT = '[data-testid="empty-state__hint--text"]'
const CLEAR = '[data-testid="empty-state__clear--button"]'

// A page left mounted by an earlier test would refetch on the next test's navigation
enableAutoUnmount(afterEach)

function htmlElement(element: Element): HTMLElement {
  if (!(element instanceof HTMLElement)) throw new Error('the element is not an HTML element')
  return element
}

beforeEach(() => {
  requests = []
  release = undefined
  gate = undefined
  failing = false
  empty = false
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('customers page', () => {
  it('renders the list heading', async () => {
    const wrapper = await mountSuspended(CustomersPage)

    expect(wrapper.get('[data-testid="customers__title--heading"]').text()).toBe(
      'Lista de clientes',
    )
  })

  it('opens with the Home > Clientes trail', async () => {
    const wrapper = await mountSuspended(CustomersPage)

    expect(wrapper.get('[data-testid="breadcrumb__item--link"]').text()).toBe('Home')
    expect(wrapper.get('[data-testid="breadcrumb__item--current"]').text()).toBe('Clientes')
  })

  it('asks the BFF for the page and the page size in the URL', async () => {
    await mountSuspended(CustomersPage, { route: '/customers?page=2&perPage=18' })

    expect(requests.map(String)).toEqual(['page=2&perPage=18'])
  })

  // The canonical keys, as in the page URL: no default and no empty search
  it('leaves the defaults to the BFF when the URL is not canonical', async () => {
    await mountSuspended(CustomersPage, { route: '/customers?page=abc&perPage=7&search=' })

    expect(requests.map(String)).toEqual([''])
  })

  it('asks the BFF for the trimmed search in the URL', async () => {
    await mountSuspended(CustomersPage, { route: '/customers?search=%20girao%20rosa%20&page=2' })

    expect(requests.map(String)).toEqual(['page=2&search=girao+rosa'])
  })

  it('renders one card per customer, in the order of the response', async () => {
    const wrapper = await mountSuspended(CustomersPage, { route: '/customers?page=2' })
    const names = wrapper
      .findAll('[data-testid="customer-card__name--heading"]')
      .map((name) => name.text())

    expect(wrapper.findAll(CARD)).toHaveLength(items.length)
    expect(names).toEqual(items.map((item) => item.name))
  })

  // A page change scrolls back to the element with this id and moves the focus to it. The skeleton
  // and the list come and go inside it, so the focus does not fall to the page when the skeleton goes.
  it('wraps the list in the results the page change scrolls to and focuses', async () => {
    const wrapper = await mountSuspended(CustomersPage, { route: '/customers?page=2' })
    const results = wrapper.get(RESULTS)

    expect(results.element.tagName).toBe('SECTION')
    expect(results.attributes()).toMatchObject({
      id: RESULTS_ID,
      tabindex: '-1',
      'aria-label': 'Resultados',
    })
    expect(results.find(LIST).exists()).toBe(true)
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
    const results = wrapper.get(RESULTS).element
    expect(wrapper.find(SKELETON).exists()).toBe(false)
    expect(wrapper.getComponent(PaginationNav).props('loading')).toBe(false)
    gate = new Promise((resolve) => {
      release = resolve
    })

    // Not the default page size: the skeleton count stays at 9 whatever perPage asks for
    await navigateTo('/customers?page=2&perPage=18')
    await vi.waitFor(() => {
      expect(wrapper.find(SKELETON).exists()).toBe(true)
    })
    const skeletons = wrapper.get(SKELETON)

    // The same element holds the list, the skeleton and the list again: that is what keeps the focus
    expect(wrapper.get(RESULTS).element).toBe(results)
    expect(wrapper.get(RESULTS).element.contains(skeletons.element)).toBe(true)
    expect(skeletons.attributes('aria-busy')).toBe('true')
    expect(skeletons.attributes('aria-label')).toBe('Carregando clientes')
    expect(skeletons.findAll('li')).toHaveLength(DEFAULT_PER_PAGE)
    expect(wrapper.find(CARD).exists()).toBe(false)
    expect(wrapper.getComponent(PaginationNav).props('loading')).toBe(true)

    release?.()
    await vi.waitFor(() => {
      expect(wrapper.findAll(CARD)).toHaveLength(items.length)
    })
    expect(wrapper.find(SKELETON).exists()).toBe(false)
    expect(wrapper.get(RESULTS).element).toBe(results)
    expect(wrapper.get(RESULTS).element.contains(wrapper.get(LIST).element)).toBe(true)
    expect(wrapper.getComponent(PaginationNav).props('loading')).toBe(false)
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
      expect(wrapper.find(SKELETON).exists()).toBe(true)
    })

    expect(wrapper.get(NAV).element).toBe(nav)
    release?.()
    await vi.waitFor(() => {
      expect(wrapper.find(SKELETON).exists()).toBe(false)
    })
    expect(wrapper.get(NAV).element).toBe(nav)
  })

  // A failed request ends in the error, inside the results, and above all not in a skeleton: its
  // aria-busy would announce a load that never ends. No list and no pagination either.
  it('shows only the error state when the request fails', async () => {
    failing = true
    const wrapper = await mountSuspended(CustomersPage, { route: '/customers?page=2' })
    const error = wrapper.get(ERROR)

    expect(wrapper.get(RESULTS).element.contains(error.element)).toBe(true)
    expect(wrapper.find(LIST).exists()).toBe(false)
    expect(wrapper.find(CARD).exists()).toBe(false)
    expect(wrapper.find(SKELETON).exists()).toBe(false)
    expect(wrapper.find(NAV).exists()).toBe(false)
  })

  // ofetch would retry a GET on a 502 by itself: one more read of a source that is down, and the
  // error twice as long to show. The retry is the button's.
  it('asks the BFF once when the request fails', async () => {
    failing = true
    await mountSuspended(CustomersPage, { route: '/customers?page=2' })

    expect(requests.map(String)).toEqual(['page=2'])
  })

  it('retries the same query and shows the cards when the retry succeeds', async () => {
    failing = true
    const wrapper = await mountSuspended(CustomersPage, { route: '/customers?page=2' })
    failing = false

    await wrapper.get(RETRY).trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.findAll(CARD)).toHaveLength(items.length)
    })

    expect(requests.map(String)).toEqual(['page=2', 'page=2'])
    expect(wrapper.find(ERROR).exists()).toBe(false)
    expect(wrapper.find(NAV).exists()).toBe(true)
  })

  it('shows the skeletons, not the error, while the retry loads', async () => {
    failing = true
    const wrapper = await mountSuspended(CustomersPage, { route: '/customers?page=2' })
    failing = false
    gate = new Promise((resolve) => {
      release = resolve
    })

    await wrapper.get(RETRY).trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.find(SKELETON).exists()).toBe(true)
    })

    expect(wrapper.find(ERROR).exists()).toBe(false)
    release?.()
    await vi.waitFor(() => {
      expect(wrapper.findAll(CARD)).toHaveLength(items.length)
    })
    expect(wrapper.find(SKELETON).exists()).toBe(false)
    expect(wrapper.find(ERROR).exists()).toBe(false)
  })

  // The button goes when the skeleton comes in: the focus it holds has to be somewhere that stays,
  // and moving it there must not scroll the page
  it('moves the focus to the results when retrying', async () => {
    failing = true
    const wrapper = await mountSuspended(CustomersPage, {
      route: '/customers?page=2',
      attachTo: document.body,
    })
    failing = false
    const button = htmlElement(wrapper.get(RETRY).element)
    const results = htmlElement(wrapper.get(RESULTS).element)
    const focus = vi.spyOn(results, 'focus')
    button.focus()
    expect(document.activeElement).toBe(button)

    await wrapper.get(RETRY).trigger('click')

    expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true })
    expect(document.activeElement).toBe(results)
  })

  // No match is an answer, not a failure: the empty state takes the place of the list, inside the
  // results. With no page to go to there is no pagination either.
  it('shows only the empty state when nothing matches', async () => {
    empty = true
    const wrapper = await mountSuspended(CustomersPage, { route: '/customers?search=zzzz' })
    const title = wrapper.get(EMPTY_TITLE)

    expect(wrapper.get(RESULTS).element.contains(title.element)).toBe(true)
    expect(wrapper.find(LIST).exists()).toBe(false)
    expect(wrapper.find(CARD).exists()).toBe(false)
    expect(wrapper.find(SKELETON).exists()).toBe(false)
    expect(wrapper.find(ERROR).exists()).toBe(false)
    expect(wrapper.find(NAV).exists()).toBe(false)
  })

  it('names the search in the URL in the empty state', async () => {
    empty = true
    const wrapper = await mountSuspended(CustomersPage, { route: '/customers?search=zzzz' })

    expect(wrapper.get(EMPTY_HINT).text()).toContain('chamado “zzzz”')
  })

  // The page size stays, the search and the page go: the list starts over from its first page. A
  // search written on the list replaces its history entry (ADR-0013).
  it('clears the search and the filters, keeps the page size and replaces the history entry', async () => {
    empty = true
    const wrapper = await mountSuspended(CustomersPage, {
      route: '/customers?search=zzzz&page=3&perPage=18&states=bahia&gender=female',
    })
    empty = false
    const router = useRouter()
    const replace = vi.spyOn(router, 'replace')
    const push = vi.spyOn(router, 'push')

    await wrapper.get(CLEAR).trigger('click')
    await vi.waitFor(() => {
      expect(useRoute().fullPath).toBe('/customers?perPage=18')
    })

    expect(replace).toHaveBeenCalledExactlyOnceWith({
      path: '/customers',
      query: { perPage: '18' },
    })
    expect(push).not.toHaveBeenCalled()
    await vi.waitFor(() => {
      expect(wrapper.findAll(CARD)).toHaveLength(items.length)
    })
    expect(wrapper.find(EMPTY_TITLE).exists()).toBe(false)
  })

  // The button goes when the skeleton comes in: the focus it holds has to be somewhere that stays,
  // and moving it there must not scroll the page
  it('moves the focus to the results when clearing and keeps it there while the list loads', async () => {
    empty = true
    const wrapper = await mountSuspended(CustomersPage, {
      route: '/customers?search=zzzz',
      attachTo: document.body,
    })
    empty = false
    const button = htmlElement(wrapper.get(CLEAR).element)
    const results = htmlElement(wrapper.get(RESULTS).element)
    const focus = vi.spyOn(results, 'focus')
    button.focus()
    expect(document.activeElement).toBe(button)
    gate = new Promise((resolve) => {
      release = resolve
    })

    await wrapper.get(CLEAR).trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.find(SKELETON).exists()).toBe(true)
    })

    expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true })
    expect(wrapper.find(CLEAR).exists()).toBe(false)
    expect(document.activeElement).toBe(results)
    release?.()
    await vi.waitFor(() => {
      expect(wrapper.findAll(CARD)).toHaveLength(items.length)
    })
    expect(document.activeElement).toBe(results)
  })

  it('refetches when the page in the URL changes', async () => {
    await mountSuspended(CustomersPage, { route: '/customers?page=2' })
    await useListQuery().setQuery({ page: 3, perPage: 9, search: '', states: [], gender: 'all' })

    await vi.waitFor(() => {
      expect(requests.map(String)).toEqual(['page=2', 'page=3'])
    })
  })
})
