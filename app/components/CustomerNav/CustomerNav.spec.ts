import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import type { ICustomerCard } from '#shared/types/customer'
import CustomerNav from './CustomerNav.vue'

const NAV = '[data-testid="customer-nav__root--nav"]'
const PREV_LINK = '[data-testid="customer-nav__prev--link"]'
const PREV_GHOST = '[data-testid="customer-nav__prev--ghost"]'
const POSITION = '[data-testid="customer-nav__position--text"]'
const NEXT_LINK = '[data-testid="customer-nav__next--link"]'
const NEXT_GHOST = '[data-testid="customer-nav__next--ghost"]'

const PREV: ICustomerCard = {
  slug: 'ana-souza',
  name: 'Ana Souza',
  street: 'Rua Santa Catarina, 3833',
  city: 'Umuarama',
  state: 'Santa Catarina',
  uf: 'SC',
  postcode: '43646',
  picture: 'https://example.com/ana.jpg',
}
const NEXT: ICustomerCard = {
  slug: 'carlos-munoz',
  name: 'Carlos Muñoz',
  street: 'Rua Santa Catarina, 3833',
  city: 'Umuarama',
  state: 'Santa Catarina',
  uf: 'SC',
  postcode: '43646',
  picture: 'https://example.com/carlos.jpg',
}

// Two neighbors around position 3 of a context of 43
const FULL = { position: 3, total: 43, prev: PREV, next: NEXT }
type TNavProps = {
  position: number
  total: number
  prev: ICustomerCard | null
  next: ICustomerCard | null
}

const mountNav = (props: TNavProps = FULL, route = '/customers') =>
  mountSuspended(CustomerNav, { props, route })

enableAutoUnmount(afterEach)

