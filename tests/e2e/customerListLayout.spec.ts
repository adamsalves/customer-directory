import { expect, test, type Locator, type Page } from '@playwright/test'
import { waitForHydration } from './hydration'

// ADR-0014: the layout changes in CSS, at 640px and at 960px. happy-dom applies no media query,
// so the component specs cannot see any of it and these are the tests that do.

const cards = (page: Page) => page.getByTestId('customer-card__root--article')
const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true })

// Page 1 of the fixture has 9 cards
async function openList(page: Page, width: number) {
  await page.setViewportSize({ width, height: 800 })
  await page.goto('/customers')
  await expect(cards(page)).toHaveCount(9)
}

// Below 640px a card is a row and its location is one line; from there the card is a column and
// the location has two lines. CSS shows one of each pair, and display:none keeps the other out of
// the accessibility tree, so the location is read once.
for (const { width, row } of [
  { width: 375, row: true },
  { width: 1280, row: false },
]) {
  test(`the card, its location and the pagination at ${String(width)}px`, async ({ page }) => {
    await openList(page, width)

    // The name is beside the avatar in a row and under it in a column
    const card = cards(page).first()
    const avatar = await card.getByTestId('customer-card__avatar--image').boundingBox()
    const name = await card.getByTestId('customer-card__name--heading').boundingBox()
    if (!avatar || !name) throw new Error('the card is not rendered')
    const beside = name.x >= avatar.x + avatar.width && name.y < avatar.y + avatar.height
    expect(beside, 'the name is beside the avatar').toBe(row)

    await expect(visible(page, 'customer-card__location--row')).toHaveCount(row ? 9 : 0)
    await expect(visible(page, 'customer-card__location--grid')).toHaveCount(row ? 0 : 9)
    await expect(page.getByTestId('pagination__compact--list')).toBeVisible({ visible: row })
    await expect(page.getByTestId('pagination__full--list')).toBeVisible({ visible: !row })
  })
}

// One column below 640px, then a grid with as many columns as fit: 208px each at least up to 960px
// (232px from there). At 768px that is 3 columns, where 232px would fit 2.
for (const { width, columns } of [
  { width: 375, columns: 1 },
  { width: 639, columns: 1 },
  { width: 640, columns: 2 },
  { width: 768, columns: 3 },
]) {
  test(`the list columns at ${String(width)}px`, async ({ page }) => {
    await openList(page, width)

    // The cards of a column share their left edge
    const lefts = await cards(page).evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().x),
    )
    expect(new Set(lefts).size).toBe(columns)
  })
}

for (const { width, shown } of [
  { width: 639, shown: true },
  { width: 640, shown: false },
]) {
  test(`the card chevron at ${String(width)}px`, async ({ page }) => {
    await openList(page, width)

    await expect(visible(page, 'customer-card__chevron--icon')).toHaveCount(shown ? 9 : 0)
  })
}

// The card lifts on hover only from 640px and only where a pointer can hover (ADR-0013). The mobile
// project has a touch screen, which does not match (hover: hover): there is nothing to lift in it.
test.describe('hover', () => {
  test.skip(({ isMobile }) => isMobile, 'a touch screen does not match (hover: hover)')

  // The transform is only final once the entrance animation has ended and, after a hover, once
  // the transition that the hover starts has too
  const settled = (card: Locator) =>
    card.evaluate(async (el) => {
      await Promise.allSettled(el.getAnimations().map((animation) => animation.finished))
    })

  for (const { width, transform } of [
    { width: 640, transform: 'matrix(1, 0, 0, 1, 0, -2)' },
    { width: 639, transform: 'none' },
  ]) {
    test(`hovering a card at ${String(width)}px`, async ({ page }) => {
      await openList(page, width)
      const card = cards(page).first()
      await settled(card)

      await card.hover()
      // The pointer is on the card, so "no lift" cannot be a hover that never happened
      await expect.poll(() => card.evaluate((el) => el.matches(':hover'))).toBe(true)
      await settled(card)
      await expect(card).toHaveCSS('transform', transform)
    })
  }
})

// The request held here is the one of the browser, so the page has to be interactive before the
// click: before it a link is a plain navigation. waitForHydration needs a dark system.
test.describe('the skeleton while the next page loads', () => {
  test.use({ colorScheme: 'dark' })

  // The boxes of the card: a row of 98px (64px avatar, 16px padding and 1px border on each side), or
  // the 310px of the grid
  for (const { width, height } of [
    { width: 375, height: 98 },
    { width: 1280, height: 310 },
  ]) {
    test(`it has the height of the card at ${String(width)}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.goto('/customers?perPage=18')
      await waitForHydration(page)
      const answer: PromiseWithResolvers<void> = Promise.withResolvers()
      await page.route(/\/api\/customers\?/, async (route) => {
        await answer.promise
        await route.continue()
      })

      await visible(page, 'pagination__page--link')
        .filter({ hasText: /^\s*2\s*$/ })
        .click()

      // Nine, whatever the page size: this one asked for 18
      const skeletons = page.getByTestId('customer-card-skeleton__root--block')
      await expect(skeletons).toHaveCount(9)
      const heights = await skeletons.evaluateAll((els) =>
        els.map((el) => el.getBoundingClientRect().height),
      )
      expect(Math.min(...heights)).toBeGreaterThanOrEqual(height - 1)
      expect(Math.max(...heights)).toBeLessThanOrEqual(height + 1)

      answer.resolve()
      await expect(cards(page)).toHaveCount(2)
      await expect(skeletons).toHaveCount(0)
    })
  }
})
