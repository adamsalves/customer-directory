import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'
import { waitForHydration } from './hydration'
import { FLAKY_APP_PORT, SOURCE_URL } from './servers'

// The customer page from the list and back, and the page when it cannot open: what the unit specs
// cannot see, since they do not navigate. The mobile project would only repeat the same clicks and
// the same server HTML.
test.skip(({ isMobile }) => isMobile, 'the same at any width: the desktop project is enough')
// A retry would hide the flake of the test that starts a server, so no retry, and the trace is kept
// on failure instead of on a retry that never comes
test.describe.configure({ retries: 0 })
// waitForHydration needs a dark system. The tests that click a link wait for it: before the page is
// interactive the click is a plain navigation, and a test of the client would pass by the speed of
// the build.
test.use({ colorScheme: 'dark', trace: 'retain-on-failure' })

const cards = (page: Page) => page.getByTestId('customer-card__root--article')
const names = (page: Page) => cards(page).getByTestId('customer-card__name--heading')
const links = (page: Page) => page.getByTestId('customer-card__name--link')
const field = (page: Page) => page.getByTestId('header__search--input')
const heroName = (page: Page) => page.getByTestId('customer-hero__name--heading')
const back = (page: Page) => page.getByTestId('customer-detail__back--link')
// The panel of the page is the aside: the sheet has another, with the same test ids
const menBox = (page: Page) =>
  page
    .getByTestId('customers__filters--aside')
    .locator('[data-testid="filter-panel__gender--radio"][value="male"]')
// Both page lists are in the DOM and CSS hides one of them
const pageTwoLink = (page: Page) =>
  page.getByTestId('pagination__page--link').filter({ hasText: /^\s*2\s*$/, visible: true })
const currentPage = (page: Page) =>
  page.getByTestId('pagination__current--number').filter({ visible: true })

// Two frames are enough for what runs a frame after a navigation
const settle = (page: Page) =>
  page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  )

// The error page keeps what the layout gives every page
async function expectLayout(page: Page) {
  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('main')).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
}

// The 13 men of the fixture are two pages, of 9 and 4. Page 2 starts with Melchior da Cunha, who is
// neither the first of the men (Abraim da Costa) nor the first of page 2 with no filter (Deolindo
// da Cunha): a list that lost the filter, the page or both starts with someone else.
const MEN_PAGE_2_QUERY = 'page=2&gender=male'

async function expectMenPageTwo(page: Page) {
  await expect(page).toHaveURL(`/customers?${MEN_PAGE_2_QUERY}`)
  await expect(menBox(page)).toBeChecked()
  await expect(currentPage(page)).toHaveText('2')
  await expect(names(page)).toHaveText([
    'Melchior da Cunha',
    'Nêuton Novaes',
    'Oceano Jesus',
    'Quévin Cavalcanti',
  ])
}

// Every step through the interface, from the filter to the copy and the way back: the link back
// carries the list state, and the list opens on it again
test('a customer opened from page 2 of a filtered list goes back to that same page', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/customers')
  await waitForHydration(page)
  await menBox(page).check()
  await expect(page).toHaveURL('/customers?gender=male')
  // The pagination has to be the one of the filtered list before its link to page 2 is clicked
  await expect(page.getByTestId('list-toolbar__count--text')).toHaveText(
    'Exibindo 1–9 de 13 clientes',
  )
  await pageTwoLink(page).click()
  // The page change moves the focus to the results a frame later, and would take it from what is
  // clicked next
  await expect(page.getByTestId('customers__results--section')).toBeFocused()
  await expectMenPageTwo(page)

  await links(page).filter({ hasText: 'Oceano Jesus' }).click()

  await expect(page).toHaveURL(`/customers/oceano-jesus?${MEN_PAGE_2_QUERY}`)
  await expect(heroName(page)).toHaveText('Oceano Jesus')
  // The toast comes after the write, so the clipboard has the e-mail once it is up
  await page.getByTestId('customer-detail__copy--button').click()
  await expect(page.getByTestId('toast__message--text')).toHaveText('E-mail copiado')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('oceano.jesus@example.com')

  await back(page).click()

  await expectMenPageTwo(page)
})

// The click is a navigation of the client, so the browser is the one that asks the BFF for the
// customer, and the answer is faked: a customer the list had and the BFF no longer has. Before the
// page is interactive the server would be the one asking, out of the browser's reach.
test('a customer the BFF no longer has gives the 404 page, and its link goes back to the list', async ({
  page,
}) => {
  await page.route('**/api/customers/abraim-dacosta', (route) => route.fulfill({ status: 404 }))
  await page.goto('/customers')
  await waitForHydration(page)

  await links(page).first().click()

  await expect(page.getByTestId('error-page__title--heading')).toHaveText('Cliente não encontrado')
  await expect(page).toHaveTitle('Cliente não encontrado · Juntos Somos Mais')
  await expectLayout(page)
  await expect(heroName(page)).toHaveCount(0)

  await page.getByTestId('error-page__list--link').click()

  await expect(page).toHaveURL('/customers')
  await expect(page.getByTestId('customers__title--heading')).toHaveText('Lista de clientes')
  await expect(page.getByTestId('error-page__root--div')).toHaveCount(0)
})

