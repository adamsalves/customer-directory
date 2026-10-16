import { expect, test } from '@playwright/test'

test('home responds 200', async ({ page }) => {
  const response = await page.goto('/')

  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Diretório de membros')
})
