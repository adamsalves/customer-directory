import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import type { ICustomerCard } from '#shared/types/customer'
import CustomerCard from './CustomerCard.vue'

const customer: ICustomerCard = {
  slug: 'alejandra-rodrigues',
  name: 'Alejandra Rodrigues',
  street: 'Rua Santa Catarina, 3833',
  city: 'Umuarama',
  state: 'Santa Catarina',
  uf: 'SC',
  postcode: '43646',
  picture: 'https://randomuser.me/api/portraits/women/18.jpg',
}

const IMAGE = '[data-testid="customer-card__avatar--image"]'
const ROW = '[data-testid="customer-card__location--row"]'

describe('CustomerCard', () => {
  it('names the customer in a heading and shows the street', async () => {
    const wrapper = await mountSuspended(CustomerCard, { props: { customer } })
    const name = wrapper.get('[data-testid="customer-card__name--heading"]')

    expect(name.element.tagName).toBe('H2')
    expect(name.text()).toBe('Alejandra Rodrigues')
    expect(wrapper.get('[data-testid="customer-card__street--text"]').text()).toBe(
      'Rua Santa Catarina, 3833',
    )
  })

  // CSS shows one of the two locations per width (ADR-0014)
  it('renders the location on two lines for the grid and on one for the row', async () => {
    const wrapper = await mountSuspended(CustomerCard, { props: { customer } })
    const grid = wrapper.get('[data-testid="customer-card__location--grid"]')

    expect(grid.get('[data-testid="customer-card__city--text"]').text()).toBe('Umuarama')
    expect(grid.get('[data-testid="customer-card__state--text"]').text()).toBe(
      'Santa Catarina - CEP: 43646',
    )
    expect(wrapper.get(ROW).text()).toBe('Umuarama, SC · CEP 43646')
  })

  it('falls back to the state name in the row when the state has no UF', async () => {
    const wrapper = await mountSuspended(CustomerCard, {
      props: { customer: { ...customer, state: 'Atlantis', uf: '' } },
    })

    expect(wrapper.get(ROW).text()).toBe('Umuarama, Atlantis · CEP 43646')
  })

  it('renders the avatar as a decorative image with its size reserved', async () => {
    const image = (await mountSuspended(CustomerCard, { props: { customer } })).get(IMAGE)

    expect(image.attributes()).toMatchObject({
      src: customer.picture,
      alt: '',
      width: '80',
      height: '80',
      decoding: 'async',
    })
  })

  it('loads the avatar lazily and without priority by default', async () => {
    const image = (await mountSuspended(CustomerCard, { props: { customer } })).get(IMAGE)

    expect(image.attributes('loading')).toBe('lazy')
    expect(image.attributes('fetchpriority')).toBeUndefined()
  })

  it('loads the avatar eagerly and with high priority when asked to', async () => {
    const image = (
      await mountSuspended(CustomerCard, {
        props: { customer, loading: 'eager', fetchpriority: 'high' },
      })
    ).get(IMAGE)

    expect(image.attributes('loading')).toBe('eager')
    expect(image.attributes('fetchpriority')).toBe('high')
  })

  it('hides the chevron from assistive technology', async () => {
    const wrapper = await mountSuspended(CustomerCard, { props: { customer } })

    expect(
      wrapper.get('[data-testid="customer-card__chevron--icon"]').attributes('aria-hidden'),
    ).toBe('true')
  })
})
