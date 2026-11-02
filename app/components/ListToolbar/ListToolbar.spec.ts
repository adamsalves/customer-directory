import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import type { AsyncDataRequestStatus } from '#app'
import type { ICustomerCard, ICustomerListResponse } from '#shared/types/customer'
import { TOOLBAR_ID } from '~/utils/resultsScroll'
import ListToolbar from './ListToolbar.vue'

const ROOT = '[data-testid="list-toolbar__root--div"]'
const COUNT = '[data-testid="list-toolbar__count--text"]'

const card: ICustomerCard = {
  slug: 'customer-0',
  name: 'Customer 0',
  street: 'Rua Santa Catarina, 3833',
  city: 'Umuarama',
  state: 'Santa Catarina',
  uf: 'SC',
  postcode: '43646',
  picture: 'https://example.com/0.jpg',
}

// A page as the BFF answers it: `shown` cards of `total`. The facets are the panel's, not the toolbar's.
const answer = (page: number, perPage: number, shown: number, total: number) =>
  ({
    items: Array.from({ length: shown }, () => card),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    facets: { states: {}, gender: { all: total, female: 0, male: 0 } },
  }) satisfies ICustomerListResponse

type TState = [
  name: string,
  response: ICustomerListResponse | undefined,
  status: AsyncDataRequestStatus,
  text: string,
]

const states: TState[] = [
  ['a full page', answer(1, 9, 9, 200), 'success', 'Exibindo 1–9 de 200 clientes'],
  // Not the default page size, so a start of 9 × page would not do
  ['a short last page', answer(2, 18, 2, 20), 'success', 'Exibindo 19–20 de 20 clientes'],
  // The plural follows the total, not what is on the page
  ['a page of one of many', answer(3, 9, 1, 19), 'success', 'Exibindo 19–19 de 19 clientes'],
  ['one customer', answer(1, 9, 1, 1), 'success', 'Exibindo 1–1 de 1 cliente'],
  ['no customer', answer(1, 9, 0, 0), 'success', 'Nenhum cliente encontrado'],
  // The last answer stays while the next is on its way, and a retry after a failure has none
  ['loading over an answer', answer(1, 9, 9, 200), 'pending', 'Carregando clientes…'],
  ['loading with none', undefined, 'pending', 'Carregando clientes…'],
  // The error state announces itself (role="alert"): the region stays empty
  ['a failure with no answer', undefined, 'error', ''],
  ['a failure over an answer', answer(1, 9, 9, 200), 'error', ''],
  // Nothing asked yet, nothing to say
  ['idle with no answer', undefined, 'idle', ''],
]

enableAutoUnmount(afterEach)

describe('ListToolbar', () => {
  it.each(states)('reads the text of %s', async (_name, response, status, text) => {
    const wrapper = await mountSuspended(ListToolbar, { props: { response, status } })

    expect(wrapper.get(COUNT).text()).toBe(text)
  })

  // Only the text changes between states, so a screen reader that has met the region announces each
  // change. It is the only live region the toolbar has.
  it.each(states)('keeps its live region in the HTML for %s', async (_name, response, status) => {
    const wrapper = await mountSuspended(ListToolbar, { props: { response, status } })
    const count = wrapper.get(COUNT)

    expect(count.element.tagName).toBe('P')
    expect(count.attributes()).toMatchObject({ role: 'status', 'aria-live': 'polite' })
    expect(wrapper.findAll('[aria-live]')).toHaveLength(1)
  })

  // A page change scrolls back to the toolbar, and finds it by this id (resultsScroll.ts)
  it('has the id a page change scrolls back to', async () => {
    const wrapper = await mountSuspended(ListToolbar, {
      props: { response: undefined, status: 'idle' },
    })

    expect(wrapper.get(ROOT).attributes('id')).toBe(TOOLBAR_ID)
  })
})
