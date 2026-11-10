import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises, type DOMWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { nextTick } from 'vue'
import PaginationNav from './PaginationNav.vue'

const FULL = '[data-testid="pagination__full--list"]'
const COMPACT = '[data-testid="pagination__compact--list"]'
const PAGE_LINK = '[data-testid="pagination__page--link"]'
const PREV_LINK = '[data-testid="pagination__prev--link"]'
const PREV_INACTIVE = '[data-testid="pagination__prev--text"]'
const NEXT_LINK = '[data-testid="pagination__next--link"]'
const NEXT_INACTIVE = '[data-testid="pagination__next--text"]'
const SELECT = '[data-testid="pagination__per-page--select"]'
const ITEM = '[data-testid="pagination__page--item"]'
const CURRENT_LABEL = '[data-testid="pagination__current--label"]'
const CURRENT_NUMBER = '[data-testid="pagination__current--number"]'

// What the select holds, as the tests of the other selects read it: the value is DOM state
function selectElement({ element }: Pick<DOMWrapper<Element>, 'element'>) {
  if (!(element instanceof HTMLSelectElement)) throw new Error('not a select')
  return element
}

// The route sets the page size the links keep and the base the query-only links resolve against
const mountNav = (page: number, totalPages: number, route = '/customers', attachTo?: HTMLElement) =>
  mountSuspended(PaginationNav, { props: { page, totalPages, loading: false }, route, attachTo })

enableAutoUnmount(afterEach)

