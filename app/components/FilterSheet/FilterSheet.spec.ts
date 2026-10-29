import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import type { ICustomerFacets } from '#shared/types/customer'
import { BRAZILIAN_STATES } from '#shared/utils/brazilianStates'
import FilterSheet from './FilterSheet.vue'

const OPEN = '[data-testid="filter-sheet__open--button"]'
const BADGE = '[data-testid="filter-sheet__badge--text"]'
const DIALOG = '[data-testid="filter-sheet__root--dialog"]'
const GRIP = '[data-testid="filter-sheet__grip--div"]'
const BODY = '[data-testid="filter-sheet__body--div"]'
const TITLE = '[data-testid="filter-sheet__title--heading"]'
const CLOSE = '[data-testid="filter-sheet__close--button"]'
const CLEAR = '[data-testid="filter-sheet__clear--button"]'
const APPLY = '[data-testid="filter-sheet__apply--button"]'
const PANEL = '[data-testid="filter-panel__root--div"]'
const STATE = '[data-testid="filter-panel__state--checkbox"]'
const COUNT = '[data-testid="filter-panel__count--number"]'
const PANEL_TOGGLE = '[data-testid="filter-panel__toggle--button"]'
const PANEL_CLEAR = '[data-testid="filter-panel__clear--button"]'

const facets: ICustomerFacets = {
  states: {
    ...Object.fromEntries(BRAZILIAN_STATES.map(({ slug }) => [slug, 0])),
    'sao-paulo': 12,
    acre: 3,
  },
  gender: { all: 21, female: 9, male: 12 },
}

enableAutoUnmount(afterEach)

afterEach(() => {
  vi.restoreAllMocks()
})

type TProps = { total: number | undefined; facets: ICustomerFacets | undefined }

// In the document, so the dialog can take a click. The route is the list state the sheet starts from.
function mountSheet(route = '/customers', props: TProps = { total: 20, facets }) {
  return mountSuspended(FilterSheet, { route, props, attachTo: document.body })
}

type TWrapper = Awaited<ReturnType<typeof mountSheet>>

function dialogOf(wrapper: TWrapper) {
  const { element } = wrapper.get(DIALOG)
  if (!(element instanceof HTMLDialogElement)) throw new Error('the sheet is not a dialog')
  return element
}

// The click, and the frame the sheet waits for before it shows
async function openSheet(wrapper: TWrapper) {
  await wrapper.get(OPEN).trigger('click')
  await flushPromises()
}

const urlIs = (url: string) =>
  vi.waitFor(() => {
    expect(useRoute().fullPath).toBe(url)
  })

// Both calling through: the router still navigates
function spyOnRouter() {
  const router = useRouter()
  return { push: vi.spyOn(router, 'push'), replace: vi.spyOn(router, 'replace') }
}

