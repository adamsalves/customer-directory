import { expect, test } from '@playwright/test'

test('the root redirects to the customer list', async ({ page }) => {
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
