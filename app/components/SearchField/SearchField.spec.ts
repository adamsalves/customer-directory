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

// The write that is on its way lands: the frame it waits for runs out and the clock stays put, so
// the wait of a key typed meanwhile keeps waiting. The caller says what the URL ends on.
async function landOn(url: string) {
  for (let turn = 0; turn < 50 && useRoute().fullPath !== url; turn++) {
    await flushPromises()
    vi.advanceTimersByTime(0)
  }
  await flushPromises()
}

// A page that is not the list, for as long as the test runs
function addPageOutsideTheList() {
  onTestFinished(useRouter().addRoute({ path: '/elsewhere', component: { render: () => null } }))
}

// The Enter of a field in a form is the submit of the form
function pressEnter(wrapper: TWrapper) {
  const submit = new Event('submit', { bubbles: true, cancelable: true })
  wrapper.get(FORM).element.dispatchEvent(submit)
  return submit
}

const inputOfType = (type: string) => Object.assign(document.createElement('input'), { type })

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
      'aria-keyshortcuts': '/',
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

    const submit = pressEnter(wrapper)

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

  // The key that ends a composition (an IME, a dead key) is not for the field to clear
  it('leaves Escape alone while the reader is composing', async () => {
    const wrapper = await mountField('/customers?search=ana')
    const { replace, push } = spyOnRouter()

    const escape = press('Escape', { isComposing: true }, inputOf(wrapper))
    vi.advanceTimersByTime(300)

    expect(escape.defaultPrevented).toBe(false)
    expect(inputOf(wrapper).value).toBe('ana')
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

  // The clear buttons of the page write the list state without this field, and the search is among
  // what they clear. That write has the search the field sees coming (an empty one) but no keys
  // behind it, so it is not the field's own write coming back, even after the field wrote before.
  it('follows the search that another writer cleared, after the field wrote one', async () => {
    const wrapper = await mountField()
    await wrapper.get(INPUT).setValue('ana')
    vi.advanceTimersByTime(300)
    await urlIs('/customers?search=ana')

    void useListQuery().setQuery({ search: '', page: 1 }, { replace: true })
    await landOn('/customers')

    expect(inputOf(wrapper).value).toBe('')
  })

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
        pressEnter(wrapper)
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

  // The route is a frame behind the field: what lands is the write of "an", and the key typed
  // meanwhile is not the route's to take back. Landing on the list from another page is no reason
  // to drop the wait either: it is that same write.
  it.each(['/customers', '/elsewhere'])(
    'keeps a key typed while its write is on the way, and writes it after, from %s',
    async (path) => {
      addPageOutsideTheList()
      const wrapper = await mountField(path)
      const { replace } = spyOnRouter()

      await wrapper.get(INPUT).setValue('an')
      vi.advanceTimersByTime(300)
      await wrapper.get(INPUT).setValue('ana')
      await landOn('/customers?search=an')

      expect(inputOf(wrapper).value).toBe('ana')
      vi.advanceTimersByTime(300)
      expect(replace).toHaveBeenLastCalledWith({ path: '/customers', query: { search: 'ana' } })
      await urlIs('/customers?search=ana')
    },
  )

  // The write that a newer one replaced settles too, and must not take the place of the newer one
  it('keeps a key typed while a newer write is on the way, after an older one was replaced', async () => {
    const wrapper = await mountField()
    await wrapper.get(INPUT).setValue('an')
    vi.advanceTimersByTime(300)
    await flushPromises()
    await wrapper.get(INPUT).setValue('ana')
    vi.advanceTimersByTime(300)
    await wrapper.get(INPUT).setValue('anab')

    await landOn('/customers?search=ana')

    expect(inputOf(wrapper).value).toBe('anab')
  })

  // The Enter takes the wait of the keys before it, even when the router refuses its write: nothing
  // sends it again when that wait would have run out
  it('does not send again a write that Enter made and the router refused', async () => {
    const wrapper = await mountField()
    const { replace } = spyOnRouter()
    onTestFinished(useRouter().beforeEach(() => false))
    await wrapper.get(INPUT).setValue('ana')

    pressEnter(wrapper)
    await flushPromises()
    vi.advanceTimersByTime(300)

    expect(replace).toHaveBeenCalledOnce()
  })

  // A change from elsewhere to the trimmed text of the field has nothing to take from it
  it('leaves the field as typed when the URL moves to the trimmed text of it', async () => {
    const wrapper = await mountField()
    await wrapper.get(INPUT).setValue('ana ')

    await arriveAt('/customers?search=ana')
    await flushPromises()

    expect(inputOf(wrapper).value).toBe('ana ')
  })

  // The URL does not have the search yet, so what says it is on its way is the field
  it('sends one navigation when Enter comes after the wait wrote the same search', async () => {
    const wrapper = await mountField()
    const { replace } = spyOnRouter()
    await wrapper.get(INPUT).setValue('ana')
    vi.advanceTimersByTime(300)

    pressEnter(wrapper)

    expect(replace).toHaveBeenCalledOnce()
    await landOn('/customers?search=ana')
  })

  // Off the list nothing but the write on its way says the search was sent: a second push would be
  // the same location again
  it('sends one navigation when Enter comes after the wait wrote the same search, from another page', async () => {
    addPageOutsideTheList()
    const wrapper = await mountField('/elsewhere')
    const { push } = spyOnRouter()
    await wrapper.get(INPUT).setValue('ana')
    vi.advanceTimersByTime(300)

    pressEnter(wrapper)

    expect(push).toHaveBeenCalledOnce()
    await landOn('/customers?search=ana')
  })

  // The same goes for going back to the search the URL has: the write on its way would still land
  it('takes back a write on its way when the field goes back to the search of the URL', async () => {
    const wrapper = await mountField('/customers?search=a')
    await wrapper.get(INPUT).setValue('an')
    vi.advanceTimersByTime(300)
    await flushPromises()
    await wrapper.get(INPUT).setValue('a')
    vi.advanceTimersByTime(300)
    for (let turn = 0; turn < 5; turn++) {
      await flushPromises()
      vi.advanceTimersByTime(0)
    }

    expect(useRoute().fullPath).toBe('/customers?search=a')
    expect(inputOf(wrapper).value).toBe('a')
  })

  // A write that never lands, aborted by a guard or replaced by another navigation, leaves nothing
  // behind: a back or forward to its search later is a change from elsewhere like any other
  it.each([
    {
      how: 'aborted',
      stop: async () => {
        const removeGuard = useRouter().beforeEach(() => false)
        onTestFinished(removeGuard)
        vi.advanceTimersByTime(300)
        await flushPromises()
        removeGuard()
      },
    },
    {
      how: 'replaced',
      stop: async () => {
        vi.advanceTimersByTime(300)
        await arriveAt('/customers?search=x')
      },
    },
  ])('follows a search it had written when that write was $how', async ({ stop }) => {
    const wrapper = await mountField()
    await wrapper.get(INPUT).setValue('an')
    await stop()
    await wrapper.get(INPUT).setValue('ana')

    await arriveAt('/customers?search=an')
    await flushPromises()

    expect(inputOf(wrapper).value).toBe('an')
  })

  // Leaving the list takes the wait with it: off the list it would write, and take the reader back
  it('drops the write it was waiting to do when the reader leaves the list', async () => {
    addPageOutsideTheList()
    const wrapper = await mountField()
    await wrapper.get(INPUT).setValue('ana')

    await arriveAt('/elsewhere')
    const { replace, push } = spyOnRouter()
    vi.advanceTimersByTime(300)

    expect(replace).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
    expect(useRoute().fullPath).toBe('/elsewhere')
  })

  // Off the list an empty search has nothing to say, and the reader stays where they are
  it.each([
    {
      how: 'Escape',
      act: (wrapper: TWrapper) => {
        press('Escape', {}, inputOf(wrapper))
      },
    },
    {
      how: 'the clear button',
      act: (wrapper: TWrapper) => {
        void wrapper.get(CLEAR).trigger('click')
      },
    },
    {
      how: 'deleting the text',
      act: (wrapper: TWrapper) => {
        void wrapper.get(INPUT).setValue('')
      },
    },
  ])('stays on another page when the search is emptied with $how', async ({ act }) => {
    addPageOutsideTheList()
    const wrapper = await mountField('/elsewhere?search=ana')
    const { replace, push } = spyOnRouter()

    act(wrapper)
    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(replace).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
    expect(useRoute().fullPath).toBe('/elsewhere?search=ana')
    expect(inputOf(wrapper).value).toBe('')
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
    { name: 'an input of type text', make: () => inputOfType('text') },
    { name: 'an input of type search', make: () => inputOfType('search') },
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

  // There is no text to type in these, and no character a slash could be
  it.each(['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'color', 'file', 'image'])(
    'focuses the field on a slash from an input of type %s',
    async (type) => {
      const wrapper = await mountField()
      const other = document.body.appendChild(inputOfType(type))
      onTestFinished(() => {
        other.remove()
      })

      const slash = press('/', {}, other)

      expect(slash.defaultPrevented).toBe(true)
      expect(document.activeElement).toBe(inputOf(wrapper))
    },
  )

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
