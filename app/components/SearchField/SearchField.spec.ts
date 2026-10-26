import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { MAX_SEARCH_LENGTH } from '#shared/utils/listQuery'
import SearchField from './SearchField.vue'

const FORM = '[data-testid="header__search--form"]'
const INPUT = '[data-testid="header__search--input"]'
const CLEAR = '[data-testid="header__search--clear"]'
const HINT = '[data-testid="header__search--hint"]'

enableAutoUnmount(afterEach)

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

// In the document, so the field can take focus. The route is the list state the field starts from.
// Only the wait is faked (setTimeout and clearTimeout) and only after the mount, which the router
// has to be able to finish.
async function mountField(route = '/customers') {
  const wrapper = await mountSuspended(SearchField, { route, attachTo: document.body })
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  return wrapper
}

type TWrapper = Awaited<ReturnType<typeof mountField>>

function inputOf(wrapper: TWrapper): HTMLInputElement {
  const { element } = wrapper.get(INPUT)
  if (!(element instanceof HTMLInputElement)) throw new Error('the search field is not an input')
  return element
}

// Both calling through: the router still navigates
function spyOnRouter() {
  const router = useRouter()
  return { replace: vi.spyOn(router, 'replace'), push: vi.spyOn(router, 'push') }
}

// Waits for the URL a write ends on. Each check moves the fake clock by 50ms, which also lets the
// router's frame wait run out (see arriveAt), so use it only when no write is still waiting.
const urlIs = (url: string) =>
  vi.waitFor(() => {
    expect(useRoute().fullPath).toBe(url)
  })

// Nuxt makes every navigation wait a frame before it resolves (navigation-repaint): a real animation
// frame and then a timer, which here is the fake one. This runs that timer without moving the clock,
// so a write that is still waiting stays waiting.
async function arriveAt(url: string) {
  const navigation = { done: false }
  void useRouter()
    .push(url)
    .then(() => {
      navigation.done = true
    })
  while (!navigation.done) {
    await flushPromises()
    vi.advanceTimersByTime(0)
  }
}

// A page that is not the list, for as long as the test runs
function addPageOutsideTheList() {
  onTestFinished(useRouter().addRoute({ path: '/elsewhere', component: { render: () => null } }))
}

// A key as the page gets it: it bubbles up to the window, and a handler may cancel it
function press(key: string, init: KeyboardEventInit = {}, target: EventTarget = document.body) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}

describe('SearchField', () => {
  it('is a search landmark with a hidden label, and a field made for searching', async () => {
    const wrapper = await mountField()
    const input = wrapper.get(INPUT)
    const label = wrapper.get('label')

    expect(wrapper.get(FORM).attributes('role')).toBe('search')
    expect(label.text()).toBe('Buscar clientes por nome ou sobrenome')
    expect(input.attributes('id')).toMatch(/\S/)
    expect(label.attributes('for')).toBe(input.attributes('id'))
    expect(input.attributes()).toMatchObject({
      type: 'text',
      inputmode: 'search',
      enterkeyhint: 'search',
      autocomplete: 'off',
      spellcheck: 'false',
      placeholder: 'Buscar aqui',
      maxlength: String(MAX_SEARCH_LENGTH),
    })
  })

  it('shows the shortcut hint on an empty field and the clear button once there is text', async () => {
    const wrapper = await mountField()
    expect(wrapper.find(CLEAR).exists()).toBe(false)
    expect(wrapper.get(HINT).attributes()).toMatchObject({
      'aria-hidden': 'true',
      title: 'Atalho: pressione / para buscar',
    })
    expect(wrapper.get(HINT).text()).toBe('/')

    await wrapper.get(INPUT).setValue('a')

    expect(wrapper.find(HINT).exists()).toBe(false)
    expect(wrapper.get(CLEAR).attributes()).toMatchObject({
      type: 'button',
      'aria-label': 'Limpar busca',
    })
  })

  it('starts with the search of the URL, and the clear button in place of the hint', async () => {
    const wrapper = await mountField('/customers?search=ana')

    expect(inputOf(wrapper).value).toBe('ana')
    expect(wrapper.find(CLEAR).exists()).toBe(true)
    expect(wrapper.find(HINT).exists()).toBe(false)
  })
})

