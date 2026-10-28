import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { RESULTS_ID } from '~/utils/resultsScroll'
import FilterChips from './FilterChips.vue'

const LIST = '[data-testid="filter-chips__root--list"]'
const CHIP = '[data-testid="filter-chips__chip--button"]'

enableAutoUnmount(afterEach)

afterEach(() => {
  vi.restoreAllMocks()
})

// The page puts the results under the chips, and the focus goes there when no chip is left
const WithResults = defineComponent({
  render: () => h('div', [h(FilterChips), h('section', { id: RESULTS_ID, tabindex: -1 })]),
})

// In the document, so a chip can take focus. The route is the list state the chips start from.
const mountChips = (route = '/customers') =>
  mountSuspended(WithResults, { route, attachTo: document.body })

type TWrapper = Awaited<ReturnType<typeof mountChips>>

const removalsOf = (wrapper: TWrapper) =>
  wrapper.findAll(CHIP).map((chip) => chip.attributes('aria-label'))
const chipNamed = (wrapper: TWrapper, name: string) => wrapper.get(`${CHIP}[aria-label="${name}"]`)
const focusedName = () => document.activeElement?.getAttribute('aria-label')

function htmlElement(element: Element): HTMLElement {
  if (!(element instanceof HTMLElement)) throw new Error('the element is not an HTML element')
  return element
}

const urlIs = (url: string) =>
  vi.waitFor(() => {
    expect(useRoute().fullPath).toBe(url)
  })

describe('FilterChips', () => {
  // The page and the page size are no filter, "all" is the gender that is not one, and a blank search
  // is no search
  it.each([
    '/customers',
    '/customers?page=2&perPage=18',
    '/customers?gender=all',
    '/customers?search=%20%20',
  ])('is not there for %s', async (route) => {
    const wrapper = await mountChips(route)

    expect(wrapper.find(LIST).exists()).toBe(false)
    expect(wrapper.find(CHIP).exists()).toBe(false)
  })

  // The table has Bahia before São Paulo, and the link says it the other way
  it('is a list of a chip for the search, one for each state and one for the gender, in that order', async () => {
    const wrapper = await mountChips('/customers?search=ana&states=sao-paulo,bahia&gender=female')
    const list = wrapper.get(LIST)

    expect(wrapper.findAll(CHIP).map((chip) => chip.text())).toEqual([
      'Busca: “ana”',
      'Bahia',
      'São Paulo',
      'Feminino',
    ])
    expect(removalsOf(wrapper)).toEqual([
      'Remover busca ana',
      'Remover filtro Bahia',
      'Remover filtro São Paulo',
      'Remover filtro Feminino',
    ])
    expect(list.element.tagName).toBe('UL')
    expect(list.attributes('aria-label')).toBe('Filtros ativos')
    expect(list.findAll('li')).toHaveLength(4)
    for (const chip of wrapper.findAll(CHIP)) {
      expect(chip.element.tagName).toBe('BUTTON')
      expect(chip.element.parentElement?.tagName).toBe('LI')
      expect(chip.attributes('type')).toBe('button')
      expect(chip.get('svg').attributes('aria-hidden')).toBe('true')
    }
  })
})

