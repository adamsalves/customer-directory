import { expect, test, type Page } from '@playwright/test'

// A dark system means every light theme below can only come from the cookie (ADR-0011)
test.use({ colorScheme: 'dark' })

// With no cookie the server renders the toggle as "Ativar tema escuro". Once Vue has mounted it
// adopts the system theme and the label flips, so the flip proves the page is interactive.
async function waitForHydration(page: Page) {
  await expect(page.getByTestId('header__theme--toggle')).toHaveAccessibleName('Ativar tema claro')
}

test('with no cookie and a dark system, the page opens dark without a flash', async ({ page }) => {
  const messages: string[] = []
  page.on('console', (message) => messages.push(message.text()))
  // Logs "<theme>@<head|body>" for every change of <html data-theme>. It watches `document`
  // because <html> does not exist yet when init scripts run; <body> does not exist while <head>
  // is parsed.
  await page.addInitScript(() => {
    const changes: string[] = []
    new MutationObserver((records) => {
      records.forEach(() => {
        const theme = document.documentElement.getAttribute('data-theme') ?? 'none'
        changes.push(`${theme}@${document.querySelector('body') ? 'body' : 'head'}`)
      })
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-theme'] })
    Reflect.set(window, '__themeChanges', changes)
  })

  await page.goto('/clientes')
  await waitForHydration(page)

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  // The first change is the inline script in <head>, before the first paint. Nothing after it
  // removes the attribute or sets another theme.
  const changes = await page.evaluate(() => String(Reflect.get(window, '__themeChanges')))
  expect(changes).toMatch(/^dark@head(,dark@(head|body))*$/)
  expect(messages.filter((text) => text.includes('Hydration'))).toEqual([])
})

test('clicking the toggle saves the cookie and a reload keeps the theme', async ({
  page,
  context,
}) => {
  await page.goto('/clientes')
  await waitForHydration(page)

  await page.getByTestId('header__theme--toggle').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  const cookie = (await context.cookies()).find(({ name }) => name === 'jsm-theme')
  if (!cookie) throw new Error('the toggle did not write the jsm-theme cookie')
  expect(cookie).toMatchObject({ value: 'light', path: '/', sameSite: 'Lax' })
  // `expires` is in seconds. One year, minus a day of slack for the time the test took.
  expect(cookie.expires).toBeGreaterThan(Date.now() / 1000 + 364 * 24 * 60 * 60)

  // The cookie beats the dark system: the server renders light and nothing flips it back
  const reloaded = await page.reload()
  expect(await reloaded?.text()).toMatch(/<html[^>]*data-theme="light"/)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('a request with the cookie gets the theme in the server HTML', async ({ page }) => {
  const response = await page.request.get('/clientes', { headers: { cookie: 'jsm-theme=dark' } })

  expect(response.status()).toBe(200)
  expect(await response.text()).toMatch(/<html[^>]*data-theme="dark"/)
})

test('the keyboard reaches the toggle after the skip link and the logo', async ({ page }) => {
  await page.goto('/clientes')
  await waitForHydration(page)

  await page.keyboard.press('Tab')
  await expect(page.getByTestId('layout__skip--link')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByTestId('header__logo--link')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByTestId('header__theme--toggle')).toBeFocused()

  await page.keyboard.press('Enter')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})
