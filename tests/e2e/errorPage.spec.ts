import { expect } from '@playwright/test'
import { waitForHydration } from './hydration'
import { test } from './network'

// The counter of the results reads the poll of the way out has made: a property the page sets while
// it watches getElementById
declare global {
  interface Window {
    __resultsLookups?: number
  }
}

// A slug no customer has: the BFF answers 404 and the page throws it (#32)
const MISSING = '/customers/no-such-customer'
// The server answers an error with HTML only to a request that says it takes HTML, as a browser does;
// to any other it sends the JSON of the error
const HTML = { accept: 'text/html' }

// waitForHydration needs a dark system, and a dark system means every light theme below can only come
// from the cookie (ADR-0011)
test.use({ colorScheme: 'dark' })

test.describe('the server HTML', () => {
  // The mobile project would only repeat the same requests
  test.skip(({ isMobile }) => isMobile, 'the server HTML is the same at any width')

  test('a slug no customer has gets the 404 page', async ({ request }) => {
    const response = await request.get(MISSING, { headers: HTML })
    const html = await response.text()

    expect(response.status()).toBe(404)
    expect(html).toContain('<title>Cliente não encontrado · Juntos Somos Mais</title>')
    expect(html).toContain('Cliente não encontrado</h1>')
    expect(html).toContain('O link pode estar desatualizado ou o cliente não existe mais.')
    expect(html).toContain('Ver lista de clientes')
  })

  test('a request with the cookie gets the theme of the 404 page', async ({ request }) => {
    const response = await request.get(MISSING, { headers: { ...HTML, cookie: 'jsm-theme=dark' } })

    expect(response.status()).toBe(404)
    expect(await response.text()).toMatch(/<html[^>]*data-theme="dark"/)
  })
})

test('the 404 page keeps the layout and stays what the server rendered after hydration', async ({
  page,
}) => {
  const response = await page.goto(MISSING)
  await waitForHydration(page)

  expect(response?.status()).toBe(404)
  await expect(page).toHaveTitle('Cliente não encontrado · Juntos Somos Mais')
  await expect(page.getByTestId('error-page__title--heading')).toHaveText('Cliente não encontrado')
  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('main')).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
})

test('the link goes back to the list', async ({ page }) => {
  await page.goto(MISSING)
  await waitForHydration(page)

  await page.getByTestId('error-page__list--link').click()

  await expect(page).toHaveURL(/\/customers$/)
  await expect(page.getByTestId('customers__title--heading')).toHaveText('Lista de clientes')
  await expect(page.getByTestId('error-page__root--div')).toHaveCount(0)
})

// Entering the error page the way a reader does: from the hydrated list, a card of a customer the
// BFF no longer has (the answer is faked, as in customerDetail.spec.ts). The title takes the focus
// a replaced view leaves on <body>, and the announcer — the layout's, which error.vue renders —
// says which page this is. Leaving by "Ver lista de clientes" is one more swap of the replaced
// view: the results then take the focus the way an in-list page change does, and the announcer
// names the list — both sides of the journey in one read (ADR-0022, ADR-0024)
test('the client 404 focuses the title, and the way out hands the focus to the results', async ({
  page,
}) => {
  await page.route('**/api/customers/abraim-dacosta', (route) => route.fulfill({ status: 404 }))
  await page.goto('/customers')
  await waitForHydration(page)

  await page.getByTestId('customer-card__name--link').filter({ hasText: 'Abraim da Costa' }).click()

  await expect(page.getByTestId('error-page__root--div')).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.getAttribute('data-testid')))
    .toBe('error-page__title--heading')
  await expect(page.locator('.nuxt-route-announcer')).toContainText('Cliente não encontrado')

  await page.getByTestId('error-page__list--link').click()

  await expect(page).toHaveURL(/\/customers$/)
  await expect(page.getByTestId('customers__title--heading')).toHaveText('Lista de clientes')
  await expect(page.locator('.nuxt-route-announcer')).toContainText('Lista de clientes')
  await expect
    .poll(() =>
      page.evaluate(() => {
        const element = document.activeElement
        return element instanceof HTMLElement
          ? `${element.tagName.toLowerCase()}#${element.id}`
          : ''
      }),
    )
    .toBe('section#results')
  // The rows of the answer the list gives with no query: nine cards, the defaults
  await expect(page.getByTestId('customer-card__name--link')).toHaveCount(9)
})

