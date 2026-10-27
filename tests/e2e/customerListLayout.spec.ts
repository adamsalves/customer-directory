import { expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test'
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

// The shortcut hint of the search field is in the HTML at any width, and CSS shows it from 960px
// while the field is empty
for (const { width, shown } of [
  { width: 375, shown: false },
  { width: 959, shown: false },
  { width: 1280, shown: true },
]) {
  test(`the search shortcut hint at ${String(width)}px`, async ({ page }) => {
    await openList(page, width)

    await expect(page.getByTestId('header__search--hint')).toBeVisible({ visible: shown })
  })
}

// The search field is 48px tall, and 44px below 640px
for (const { width, height } of [
  { width: 768, height: 48 },
  { width: 375, height: 44 },
]) {
  test(`the search field is ${String(height)}px tall at ${String(width)}px`, async ({ page }) => {
    await openList(page, width)

    await expect(page.getByTestId('header__search--input')).toHaveCSS(
      'height',
      `${String(height)}px`,
    )
  })
}

// The hint repeats the search, which can be 100 characters with no space (MAX_SEARCH_LENGTH), like
// an email. It breaks inside the word: else it is wider than the empty state and the page scrolls
// sideways.
for (const width of [320, 375]) {
  test(`a long search in the empty state at ${String(width)}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await page.goto(`/customers?search=${'w'.repeat(100)}`)

    const hint = page.getByTestId('empty-state__hint--text')
    await expect(hint).toBeVisible()
    const box = await hint.evaluate((el) => {
      const parent = el.parentElement?.getBoundingClientRect()
      const own = el.getBoundingClientRect()
      if (!parent) throw new Error('the hint has no parent')
      return {
        left: own.left - parent.left,
        right: parent.right - own.right,
        overflow: el.scrollWidth - el.clientWidth,
      }
    })
    // Inside the empty state, and the text inside the hint
    expect(box.left).toBeGreaterThanOrEqual(0)
    expect(box.right).toBeGreaterThanOrEqual(0)
    expect(box.overflow).toBe(0)
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scroll).toBe(width)
  })
}

// The theme is the cookie, which the server renders at once: nothing flips after the page loads
async function openListIn(page: Page, context: BrowserContext, theme: string, width: number) {
  await context.addCookies([{ name: 'jsm-theme', value: theme, domain: 'localhost', path: '/' }])
  await openList(page, width)
}

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('the element is not rendered')
  return box
}

type TBox = { x: number; width: number }
// Where the search starts: a gap after the image, or after the 272px column that starts with it
const afterImage = (gap: number) => (image: TBox) => image.x + image.width + gap
const afterColumn = (image: TBox) => image.x + 272 + 16

// The header row, in both themes. The dark one puts the logo on a light pill, --logo-pill-pad (6px)
// around the image: the link is that pill, its focus ring and its click area, so it is as wide as
// the image and the pad on each side, and no more. From 960px the logo has a column of 272px in the
// header grid and the search starts 16px after it, counted from the image, in either theme; below
// that the search follows the logo by a gap of 16px (12px under 640px). The header is 97px tall
// from 640px and 69px under it, the two numbers base.scss holds in scroll-padding. The theme toggle
// is at the far end of the row, the padding of the header (24px, 16px under 640px) from its edge.
for (const theme of ['light', 'dark']) {
  const pad = theme === 'dark' ? 6 : 0

  for (const { width, height, inset, searchAt } of [
    { width: 375, height: 69, inset: 16, searchAt: afterImage(12) },
    { width: 639, height: 69, inset: 16, searchAt: afterImage(12) },
    { width: 640, height: 97, inset: 24, searchAt: afterImage(16) },
    { width: 959, height: 97, inset: 24, searchAt: afterImage(16) },
    { width: 960, height: 97, inset: 24, searchAt: afterColumn },
    { width: 1280, height: 97, inset: 24, searchAt: afterColumn },
  ]) {
    test(`the header at ${String(width)}px in the ${theme} theme`, async ({ page, context }) => {
      await openListIn(page, context, theme, width)

      const header = await boxOf(page.getByRole('banner'))
      const link = await boxOf(page.getByTestId('header__logo--link'))
      const image = await boxOf(page.getByTestId('header__logo--image'))
      const form = await boxOf(page.getByTestId('header__search--form'))
      const toggle = await boxOf(page.getByTestId('header__theme--toggle'))

      expect(header.height).toBeCloseTo(height, 1)
      expect(link.width).toBeCloseTo(image.width + 2 * pad, 1)
      expect(form.x).toBeCloseTo(searchAt(image), 1)
      // The row is as wide as the header up to 1184px and centered beyond
      const row = Math.min(1184, header.width)
      expect(toggle.x + toggle.width).toBeCloseTo((header.width + row) / 2 - inset, 1)
    })
  }
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