// The neighboring states: which sides have a link, and what the one in the middle reads. A side
// with no neighbor renders nothing and the nav with its "N de M" stays.
describe('CustomerNav', () => {
  it('labels the navigation landmark', async () => {
    const nav = (await mountNav()).get(NAV)

    expect(nav.element.tagName).toBe('NAV')
    expect(nav.attributes('aria-label')).toBe('Navegar entre clientes')
  })

  it.each([
    {
      name: 'between the two neighbors',
      props: FULL,
      hasPrev: true,
      hasNext: true,
      position: '3 de 43',
    },
    {
      name: 'on the last edge, with the neighbor before alone',
      props: { position: 43, total: 43, prev: PREV, next: null },
      hasPrev: true,
      hasNext: false,
      position: '43 de 43',
    },
    {
      name: 'on the first edge, with the neighbor after alone',
      props: { position: 1, total: 43, prev: null, next: NEXT },
      hasPrev: false,
      hasNext: true,
      position: '1 de 43',
    },
    {
      name: 'alone in a context of one',
      props: { position: 1, total: 1, prev: null, next: null },
      hasPrev: false,
      hasNext: false,
      position: '1 de 1',
    },
  ])('reads $position $name', async ({ props, hasPrev, hasNext, position }) => {
    const wrapper = await mountNav(props)

    // The nav and the "N de M" stay; the sides that have no neighbor leave nothing
    expect(wrapper.get(POSITION).text()).toBe(position)
    expect(wrapper.find(PREV_LINK).exists()).toBe(hasPrev)
    expect(wrapper.find(NEXT_LINK).exists()).toBe(hasNext)

    // What each link reads: the leaves of it, label of the side first and the name of the neighbor
    if (hasPrev) {
      expect(
        wrapper
          .get(PREV_LINK)
          .findAll('span > span')
          .map((span) => span.text()),
      ).toEqual(['Anterior', PREV.name])
    }
    if (hasNext) {
      expect(
        wrapper
          .get(NEXT_LINK)
          .findAll('span > span')
          .map((span) => span.text()),
      ).toEqual(['Próximo', NEXT.name])
    }
  })

  // The side without a neighbor keeps the place it holds (the slot of the pill on the desktop, the
  // column of the card on the mobile), the way the prototype keeps it on both variants
  it.each([
    {
      name: 'between the two neighbors, both links live',
      props: FULL,
      hasPrevGhost: false,
      hasNextGhost: false,
    },
    {
      name: 'on the last edge, the next side is open',
      props: { position: 43, total: 43, prev: PREV, next: null },
      hasPrevGhost: false,
      hasNextGhost: true,
    },
    {
      name: 'on the first edge, the previous side is open',
      props: { position: 1, total: 43, prev: null, next: NEXT },
      hasPrevGhost: true,
      hasNextGhost: false,
    },
    {
      name: 'alone in a context of one, both sides are open',
      props: { position: 1, total: 1, prev: null, next: null },
      hasPrevGhost: true,
      hasNextGhost: true,
    },
  ])(
    'keeps the empty slot of the side without a neighbor $name',
    async ({ props, hasPrevGhost, hasNextGhost }) => {
      const wrapper = await mountNav(props)

      expect(wrapper.find(PREV_GHOST).exists()).toBe(hasPrevGhost)
      expect(wrapper.find(NEXT_GHOST).exists()).toBe(hasNextGhost)

      // What holds the place is a span of its own, empty and out of the accessibility tree
      for (const ghost of [wrapper.find(PREV_GHOST), wrapper.find(NEXT_GHOST)]) {
        if (!ghost.exists()) continue
        expect(ghost.element.tagName).toBe('SPAN')
        expect(ghost.text()).toBe('')
        expect(ghost.attributes('aria-hidden')).toBe('true')
      }
    },
  )

  it('opens the neighbors with the list state the address carries, page included', async () => {
    const wrapper = await mountNav(FULL, '/customers?search=girao&states=acre&sort=recent&page=5')

    expect(wrapper.get(PREV_LINK).attributes('href')).toBe(
      '/customers/ana-souza?page=5&search=girao&states=acre&sort=recent',
    )
    expect(wrapper.get(NEXT_LINK).attributes('href')).toBe(
      '/customers/carlos-munoz?page=5&search=girao&states=acre&sort=recent',
    )
  })

  it('keeps the chosen page size in the neighbor links too', async () => {
    const wrapper = await mountNav(FULL, '/customers?page=5&perPage=18')

    expect(wrapper.get(PREV_LINK).attributes('href')).toBe('/customers/ana-souza?page=5&perPage=18')
    expect(wrapper.get(NEXT_LINK).attributes('href')).toBe(
      '/customers/carlos-munoz?page=5&perPage=18',
    )
  })

  // Defaults stay out, the way the links of the list do: page 1 and the search, filters and order
  // at their default are not part of the address of the neighbor
  it('leaves the defaults out of the neighbor links', async () => {
    const wrapper = await mountNav()

    expect(wrapper.get(PREV_LINK).attributes('href')).toBe('/customers/ana-souza')
    expect(wrapper.get(NEXT_LINK).attributes('href')).toBe('/customers/carlos-munoz')
  })

  // A key the list does not take is dropped, valueless keys fall to the default: what the link of
  // the neighbor carries is the list state, not a copy of whatever the query string had
  it('reads a query the list does not take through the parser', async () => {
    const wrapper = await mountNav(FULL, '/customers?foo=1&page=abc')

    expect(wrapper.get(PREV_LINK).attributes('href')).toBe('/customers/ana-souza')
  })

  it('hides the chevrons from assistive technology', async () => {
    const wrapper = await mountNav()

    expect(wrapper.get(PREV_LINK).get('svg').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get(NEXT_LINK).get('svg').attributes('aria-hidden')).toBe('true')
  })

  // CSS Modules hash the class names and happy-dom applies no media query: what the spec pins here
  // is that each part carries the class its rules are written for. The layout of the two widths,
  // the pill and the card of it, is covered by the E2E of the detail (test/e2e).
  it('gives each part the class of its rule', async () => {
    const wrapper = await mountNav()

    expect(wrapper.get(NAV).classes()).toEqual([expect.stringMatching(/^_Nav_/)])
    expect(wrapper.get(POSITION).classes()).toEqual([expect.stringMatching(/^_Position_/)])
    expect(wrapper.get(PREV_LINK).classes()).toEqual([
      expect.stringMatching(/^_Link_/),
      expect.stringMatching(/^_Prev_/),
    ])
    expect(wrapper.get(NEXT_LINK).classes()).toEqual([
      expect.stringMatching(/^_Link_/),
      expect.stringMatching(/^_Next_/),
    ])
  })
})
