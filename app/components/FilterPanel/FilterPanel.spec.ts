import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import type { ICustomerFacets } from '#shared/types/customer'
import { BRAZILIAN_STATES } from '#shared/utils/brazilianStates'
import FilterPanel from './FilterPanel.vue'

const STATES = '[data-testid="filter-panel__states--fieldset"]'
const GENDERS = '[data-testid="filter-panel__gender--fieldset"]'
const STATE = '[data-testid="filter-panel__state--checkbox"]'
const GENDER = '[data-testid="filter-panel__gender--radio"]'
const NAME = '[data-testid="filter-panel__name--text"]'
const COUNT = '[data-testid="filter-panel__count--text"]'
const COUNT_LABEL = '[data-testid="filter-panel__count--label"]'
const COUNT_NUMBER = '[data-testid="filter-panel__count--number"]'
const CLEAR = '[data-testid="filter-panel__clear--button"]'
const TOGGLE = '[data-testid="filter-panel__toggle--button"]'

// Every state, as the BFF answers: 0 for the ones nobody is from. `all` is the two genders together.
const facets: ICustomerFacets = {
  states: {
    ...Object.fromEntries(BRAZILIAN_STATES.map(({ slug }) => [slug, 0])),
    'sao-paulo': 12,
    'rio-de-janeiro': 1,
    bahia: 5,
    acre: 3,
  },
  gender: { all: 21, female: 9, male: 12 },
}

enableAutoUnmount(afterEach)

afterEach(() => {
  vi.restoreAllMocks()
})

// In the document, so a control can take focus. The route is the list state the panel starts from.
async function mountPanel(
  route = '/customers',
  props: { facets: ICustomerFacets | undefined } = { facets },
) {
  return mountSuspended(FilterPanel, { route, props, attachTo: document.body })
}

type TWrapper = Awaited<ReturnType<typeof mountPanel>>

const stateBox = (wrapper: TWrapper, slug: string) => wrapper.get(`${STATE}[value="${slug}"]`)
const genderRadio = (wrapper: TWrapper, value: string) => wrapper.get(`${GENDER}[value="${value}"]`)

const isChecked = (element: Element) => element instanceof HTMLInputElement && element.checked

function valuesOf(wrapper: TWrapper, control: string) {
  return wrapper.findAll(control).map((input) => input.attributes('value'))
}

function pickedOf(wrapper: TWrapper, control: string) {
  return wrapper
    .findAll(control)
    .filter(({ element }) => isChecked(element))
    .map((input) => input.attributes('value'))
}

function namesIn(wrapper: TWrapper, group: string) {
  return wrapper
    .get(group)
    .findAll(NAME)
    .map((name) => name.text())
}

const isDimmed = (wrapper: TWrapper, slug: string) =>
  wrapper
    .get(`label:has(${STATE}[value="${slug}"])`)
    .classes()
    .some((name) => name.includes('Dimmed'))

function focusOn(element: Element) {
  if (!(element instanceof HTMLElement)) throw new Error('the element is not an HTML element')
  element.focus()
}

// Both calling through: the router still navigates
function spyOnRouter() {
  const router = useRouter()
  return { push: vi.spyOn(router, 'push'), replace: vi.spyOn(router, 'replace') }
}

const urlIs = (url: string) =>
  vi.waitFor(() => {
    expect(useRoute().fullPath).toBe(url)
  })

const FIVE = ['São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Espírito Santo', 'Bahia']