describe('FilterSheet bar', () => {
  // The search is no filter, and neither are the page and the page size. "all" is the gender that is
  // not one.
  it.each([
    { name: 'no filter', route: '/customers', label: 'Filtros', badge: undefined },
    {
      name: 'a search, a page and a page size',
      route: '/customers?search=ana&page=2&perPage=18&gender=all',
      label: 'Filtros',
      badge: undefined,
    },
    {
      name: 'the gender alone',
      route: '/customers?gender=female',
      label: 'Filtros, 1 ativo',
      badge: '1',
    },
    {
      name: 'two states, the gender and a search',
      route: '/customers?search=ana&states=bahia,sao-paulo&gender=female',
      label: 'Filtros, 3 ativos',
      badge: '3',
    },
  ])('counts the filters picked: $name', async ({ route, label, badge }) => {
    const wrapper = await mountSheet(route)
    const button = wrapper.get(OPEN)

    expect(button.attributes('aria-label')).toBe(label)
    expect(wrapper.find(BADGE).exists()).toBe(badge !== undefined)
    if (badge !== undefined) {
      expect(wrapper.get(BADGE).text()).toBe(badge)
      // The label says the number, so the badge is not read twice
      expect(wrapper.get(BADGE).attributes('aria-hidden')).toBe('true')
    }
  })

  // A modal dialog makes the button inert while it is open, so it has nothing to expand or collapse
  it('is a button that opens a dialog, with no expanded state', async () => {
    const wrapper = await mountSheet()
    const button = wrapper.get(OPEN)

    expect(button.element.tagName).toBe('BUTTON')
    expect(button.attributes('type')).toBe('button')
    expect(button.attributes('aria-haspopup')).toBe('dialog')
    expect(button.attributes('aria-expanded')).toBeUndefined()
    expect(button.text()).toBe('Filtros')
    expect(button.get('svg').attributes('aria-hidden')).toBe('true')
  })

  // The route is a frame behind a pick: the badge follows the write on its way, as the panel does
  it('counts the filters of the write still on its way, before the URL has them', async () => {
    const wrapper = await mountSheet()

    void useListQuery().setQuery({ states: ['bahia'], gender: 'male', page: 1 })
    await nextTick()
    expect(useRoute().fullPath).toBe('/customers')
    expect(wrapper.get(OPEN).attributes('aria-label')).toBe('Filtros, 2 ativos')
    expect(wrapper.get(BADGE).text()).toBe('2')

    await urlIs('/customers?states=bahia&gender=male')
    expect(wrapper.get(OPEN).attributes('aria-label')).toBe('Filtros, 2 ativos')
  })
})

describe('FilterSheet dialog', () => {
  it('is a closed dialog named by its heading, with no panel in it', async () => {
    const wrapper = await mountSheet()
    const dialog = dialogOf(wrapper)

    expect(dialog.open).toBe(false)
    expect(wrapper.find(PANEL).exists()).toBe(false)
    expect(wrapper.get(TITLE).text()).toBe('Filtros')
    expect(wrapper.get(TITLE).element.tagName).toBe('H2')
    expect(dialog.getAttribute('aria-labelledby')).toMatch(/\S/)
    expect(wrapper.get(TITLE).attributes('id')).toBe(dialog.getAttribute('aria-labelledby'))
    expect(wrapper.get(CLOSE).attributes('aria-label')).toBe('Fechar filtros')
    expect(wrapper.get(CLOSE).attributes('type')).toBe('button')
    // The icon and the handle are decoration
    expect(wrapper.get(CLOSE).get('svg').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get(GRIP).attributes('aria-hidden')).toBe('true')
  })

  // happy-dom only sets `open`: the top layer, the inert page, Esc and the focus are the E2E's
  it('opens as a modal, with the panel of the sheet in it', async () => {
    const wrapper = await mountSheet()
    const showModal = vi.spyOn(dialogOf(wrapper), 'showModal')

    await openSheet(wrapper)

    expect(showModal).toHaveBeenCalledOnce()
    expect(dialogOf(wrapper).open).toBe(true)
    // Every state, with nothing to open, and the counts of the answer
    const panel = wrapper.get(DIALOG).get(PANEL)
    expect(panel.findAll(STATE)).toHaveLength(27)
    expect(panel.find(PANEL_TOGGLE).exists()).toBe(false)
    expect(panel.find(PANEL_CLEAR).exists()).toBe(false)
    expect(panel.get(`label:has(${STATE}[value="acre"]) ${COUNT}`).text()).toBe('3')
  })

  // The sheet comes up with its whole height: a panel that arrives after the dialog is shown would
  // grow the sheet under the animation
  it('has the panel in the dialog before it shows', async () => {
    const wrapper = await mountSheet()
    const dialog = dialogOf(wrapper)
    const seen: boolean[] = []
    vi.spyOn(dialog, 'showModal').mockImplementation(() => {
      seen.push(dialog.querySelector(PANEL) !== null)
      dialog.setAttribute('open', '')
    })

    await openSheet(wrapper)

    expect(seen).toEqual([true])
  })

  // The browser closes it on Esc, the close button and the action button end in the same close, and
  // the close event is what takes the panel away
  it.each([
    { name: 'the close button', close: (wrapper: TWrapper) => wrapper.get(CLOSE).trigger('click') },
    {
      name: 'the action button',
      close: (wrapper: TWrapper) => wrapper.get(APPLY).trigger('click'),
    },
    // The click on the backdrop lands on the dialog itself
    {
      name: 'a click on the backdrop',
      close: (wrapper: TWrapper) => wrapper.get(DIALOG).trigger('click'),
    },
    // As on Esc
    {
      name: 'the browser, on Esc',
      close: (wrapper: TWrapper) => {
        dialogOf(wrapper).close()
        return nextTick()
      },
    },
  ])('closes with $name, and takes the panel away', async ({ close }) => {
    const wrapper = await mountSheet()
    await openSheet(wrapper)
    expect(wrapper.find(PANEL).exists()).toBe(true)

    await close(wrapper)
    await flushPromises()

    expect(dialogOf(wrapper).open).toBe(false)
    expect(wrapper.find(PANEL).exists()).toBe(false)
  })

  it('stays open for a click inside the sheet', async () => {
    const wrapper = await mountSheet()
    await openSheet(wrapper)

    for (const inside of [BODY, TITLE, PANEL, STATE]) {
      await wrapper.get(DIALOG).get(inside).trigger('click')
    }
    await flushPromises()

    expect(dialogOf(wrapper).open).toBe(true)
    expect(wrapper.find(PANEL).exists()).toBe(true)
  })
})

