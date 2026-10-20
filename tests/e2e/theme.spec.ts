import { expect, test, type Page } from '@playwright/test'

// A dark system means every light theme below can only come from the cookie (ADR-0011)
test.use({ colorScheme: 'dark' })

declare global {
  interface Window {
    __themeChanges?: string[]
  }
}

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
    window.__themeChanges = changes
  })

  await page.goto('/customers')
  await waitForHydration(page)

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  // The first change is the inline script in <head>, before the first paint. Nothing after it
  // removes the attribute or sets another theme.
  const changes = await page.evaluate(() => window.__themeChanges?.join(',') ?? '')
  expect(changes).toMatch(/^dark@head(,dark@(head|body))*$/)
  // A production build only logs structural and text mismatches; attribute mismatches are patched
  // silently, so this cannot catch them.
  expect(messages.filter((text) => text.includes('Hydration'))).toEqual([])
})

test('clicking the toggle saves the cookie and a reload keeps the theme', async ({
  page,
  context,
}) => {
  await page.goto('/customers')
  await waitForHydration(page)

  await page.getByTestId('header__theme--toggle').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  const cookie = (await context.cookies()).find(({ name }) => name === 'jsm-theme')
  if (!cookie) throw new Error('the toggle did not write the jsm-theme cookie')
  // No sameSite here: Chromium reports a missing SameSite as Lax, so only the setter spy in
  // AppThemeToggle.spec.ts can prove it.
  expect(cookie).toMatchObject({ value: 'light', path: '/' })
  // `expires` is in seconds: about one year, with a day of slack on each side
  const day = 24 * 60 * 60
  expect(cookie.expires).toBeGreaterThan(Date.now() / 1000 + 364 * day)
  expect(cookie.expires).toBeLessThan(Date.now() / 1000 + 366 * day)

  // The cookie beats the dark system: the server renders light and nothing flips it back. With the
  // cookie the toggle label is the same on server and client, so there is no hydration signal to
  // wait for and the last check is a snapshot in time.
  const reloaded = await page.reload()
  expect(await reloaded?.text()).toMatch(/<html[^>]*data-theme="light"/)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('a request with the cookie gets the theme in the server HTML', async ({ page }) => {
  const response = await page.request.get('/customers', { headers: { cookie: 'jsm-theme=dark' } })

  expect(response.status()).toBe(200)
  expect(await response.text()).toMatch(/<html[^>]*data-theme="dark"/)
})

test('the keyboard reaches the toggle after the skip link and the logo', async ({ page }) => {
  await page.goto('/customers')
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