describe('FilterPanel states', () => {
  it('names the group and lists the five default states, none picked', async () => {
    const wrapper = await mountPanel()

    expect(wrapper.get(`${STATES} legend`).text()).toBe('Por Estado')
    expect(namesIn(wrapper, STATES)).toEqual(FIVE)
    expect(valuesOf(wrapper, STATE)).toEqual([
      'sao-paulo',
      'rio-de-janeiro',
      'minas-gerais',
      'espirito-santo',
      'bahia',
    ])
    expect(pickedOf(wrapper, STATE)).toEqual([])
  })

  it('puts a native checkbox in the label of each state', async () => {
    const wrapper = await mountPanel()
    const box = stateBox(wrapper, 'bahia')

    expect(box.attributes('type')).toBe('checkbox')
    expect(box.element.closest('label')?.textContent).toContain('Bahia')
  })

  it('lists the picked states outside the five after them, in table order', async () => {
    const wrapper = await mountPanel('/customers?states=tocantins,acre,bahia')

    expect(namesIn(wrapper, STATES)).toEqual([...FIVE, 'Acre', 'Tocantins'])
    expect(pickedOf(wrapper, STATE)).toEqual(['bahia', 'acre', 'tocantins'])
  })

  it('does not list a picked default state twice', async () => {
    const wrapper = await mountPanel('/customers?states=bahia')

    expect(namesIn(wrapper, STATES)).toEqual(FIVE)
    expect(pickedOf(wrapper, STATE)).toEqual(['bahia'])
  })

  // The push is the history entry that back takes back (ADR-0007); the page size stays
  it('pushes the state picked, from page 1, keeping the page size', async () => {
    const wrapper = await mountPanel('/customers?page=3&perPage=18')
    const { push, replace } = spyOnRouter()

    await stateBox(wrapper, 'bahia').setValue(true)
    await urlIs('/customers?perPage=18&states=bahia')

    expect(push).toHaveBeenCalledExactlyOnceWith({
      path: '/customers',
      query: { perPage: '18', states: 'bahia' },
    })
    expect(replace).not.toHaveBeenCalled()
  })

  it('takes a state out when it is unpicked, keeping the others', async () => {
    const wrapper = await mountPanel('/customers?states=bahia,minas-gerais')

    await stateBox(wrapper, 'bahia').setValue(false)
    await urlIs('/customers?states=minas-gerais')
  })

  it('writes the states in table order, whatever the order of the picks', async () => {
    const wrapper = await mountPanel('/customers?states=minas-gerais')

    await stateBox(wrapper, 'bahia').setValue(true)
    await urlIs('/customers?states=bahia,minas-gerais')
  })

  // The route is a frame behind a pick. A second pick made on what the URL still says would take the
  // first one back, and the same box picked and unpicked would end up picked.
  it('builds a second pick on the first, before the URL has it', async () => {
    const wrapper = await mountPanel()

    await stateBox(wrapper, 'bahia').setValue(true)
    await stateBox(wrapper, 'minas-gerais').setValue(true)
    await urlIs('/customers?states=bahia,minas-gerais')
  })

  it('unpicks a state picked a moment before, before the URL has it', async () => {
    const wrapper = await mountPanel()

    await stateBox(wrapper, 'bahia').setValue(true)
    await stateBox(wrapper, 'bahia').setValue(false)
    await urlIs('/customers')
  })

  // The first pick is cancelled by the second and settles at once, while the second is still on its
  // way: a third one has to build on the second
  it('keeps building on the picks that are still on their way', async () => {
    const wrapper = await mountPanel()

    await stateBox(wrapper, 'bahia').setValue(true)
    await stateBox(wrapper, 'minas-gerais').setValue(true)
    await flushPromises()
    await stateBox(wrapper, 'espirito-santo').setValue(true)
    await urlIs('/customers?states=bahia,espirito-santo,minas-gerais')
  })

  // What the pick waited for is over: the next one is made on the URL, which may have moved meanwhile
  it('builds on the URL again once a pick has landed', async () => {
    const wrapper = await mountPanel()
    await stateBox(wrapper, 'bahia').setValue(true)
    await urlIs('/customers?states=bahia')

    await navigateTo('/customers?states=acre')
    await stateBox(wrapper, 'minas-gerais').setValue(true)
    await urlIs('/customers?states=acre,minas-gerais')
  })
})