describe('SearchField writing the URL', () => {
  // The wait of the first key would run out at 300ms, but the second key restarts it at 200ms
  it('writes once, 300ms after the last key, from page 1 and with the page size kept', async () => {
    const wrapper = await mountField('/customers?page=3&perPage=18')
    const { replace } = spyOnRouter()

    await wrapper.get(INPUT).setValue('a')
    vi.advanceTimersByTime(200)
    await wrapper.get(INPUT).setValue('an')
    vi.advanceTimersByTime(299)
    expect(replace).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)

    expect(replace).toHaveBeenCalledOnce()
    await urlIs('/customers?perPage=18&search=an')
  })

  it('writes the search trimmed and leaves the field as it was typed', async () => {
    const wrapper = await mountField()

    await wrapper.get(INPUT).setValue(' ana ')
    vi.advanceTimersByTime(300)
    await urlIs('/customers?search=ana')
    // The trimmed draft has come back: the field has no reason to take it
    await flushPromises()

    expect(inputOf(wrapper).value).toBe(' ana ')
  })

  // The wait runs out before the navigation of the Enter is through, so the list still has the old
  // search and a write that was not cancelled would go out a second time
  it('writes at once on Enter, without a second write when the wait runs out', async () => {
    const wrapper = await mountField()
    const { replace } = spyOnRouter()
    await wrapper.get(INPUT).setValue('ana')
    const submit = new Event('submit', { bubbles: true, cancelable: true })

    wrapper.get(FORM).element.dispatchEvent(submit)

    expect(submit.defaultPrevented).toBe(true)
    expect(replace).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(300)
    expect(replace).toHaveBeenCalledOnce()
    await urlIs('/customers?search=ana')
  })

  it('clears the text with Escape and writes at once', async () => {
    const wrapper = await mountField('/customers?search=ana&perPage=18')
    const { replace } = spyOnRouter()

    const escape = press('Escape', {}, inputOf(wrapper))

    expect(escape.defaultPrevented).toBe(true)
    expect(replace).toHaveBeenCalledOnce()
    await urlIs('/customers?perPage=18')
    expect(inputOf(wrapper).value).toBe('')
  })

  // The key is left to whatever else listens for it
  it('leaves Escape alone when the field is empty', async () => {
    const wrapper = await mountField()
    const { replace, push } = spyOnRouter()

    const escape = press('Escape', {}, inputOf(wrapper))
    vi.advanceTimersByTime(300)

    expect(escape.defaultPrevented).toBe(false)
    expect(replace).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })

  it('clears the text with the button, writes at once and gives the focus back to the field', async () => {
    const wrapper = await mountField('/customers?search=ana')
    const { replace } = spyOnRouter()
    expect(document.activeElement).not.toBe(inputOf(wrapper))

    await wrapper.get(CLEAR).trigger('click')

    expect(replace).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(inputOf(wrapper))
    await urlIs('/customers')
    expect(inputOf(wrapper).value).toBe('')
  })

  // Back and forward change the URL under the field. On the list a write left waiting would find
  // nothing to change; off it nothing is skipped, and the write would pull the reader to the list.
  it.each(['/customers', '/elsewhere'])(
    'follows a search that came from the URL on %s and drops the write it was waiting to do',
    async (path) => {
      addPageOutsideTheList()
      const wrapper = await mountField(`${path}?search=ana`)
      await wrapper.get(INPUT).setValue('anab')

      await arriveAt(`${path}?page=2&search=maria`)
      await flushPromises()
      expect(inputOf(wrapper).value).toBe('maria')

      const { replace, push } = spyOnRouter()
      vi.advanceTimersByTime(300)
      expect(replace).not.toHaveBeenCalled()
      expect(push).not.toHaveBeenCalled()
      expect(useRoute().fullPath).toBe(`${path}?page=2&search=maria`)
    },
  )

  it('drops the write it was waiting to do when the field goes away', async () => {
    const wrapper = await mountField()
    const { replace } = spyOnRouter()
    await wrapper.get(INPUT).setValue('ana')

    wrapper.unmount()
    vi.advanceTimersByTime(300)

    expect(replace).not.toHaveBeenCalled()
  })

  // From the detail page (#36) back to the list has to be a step the back button can undo
  it.each([
    { route: '/customers', used: 'replace', unused: 'push' },
    { route: '/elsewhere', used: 'push', unused: 'replace' },
  ] as const)('$used the history entry from $route', async ({ route, used, unused }) => {
    addPageOutsideTheList()
    const wrapper = await mountField(route)
    const spies = spyOnRouter()

    await wrapper.get(INPUT).setValue('ana')
    vi.advanceTimersByTime(300)

    expect(spies[used]).toHaveBeenCalledOnce()
    expect(spies[unused]).not.toHaveBeenCalled()
    await urlIs('/customers?search=ana')
  })

  // The same search is not a new one: it keeps its page and writes nothing. A write would look like
  // a page change to the results scroll, which takes the focus off the field.
  it.each([
    {
      how: 'the wait running out',
      act: () => {
        vi.advanceTimersByTime(300)
      },
    },
    {
      how: 'Enter',
      act: (wrapper: TWrapper) => {
        const submit = new Event('submit', { bubbles: true, cancelable: true })
        wrapper.get(FORM).element.dispatchEvent(submit)
      },
    },
  ])('keeps page 2 of the same search when a space is added, on $how', async ({ act }) => {
    const wrapper = await mountField('/customers?search=e&page=2')
    const { replace, push } = spyOnRouter()

    await wrapper.get(INPUT).setValue('e ')
    act(wrapper)
    await flushPromises()

    expect(replace).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
    expect(useRoute().fullPath).toBe('/customers?search=e&page=2')
  })

  // The skip is for the list: from another page the same search is how the reader gets back to it
  it('goes from another page to the list with the same search, on its page', async () => {
    addPageOutsideTheList()
    const wrapper = await mountField('/elsewhere?search=e&page=2')
    const { push } = spyOnRouter()

    await wrapper.get(INPUT).setValue('e ')
    vi.advanceTimersByTime(300)

    expect(push).toHaveBeenCalledOnce()
    await urlIs('/customers?page=2&search=e')
  })
})