// CSS shows one of the two lists per width (ADR-0014); happy-dom applies no media query, so which
// one is visible is covered by the E2E in tests/e2e/customerList.spec.ts
describe('PaginationNav', () => {
  it('labels the navigation landmark', async () => {
    const nav = (await mountNav(3, 8)).get('[data-testid="pagination__root--nav"]')

    expect(nav.element.tagName).toBe('NAV')
    expect(nav.attributes('aria-label')).toBe('Paginação')
  })

  // mountSuspended stubs RouterLink, so the exact-active aria-current of the links is covered in
  // tests/e2e
  it('marks the current page, once per list, as a span with aria-current', async () => {
    const wrapper = await mountNav(3, 8)

    for (const selector of [FULL, COMPACT]) {
      const list = wrapper.get(selector)
      expect(list.findAll('[aria-current]')).toHaveLength(1)
      const current = list.get('[aria-current]')

      expect(current.element.tagName).toBe('SPAN')
      expect(current.attributes('aria-current')).toBe('page')
      // ARIA 1.2 bars a name on a span: the reader gets hidden text, and not the number twice
      expect(current.attributes('aria-label')).toBeUndefined()
      expect(current.get(CURRENT_LABEL).text()).toBe('Página 3, atual')
      expect(current.get(CURRENT_LABEL).classes()).toContain('VisuallyHidden')
      expect(current.get(CURRENT_NUMBER).text()).toBe('3')
      expect(current.get(CURRENT_NUMBER).attributes('aria-hidden')).toBe('true')
    }
  })

  it('links the other pages by query, keeping the page size and the order and leaving page 1 out', async () => {
    const wrapper = await mountNav(3, 8, '/customers?page=3&perPage=18&sort=old')
    const links = wrapper.get(FULL).findAll(PAGE_LINK)

    expect(links.map((link) => [link.attributes('aria-label'), link.attributes('href')])).toEqual([
      ['Página 1', '/customers?perPage=18&sort=old'],
      ['Página 2', '/customers?page=2&perPage=18&sort=old'],
      ['Página 4', '/customers?page=4&perPage=18&sort=old'],
      ['Página 8', '/customers?page=8&perPage=18&sort=old'],
    ])
  })

  // The write still on its way is where the list state goes on from: a click on a link while it is
  // on its way cancels it, and the page that lands has to carry what it was writing (#90)
  it.each([
    {
      name: 'a state picked',
      write: () => {
        void useListQuery().setQuery({ states: ['bahia'], page: 1 })
      },
      landsOn: '/customers?states=bahia',
      href: '/customers?page=2&states=bahia',
    },
    {
      name: 'a page size chosen',
      write: (wrapper: Awaited<ReturnType<typeof mountNav>>) => wrapper.get(SELECT).setValue('27'),
      landsOn: '/customers?perPage=27',
      href: '/customers?page=2&perPage=27',
    },
  ])('links page 2 with $name that the URL does not have yet', async ({ write, landsOn, href }) => {
    const wrapper = await mountNav(1, 8)

    await write(wrapper)
    await nextTick()

    expect(wrapper.get(`${FULL} ${PAGE_LINK}[aria-label="Página 2"]`).attributes('href')).toBe(href)
    // Let the write land, so it is not on its way in the next test
    await vi.waitFor(() => {
      expect(useRoute().fullPath).toBe(landsOn)
    })
  })

  it('leaves the default page size out too', async () => {
    const wrapper = await mountNav(3, 8, '/customers?page=3')

    expect(wrapper.get(FULL).get(PAGE_LINK).attributes('href')).toBe('/customers')
  })

  it('links the arrows to the previous and the next page', async () => {
    const wrapper = await mountNav(3, 8, '/customers?page=3&perPage=27&sort=old')

    expect(wrapper.get(PREV_LINK).attributes()).toMatchObject({
      'aria-label': 'Página anterior',
      href: '/customers?page=2&perPage=27&sort=old',
    })
    expect(wrapper.get(NEXT_LINK).attributes()).toMatchObject({
      'aria-label': 'Próxima página',
      href: '/customers?page=4&perPage=27&sort=old',
    })
  })

  it.each([
    { page: 1, totalPages: 8, prev: false, next: true },
    { page: 4, totalPages: 8, prev: true, next: true },
    { page: 8, totalPages: 8, prev: true, next: false },
    { page: 1, totalPages: 1, prev: false, next: false },
  ])(
    'page $page of $totalPages: previous arrow is a link $prev, next arrow is a link $next',
    async ({ page, totalPages, prev, next }) => {
      const wrapper = await mountNav(page, totalPages)

      expect(wrapper.find(PREV_LINK).exists()).toBe(prev)
      expect(wrapper.find(NEXT_LINK).exists()).toBe(next)
      expect(wrapper.find(PREV_INACTIVE).exists()).toBe(!prev)
      expect(wrapper.find(NEXT_INACTIVE).exists()).toBe(!next)
      // What is not a link is a span out of the accessibility tree
      for (const inactive of [wrapper.find(PREV_INACTIVE), wrapper.find(NEXT_INACTIVE)]) {
        if (inactive.exists()) {
          expect(inactive.element.tagName).toBe('SPAN')
          expect(inactive.attributes('aria-hidden')).toBe('true')
        }
      }
    },
  )

  it('renders the full and the compact list, with the ellipses hidden', async () => {
    const wrapper = await mountNav(11, 22)
    // What a sighted reader sees: the hidden label of the current page is not one of the items
    const texts = (list: string) =>
      wrapper
        .get(list)
        .findAll(ITEM)
        .map((item) =>
          (item.find(CURRENT_NUMBER).exists() ? item.get(CURRENT_NUMBER) : item).text(),
        )
    const gaps = wrapper.findAll(ITEM).filter((item) => item.text() === '…')

    expect(texts(FULL)).toEqual(['1', '…', '10', '11', '12', '…', '22'])
    expect(texts(COMPACT)).toEqual(['1', '…', '11', '…', '22'])
    expect(gaps).toHaveLength(4)
    // The ellipses leave the accessibility tree, with their list item, and nothing else does
    expect(wrapper.findAll(`${ITEM}[aria-hidden="true"]`)).toHaveLength(gaps.length)
    for (const gap of gaps) expect(gap.attributes('aria-hidden')).toBe('true')
  })

  it('labels the page size select and selects the size in the URL', async () => {
    const wrapper = await mountNav(2, 8, '/customers?page=2&perPage=27')
    const label = wrapper.get('[data-testid="pagination__per-page--label"]')
    const select = wrapper.get(SELECT)
    const options = select.findAll('option')

    expect(label.text()).toBe('Itens por página')
    expect(label.attributes('for')).toMatch(/\S/)
    expect(select.attributes('id')).toBe(label.attributes('for'))
    expect(options.map((option) => option.text())).toEqual(['9', '18', '27', '54'])
    // happy-dom keeps select.value out of step with the selected prop, but writes it as an attribute
    const selected = options.filter((option) => option.attributes('selected') !== undefined)
    expect(selected.map((option) => option.text())).toEqual(['27'])
  })

  it('goes back to page 1 with the new page size, keeping the order', async () => {
    const wrapper = await mountNav(3, 8, '/customers?page=3&perPage=18&sort=old')

    await wrapper.get(SELECT).setValue('27')

    await vi.waitFor(() => {
      expect(useRoute().fullPath).toBe('/customers?perPage=27&sort=old')
    })
  })

  // The page size is a write like any other: it keeps what is still on its way to the URL (#90)
  it('keeps a write that is on its way when the page size changes', async () => {
    const wrapper = await mountNav(3, 8, '/customers?page=3')

    void useListQuery().setQuery({ search: 'ana' }, { replace: true })
    await wrapper.get(SELECT).setValue('27')

    await vi.waitFor(() => {
      expect(useRoute().fullPath).toBe('/customers?perPage=27&search=ana')
    })
  })

  // A change event only reaches the handler from an option when something dispatches it there.
  // The handler pushes at once, so the spy sees it; the second trigger shows the handler is wired.
  it('ignores a change that does not come from the select itself', async () => {
    const wrapper = await mountNav(3, 8, '/customers?page=3')
    const push = vi.spyOn(useRouter(), 'push')
    onTestFinished(() => {
      push.mockRestore()
    })

    await wrapper.get(`${SELECT} option[value="54"]`).trigger('change')
    expect(push).not.toHaveBeenCalled()

    await wrapper.get(SELECT).trigger('change')
    expect(push).toHaveBeenCalledOnce()
  })
})

