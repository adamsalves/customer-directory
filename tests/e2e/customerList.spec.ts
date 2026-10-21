import { expect, test, type Page } from '@playwright/test'

// ADR-0009: the server reads the 20-record fixture, not the 200 records on S3. Page 3 is then
// the last page, with 2 cards; on S3 it would have 9.
test('the list renders the local fixture, not S3', async ({ page }) => {
  await page.goto('/customers?page=3')

  await expect(page.getByTestId('customer-card__root--article')).toHaveCount(2)
})

// The page links point at /customers, so RouterLink sees them as exact-active there: only the
// current page may carry aria-current="page"
test('the pagination marks only the current page', async ({ page }) => {
  await page.goto('/customers?page=2')
  const nav = page.getByRole('navigation', { name: 'Paginação' })

  await expect(nav.locator('a[aria-current="page"]')).toHaveCount(0)
  // Both page lists are in the DOM and CSS hides one of them
  const current = nav.locator('[aria-current="page"]').filter({ visible: true })
  await expect(current).toHaveCount(1)
  await expect(current.getByTestId('pagination__current--number')).toHaveText('2')
  // The screen reader gets "Página 2, atual" as text that takes no room
  const label = current.getByTestId('pagination__current--label')
  await expect(label).toHaveText('Página 2, atual')
  expect(await label.boundingBox()).toMatchObject({ width: 1, height: 1 })
})

const pageTwoLink = (page: Page) =>
  page.getByRole('navigation', { name: 'Paginação' }).getByRole('link', { name: 'Página 2' })

// The fixture has 3 pages, too few for an ellipsis, so the next answer claims 23: the widest
// compact list ("1 2 3 … 23") has to fit a 320px screen
test('the widest compact list fits a 320px screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('/customers')
  await page.route(/\/api\/customers\?/, (route) =>
    route.fulfill({ json: { items: [], total: 200, page: 3, perPage: 9, totalPages: 23 } }),
  )
  await pageTwoLink(page).click()
  const nav = page.getByRole('navigation', { name: 'Paginação' })
  await expect(nav.getByRole('link', { name: 'Página 23' })).toBeVisible()

  // Inside the 16px gutters of the page, so nothing scrolls sideways or touches the edge
  const box = await nav.boundingBox()
  if (!box) throw new Error('pagination not rendered')
  expect(box.width).toBeLessThanOrEqual(320 - 2 * 16)
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(320)
})

// ADR-0014: the compact list below 640px. The issue: targets of 44px below 960px; from there the
// arrows are 32px and the page links 32px wide and 40px tall (the prototype)
for (const { width, compact, arrow, link } of [
  { width: 639, compact: true, arrow: 44, link: { width: 44, height: 44 } },
  { width: 640, compact: false, arrow: 44, link: { width: 44, height: 44 } },
  { width: 959, compact: false, arrow: 44, link: { width: 44, height: 44 } },
  { width: 960, compact: false, arrow: 32, link: { width: 32, height: 40 } },
]) {
  test(`the pagination at ${String(width)}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await page.goto('/customers')

    await expect(page.getByTestId('pagination__compact--list')).toBeVisible({ visible: compact })
    await expect(page.getByTestId('pagination__full--list')).toBeVisible({ visible: !compact })
    const arrowBox = await page.getByTestId('pagination__next--link').boundingBox()
    const linkBox = await page.getByRole('link', { name: 'Página 2' }).boundingBox()
    expect(arrowBox).toMatchObject({ width: arrow, height: arrow })
    expect(linkBox).toMatchObject(link)
  })
}
