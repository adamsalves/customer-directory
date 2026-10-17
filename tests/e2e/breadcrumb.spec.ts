import { expect, test } from '@playwright/test'

// Home points at /clientes, so RouterLink sees it as exact-active there
test('the trail marks only the last step as the current page', async ({ page }) => {
  await page.goto('/clientes')

  const current = page
    .getByRole('navigation', { name: 'Trilha de navegação' })
    .locator('[aria-current="page"]')
  await expect(current).toHaveCount(1)
  await expect(current).toHaveText('Usuários')
})