// The arrows of the keyboard arm a traverse of the page sizes: its first change pushes the entry,
// and the armed changes after it rewrite that entry once the write before them has landed, so one
// traverse costs one entry in the history. The mouse is not part of it, and the traverse comes
// apart on blur, on a press on the select and on Escape and Enter. Every navigation waits for its
// frame before landing (navigation-repaint), so these waits are real ones — one flushPromises
// pumps nothing.
describe('PaginationNav armed by the arrows', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  const urlIs = (url: string) =>
    vi.waitFor(() => {
      expect(useRoute().fullPath).toBe(url)
    })

  // The next write of the list waits at the guard until the test lets it: the change that follows
  // it moves the select on while the write is still on its way, which is the gap a render of a real
  // burst has between two of its writes (ADR-0023)
  function holdTheWrite() {
    let abort = false
    const { promise, resolve } = Promise.withResolvers<undefined>()
    onTestFinished(
      useRouter().beforeEach((to) => {
        if (abort || to.path !== LIST_PATH) return
        abort = true
        onTestFinished(resolve)
        return promise
      }),
    )
    return () => {
      resolve(undefined)
    }
  }

  // A page that is not the list, for as long as the test runs (as in SearchField.spec.ts)
  function addPageOutsideTheList() {
    onTestFinished(useRouter().addRoute({ path: '/elsewhere', component: { render: () => null } }))
  }

  // Both calling through: the router still navigates
  function spyOnRouter() {
    const router = useRouter()
    return { push: vi.spyOn(router, 'push'), replace: vi.spyOn(router, 'replace') }
  }

  it('makes the second armed change rewrite the entry the first one pushed', async () => {
    const wrapper = await mountNav(3, 8, '/customers?page=3&perPage=18')
    const { push, replace } = spyOnRouter()
    const select = wrapper.get(SELECT)

    await select.trigger('keydown', { key: 'ArrowDown' })
    await select.setValue('27')
    await select.setValue('54')
    await urlIs('/customers?perPage=54')

    expect(push).toHaveBeenCalledExactlyOnceWith({ path: '/customers', query: { perPage: '27' } })
    expect(replace).toHaveBeenCalledExactlyOnceWith({
      path: '/customers',
      query: { perPage: '54' },
    })
  })

  // The burst lines its writes up without one racing the other, and it ends on the last arrow: its
  // page size is the one landed, and page 1 stays out of the URL (it is the default again)
  it('keeps one push and lands on the last page size through a burst of armed changes', async () => {
    const wrapper = await mountNav(3, 8, '/customers?page=3&perPage=18')
    const { push, replace } = spyOnRouter()
    const select = wrapper.get(SELECT)

    await select.trigger('keydown', { key: 'ArrowDown' })
    await select.setValue('27')
    await select.setValue('54')
    await select.setValue('18')
    await urlIs('/customers?perPage=18')

    expect(push).toHaveBeenCalledExactlyOnceWith({ path: '/customers', query: { perPage: '27' } })
    expect(replace).toHaveBeenCalledTimes(2)
    expect(replace).toHaveBeenNthCalledWith(1, {
      path: '/customers',
      query: { perPage: '54' },
    })
    expect(replace).toHaveBeenNthCalledWith(2, {
      path: '/customers',
      query: { perPage: '18' },
    })
  })

  // A write another one cancelled (or a guard aborted) left no entry of the traverse behind: the
  // armed change after it pushes, so it does not take the place of the entry the other is adding.
  // Its anchor goes with the failed write too: in the document, a loading toggle must not correct
  it('pushes again when the write before it did not land, dropping the anchor', async () => {
    const scrollBy = vi.fn()
    vi.stubGlobal('scrollBy', scrollBy)
    const wrapper = await mountNav(3, 8, '/customers?page=3&perPage=18', document.body)
    const { push, replace } = spyOnRouter()
    const select = wrapper.get(SELECT)
    let aborted = true
    onTestFinished(
      useRouter().beforeEach(() => {
        if (!aborted) return
        aborted = false
        return false
      }),
    )

    await select.trigger('keydown', { key: 'ArrowDown' })
    await select.setValue('27')
    await vi.waitFor(() => {
      expect(useListQuery().pending()).toBeUndefined()
    })
    expect(useRoute().fullPath).toBe('/customers?page=3&perPage=18')

    // A loading after it would correct an anchored select in this frame, one does not
    await wrapper.setProps({ loading: true })
    await new Promise((resolve) => requestAnimationFrame(resolve))
    expect(scrollBy).not.toHaveBeenCalled()

    await select.setValue('54')
    await urlIs('/customers?perPage=54')

    expect(push).toHaveBeenCalledTimes(2)
    expect(push).toHaveBeenNthCalledWith(2, { path: '/customers', query: { perPage: '54' } })
    expect(replace).not.toHaveBeenCalled()
  })

  it.each([
    { ends: 'blur' },
    { ends: 'mousedown' },
    { ends: 'Escape' },
    { ends: 'Enter' },
  ] as const)('pushes again once $ends ends the traverse', async ({ ends }) => {
    const wrapper = await mountNav(3, 8, '/customers?page=3&perPage=18')
    const { push, replace } = spyOnRouter()
    const select = wrapper.get(SELECT)

    await select.trigger('keydown', { key: 'ArrowDown' })
    await select.setValue('54')
    await urlIs('/customers?perPage=54')

    if (ends === 'Escape' || ends === 'Enter') await select.trigger('keydown', { key: ends })
    else await select.trigger(ends)

    await select.setValue('27')
    await select.setValue('9')
    await urlIs('/customers')

    // The changes after the disarm are not from the traverse: each one pushed
    expect(push).toHaveBeenCalledTimes(3)
    expect(push).toHaveBeenNthCalledWith(3, { path: '/customers', query: {} })
    expect(replace).not.toHaveBeenCalled()

    // Armed again: the first change of a new traverse pushes, it does not rewrite the last entry
    await select.trigger('keydown', { key: 'ArrowUp' })
    await select.setValue('18')
    await urlIs('/customers?perPage=18')

    expect(push).toHaveBeenCalledTimes(4)
    expect(push).toHaveBeenNthCalledWith(4, { path: '/customers', query: { perPage: '18' } })
    expect(replace).not.toHaveBeenCalled()
  })

  // The writes of the burst are one behind the other, and a render between two of them reads the
  // write that is on its way, whose page size is one step behind what the arrows already moved the
  // select to (the mark of ADR-0023). Drawing that size back into the select would drag the select
  // behind the arrows, and the next arrow would step from the dragged one
  it('keeps the select on the last armed change when a render runs between two writes', async () => {
    const wrapper = await mountNav(3, 8, '/customers?page=3&perPage=18')
    const letGo = holdTheWrite()
    const select = wrapper.get(SELECT)

    await select.trigger('keydown', { key: 'ArrowDown' })
    await select.setValue('27')
    await select.setValue('54')
    // Whatever write of the list comes in (the filters, the search) puts the render to work
    // between the two steps: the arrows have already said 54, so the render draws from the mark,
    // and the select stays where the arrows put it
    void useListQuery().setQuery({ search: 'ana' }, { replace: true })
    await nextTick()

    // What the render drew at this tick: the happy-dom value the reader has may hide it, so the
    // option the render says is the drawn one
    const chosen = select.findAll('option[selected]').map((option) => option.attributes('value'))
    expect(chosen).toEqual(['54'])
    expect(selectElement(select).value).toBe('54')

    letGo()
    // The burst's own last armed change rides on the write that was on its way (ADR-0023)
    await urlIs('/customers?perPage=54&search=ana')
  })

  // A card clicked while the burst was mid-write makes the reader leave the list, and the last
  // navigation to start is the only one that wins (ADR-0023): the steps the chain still owed would
  // start last and take the reader back, so they drop where they are, without a write
  it('drops the steps the chain owed once the reader is off the list', async () => {
    addPageOutsideTheList()
    const wrapper = await mountNav(3, 8, '/customers?page=3&perPage=18')
    const { push, replace } = spyOnRouter()
    const select = wrapper.get(SELECT)
    const letGo = holdTheWrite()

    await select.trigger('keydown', { key: 'ArrowDown' })
    await select.setValue('27')
    // The step waits behind the write that is held: it is still owed while the reader goes
    await select.setValue('54')

    // The reader follows a card (any navigation off the list): the guard of the test holds the
    // writes of the list only, so this navigation goes
    await useRouter().push('/elsewhere')
    expect(useRoute().fullPath).toBe('/elsewhere')

    // From here the chain only has steps behind: releasing the write lets the step start, and it
    // finds no list to serve — nothing it would do may take the reader back
    push.mockClear()
    replace.mockClear()
    letGo()
    await vi.waitFor(() => {
      expect(useListQuery().pending()).toBeUndefined()
    })
    await flushPromises()

    expect(push).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
    expect(useRoute().fullPath).toBe('/elsewhere')
  })
})

