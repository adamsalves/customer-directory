import { expect, test } from '@playwright/test'

// ADR-0009: the server reads the 20-record fixture, not the 200 records on S3. Page 3 is then
// the last page, with 2 cards; on S3 it would have 9.
test('the list renders the local fixture, not S3', async ({ page }) => {
  await page.goto('/customers?page=3')

  await expect(page.getByTestId('customer-card__root--article')).toHaveCount(2)
})