describe('FilterPanel list of all states', () => {
  it('offers the 27 states, closed, and the list it controls holds the boxes', async () => {
    const wrapper = await mountPanel()
    const toggle = wrapper.get(TOGGLE)
    const id = toggle.attributes('aria-controls')

    expect(toggle.text()).toBe('Ver todos (27)')
    expect(toggle.attributes('type')).toBe('button')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(id).toMatch(/\S/)
    expect(wrapper.get(`[id="${id ?? ''}"]`).findAll(STATE)).toHaveLength(5)
  })

  it('lists the other 22 after the five, in alphabetical order, once opened', async () => {
    const wrapper = await mountPanel()

    await wrapper.get(TOGGLE).trigger('click')
    const names = namesIn(wrapper, STATES)
    const others = names.slice(5)

    expect(names.slice(0, 5)).toEqual(FIVE)
    expect(others).toHaveLength(22)
    expect(others.slice(0, 6)).toEqual([
      'Acre',
      'Alagoas',
      'Amapá',
      'Amazonas',
      'Ceará',
      'Distrito Federal',
    ])
    expect(others.at(-1)).toBe('Tocantins')
    expect(others).toEqual([...others].sort((a, b) => a.localeCompare(b, 'pt-BR')))
    const toggle = wrapper.get(TOGGLE)
    expect(toggle.text()).toBe('Ver menos')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    const id = toggle.attributes('aria-controls')
    expect(wrapper.get(`[id="${id ?? ''}"]`).findAll(STATE)).toHaveLength(27)
  })

  it('goes back to the five with "Ver menos"', async () => {
    const wrapper = await mountPanel()
    await wrapper.get(TOGGLE).trigger('click')

    await wrapper.get(TOGGLE).trigger('click')

    expect(namesIn(wrapper, STATES)).toEqual(FIVE)
    expect(wrapper.get(TOGGLE).text()).toBe('Ver todos (27)')
    expect(wrapper.get(TOGGLE).attributes('aria-expanded')).toBe('false')
  })

  it('lists a picked state once, in its place, when opened', async () => {
    const wrapper = await mountPanel('/customers?states=tocantins')
    expect(namesIn(wrapper, STATES)).toEqual([...FIVE, 'Tocantins'])

    await wrapper.get(TOGGLE).trigger('click')

    expect(wrapper.findAll(STATE)).toHaveLength(27)
    expect(pickedOf(wrapper, STATE)).toEqual(['tocantins'])
    expect(namesIn(wrapper, STATES).at(-1)).toBe('Tocantins')
  })

  it('stays open while states are picked, and keeps what was picked when closed', async () => {
    const wrapper = await mountPanel()
    await wrapper.get(TOGGLE).trigger('click')

    await stateBox(wrapper, 'acre').setValue(true)
    await urlIs('/customers?states=acre')

    expect(wrapper.findAll(STATE)).toHaveLength(27)
    expect(wrapper.get(TOGGLE).text()).toBe('Ver menos')
    await wrapper.get(TOGGLE).trigger('click')
    expect(namesIn(wrapper, STATES)).toEqual([...FIVE, 'Acre'])
  })
})

describe('FilterPanel dimmed states', () => {
  it('dims a state nobody is from and no other', async () => {
    const wrapper = await mountPanel()

    expect(isDimmed(wrapper, 'minas-gerais')).toBe(true)
    expect(isDimmed(wrapper, 'espirito-santo')).toBe(true)
    expect(isDimmed(wrapper, 'sao-paulo')).toBe(false)
    // One is still someone
    expect(isDimmed(wrapper, 'rio-de-janeiro')).toBe(false)
    expect(isDimmed(wrapper, 'bahia')).toBe(false)
  })

  it('dims the states nobody is from among all of them, once opened', async () => {
    const wrapper = await mountPanel()

    await wrapper.get(TOGGLE).trigger('click')

    expect(isDimmed(wrapper, 'alagoas')).toBe(true)
    expect(isDimmed(wrapper, 'acre')).toBe(false)
  })

  it('never dims a picked state, whatever its count', async () => {
    const wrapper = await mountPanel('/customers?states=minas-gerais')

    expect(isDimmed(wrapper, 'minas-gerais')).toBe(false)
    // The count of a picked state is still there, and still zero
    expect(wrapper.get(`label:has(${STATE}[value="minas-gerais"]) ${COUNT_NUMBER}`).text()).toBe(
      '0',
    )
    expect(isDimmed(wrapper, 'espirito-santo')).toBe(true)
  })

  it('dims nothing without facets', async () => {
    const wrapper = await mountPanel('/customers', { facets: undefined })

    for (const slug of ['sao-paulo', 'minas-gerais', 'bahia']) {
      expect(isDimmed(wrapper, slug)).toBe(false)
    }
  })

  it('dims nothing the facets do not list', async () => {
    const wrapper = await mountPanel('/customers', {
      facets: { ...facets, states: { bahia: 5 } },
    })

    expect(isDimmed(wrapper, 'minas-gerais')).toBe(false)
  })
})