// The nav is told when the page waits for an answer (loading) and puts the select back where it was
// each time the list above it changes height. happy-dom has no layout: the select reports the `top`
// the test sets and scrollBy moves it as the browser would. Where the select really ends up is
// covered by the E2E in tests/e2e/customerList.spec.ts
describe('PaginationNav select anchoring', () => {
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
  const scrollBy = vi.fn((_left: number, distance: number) => {
    top -= distance
  })
  let top = 0

  beforeEach(() => {
    top = 100
    scrollBy.mockClear()
    vi.stubGlobal('scrollBy', scrollBy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // In the document: the correction skips a select that is no longer there
  async function mountWithSelectAtTop() {
    const wrapper = await mountNav(3, 8, '/customers?page=3', document.body)
    vi.spyOn(wrapper.get(SELECT).element, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(0, top, 100, 30),
    )
    return wrapper
  }

  // The list above the select grows, then the answer arrives
  async function loadAfterGrowing(wrapper: Awaited<ReturnType<typeof mountWithSelectAtTop>>) {
    top += 300
    await wrapper.setProps({ loading: true })
    await frame()
    await wrapper.setProps({ loading: false })
    await frame()
  }

  it('puts the select back at the skeleton and at the new list, then forgets it', async () => {
    const wrapper = await mountWithSelectAtTop()
    await wrapper.get(SELECT).setValue('27')

    // The skeleton has 9 cards, more than the last page had
    top += 200
    await wrapper.setProps({ loading: true })
    // A frame later, after the browser's own anchoring has had its say
    expect(scrollBy).not.toHaveBeenCalled()
    await frame()
    expect(scrollBy.mock.calls).toEqual([[0, 200]])

    top += 90
    await wrapper.setProps({ loading: false })
    await frame()
    expect(scrollBy.mock.calls).toEqual([
      [0, 200],
      [0, 90],
    ])
    expect(top).toBe(100)

    // The next load, which no page size change started, leaves the page alone
    await loadAfterGrowing(wrapper)
    expect(scrollBy).toHaveBeenCalledTimes(2)
  })

  // Chromium anchors in the frame cycle, after the watcher has run: measuring then adds nothing
  it('adds nothing to what the browser anchored by itself before the frame', async () => {
    const wrapper = await mountWithSelectAtTop()
    await wrapper.get(SELECT).setValue('27')

    top += 200
    await wrapper.setProps({ loading: true })
    top -= 200
    await frame()

    expect(scrollBy.mock.calls).toEqual([[0, 0]])
  })

  // Going back to the original top would undo the reader's own scroll
  it.each(['wheel', 'touchmove', 'pointerdown', 'keydown'])(
    'lets a %s from the reader during the load win',
    async (type) => {
      const wrapper = await mountWithSelectAtTop()
      await wrapper.get(SELECT).setValue('27')

      window.dispatchEvent(new Event(type))
      await loadAfterGrowing(wrapper)

      expect(scrollBy).not.toHaveBeenCalled()
    },
  )

  // The answer failed and the page took the nav away before the frame
  it('leaves the page alone when the nav is gone before the frame', async () => {
    const wrapper = await mountWithSelectAtTop()
    await wrapper.get(SELECT).setValue('27')

    top += 200
    await wrapper.setProps({ loading: true })
    wrapper.unmount()
    await frame()

    expect(scrollBy).not.toHaveBeenCalled()
  })

  it('leaves the page alone when the page size did not change', async () => {
    await loadAfterGrowing(await mountWithSelectAtTop())

    expect(scrollBy).not.toHaveBeenCalled()
  })

  // The clear of the page, made in the same frame as the page size, cancels the write of the select
  // but builds on it: the list that loads is the one with the page size the select asked for
  it('keeps the select when a write made in the same frame carries the page size', async () => {
    const wrapper = await mountWithSelectAtTop()
    await wrapper.get(SELECT).setValue('27')
    void useListQuery().setQuery(
      { search: '', states: [], gender: 'all', page: 1 },
      { replace: true },
    )
    await vi.waitFor(() => {
      expect(useRoute().fullPath).toBe('/customers?perPage=27')
    })

    top += 200
    await wrapper.setProps({ loading: true })
    await frame()

    expect(scrollBy.mock.calls).toEqual([[0, 200]])
  })

  it('forgets the select when the navigation did not happen', async () => {
    const wrapper = await mountWithSelectAtTop()
    const removeGuard = useRouter().beforeEach(() => false)
    onTestFinished(removeGuard)

    await wrapper.get(SELECT).setValue('27')
    await flushPromises()
    expect(useRoute().fullPath).toBe('/customers?page=3')
    await loadAfterGrowing(wrapper)

    expect(scrollBy).not.toHaveBeenCalled()
  })
})
