import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ICustomer } from '#shared/types/customer'
import CustomerHero from './CustomerHero.vue'

const alejandra: ICustomer = {
  slug: 'alejandra-rodrigues',
  name: 'Alejandra Rodrigues',
  firstName: 'Alejandra',
  lastName: 'Rodrigues',
  street: 'Rua Santa Catarina, 3833',
  city: 'Umuarama',
  state: 'Santa Catarina',
  uf: 'SC',
  postcode: '43646',
  picture: 'https://randomuser.me/api/portraits/women/18.jpg',
  stateSlug: 'santa-catarina',
  title: 'Sra.',
  gender: 'female',
  email: 'alejandra.rodrigues@example.com',
  phone: '(09) 7033-7406',
  cell: '(54) 3190-3469',
  timezone: 'UTC+3:00 · Baghdad, Riyadh, Moscow, St. Petersburg',
  birthDate: '1974-05-16T14:46:15Z',
  registeredAt: '2013-03-06T16:09:16Z',
}

// The accent in the e-mail is on purpose: the link carries it as it is
const eleuterio: ICustomer = {
  slug: 'eleuterio-almeida',
  name: 'Eleutério Almeida',
  firstName: 'Eleutério',
  lastName: 'Almeida',
  street: 'Rua Amazonas, 8578',
  city: 'Balneário Camboriú',
  state: 'Tocantins',
  uf: 'TO',
  postcode: '28829',
  picture: 'https://randomuser.me/api/portraits/men/61.jpg',
  stateSlug: 'tocantins',
  title: 'Sr.',
  gender: 'male',
  email: 'eleutério.almeida@example.com',
  phone: '(44) 2047-8597',
  cell: '(86) 6471-7684',
  timezone: 'UTC-4:00 · Atlantic Time (Canada), Caracas, La Paz',
  birthDate: '1970-03-30T23:55:08Z',
  registeredAt: '2004-06-27T05:45:47Z',
}

// Each clock sits right around an anniversary, so that the years since a date and the difference of
// the two years part ways:
// - Alejandra on 2026-03-05: a day before the sign-up anniversary (03-06) and ten weeks before the
//   birthday (05-16). Tenure 12 and age 51, where the year difference gives 13 and 52.
// - Eleutério on 2026-03-30, 00:00 UTC: the birthday, though it is still the 29th in
//   America/Sao_Paulo (the zone of the specs), and three months before the sign-up anniversary
//   (06-27). Age 56 and tenure 21, where the year difference gives 56 and 22.
const cases = [
  {
    customer: alejandra,
    now: '2026-03-05T12:00:00Z',
    kicker: 'Sra. · Cliente há 12 anos',
    location: 'Umuarama, Santa Catarina',
    tags: ['51 anos', 'Feminino', 'SC'],
    mailto: 'mailto:alejandra.rodrigues@example.com',
    tel: 'tel:+555431903469',
  },
  {
    customer: eleuterio,
    now: '2026-03-30T00:00:00Z',
    kicker: 'Sr. · Cliente há 21 anos',
    location: 'Balneário Camboriú, Tocantins',
    tags: ['56 anos', 'Masculino', 'TO'],
    mailto: 'mailto:eleutério.almeida@example.com',
    tel: 'tel:+558664717684',
  },
]

const ROOT = '[data-testid="customer-hero__root--section"]'
const TEXT = '[data-testid="customer-hero__text--div"]'
const NAME = '[data-testid="customer-hero__name--heading"]'
const KICKER = '[data-testid="customer-hero__kicker--text"]'
const LOCATION = '[data-testid="customer-hero__location--text"]'
const TAGS = '[data-testid="customer-hero__tags--list"]'
const TAG = '[data-testid="customer-hero__tag--item"]'
const ACTIONS = '[data-testid="customer-hero__actions--div"]'
const EMAIL = '[data-testid="customer-hero__email--link"]'
const CALL = '[data-testid="customer-hero__call--link"]'
const AVATAR = '[data-testid="customer-avatar__root--span"]'
const IMAGE = '[data-testid="customer-avatar__photo--image"]'
const INITIALS = '[data-testid="customer-avatar__initials--text"]'

// Only the Date is frozen: mountSuspended waits on promises and timers that have to keep running
async function mountHero(customer: ICustomer, now = '2026-03-05T12:00:00Z') {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(now))
  return mountSuspended(CustomerHero, { props: { customer } })
}

const tagsOf = (wrapper: Awaited<ReturnType<typeof mountHero>>) =>
  wrapper
    .get(TAGS)
    .findAll(TAG)
    .map((tag) => tag.text())

