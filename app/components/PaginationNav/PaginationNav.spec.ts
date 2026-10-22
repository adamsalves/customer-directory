import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
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
      expect(
        current
          .get(CURRENT_LABEL)
          .classes()
          .some((name) => name.includes('VisuallyHidden')),
      ).toBe(true)
      expect(current.get(CURRENT_NUMBER).text()).toBe('3')
      expect(current.get(CURRENT_NUMBER).attributes('aria-hidden')).toBe('true')
    }
  })

  it('links the other pages by query, keeping the page size and leaving page 1 out', async () => {
    const wrapper = await mountNav(3, 8, '/customers?page=3&perPage=18')
    const links = wrapper.get(FULL).findAll(PAGE_LINK)

    expect(links.map((link) => [link.attributes('aria-label'), link.attributes('href')])).toEqual([
      ['Página 1', '/customers?perPage=18'],
      ['Página 2', '/customers?page=2&perPage=18'],
      ['Página 4', '/customers?page=4&perPage=18'],
      ['Página 8', '/customers?page=8&perPage=18'],
    ])
  })

  it('leaves the default page size out too', async () => {
    const wrapper = await mountNav(3, 8, '/customers?page=3')

    expect(wrapper.get(FULL).get(PAGE_LINK).attributes('href')).toBe('/customers')
  })

  it('links the arrows to the previous and the next page', async () => {
    const wrapper = await mountNav(3, 8, '/customers?page=3&perPage=27')

    expect(wrapper.get(PREV_LINK).attributes()).toMatchObject({
      'aria-label': 'Página anterior',
      href: '/customers?page=2&perPage=27',
    })
    expect(wrapper.get(NEXT_LINK).attributes()).toMatchObject({
      'aria-label': 'Próxima página',
      href: '/customers?page=4&perPage=27',
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

  it('goes back to page 1 with the new page size', async () => {
    const wrapper = await mountNav(3, 8, '/customers?page=3&perPage=18')

    await wrapper.get(SELECT).setValue('27')

    await vi.waitFor(() => {
      expect(useRoute().fullPath).toBe('/customers?perPage=27')
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