// A state outside the five is in the short list only while it is picked. Unpicking it takes its row
// away, and the focus would fall to the page: it goes to the toggle, which stays (ADR-0013).
describe('FilterPanel focus', () => {
  it('moves to the toggle when a picked state outside the five is unpicked', async () => {
    const wrapper = await mountPanel('/customers?states=acre')
    focusOn(stateBox(wrapper, 'acre').element)

    await stateBox(wrapper, 'acre').setValue(false)
    expect(document.activeElement).toBe(wrapper.get(TOGGLE).element)

    await urlIs('/customers')
    expect(wrapper.find(`${STATE}[value="acre"]`).exists()).toBe(false)
    expect(document.activeElement).toBe(wrapper.get(TOGGLE).element)
  })

  it('stays on a state of the five that is unpicked', async () => {
    const wrapper = await mountPanel('/customers?states=bahia')
    focusOn(stateBox(wrapper, 'bahia').element)

    await stateBox(wrapper, 'bahia').setValue(false)
    await urlIs('/customers')

    expect(document.activeElement).toBe(stateBox(wrapper, 'bahia').element)
  })

  it('stays on the state when the list is open, where its row stays', async () => {
    const wrapper = await mountPanel('/customers?states=acre')
    await wrapper.get(TOGGLE).trigger('click')
    focusOn(stateBox(wrapper, 'acre').element)

    await stateBox(wrapper, 'acre').setValue(false)
    await urlIs('/customers')

    expect(document.activeElement).toBe(stateBox(wrapper, 'acre').element)
    expect(wrapper.findAll(STATE)).toHaveLength(27)
  })
})

describe('FilterPanel gender', () => {
  it('names the group and offers Todos, Feminino and Masculino, Todos picked', async () => {
    const wrapper = await mountPanel()

    expect(wrapper.get(`${GENDERS} legend`).text()).toBe('Por Gênero')
    expect(namesIn(wrapper, GENDERS)).toEqual(['Todos', 'Feminino', 'Masculino'])
    expect(valuesOf(wrapper, GENDER)).toEqual(['all', 'female', 'male'])
    expect(wrapper.findAll(GENDER).map((radio) => radio.attributes('type'))).toEqual([
      'radio',
      'radio',
      'radio',
    ])
    expect(pickedOf(wrapper, GENDER)).toEqual(['all'])
  })

  it('picks the gender in the URL', async () => {
    const wrapper = await mountPanel('/customers?gender=female')

    expect(pickedOf(wrapper, GENDER)).toEqual(['female'])
  })

  it('pushes the gender picked, from page 1, keeping the rest of the list state', async () => {
    const wrapper = await mountPanel('/customers?page=2&states=bahia&search=ana')
    const { push, replace } = spyOnRouter()

    await genderRadio(wrapper, 'female').setValue()
    await urlIs('/customers?search=ana&states=bahia&gender=female')

    expect(push).toHaveBeenCalledExactlyOnceWith({
      path: '/customers',
      query: { search: 'ana', states: 'bahia', gender: 'female' },
    })
    expect(replace).not.toHaveBeenCalled()
  })

  it('leaves the gender out of the URL when Todos is picked again', async () => {
    const wrapper = await mountPanel('/customers?gender=male')

    await genderRadio(wrapper, 'all').setValue()
    await urlIs('/customers')
  })

  it('builds the gender on the state picked a moment before, before the URL has it', async () => {
    const wrapper = await mountPanel()

    await stateBox(wrapper, 'bahia').setValue(true)
    await genderRadio(wrapper, 'male').setValue()
    await urlIs('/customers?states=bahia&gender=male')
  })

  // A name shared by two panels on the page (the sheet, #26) would make their radios one group. The
  // two are in one app, as on the page: each mount of its own would start the ids over.
  it('gives the radios of one panel a name of their own', async () => {
    const both = defineComponent({
      render: () => h('div', [h(FilterPanel, { facets }), h(FilterPanel, { facets })]),
    })
    const wrapper = await mountSuspended(both, { route: '/customers' })
    const [first, second] = wrapper
      .findAll(GENDERS)
      .map((group) => new Set(group.findAll(GENDER).map((radio) => radio.attributes('name'))))

    expect(first?.size).toBe(1)
    expect(second?.size).toBe(1)
    expect(first).not.toEqual(second)
    expect([...(first ?? [])].join('')).toMatch(/\S/)
  })
})