describe('CustomerHero', () => {
  // happy-dom loads no image and reports every one as broken (complete, no width): the avatar would
  // swap the photo for the initials on mount. This photo loaded.
  beforeEach(() => {
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(80)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('names the customer in the page heading', async () => {
    const heading = (await mountHero(eleuterio)).get(NAME)

    expect(heading.element.tagName).toBe('H1')
    expect(heading.text()).toBe('Eleutério Almeida')
    // The article of the page points at it
    expect(heading.attributes('id')).toBe('customer-name')
  })

  it.each(cases)('counts the tenure of $customer.name from the sign-up date', async (row) => {
    const wrapper = await mountHero(row.customer, row.now)

    expect(wrapper.get(KICKER).text()).toBe(row.kicker)
  })

  it.each(cases)('says where $customer.name lives, with the state by name', async (row) => {
    const wrapper = await mountHero(row.customer)

    expect(wrapper.get(LOCATION).text()).toBe(row.location)
  })

  it.each(cases)('lists the age, the gender and the UF of $customer.name', async (row) => {
    const wrapper = await mountHero(row.customer, row.now)

    expect(tagsOf(wrapper)).toEqual(row.tags)
    expect(wrapper.get(TAGS).attributes('aria-label')).toBe('Resumo')
  })

  // The source can give a state outside the 27: it has no UF, and the tag is the name of the state
  it('falls back to the name of the state when it has no UF', async () => {
    const wrapper = await mountHero({ ...alejandra, state: 'Atlantis', uf: '' })

    expect(tagsOf(wrapper)).toEqual(['51 anos', 'Feminino', 'Atlantis'])
  })

  // The type has two genders and the filter a label for each; the dash is for a record that is not
  // what the type says
  it('shows a dash for a gender the filter has no label for', async () => {
    const stranger = { ...alejandra }
    Reflect.set(stranger, 'gender', 'other')

    expect(tagsOf(await mountHero(stranger))).toEqual(['51 anos', '—', 'SC'])
  })

  it.each(cases)('links the e-mail and the cell of $customer.name', async (row) => {
    const wrapper = await mountHero(row.customer)
    const email = wrapper.get(EMAIL)
    const call = wrapper.get(CALL)

    expect(email.element.tagName).toBe('A')
    expect(email.attributes('href')).toBe(row.mailto)
    expect(email.text()).toBe('Enviar e-mail')
    expect(call.element.tagName).toBe('A')
    expect(call.attributes('href')).toBe(row.tel)
    expect(call.text()).toBe('Ligar')
  })

  it('hides the icon of each action from assistive technology', async () => {
    const wrapper = await mountHero(alejandra)
    const icons = [wrapper.get(EMAIL).findAll('svg'), wrapper.get(CALL).findAll('svg')]

    expect(icons.map((found) => found.length)).toEqual([1, 1])
    expect(icons.flat().map((icon) => icon.attributes('aria-hidden'))).toEqual(['true', 'true'])
  })

  it('renders the photo with its alt text and its size reserved', async () => {
    const image = (await mountHero(eleuterio)).get(IMAGE)

    expect(image.attributes()).toMatchObject({
      src: eleuterio.picture,
      alt: 'Foto de Eleutério Almeida',
      width: '128',
      height: '128',
    })
  })

  // Above the fold and the likely LCP, as the first card of the list: no lazy loading, high priority
  it('loads the photo eagerly and with high priority', async () => {
    const image = (await mountHero(eleuterio)).get(IMAGE)

    expect(image.attributes('loading')).toBe('eager')
    expect(image.attributes('fetchpriority')).toBe('high')
  })

  it('falls back to the initials of the name when the photo fails', async () => {
    const wrapper = await mountHero(eleuterio)

    await wrapper.get(IMAGE).trigger('error')

    expect(wrapper.find(IMAGE).exists()).toBe(false)
    expect(wrapper.get(INITIALS).text()).toBe('EA')
  })

  // The hero sizes the avatar (128px, 112px in a column) with a class that lands on the avatar root,
  // next to the one of the avatar itself
  it('puts the class that sizes the avatar on its root', async () => {
    const wrapper = await mountHero(alejandra)

    expect(wrapper.get(AVATAR).classes()).toHaveLength(2)
  })

  // CSS Modules hash the class names (_Hero_183767) and happy-dom applies no CSS: what can be seen
  // here is that each part carries the class its rule is written for. The actions carry two, the
  // pill both share and the fill of one or the outline of the other.
  it.each([
    { part: 'hero', selector: ROOT, rules: ['Hero'] },
    { part: 'text column', selector: TEXT, rules: ['Text'] },
    { part: 'kicker', selector: KICKER, rules: ['Kicker'] },
    { part: 'heading', selector: NAME, rules: ['Name'] },
    { part: 'location', selector: LOCATION, rules: ['Location'] },
    { part: 'tags', selector: TAGS, rules: ['Tags'] },
    { part: 'tag', selector: TAG, rules: ['Tag'] },
    { part: 'actions', selector: ACTIONS, rules: ['Actions'] },
    { part: 'e-mail action', selector: EMAIL, rules: ['Action', 'Primary'] },
    { part: 'call action', selector: CALL, rules: ['Action', 'Secondary'] },
  ])('gives the $part the classes of its rules', async ({ selector, rules }) => {
    const wrapper = await mountHero(alejandra)

    const classes = wrapper.get(selector).classes()

    expect(classes).toHaveLength(rules.length)
    for (const [index, rule] of rules.entries()) {
      expect(classes[index]).toMatch(new RegExp(`^_${rule}_`))
    }
  })
})
