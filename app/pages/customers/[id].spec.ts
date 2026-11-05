import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ICustomer, ICustomerDetailResponse } from '#shared/types/customer'
import CustomerPage from './[id].vue'

const customer: ICustomer = {
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
const response: ICustomerDetailResponse = { customer }

// What the page asked the BFF for, one entry per request. The test server mounts the endpoints
// under /_, which is no part of what the page asked.
let requests: string[] = []

function record(event: { path: string }) {
  requests.push(event.path.replace(/^\/_/, ''))
}

function answer(event: { path: string }) {
  record(event)
  return response
}

// One slug for each answer: the BFF has the customer, does not know the slug, or has no source to
// read, or sends nothing back
registerEndpoint('/api/customers/alejandra-rodrigues', answer)
registerEndpoint('/api/customers/no-such-customer', () => {
  throw createError({ statusCode: 404, statusMessage: 'Not Found' })
})
registerEndpoint('/api/customers/source-down', (event) => {
  record(event)
  throw createError({ statusCode: 502, statusMessage: 'Bad Gateway' })
})
// A 204: no error, and nothing to show
registerEndpoint('/api/customers/no-body', () => null)

// The same customer with the fields the sections have a rule for. 01:00 UTC is still the evening
// before in America/Sao_Paulo, the zone of the specs: dates read in it come a day early, and the
// registration one a month early. A state outside the 27 has no UF. The type has two genders, so the
// third is set by Reflect.
registerEndpoint('/api/customers/night-owl', () => ({
  customer: {
    ...customer,
    birthDate: '1974-05-16T01:00:00Z',
    registeredAt: '2013-03-01T01:00:00Z',
  },
}))
registerEndpoint('/api/customers/atlantis', () => ({
  customer: { ...customer, state: 'Atlantis', uf: '' },
}))
registerEndpoint('/api/customers/stranger', () => {
  const stranger = { ...customer }
  Reflect.set(stranger, 'gender', 'other')
  return { customer: stranger }
})

const ARTICLE = '[data-testid="customer-detail__root--article"]'
const HERO = '[data-testid="customer-hero__root--section"]'
const NAME = '[data-testid="customer-hero__name--heading"]'
const SECTIONS = '[data-testid="customer-detail__sections--div"]'
const SECTION = '[data-testid="customer-info-section__root--section"]'
const HEADING = '[data-testid="customer-info-section__heading--heading"]'
const EMAIL_VALUE = '[data-testid="customer-detail__email--value"]'
const EMAIL = '[data-testid="customer-detail__email--link"]'
const COPY = '[data-testid="customer-detail__copy--button"]'
const CELL_VALUE = '[data-testid="customer-detail__cell--value"]'
const CELL = '[data-testid="customer-detail__cell--link"]'
const PHONE_VALUE = '[data-testid="customer-detail__phone--value"]'
const PHONE = '[data-testid="customer-detail__phone--link"]'
const POSTCODE_VALUE = '[data-testid="customer-detail__postcode--value"]'

// A page left mounted by an earlier test would fetch again on the next test's navigation
enableAutoUnmount(afterEach)

// The page throws a fatal error and Nuxt turns it into the error page: `useError` holds what that
// page is given, and the server answers with its status. mountSuspended does not reject with the
// error, since the root handler of Nuxt takes a fatal one and stops it there; what rejects is the
// render that follows the failed setup, with no state, in a TypeError of its own.
async function errorOf(slug: string) {
  await mountSuspended(CustomerPage, { route: `/customers/${slug}` }).catch(() => undefined)
  return useError().value
}

beforeEach(() => {
  requests = []
})

afterEach(async () => {
  await clearError()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

// Only the Date is frozen: mountSuspended waits on promises and timers that have to keep running.
// The day is ten weeks before the birthday (05-16): the age is 51, where the difference of the two
// years gives 52.
async function mountPage(slug = 'alejandra-rodrigues') {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-03-05T12:00:00Z'))
  return mountSuspended(CustomerPage, { route: `/customers/${slug}` })
}

// What each label of the page says: "Gênero" -> "Feminino"
function valuesByLabel(wrapper: Awaited<ReturnType<typeof mountPage>>) {
  const values = wrapper.findAll('dd')
  return Object.fromEntries(
    wrapper.findAll('dt').map((label, index) => [label.text(), values[index]?.text()]),
  )
}

describe('customer page', () => {
  it('renders the hero of the customer the BFF gave, inside an article', async () => {
    const wrapper = await mountSuspended(CustomerPage, { route: '/customers/alejandra-rodrigues' })
    const article = wrapper.get(ARTICLE)

    expect(article.element.tagName).toBe('ARTICLE')
    expect(article.classes()).toEqual([expect.stringContaining('Article')])
    expect(article.get(HERO).get(NAME).text()).toBe('Alejandra Rodrigues')
  })

  it('names the article by the heading of the hero', async () => {
    const wrapper = await mountSuspended(CustomerPage, { route: '/customers/alejandra-rodrigues' })
    const labelledBy = wrapper.get(ARTICLE).attributes('aria-labelledby')

    expect(labelledBy).toBeTruthy()
    expect(wrapper.get(NAME).attributes('id')).toBe(labelledBy)
  })

  it('asks the BFF for the customer of the slug in the address', async () => {
    await mountSuspended(CustomerPage, { route: '/customers/alejandra-rodrigues' })

    expect(requests).toEqual(['/api/customers/alejandra-rodrigues'])
  })

  // Two statuses, so a page that always answers with one of them fails
  it.each([
    { slug: 'no-such-customer', status: 404, statusText: 'Not Found' },
    { slug: 'source-down', status: 502, statusText: 'Bad Gateway' },
  ])('shows the error page with the $status of the BFF', async (row) => {
    expect(await errorOf(row.slug)).toMatchObject({
      status: row.status,
      statusText: row.statusText,
    })
  })

  // ofetch repeats a GET that fails with a 5xx: the BFF would read the source twice and the error
  // page would be twice as late (ADR-0005)
  it('asks the BFF once when it fails', async () => {
    await errorOf('source-down')

    expect(requests).toEqual(['/api/customers/source-down'])
  })

  it('shows the error page with a 500 when the BFF answers with nothing to show', async () => {
    expect(await errorOf('no-body')).toMatchObject({ status: 500 })
  })
})

describe('customer page sections', () => {
  it('lists the contact, the address and the personal data, in that order', async () => {
    const sections = (await mountPage()).findAll(SECTION)

    expect(
      sections.map((section) => ({
        heading: section.get(HEADING).text(),
        labels: section.findAll('dt').map((label) => label.text()),
        values: section.findAll('dd').map((value) => value.text()),
      })),
    ).toEqual([
      {
        heading: 'Contato',
        labels: ['E-mail', 'Celular', 'Telefone'],
        values: ['alejandra.rodrigues@example.com', '(54) 3190-3469', '(09) 7033-7406'],
      },
      {
        heading: 'Endereço',
        labels: ['Logradouro', 'Cidade / Estado', 'CEP', 'Fuso horário'],
        values: [
          'Rua Santa Catarina, 3833',
          'Umuarama · Santa Catarina (SC)',
          '43646',
          'UTC+3:00 · Baghdad, Riyadh, Moscow, St. Petersburg',
        ],
      },
      {
        heading: 'Dados pessoais',
        labels: ['Data de nascimento', 'Gênero', 'Cliente desde'],
        values: ['16/05/1974 (51 anos)', 'Feminino', '06/03/2013 · março de 2013'],
      },
    ])
  })

  // aria-labelledby takes the first element with the id: a repeated one would name two sections alike
  it('gives each section a heading id of its own', async () => {
    const ids = (await mountPage()).findAll(HEADING).map((heading) => heading.attributes('id'))

    expect(new Set(ids).size).toBe(3)
  })

  // The cell and the phone are two numbers, so that a link made of one of them fails
  it('links the e-mail, the cell and the phone', async () => {
    const wrapper = await mountPage()

    expect(wrapper.get(EMAIL).attributes('href')).toBe('mailto:alejandra.rodrigues@example.com')
    expect(wrapper.get(CELL).attributes('href')).toBe('tel:+555431903469')
    expect(wrapper.get(PHONE).attributes('href')).toBe('tel:+550970337406')
  })

  it('reads the dates on UTC', async () => {
    expect(valuesByLabel(await mountPage('night-owl'))).toMatchObject({
      'Data de nascimento': '16/05/1974 (51 anos)',
      'Cliente desde': '01/03/2013 · março de 2013',
    })
  })

  it('leaves the UF and its parentheses out when the state has none', async () => {
    expect(valuesByLabel(await mountPage('atlantis'))).toMatchObject({
      'Cidade / Estado': 'Umuarama · Atlantis',
    })
  })

  it('shows a dash for a gender the filter has no label for', async () => {
    expect(valuesByLabel(await mountPage('stranger'))).toMatchObject({ Gênero: '—' })
  })

  // CSS Modules hash the class names (_Sections_1a2b3c) and happy-dom applies no CSS: what can be
  // seen here is that each part carries the class its rule is written for
  it.each([
    { part: 'sections', selector: SECTIONS, rule: 'Sections' },
    { part: 'e-mail', selector: EMAIL_VALUE, rule: 'EmailValue' },
    { part: 'copy button', selector: COPY, rule: 'CopyButton' },
    { part: 'cell', selector: CELL_VALUE, rule: 'Tabular' },
    { part: 'phone', selector: PHONE_VALUE, rule: 'Tabular' },
    { part: 'postcode', selector: POSTCODE_VALUE, rule: 'Tabular' },
  ])('gives the $part the class of its rule', async ({ selector, rule }) => {
    const classes = (await mountPage()).get(selector).classes()

    expect(classes).toEqual([expect.stringMatching(new RegExp(`^_${rule}_`))])
  })
})

describe('copy e-mail button', () => {
  // The test that took the clipboard away puts it back, and the toast keeps its message
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'clipboard')
    clearNuxtState('toast')
  })

  it('names the button, and hides the icon from assistive technology', async () => {
    const copy = (await mountPage()).get(COPY)

    expect(copy.attributes()).toMatchObject({
      type: 'button',
      'aria-label': 'Copiar e-mail',
      title: 'Copiar e-mail',
    })
    expect(copy.findAll('svg').map((icon) => icon.attributes('aria-hidden'))).toEqual(['true'])
  })

  it('copies the e-mail and says so in the toast', async () => {
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    const wrapper = await mountPage()

    await wrapper.get(COPY).trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledExactlyOnceWith('alejandra.rodrigues@example.com')
    expect(useToast().message.value).toBe('E-mail copiado')
  })

  // The browser may refuse the write, and outside HTTPS there is no clipboard at all
  it.each([
    {
      how: 'refuses the write',
      take: () => vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied')),
    },
    {
      how: 'is not there',
      take: () =>
        Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }),
    },
  ])('says it could not copy when the clipboard $how', async ({ take }) => {
    const wrapper = await mountPage()
    take()

    await wrapper.get(COPY).trigger('click')
    await flushPromises()

    expect(useToast().message.value).toBe('Não foi possível copiar')
  })
})