// The page opens on the error from the server HTML: no hydration is needed to see it
test('a source that is down gives the error page with a 502', async ({
  page,
  request,
}, testInfo) => {
  // The app caches the list the first time its source answers, and nothing empties the cache. So a
  // source that is down from the first request needs an instance of its own (the build made by the
  // webServer of playwright.config.ts), as in customerListError.spec.ts. Port and source are per
  // worker, so runs in parallel (--repeat-each) do not meet. The key of the source is this spec's
  // own: the other's, "<n>", is left up or down by its test, and nothing here flips this one up.
  // The "[loadCustomers] source failed" in the log is the failure, on purpose.
  const worker = String(testInfo.parallelIndex)
  const port = FLAKY_APP_PORT + testInfo.parallelIndex
  const appURL = `http://localhost:${String(port)}`
  const downSource = `${SOURCE_URL}/flaky/detail${worker}`
  const server = spawn(
    process.execPath,
    [fileURLToPath(new URL('../../.output/server/index.mjs', import.meta.url))],
    {
      env: { ...process.env, PORT: String(port), NUXT_CUSTOMERS_URL: `${downSource}.json` },
      stdio: ['ignore', 'ignore', 'inherit'],
    },
  )
  try {
    // A static file: a page would read the source
    await expect
      .poll(() =>
        request.get(`${appURL}/logo.png`).then(
          (r) => r.ok(),
          () => false,
        ),
      )
      .toBe(true)

    const response = await page.goto(`${appURL}/customers/abraim-dacosta`)

    expect(response?.status()).toBe(502)
    await expect(page).toHaveTitle('Algo deu errado · Juntos Somos Mais')
    await expect(page.getByTestId('error-page__title--heading')).toHaveText('Algo deu errado')
    await expectLayout(page)
  } finally {
    // The next run of this worker takes the same port
    if (server.exitCode === null) {
      server.kill()
      await once(server, 'exit')
    }
  }
})

// [id].vue encodes the slug it asks the BFF for: a `../` in it would walk out of /api/customers/ to
// a route that answers with no customer, and the page would give a 500 for what is a 404
test('a slug made of encoded slashes is a 404, not a 500', async ({ request }) => {
  const response = await request.get('/customers/..%2F..%2F..%2F')

  expect(response.status()).toBe(404)
})

// The search leaves the customer page for the list, from page 1 and as a new entry of the history.
// The address carries page 2, so a search that kept the page of the address would be on page 2.
test('a search typed on a customer page goes to page 1 of the list, and back returns to the customer', async ({
  page,
}) => {
  const detail = '/customers/oceano-jesus?page=2'
  await page.goto(detail)
  await waitForHydration(page)

  await field(page).fill('girao')

  await expect(page).toHaveURL('/customers?search=girao')
  await expect(names(page)).toHaveText(['Girão da Rosa'])

  await page.goBack()

  await expect(page).toHaveURL(detail)
  await expect(heroName(page)).toHaveText('Oceano Jesus')
})

// The wait of 300 ms before a search reaches the URL does not follow the reader to a customer: it
// would take them back to the list. The clock is paused so the click is made with the wait still
// running, however slow the machine is, and then it runs past the 300 ms.
test('a search not yet written is dropped when a customer is opened', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T08:00:00') })
  await page.goto('/customers')
  await waitForHydration(page)
  await page.clock.pauseAt(new Date('2026-01-01T09:00:00'))
  await field(page).fill('girao')

  await links(page).first().click()
  // Nuxt holds a navigation for a frame (100 ms at most) before it resolves it, and a stopped
  // clock never gives it. The clock runs 20 ms at a time until the page opens, 160 ms at the most
  // in the 5 s of the poll: the wait of 300 ms is still running when the page opens.
  await expect
    .poll(async () => {
      await page.clock.runFor(20)
      return new URL(page.url()).pathname
    })
    .toBe('/customers/abraim-dacosta')
  await expect(heroName(page)).toHaveText('Abraim da Costa')

  await page.clock.runFor(400)
  // The write the wait would have made is a navigation: the clock runs again, so that it has the
  // frames to land before the address is read
  await page.clock.resume()
  await settle(page)

  await expect(page).toHaveURL('/customers/abraim-dacosta')
  await expect(heroName(page)).toHaveText('Abraim da Costa')
})