describe('FilterSheet action button', () => {
  it.each([
    { name: 'nobody', total: 0, text: 'Nenhum resultado' },
    { name: 'one customer', total: 1, text: 'Ver 1 cliente' },
    { name: 'many', total: 27, text: 'Ver 27 clientes' },
    { name: 'no answer', total: undefined, text: 'Ver clientes' },
  ])('names the total when the list has $name', async ({ total, text }) => {
    const wrapper = await mountSheet('/customers', { total, facets })

    expect(wrapper.get(APPLY).text()).toBe(text)
    expect(wrapper.get(APPLY).attributes('type')).toBe('button')
  })
})

describe('FilterSheet clear button', () => {
  // The filters go, the search stays: it has its own field. A filter starts over from page 1, as a
  // push that back takes back (ADR-0007).
  it('clears the states and the gender, keeps the rest, and pushes', async () => {
    const wrapper = await mountSheet(
      '/customers?page=2&perPage=18&search=ana&states=bahia,sao-paulo&gender=female',
    )
    const { push, replace } = spyOnRouter()

    expect(wrapper.get(CLEAR).text()).toBe('Limpar')
    expect(wrapper.get(CLEAR).attributes('type')).toBe('button')
    expect(wrapper.get(CLEAR).attributes('aria-disabled')).toBeUndefined()

    await wrapper.get(CLEAR).trigger('click')
    await urlIs('/customers?perPage=18&search=ana')

    expect(push).toHaveBeenCalledExactlyOnceWith({
      path: '/customers',
      query: { perPage: '18', search: 'ana' },
    })
    expect(replace).not.toHaveBeenCalled()
    // It follows the write: nothing left to clear
    expect(wrapper.get(CLEAR).attributes('aria-disabled')).toBe('true')
  })

  // Not `disabled`: the focus would drop to the page behind, and it stays in the tab order
  it('is aria-disabled and does nothing with no filter picked, a search aside', async () => {
    const wrapper = await mountSheet('/customers?search=ana')
    const { push, replace } = spyOnRouter()

    expect(wrapper.get(CLEAR).attributes('aria-disabled')).toBe('true')
    expect(wrapper.get(CLEAR).attributes('disabled')).toBeUndefined()
    await wrapper.get(CLEAR).trigger('click')
    await flushPromises()

    expect(push).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
    expect(useRoute().fullPath).toBe('/customers?search=ana')
  })
})
