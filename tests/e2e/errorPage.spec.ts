import { expect, test } from '@playwright/test'
import { waitForHydration } from './hydration'

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
