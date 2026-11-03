import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises, type DOMWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import SortSelect from './SortSelect.vue'

const ROOT = '[data-testid="sort-select__root--label"]'
const CAPTION = '[data-testid="sort-select__caption--text"]'
const SELECT = '[data-testid="sort-select__select--select"]'
const CHEVRON = '[data-testid="sort-select__chevron--icon"]'

// The six orders of the prototype, as the select lists them: the value in the URL and what is read
const ORDERS = [
  ['name', 'Nome'],
  ['name-desc', 'Nome (Z–A)'],
  ['last', 'Sobrenome'],
  ['young', 'Mais novos'],
  ['old', 'Mais velhos'],
  ['recent', 'Cadastro mais recente'],
]

type TVariant = 'card' | 'bar'

enableAutoUnmount(afterEach)

afterEach(() => {
  vi.restoreAllMocks()
})

// In the document, so the select can take focus. The route is the list state the select starts from.
const mountSelect = (route = '/customers', variant: TVariant = 'card') =>
  mountSuspended(SortSelect, { route, props: { variant }, attachTo: document.body })

// The page has the control twice, in the bar of the sheet and in the card of the toolbar
const Both = defineComponent({
  render: () => h('div', [h(SortSelect, { variant: 'card' }), h(SortSelect, { variant: 'bar' })]),
})

async function mountBoth(route = '/customers') {
  const wrapper = await mountSuspended(Both, { route, attachTo: document.body })
  const [card, bar] = wrapper.findAll(SELECT)
  if (!card || !bar) throw new Error('the page has two selects')
  return { card, bar }
}

function selectElement({ element }: Pick<DOMWrapper<Element>, 'element'>) {
  if (!(element instanceof HTMLSelectElement)) throw new Error('not a select')
  return element
}

// What Vue drew as the selected option: it writes `selected` as an attribute too. On a first mount
// happy-dom leaves select.value on another option than the one drawn, so a test that reads the value
// reads it after the select was drawn again, or after a pick.
const drawn = (select: Pick<DOMWrapper<Element>, 'findAll'>) =>
  select.findAll('option[selected]').map((option) => option.attributes('value'))

// Both calling through: the router still navigates
function spyOnRouter() {
  const router = useRouter()
  return { push: vi.spyOn(router, 'push'), replace: vi.spyOn(router, 'replace') }
}

const urlIs = (url: string) =>
  vi.waitFor(() => {
    expect(useRoute().fullPath).toBe(url)
  })

// Every navigation waits at a guard until the returned function runs, so a write is still on its way
// when the test looks, as it is for a frame in the browser
function holdNavigations() {
  const { promise, resolve } = Promise.withResolvers<undefined>()
  onTestFinished(useRouter().beforeEach(() => promise))
  return () => {
    resolve(undefined)
  }
}

describe('SortSelect', () => {
  it('lists the six orders of the prototype, in its order', async () => {
    const options = (await mountSelect()).get(SELECT).findAll('option')

    expect(options.map((option) => [option.attributes('value'), option.text()])).toEqual(ORDERS)
  })

  it('is a label that holds the select, with the chevron over it and out of the way of a reader', async () => {
    const wrapper = await mountSelect()
    const root = wrapper.get(ROOT)

    expect(root.element.tagName).toBe('LABEL')
    expect(selectElement(wrapper.get(SELECT)).labels).toHaveLength(1)
    expect(selectElement(wrapper.get(SELECT)).labels[0]).toBe(root.element)
    expect(wrapper.get(CHEVRON).attributes('aria-hidden')).toBe('true')
  })

  // Same control, two captions and two looks: the class is what the stylesheet tells them apart by
  it.each([
    { variant: 'card', caption: 'Ordenar por:', look: 'Card', other: 'Bar' },
    { variant: 'bar', caption: 'Ordenar:', look: 'Bar', other: 'Card' },
  ] as const)(
    'is the $variant, captioned "$caption"',
    async ({ variant, caption, look, other }) => {
      const wrapper = await mountSelect('/customers', variant)
      const classes = wrapper.get(ROOT).classes()

      expect(wrapper.get(CAPTION).text()).toBe(caption)
      expect(classes.some((name) => name.includes(look))).toBe(true)
      expect(classes.some((name) => name.includes(other))).toBe(false)
    },
  )

  // A value that is no order is the default, as everywhere the URL is read
  it.each([
    { route: '/customers', order: 'name' },
    { route: '/customers?sort=old', order: 'old' },
    { route: '/customers?page=3&sort=recent', order: 'recent' },
    { route: '/customers?sort=nope', order: 'name' },
  ])('draws $order as the selected order for $route', async ({ route, order }) => {
    const wrapper = await mountSelect(route)

    expect(drawn(wrapper.get(SELECT))).toEqual([order])
  })
})