describe('FilterChips removal', () => {
  // The removal starts over from page 1 and keeps the rest of the list state, the page size included.
  // It is a push: that history entry is what back takes back (ADR-0007).
  it.each([
    {
      name: 'the search',
      route: '/customers?page=3&perPage=18&search=ana&states=bahia&gender=female',
      chip: 'Remover busca ana',
      url: '/customers?perPage=18&states=bahia&gender=female',
    },
    {
      name: 'a state, keeping the others',
      route: '/customers?page=3&search=ana&states=bahia,sao-paulo&gender=female',
      chip: 'Remover filtro Bahia',
      url: '/customers?search=ana&states=sao-paulo&gender=female',
    },
    {
      name: 'the gender',
      route: '/customers?page=3&perPage=18&search=ana&states=bahia&gender=female',
      chip: 'Remover filtro Feminino',
      url: '/customers?perPage=18&search=ana&states=bahia',
    },
  ])('writes the list without $name, from page 1, as a push', async ({ route, chip, url }) => {
    const wrapper = await mountChips(route)
    const router = useRouter()
    const push = vi.spyOn(router, 'push')
    const replace = vi.spyOn(router, 'replace')

    await chipNamed(wrapper, chip).trigger('click')
    await urlIs(url)

    expect(push).toHaveBeenCalledOnce()
    expect(replace).not.toHaveBeenCalled()
  })

  // The route is a frame behind a click. The chip goes with it, and the next removal builds on the
  // one before, not on the URL, which still has what that one took out.
  it('takes the chip off at the click and builds each removal on the ones still on their way', async () => {
    const route = '/customers?search=ana&states=acre,bahia,sao-paulo&gender=female'
    const wrapper = await mountChips(route)

    await chipNamed(wrapper, 'Remover filtro Acre').trigger('click')
    expect(useRoute().fullPath).toBe(route)
    expect(removalsOf(wrapper)).toEqual([
      'Remover busca ana',
      'Remover filtro Bahia',
      'Remover filtro São Paulo',
      'Remover filtro Feminino',
    ])
    await chipNamed(wrapper, 'Remover filtro Bahia').trigger('click')
    await chipNamed(wrapper, 'Remover busca ana').trigger('click')
    expect(removalsOf(wrapper)).toEqual(['Remover filtro São Paulo', 'Remover filtro Feminino'])

    await urlIs('/customers?states=sao-paulo&gender=female')
  })

  // A navigation started meanwhile (the breadcrumb, back) cancels the write: the URL keeps the
  // filter, and so does the chip
  it('brings the chip back when the write that took it off is cancelled', async () => {
    const wrapper = await mountChips('/customers?states=bahia')

    await chipNamed(wrapper, 'Remover filtro Bahia').trigger('click')
    expect(wrapper.find(LIST).exists()).toBe(false)
    await useRouter().push('/customers?states=bahia')

    await vi.waitFor(() => {
      expect(removalsOf(wrapper)).toEqual(['Remover filtro Bahia'])
    })
    expect(useRoute().fullPath).toBe('/customers?states=bahia')
  })
})

// The chip that goes away holds the focus, and it would fall to the page
describe('FilterChips focus', () => {
  // The pointer lands on the ✕ inside the button, so the click comes from a child of the chip
  it.each([
    {
      name: 'the next chip when the first one goes',
      removed: 'Remover busca ana',
      focused: 'Remover filtro Bahia',
      url: '/customers?states=bahia&gender=female',
    },
    {
      name: 'the next chip when one in the middle goes',
      removed: 'Remover filtro Bahia',
      focused: 'Remover filtro Feminino',
      url: '/customers?search=ana&gender=female',
    },
    {
      name: 'the previous chip when the last one goes',
      removed: 'Remover filtro Feminino',
      focused: 'Remover filtro Bahia',
      url: '/customers?search=ana&states=bahia',
    },
  ])('goes to $name', async ({ removed, focused, url }) => {
    const wrapper = await mountChips('/customers?search=ana&states=bahia&gender=female')
    const chip = chipNamed(wrapper, removed)
    htmlElement(chip.element).focus()
    expect(focusedName()).toBe(removed)

    await chip.get('svg').trigger('click')
    expect(focusedName()).toBe(focused)

    // The chips that stay are the same elements: the focus is on the one it went to, not on a chip
    // that took its place
    await urlIs(url)
    expect(wrapper.find(`${CHIP}[aria-label="${removed}"]`).exists()).toBe(false)
    expect(focusedName()).toBe(focused)
  })

  // The results stay on the page, and the focus goes there without a scroll (ADR-0022)
  it('goes to the results when the only chip goes', async () => {
    const wrapper = await mountChips('/customers?states=bahia')
    const results = htmlElement(wrapper.get(`#${RESULTS_ID}`).element)
    const focus = vi.spyOn(results, 'focus')
    const chip = chipNamed(wrapper, 'Remover filtro Bahia')
    htmlElement(chip.element).focus()

    await chip.trigger('click')
    expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true })
    expect(document.activeElement).toBe(results)

    await urlIs('/customers')
    expect(wrapper.find(LIST).exists()).toBe(false)
    expect(document.activeElement).toBe(results)
  })
})
