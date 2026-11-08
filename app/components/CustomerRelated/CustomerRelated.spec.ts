import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ICustomerCard } from '#shared/types/customer'
import CustomerRelated from './CustomerRelated.vue'

const SECTION = '[data-testid="customer-related__root--section"]'
const TITLE = '[data-testid="customer-related__title--heading"]'
const MORE = '[data-testid="customer-related__more--link"]'
const CARDS = '[data-testid="customer-related__cards--list"]'
const ITEM = '[data-testid="customer-related__item--listitem"]'
const NAME_LINK = '[data-testid="customer-related__name--link"]'
const CITY = '[data-testid="customer-related__city--text"]'
const PHOTO = '[data-testid="customer-avatar__photo--image"]'

// Four others of Santa Catarina, as the BFF answers them: by name, without the customer itself
const RELATED: ICustomerCard[] = [
  {
    slug: 'alexa-henderson',
    name: 'Alexa Henderson',
    street: 'Rua Fernandes, 8093',
    city: 'Chapecó',
    state: 'Santa Catarina',
    uf: 'SC',
    postcode: '20952',
    picture: 'https://example.com/alexa.jpg',
  },
  {
    slug: 'carlos-munoz',
    name: 'Carlos Muñoz',
    street: 'Rua Santa Catarina, 3833',
    city: 'Joinville',
    state: 'Santa Catarina',
    uf: 'SC',
    postcode: '43646',
    picture: 'https://example.com/carlos.jpg',
  },
  {
    slug: 'dalva-rios',
    name: 'Dalva Rios',
    street: 'Rua Borba, 1092',
    city: 'Blumenau',
    state: 'Santa Catarina',
    uf: 'SC',
    postcode: '15605',
    picture: 'https://example.com/dalva.jpg',
  },
  {
    slug: 'fernanda-santos',
    name: 'Fernanda Santos',
    street: 'Rua Tucano, 1029',
    city: 'Umuarama',
    state: 'Santa Catarina',
    uf: 'SC',
    postcode: '14876',
    picture: 'https://example.com/fernanda.jpg',
  },
]

type TRelatedProps = {
  customers: ICustomerCard[]
  state: string
  stateSlug: string
}

const STATE = { state: 'Santa Catarina', stateSlug: 'santa-catarina' } as const

// The list state the card's link carries: a search, a gender and a filter that are not the state of
// the customer, five pages of eighteen each. The route is the list's own, so the `/customers` of the
// links comes from the markup and not from the resolution of the route.
const OPENED_FROM_LIST =
  '/customers?page=5&perPage=18&search=girao&states=acre&gender=female&sort=recent'

const mountRelated = (props: Partial<TRelatedProps> = {}, route = OPENED_FROM_LIST) =>
  mountSuspended(CustomerRelated, {
    props: { customers: RELATED, ...STATE, ...props },
    route,
  })