describe('SortSelect writing the URL', () => {
  // The order starts the list over from its first page, and is a history entry that back takes back
  // (ADR-0007). The page leaves the URL because page 1 is its default.
  it('pushes the order picked, from page 1', async () => {
    const wrapper = await mountSelect('/customers?page=3&sort=old')
    const { push, replace } = spyOnRouter()

    await wrapper.get(SELECT).setValue('last')
    await urlIs('/customers?sort=last')

    expect(push).toHaveBeenCalledExactlyOnceWith({ path: '/customers', query: { sort: 'last' } })
    expect(replace).not.toHaveBeenCalled()
  })

  it('takes the key out of the URL when the default order is picked again', async () => {
    const wrapper = await mountSelect('/customers?page=3&perPage=18&sort=old')

    await wrapper.get(SELECT).setValue('name')

    await urlIs('/customers?perPage=18')
  })

  // The pick builds on the write that is on its way, not on the URL, which does not have it yet (#90)
  it('keeps a write that is on its way when the order is picked', async () => {
    const wrapper = await mountSelect('/customers?page=3')

    void useListQuery().setQuery({ search: 'ana' }, { replace: true })
    await wrapper.get(SELECT).setValue('last')

    await urlIs('/customers?search=ana&sort=last')
  })

  // The value is read from the DOM, as external data: whatever is not an order is the default
  it('writes the default order for a value that is no order', async () => {
    const wrapper = await mountSelect('/customers?sort=old')
    const select = wrapper.get(SELECT)
    select.element.append(Object.assign(document.createElement('option'), { value: 'nope' }))

    await select.setValue('nope')

    await urlIs('/customers')
  })

  // A change event only reaches the handler from an option when something dispatches it there. The
  // handler pushes at once, so the spy sees it; the second trigger shows the handler is wired.
  it('ignores a change that does not come from the select itself', async () => {
    const wrapper = await mountSelect('/customers?sort=old')
    const { push } = spyOnRouter()

    await wrapper.get(`${SELECT} option[value="last"]`).trigger('change')
    expect(push).not.toHaveBeenCalled()

    await wrapper.get(SELECT).trigger('change')
    expect(push).toHaveBeenCalledOnce()
  })
})

// The select is drawn from the write on its way, so every copy agrees from the pick on; a pick that
// never reaches the URL is drawn back by it, or put back on the URL once nothing is on its way
describe('SortSelect write on its way', () => {
  it('shows the pick in both selects before the URL has it', async () => {
    const { card, bar } = await mountBoth('/customers?sort=old')
    const letGo = holdNavigations()

    await bar.setValue('last')

    expect(useRoute().fullPath).toBe('/customers?sort=old')
    for (const select of [card, bar]) {
      expect(drawn(select)).toEqual(['last'])
      expect(selectElement(select).value).toBe('last')
    }

    letGo()
    await urlIs('/customers?sort=last')
    for (const select of [card, bar]) {
      expect(drawn(select)).toEqual(['last'])
      expect(selectElement(select).value).toBe('last')
    }
  })

  // Back, a link or the breadcrumb navigate while the pick waits for its frame: the URL stays as it
  // was. A push of the URL it has takes the place of the pick on its way, as the page's own writers
  // meet it.
  it('puts both selects back on the URL when another navigation cancels the pick', async () => {
    const { card, bar } = await mountBoth('/customers?sort=old')

    await bar.setValue('last')
    await useRouter().push('/customers?sort=old')
    await flushPromises()

    expect(useRoute().fullPath).toBe('/customers?sort=old')
    for (const select of [card, bar]) {
      expect(drawn(select)).toEqual(['old'])
      expect(selectElement(select).value).toBe('old')
    }
  })

  it('puts both selects back on the URL when a guard aborts the pick', async () => {
    const { card, bar } = await mountBoth('/customers?sort=old')
    onTestFinished(useRouter().beforeEach(() => false))

    await bar.setValue('last')
    await flushPromises()

    expect(useRoute().fullPath).toBe('/customers?sort=old')
    for (const select of [card, bar]) {
      expect(drawn(select)).toEqual(['old'])
      expect(selectElement(select).value).toBe('old')
    }
  })

  // A write made in the same tick as the pick, with the order the URL has, takes the pick back before
  // Vue draws anything from it: the select is drawn as it was, and no render writes the old order back
  // over the click. The select goes back to the URL when nothing is on its way.
  it('puts the select back on the URL when a write made in the same tick takes the pick back', async () => {
    const wrapper = await mountSelect('/customers?sort=old')
    const select = selectElement(wrapper.get(SELECT))

    select.value = 'last'
    select.dispatchEvent(new Event('change'))
    void useListQuery().setQuery({ sort: 'old' })
    await vi.waitFor(() => {
      expect(useListQuery().pending()).toBeUndefined()
    })
    await flushPromises()

    expect(useRoute().fullPath).toBe('/customers?sort=old')
    expect(select.value).toBe('old')
  })

  // The select is put back once nothing is on its way, not while another write still is
  it('keeps the pick while the write that carries it is on its way', async () => {
    const wrapper = await mountSelect('/customers?sort=old')
    const letGo = holdNavigations()

    await wrapper.get(SELECT).setValue('last')
    void useListQuery().setQuery({ search: 'ana' }, { replace: true })
    await flushPromises()
    expect(selectElement(wrapper.get(SELECT)).value).toBe('last')

    letGo()
    await urlIs('/customers?search=ana&sort=last')
    expect(selectElement(wrapper.get(SELECT)).value).toBe('last')
  })
})