// A modified click is the browser's — the link would go to another tab or window — and no
// navigation of the current tab comes out of it: the error stays where it was, with the focus of
// the reader still where the click left it (ADR-0024). The wait for the results is the piece this
// click must not arm: the poll reads the results by getElementById each frame the moment it is
// armed, so a silenced counter on the document catches an armed wait before the first frame lands.
test('a modified click on the way out of the error keeps the error', async ({ page }) => {
  await page.goto(MISSING)
  await waitForHydration(page)

  await page.evaluate(() => {
    const original = document.getElementById.bind(document)
    window.__resultsLookups = 0
    document.getElementById = (id: string) => {
      if (id === 'results' && window.__resultsLookups !== undefined) {
        window.__resultsLookups += 1
      }
      return original(id)
    }
  })
  await page.getByTestId('error-page__list--link').click({ modifiers: ['Control'] })
  await page.waitForTimeout(300)

  await expect(page).toHaveURL(/no-such-customer$/)
  const lookups: number | undefined = await page.evaluate(() => window.__resultsLookups)
  expect(lookups).toBe(0)
  await expect(page.getByTestId('error-page__root--div')).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? ''))
    .toBe('error-page__list--link')
})

// Using the skip link with an error set must not navigate: the fragment navigation would land on
// the router, whose afterEach clears the error, and the customer page would refetch its customer
// to 404 again. The click is prevented and the main takes the focus, what the navigation would do
// (ADR-0024)
test('the skip link on the error page keeps the error and focuses the main', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'the mobile project would only repeat the same requests')

  await page.route('**/api/customers/abraim-dacosta', (route) => route.fulfill({ status: 404 }))
  await page.goto('/customers')
  await waitForHydration(page)

  // Every ask from before the card click on: once the error is on, the skip link must add none
  const asks: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) asks.push(request.url())
  })

  await page.getByTestId('customer-card__name--link').filter({ hasText: 'Abraim da Costa' }).click()

  await expect(page.getByTestId('error-page__root--div')).toBeVisible()
  const asksOnLanding = asks.length

  // The title holds the focus from the mount, and letting it go does not reset the sequential
  // focus navigation: a Tab from it would reach the error's list link, never the skip link. The
  // skip link takes the focus the way the tabbing of a reader would leave it, and Enter follows it
  await page.getByTestId('layout__skip--link').focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)

  // No new ask of the BFF at all: the error is still there, and the focus went to the main
  expect(asks.length).toBe(asksOnLanding)
  await expect(page.getByTestId('error-page__root--div')).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() => {
        const element = document.activeElement
        return element instanceof HTMLElement
          ? `${element.tagName.toLowerCase()}#${element.id}`
          : ''
      }),
    )
    .toBe('main#conteudo')
})

// Text-only zoom at 200% takes the 15px label to 30px, and at 375px it wraps: the pill must grow with
// it, not let the second line spill out of its 44px
test('the link grows with a label that wraps', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(MISSING)
  await page.addStyleTag({ content: '[data-testid="error-page__list--link"] { font-size: 30px }' })
  const link = page.getByTestId('error-page__list--link')

  const { scrollHeight, clientHeight } = await link.evaluate((element) => ({
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
  }))
  expect(clientHeight).toBeGreaterThan(44)
  expect(scrollHeight).toBeLessThanOrEqual(clientHeight)
})

// The system is dark, so a light page can only come from the click and its cookie
test('the toggle switches the theme of the 404 page and the cookie keeps it', async ({ page }) => {
  await page.goto(MISSING)
  await waitForHydration(page)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await page.getByTestId('header__theme--toggle').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  const reloaded = await page.reload()
  expect(reloaded?.status()).toBe(404)
  expect(await reloaded?.text()).toMatch(/<html[^>]*data-theme="light"/)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})