describe('FilterPanel counts', () => {
  // The bare number is for the eye and the whole phrase for the screen reader: a name on a span
  // would be ignored (ARIA 1.2), so the text is hidden, not labelled (ADR-0013)
  it('shows the number and hides the phrase a screen reader reads in its place', async () => {
    const wrapper = await mountPanel()
    const count = stateBox(wrapper, 'sao-paulo').element.closest('label')
    const label = wrapper.get(`label:has(${STATE}[value="sao-paulo"]) ${COUNT_LABEL}`)
    const number = wrapper.get(`label:has(${STATE}[value="sao-paulo"]) ${COUNT_NUMBER}`)

    expect(count?.textContent).toContain('São Paulo')
    expect(label.text()).toBe('12 clientes')
    expect(label.classes()).toContain('VisuallyHidden')
    expect(number.text()).toBe('12')
    expect(number.attributes('aria-hidden')).toBe('true')
  })

  it('says "1 cliente" for one and "0 clientes" for none', async () => {
    const wrapper = await mountPanel()
    const labelOf = (slug: string) =>
      wrapper.get(`label:has(${STATE}[value="${slug}"]) ${COUNT_LABEL}`).text()

    expect(labelOf('rio-de-janeiro')).toBe('1 cliente')
    expect(labelOf('minas-gerais')).toBe('0 clientes')
  })

  it('counts each gender', async () => {
    const wrapper = await mountPanel()
    const group = wrapper.get(GENDERS)

    expect(group.findAll(COUNT_LABEL).map((label) => label.text())).toEqual([
      '21 clientes',
      '9 clientes',
      '12 clientes',
    ])
    expect(group.findAll(COUNT_NUMBER).map((number) => number.text())).toEqual(['21', '9', '12'])
  })

  it('shows no count without facets', async () => {
    const wrapper = await mountPanel('/customers', { facets: undefined })

    expect(wrapper.find(COUNT).exists()).toBe(false)
    expect(namesIn(wrapper, STATES)).toEqual(FIVE)
    expect(namesIn(wrapper, GENDERS)).toEqual(['Todos', 'Feminino', 'Masculino'])
  })

  // The BFF lists every state, but a state it does not list has no number to show, not a zero
  it('shows no count for a state the facets do not list', async () => {
    const wrapper = await mountPanel('/customers', {
      facets: { ...facets, states: { bahia: 5 } },
    })
    const states = wrapper.get(STATES)

    expect(states.findAll(COUNT_NUMBER).map((number) => number.text())).toEqual(['5'])
    expect(wrapper.get(GENDERS).findAll(COUNT_NUMBER)).toHaveLength(3)
  })
})

describe('FilterPanel clear button', () => {
  it('is not there with no search and no filter', async () => {
    // The page and the page size are no filter
    const wrapper = await mountPanel('/customers?page=2&perPage=18')

    expect(wrapper.find(CLEAR).exists()).toBe(false)
  })

  it.each([
    { name: 'a search', route: '/customers?search=ana' },
    { name: 'a state', route: '/customers?states=bahia' },
    { name: 'a gender', route: '/customers?gender=female' },
  ])('is there with $name alone', async ({ route }) => {
    const wrapper = await mountPanel(route)

    expect(wrapper.get(CLEAR).text()).toBe('Limpar filtros')
    expect(wrapper.get(CLEAR).attributes('type')).toBe('button')
  })

  // The page clears: the search is its to clear, and so is the focus that goes with the button
  it('asks to clear and navigates nowhere by itself', async () => {
    const wrapper = await mountPanel('/customers?states=bahia')
    const { push, replace } = spyOnRouter()

    await wrapper.get(CLEAR).trigger('click')

    expect(wrapper.emitted('clear')).toEqual([[]])
    expect(push).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
  })

  it('shows up once a filter is picked', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find(CLEAR).exists()).toBe(false)

    await stateBox(wrapper, 'bahia').setValue(true)
    await vi.waitFor(() => {
      expect(wrapper.find(CLEAR).exists()).toBe(true)
    })
  })
})
