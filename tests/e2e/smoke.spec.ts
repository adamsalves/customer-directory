import { expect, test } from '@playwright/test'

test('the root redirects to the customer list', async ({ page }) => {
  // The redirect comes from the server, not from client-side navigation
  const redirect = await page.request.get('/', { maxRedirects: 0 })
  expect(redirect.status()).toBe(307)
  expect(redirect.headers().location).toBe('/clientes')

  const response = await page.goto('/')

  expect(response?.status()).toBe(200)
  await expect(page).toHaveURL(/\/clientes$/)
  await expect(page.getByTestId('customers__title--heading')).toHaveText('Lista de clientes')
})

test('the layout exposes the header, main and footer landmarks', async ({ page }) => {
  await page.goto('/clientes')

  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('main')).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
})

test('the skip link is the first tab stop and moves focus to the main content', async ({
  page,
}) => {
  await page.goto('/clientes')

  await page.keyboard.press('Tab')
  const skipLink = page.getByTestId('layout__skip--link')
  await expect(skipLink).toBeFocused()
  await expect(skipLink).toBeInViewport()

  await page.keyboard.press('Enter')
  await expect(page.getByTestId('layout__content--main')).toBeFocused()
})

test('the skip link does not leave the heading under the sticky header', async ({ page }) => {
  // Short landscape viewport: the page scrolls, so the fragment jump lands under the header
  await page.setViewportSize({ width: 667, height: 375 })
  await page.goto('/clientes')

  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('layout__content--main')).toBeFocused()

  const header = await page.getByRole('banner').boundingBox()
  const title = await page.getByTestId('customers__title--heading').boundingBox()
  if (!header || !title) throw new Error('layout not rendered')
  expect(title.y).toBeGreaterThanOrEqual(header.y + header.height)
})
