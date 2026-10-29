import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
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
const LIST = '[data-testid="filter-panel__list--div"]'
const SEGMENTS = '[data-testid="filter-panel__segments--div"]'
const CHECK = '[data-testid="filter-panel__check--icon"]'
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
  props: { facets: ICustomerFacets | undefined; variant?: 'aside' | 'sheet' } = { facets },
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

// The labels of a group that have a control in them: a click on the name reaches it
const labelsOf = (wrapper: TWrapper, group: string, control: string) =>
  wrapper
    .get(group)
    .findAll('label')
    .filter((label) => label.find(control).exists())

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

// Every navigation waits at a guard until `letOneGo` lets the oldest one go, and `held` counts the ones
// that got there. Each write waits for a frame of its own in the browser, so one settles while the
// next is still on its way.
function holdNavigationsOneByOne() {
  const gates: (() => void)[] = []
  onTestFinished(
    useRouter().beforeEach(
      () =>
        new Promise<void>((resolve) => {
          gates.push(resolve)
        }),
    ),
  )
  return {
    held: () => gates.length,
    letOneGo: () => {
      gates.shift()?.()
    },
  }
}

const FIVE = ['São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Espírito Santo', 'Bahia']

describe('FilterPanel states', () => {
  it('names the group and lists the five default states in native checkboxes, none picked', async () => {
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
    expect(wrapper.findAll(STATE).map((box) => box.attributes('type'))).toEqual(
      Array.from({ length: 5 }, () => 'checkbox'),
    )
    // A click on the name reaches the box
    expect(labelsOf(wrapper, STATES, STATE)).toHaveLength(5)
    expect(pickedOf(wrapper, STATE)).toEqual([])
  })

  it('lists the picked states outside the five after them, in table order', async () => {
    const wrapper = await mountPanel('/customers?states=tocantins,acre,bahia')

    expect(namesIn(wrapper, STATES)).toEqual([...FIVE, 'Acre', 'Tocantins'])
    expect(pickedOf(wrapper, STATE)).toEqual(['bahia', 'acre', 'tocantins'])
  })

  // A row that stays keeps its element, and the focus in it: the list of picks changes under a reader
  // who is on the last of them when another one goes (back, a link)
  it('keeps the element of a state when another one leaves the list', async () => {
    const wrapper = await mountPanel('/customers?states=acre,tocantins')
    const box = stateBox(wrapper, 'tocantins').element

    await navigateTo('/customers?states=tocantins')
    await vi.waitFor(() => {
      expect(wrapper.find(`${STATE}[value="acre"]`).exists()).toBe(false)
    })

    expect(stateBox(wrapper, 'tocantins').element).toBe(box)
  })

  // The push is the history entry that back takes back (ADR-0007). A pick starts over from page 1 and
  // keeps the page size, an unpick keeps the other picks.
  it.each([
    {
      name: 'pushes the state picked, from page 1, keeping the page size',
      route: '/customers?page=3&perPage=18',
      picked: true,
      query: { perPage: '18', states: 'bahia' },
      url: '/customers?perPage=18&states=bahia',
    },
    {
      name: 'takes a state out when it is unpicked, keeping the others',
      route: '/customers?states=bahia,minas-gerais',
      picked: false,
      query: { states: 'minas-gerais' },
      url: '/customers?states=minas-gerais',
    },
  ])('$name', async ({ route, picked, query, url }) => {
    const wrapper = await mountPanel(route)
    const { push, replace } = spyOnRouter()

    await stateBox(wrapper, 'bahia').setValue(picked)
    await urlIs(url)

    expect(push).toHaveBeenCalledExactlyOnceWith({ path: '/customers', query })
    expect(replace).not.toHaveBeenCalled()
  })

  // The route is a frame behind a pick. A second pick made on what the URL still says would take the
  // first one back. The first pick is cancelled by the second and settles at once, while the second is
  // still on its way: a third one has to build on the second.
  it('builds each pick on the ones still on their way, before the URL has them', async () => {
    const wrapper = await mountPanel()

    await stateBox(wrapper, 'bahia').setValue(true)
    await stateBox(wrapper, 'minas-gerais').setValue(true)
    await flushPromises()
    // The first one, cancelled by the second, leaves the boxes as they are
    expect(pickedOf(wrapper, STATE)).toEqual(['minas-gerais', 'bahia'])
    await stateBox(wrapper, 'espirito-santo').setValue(true)
    await urlIs('/customers?states=bahia,espirito-santo,minas-gerais')
  })

  // The search is another writer, and its write is on its way too (#90): a pick made on the URL's
  // state would cancel it
  it('builds a pick on a write another component made, before the URL has it', async () => {
    const wrapper = await mountPanel()

    void useListQuery().setQuery({ search: 'ana' }, { replace: true })
    await stateBox(wrapper, 'bahia').setValue(true)
    await urlIs('/customers?search=ana&states=bahia')

    expect(pickedOf(wrapper, STATE)).toEqual(['bahia'])
  })

  // Another writer (a chip) takes a filter off: the boxes and the clear button go with it at once, as
  // the chips do, and a click on the box meanwhile picks the state again instead of being undone
  it('shows the write another component made, before the URL has it', async () => {
    const wrapper = await mountPanel('/customers?states=bahia')

    void useListQuery().setQuery({ states: [], page: 1 })
    await nextTick()
    expect(useRoute().fullPath).toBe('/customers?states=bahia')
    expect(pickedOf(wrapper, STATE)).toEqual([])
    expect(wrapper.find(CLEAR).exists()).toBe(false)

    await urlIs('/customers')
    expect(pickedOf(wrapper, STATE)).toEqual([])
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

// A navigation started while the pick is on its way (the breadcrumb, back) cancels it: the URL
// stays as it was, and so must the controls
describe('FilterPanel cancelled pick', () => {
  it('unticks the state again', async () => {
    const wrapper = await mountPanel()

    await stateBox(wrapper, 'bahia').setValue(true)
    await useRouter().push('/customers')
    await flushPromises()

    expect(useRoute().fullPath).toBe('/customers')
    expect(pickedOf(wrapper, STATE)).toEqual([])
  })

  it('picks the gender of the URL again', async () => {
    const wrapper = await mountPanel('/customers?gender=female')

    await genderRadio(wrapper, 'male').setValue()
    await useRouter().push('/customers?gender=female')
    await flushPromises()

    expect(useRoute().fullPath).toBe('/customers?gender=female')
    expect(pickedOf(wrapper, GENDER)).toEqual(['female'])
  })

  // The clear of the page, made in the same frame, cancels the pick and has no states: the URL ends
  // with the states it had, so Vue has no `checked` to write and the box keeps the click
  it('unticks a state picked in the same frame as a clear, once the clear has landed', async () => {
    const wrapper = await mountPanel('/customers?search=ana')

    await stateBox(wrapper, 'bahia').setValue(true)
    void useListQuery().setQuery(
      { search: '', states: [], gender: 'all', page: 1 },
      { replace: true },
    )
    await urlIs('/customers')
    await flushPromises()

    expect(pickedOf(wrapper, STATE)).toEqual([])
  })

  // The search fires after the pick and builds on it: the pick is carried by that write, which back or
  // a link then cancels. While that write is on its way the pick is still on its way with it; once
  // nothing is, the URL does not have the pick.
  it('unticks a state when the write that carried it is cancelled too', async () => {
    const wrapper = await mountPanel()
    const { held, letOneGo } = holdNavigationsOneByOne()

    await stateBox(wrapper, 'bahia').setValue(true)
    await vi.waitFor(() => {
      expect(held()).toBe(1)
    })
    void useListQuery().setQuery({ search: 'ana' }, { replace: true })
    await vi.waitFor(() => {
      expect(held()).toBe(2)
    })
    await useRouter().push('/customers')

    letOneGo()
    await flushPromises()
    expect(pickedOf(wrapper, STATE)).toEqual(['bahia'])

    letOneGo()
    await flushPromises()
    expect(pickedOf(wrapper, STATE)).toEqual([])
    expect(useRoute().fullPath).toBe('/customers')
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
    expect(others.at(0)).toBe('Acre')
    expect(others.at(-1)).toBe('Tocantins')
    expect(others).toEqual([...others].sort((a, b) => a.localeCompare(b, 'pt-BR')))
    const toggle = wrapper.get(TOGGLE)
    expect(toggle.text()).toBe('Ver menos')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    const id = toggle.attributes('aria-controls')
    expect(wrapper.get(`[id="${id ?? ''}"]`).findAll(STATE)).toHaveLength(27)
  })

  it('stays open while states are picked, lists the pick once, and closes with "Ver menos"', async () => {
    const wrapper = await mountPanel()
    await wrapper.get(TOGGLE).trigger('click')

    await stateBox(wrapper, 'acre').setValue(true)
    await urlIs('/customers?states=acre')

    const names = namesIn(wrapper, STATES)
    expect(names).toHaveLength(27)
    expect(new Set(names).size).toBe(27)
    expect(wrapper.get(TOGGLE).text()).toBe('Ver menos')

    await wrapper.get(TOGGLE).trigger('click')
    expect(namesIn(wrapper, STATES)).toEqual([...FIVE, 'Acre'])
    expect(wrapper.get(TOGGLE).text()).toBe('Ver todos (27)')
    expect(wrapper.get(TOGGLE).attributes('aria-expanded')).toBe('false')
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

  it('never dims a picked state, whatever its count', async () => {
    const wrapper = await mountPanel('/customers?states=minas-gerais')

    expect(isDimmed(wrapper, 'minas-gerais')).toBe(false)
    // The count of a picked state is still there, and still zero
    expect(wrapper.get(`label:has(${STATE}[value="minas-gerais"]) ${COUNT_NUMBER}`).text()).toBe(
      '0',
    )
    expect(isDimmed(wrapper, 'espirito-santo')).toBe(true)
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
    expect(labelsOf(wrapper, GENDERS, GENDER)).toHaveLength(3)
    expect(pickedOf(wrapper, GENDER)).toEqual(['all'])
  })

  it.each([
    {
      name: 'pushes the gender picked, from page 1, keeping the rest of the list state',
      route: '/customers?page=2&states=bahia&search=ana',
      before: 'all',
      value: 'female',
      query: { search: 'ana', states: 'bahia', gender: 'female' },
      url: '/customers?search=ana&states=bahia&gender=female',
    },
    {
      name: 'leaves the gender out of the URL when Todos is picked again',
      route: '/customers?gender=male',
      before: 'male',
      value: 'all',
      query: {},
      url: '/customers',
    },
  ])('$name', async ({ route, before, value, query, url }) => {
    const wrapper = await mountPanel(route)
    const { push, replace } = spyOnRouter()
    // What the URL says is what is picked
    expect(pickedOf(wrapper, GENDER)).toEqual([before])

    await genderRadio(wrapper, value).setValue()
    await urlIs(url)

    expect(push).toHaveBeenCalledExactlyOnceWith({ path: '/customers', query })
    expect(replace).not.toHaveBeenCalled()
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
  // would be ignored (ARIA 1.2), so the text is hidden, not labelled (ADR-0013). The five states
  // (São Paulo, Rio de Janeiro, Minas Gerais, Espírito Santo, Bahia) and then Todos, Feminino and
  // Masculino.
  it('shows each number to the eye and hides the phrase a screen reader reads in its place', async () => {
    const wrapper = await mountPanel()
    const counts = wrapper.findAll(COUNT)

    expect(counts.map((count) => count.get(COUNT_NUMBER).text())).toEqual([
      '12',
      '1',
      '0',
      '0',
      '5',
      '21',
      '9',
      '12',
    ])
    expect(counts.map((count) => count.get(COUNT_LABEL).text())).toEqual([
      '12 clientes',
      '1 cliente',
      '0 clientes',
      '0 clientes',
      '5 clientes',
      '21 clientes',
      '9 clientes',
      '12 clientes',
    ])
    for (const count of counts) {
      expect(count.get(COUNT_NUMBER).attributes('aria-hidden')).toBe('true')
      expect(count.get(COUNT_LABEL).classes()).toContain('VisuallyHidden')
    }
  })

  it('shows no count without facets, and dims nothing', async () => {
    const wrapper = await mountPanel('/customers', { facets: undefined })

    expect(wrapper.find(COUNT).exists()).toBe(false)
    expect(namesIn(wrapper, STATES)).toEqual(FIVE)
    expect(namesIn(wrapper, GENDERS)).toEqual(['Todos', 'Feminino', 'Masculino'])
    expect(isDimmed(wrapper, 'minas-gerais')).toBe(false)
  })

  // The BFF lists every state, but a state it does not list has no number to show, not a zero, and
  // nobody to dim it for
  it('shows no count and no dimming for a state the facets do not list', async () => {
    const wrapper = await mountPanel('/customers', {
      facets: { ...facets, states: { bahia: 5 } },
    })
    const states = wrapper.get(STATES)

    expect(states.findAll(COUNT_NUMBER).map((number) => number.text())).toEqual(['5'])
    expect(wrapper.get(GENDERS).findAll(COUNT_NUMBER)).toHaveLength(3)
    expect(isDimmed(wrapper, 'minas-gerais')).toBe(false)
  })
})

describe('FilterPanel clear button', () => {
  it('is not there with no search and no filter, and shows up once one is picked', async () => {
    // The page and the page size are no filter
    const wrapper = await mountPanel('/customers?page=2&perPage=18')
    expect(wrapper.find(CLEAR).exists()).toBe(false)

    await stateBox(wrapper, 'bahia').setValue(true)
    await vi.waitFor(() => {
      expect(wrapper.find(CLEAR).exists()).toBe(true)
    })
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
})

// The sheet (#26) shows the same panel in a dialog: all the states in the list, with no "Ver todos",
// and no clear button, since the sheet has its own. The default, `aside`, is every test above.
describe('FilterPanel sheet variant', () => {
  const mountSheetPanel = (route = '/customers') => mountPanel(route, { facets, variant: 'sheet' })

  it('lists the 27 states at once, as "Ver todos" lists them, with nothing to open', async () => {
    const aside = await mountPanel()
    await aside.get(TOGGLE).trigger('click')
    const wrapper = await mountSheetPanel()

    expect(wrapper.find(TOGGLE).exists()).toBe(false)
    expect(namesIn(wrapper, STATES)).toHaveLength(27)
    expect(namesIn(wrapper, STATES)).toEqual(namesIn(aside, STATES))
  })

  it('has no clear button of its own, whatever is picked', async () => {
    const wrapper = await mountSheetPanel('/customers?search=ana&states=bahia&gender=female')

    expect(wrapper.find(CLEAR).exists()).toBe(false)
  })

  // The row stays, so the focus has nowhere to move from
  it('leaves the focus on a state outside the five that is unpicked', async () => {
    const wrapper = await mountSheetPanel('/customers?states=acre')
    focusOn(stateBox(wrapper, 'acre').element)

    await stateBox(wrapper, 'acre').setValue(false)
    await urlIs('/customers')

    expect(document.activeElement).toBe(stateBox(wrapper, 'acre').element)
  })

  // What the stylesheet of the sheet hangs on (#96). A module class is a hashed name, read here by the
  // name it was written with. happy-dom draws none of it: filterSheet.spec.ts reads the pixels.
  const hasClass = (target: { classes: () => string[] }, name: string) =>
    target.classes().some((className) => className.includes(name))

  it('marks the root of the sheet and no other, and boxes the states and the genders in both', async () => {
    const aside = await mountPanel()
    const wrapper = await mountSheetPanel()

    expect(hasClass(wrapper, 'Sheet')).toBe(true)
    expect(hasClass(aside, 'Sheet')).toBe(false)
    for (const panel of [aside, wrapper]) {
      expect(hasClass(panel.get(LIST), 'States')).toBe(true)
      expect(hasClass(panel.get(SEGMENTS), 'Segments')).toBe(true)
      expect(panel.get(SEGMENTS).findAll('label')).toHaveLength(3)
    }
  })

  it('takes the boxes out of sight with the global class, and keeps the order of the controls', async () => {
    const aside = await mountPanel()
    await aside.get(TOGGLE).trigger('click')
    const wrapper = await mountSheetPanel()
    const boxes = wrapper.findAll('input')

    expect(boxes).toHaveLength(27 + 3)
    for (const box of boxes) {
      expect(box.classes()).toContain('VisuallyHidden')
      expect(hasClass(box, 'Input')).toBe(false)
    }
    for (const box of aside.findAll('input')) {
      expect(box.classes()).not.toContain('VisuallyHidden')
      expect(hasClass(box, 'Input')).toBe(true)
    }
    expect(valuesOf(wrapper, 'input')).toEqual(valuesOf(aside, 'input'))
  })

  it('draws a check on each state, hidden from a screen reader, and nowhere else', async () => {
    const aside = await mountPanel()
    const wrapper = await mountSheetPanel()
    const checks = wrapper.get(STATES).findAll(CHECK)

    expect(checks).toHaveLength(27)
    for (const check of checks) {
      expect(check.attributes()).toMatchObject({
        'aria-hidden': 'true',
        width: '14',
        height: '14',
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '3',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      })
      expect(check.get('path').attributes('d')).toBe('M5 12.5l4.5 4.5L19 7.5')
    }
    expect(wrapper.get(GENDERS).find(CHECK).exists()).toBe(false)
    expect(aside.find(CHECK).exists()).toBe(false)
  })
})