describe('SearchField "/" shortcut', () => {
  it('focuses the field, and the slash is not typed into it', async () => {
    const wrapper = await mountField()

    const slash = press('/')

    expect(document.activeElement).toBe(inputOf(wrapper))
    expect(slash.defaultPrevented).toBe(true)
  })

  it.each([
    { name: 'an input', make: () => document.createElement('input') },
    { name: 'a textarea', make: () => document.createElement('textarea') },
    { name: 'a select', make: () => document.createElement('select') },
    {
      name: 'an editable element',
      make: () => Object.assign(document.createElement('div'), { contentEditable: 'true' }),
    },
  ])('leaves the slash to $name', async ({ make }) => {
    const wrapper = await mountField()
    const other = document.body.appendChild(make())
    onTestFinished(() => {
      other.remove()
    })

    const slash = press('/', {}, other)

    expect(slash.defaultPrevented).toBe(false)
    expect(document.activeElement).not.toBe(inputOf(wrapper))
  })

  it.each([
    { name: 'Ctrl', init: { ctrlKey: true } },
    { name: 'Meta', init: { metaKey: true } },
    { name: 'Alt', init: { altKey: true } },
  ])('leaves the slash to the browser with $name', async ({ init }) => {
    const wrapper = await mountField()

    const slash = press('/', init)

    expect(slash.defaultPrevented).toBe(false)
    expect(document.activeElement).not.toBe(inputOf(wrapper))
  })

  it('leaves every other key alone', async () => {
    const wrapper = await mountField()

    const key = press('a')

    expect(key.defaultPrevented).toBe(false)
    expect(document.activeElement).not.toBe(inputOf(wrapper))
  })

  it('stops listening when the field goes away', async () => {
    const wrapper = await mountField()

    wrapper.unmount()

    expect(press('/').defaultPrevented).toBe(false)
  })
})