beforeEach(() => {
  // happy-dom loads no image and reports every one as broken (complete, no width): the avatar would
  // swap the photo for the initials on mount. These photos loaded.
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(64)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('CustomerRelated', () => {
  // The section names itself by the heading, as the ones of the information do
  it('names the section by the heading of the state', async () => {
    const wrapper = await mountRelated()
    const section = wrapper.get(SECTION)

    expect(section.element.tagName).toBe('SECTION')
    const labelledBy = section.attributes('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    expect(section.get(TITLE).attributes('id')).toBe(labelledBy)
  })

  it('writes the state in the heading and in the link of the list', async () => {
    const wrapper = await mountRelated()

    expect(wrapper.get(TITLE).element.tagName).toBe('H2')
    expect(wrapper.get(TITLE).text()).toBe('Outros clientes em Santa Catarina')
    expect(wrapper.get(MORE).text()).toBe('Ver todos de Santa Catarina')
  })

  // The list of the state is the list alone: the search and the gender come out and the page starts
  // over, the order and the page size stay, as the prototype keeps
  it('goes to the list of the state alone', async () => {
    const wrapper = await mountRelated()

    expect(wrapper.get(MORE).attributes('href')).toBe(
      '/customers?perPage=18&states=santa-catarina&sort=recent',
    )
  })

  // Defaults stay out, the way every link of the app writes the list
  it('leaves the defaults out of the link of the list', async () => {
    const wrapper = await mountRelated(STATE, '/customers/oceano-jesus')

    expect(wrapper.get(MORE).attributes('href')).toBe('/customers?states=santa-catarina')
  })

  // The answer lists up to 4 others of the state, each in the order the BFF gave: the name of the
  // customer and the city of it, and only them (the street, the CEP and the chevron are of the list)
  it.each([
    { which: 0, name: 'Alexa Henderson', city: 'Chapecó' },
    { which: 1, name: 'Carlos Muñoz', city: 'Joinville' },
    { which: 2, name: 'Dalva Rios', city: 'Blumenau' },
    { which: 3, name: 'Fernanda Santos', city: 'Umuarama' },
  ])('shows the card $which, of $name, of $city', async ({ which, name, city }) => {
    const wrapper = await mountRelated()

    expect(wrapper.findAll(ITEM)).toHaveLength(4)
    expect(wrapper.findAll(NAME_LINK)[which]?.text()).toBe(name)
    expect(wrapper.findAll(CITY)[which]?.text()).toBe(city)
  })

  // The cards open each customer with the list state the address carries, page and size included
  it('opens the cards with the list state the address carries', async () => {
    const wrapper = await mountRelated()

    expect(wrapper.findAll(NAME_LINK).map((link) => link.attributes('href'))).toEqual(
      RELATED.map(
        (card) =>
          `/customers/${card.slug}?page=5&perPage=18&search=girao&states=acre&gender=female&sort=recent`,
      ),
    )
  })

  // A key the list does not take is dropped, a value it does not accept falls to the default: what
  // the links carry is the list state, not a copy of whatever the query string had
  it('reads a query the list does not take through the parser', async () => {
    const wrapper = await mountRelated(STATE, '/customers/oceano-jesus?foo=1&page=abc')

    expect(wrapper.get(NAME_LINK).attributes('href')).toBe('/customers/alexa-henderson')
    expect(wrapper.get(MORE).attributes('href')).toBe('/customers?states=santa-catarina')
  })

  it('keeps the chosen page size in the links too', async () => {
    const wrapper = await mountRelated(STATE, '/customers/oceano-jesus?page=2&perPage=27')

    expect(wrapper.get(NAME_LINK).attributes('href')).toBe(
      '/customers/alexa-henderson?page=2&perPage=27',
    )
    expect(wrapper.get(MORE).attributes('href')).toBe('/customers?perPage=27&states=santa-catarina')
  })

  it('shows the photo of each customer, with no name of its own', async () => {
    const wrapper = await mountRelated()

    expect(
      wrapper.findAll(PHOTO).map((photo) => [photo.attributes('src'), photo.attributes('alt')]),
    ).toEqual(RELATED.map((card) => [card.picture, '']))

    // The 64px the card reserves for the photo, before it arrives
    for (const photo of wrapper.findAll(PHOTO)) {
      expect([photo.attributes('width'), photo.attributes('height')]).toEqual(['64', '64'])
    }
  })

  // aria-labelledby takes the first element with the id: a repeated one would name two sections
  // alike, so no two instances inside one app get the same one
  it('gives each section of the app a heading id of its own', async () => {
    const RELATED_TWICE = { customers: RELATED, ...STATE }
    const Two = defineComponent({
      render() {
        return [h(CustomerRelated, RELATED_TWICE), h(CustomerRelated, RELATED_TWICE)]
      },
    })

    const ids = (await mountSuspended(Two)).findAll(TITLE).map((title) => title.attributes('id'))

    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
  })

  // The state has no other of its own, and nothing of the section comes out of it, the `hasRelated`
  // the prototype keeps
  it('renders nothing when the state has no other one', async () => {
    const wrapper = await mountRelated({ customers: [] })

    expect(wrapper.find(SECTION).exists()).toBe(false)
    expect(wrapper.findAll(ITEM)).toHaveLength(0)
  })

  // The answer carries fewer than 4: the state of the customer has few other ones, and the section
  // exists with what it got — not only when the count reaches the cap. One card alone also keeps
  // the section (the BFF answers one for thin states)
  it('keeps the section when the state has one other', async () => {
    const wrapper = await mountRelated({ customers: RELATED.slice(0, 1) })

    expect(wrapper.find(SECTION).exists()).toBe(true)
    expect(wrapper.findAll(ITEM)).toHaveLength(1)
    expect(wrapper.get(NAME_LINK).text()).toBe('Alexa Henderson')
    expect(wrapper.get(TITLE).text()).toBe('Outros clientes em Santa Catarina')
    expect(wrapper.get(MORE).attributes('href')).toBe(
      '/customers?perPage=18&states=santa-catarina&sort=recent',
    )
  })

  // A state outside the 27 is grouped by its own slug, but the list cannot be addressed by it: the
  // link of the list would go out promising the state and land on the whole list. The cards keep
  // their value; only the link is out
  it('keeps the cards of a state outside the table, without the link of the list', async () => {
    const wrapper = await mountRelated({ state: 'Atlantis', stateSlug: 'atlantis' })

    expect(wrapper.find(SECTION).exists()).toBe(true)
    expect(wrapper.get(TITLE).text()).toBe('Outros clientes em Atlantis')
    expect(wrapper.find(MORE).exists()).toBe(false)
    expect(wrapper.findAll(ITEM)).toHaveLength(4)
  })

  // CSS Modules hash the class names and happy-dom applies no media query: the grid of the desktop,
  // the carousel below 640px and the ring of the link are in tests/e2e (#40). What the spec pins here
  // is that each part carries the class its rules are written for.
  it.each([
    { part: 'section', selector: SECTION, rule: 'Section' },
    {
      part: 'row of heading and link',
      selector: '[data-testid="customer-related__header--div"]',
      rule: 'Header',
    },
    { part: 'heading', selector: TITLE, rule: 'Title' },
    { part: 'link of the list', selector: MORE, rule: 'More' },
    { part: 'list of cards', selector: CARDS, rule: 'Cards' },
    { part: 'item of the list', selector: ITEM, rule: 'Item' },
    { part: 'card', selector: '[data-testid="customer-related__card--div"]', rule: 'Card' },
    { part: 'name', selector: '[data-testid="customer-related__name--text"]', rule: 'Name' },
    { part: 'stretched link', selector: NAME_LINK, rule: 'Link' },
    { part: 'city', selector: CITY, rule: 'City' },
  ])('gives the $part the class of its rule', async ({ selector, rule }) => {
    const classes = (await mountRelated()).get(selector).classes()

    expect(classes).toEqual([expect.stringMatching(new RegExp(`^_${rule}_`))])
  })

  // The related card sizes the avatar (64px, as the prototype's card) with a class that lands on the
  // avatar root, next to the one of the avatar itself
  it('puts the class that sizes the avatar on its root', async () => {
    const wrapper = await mountRelated()

    expect(wrapper.get('[data-testid="customer-avatar__root--span"]').classes()).toHaveLength(2)
  })
})
