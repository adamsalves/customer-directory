import { expect, test, type Locator, type Page } from '@playwright/test'
import { waitForHydration } from './hydration'

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

// Both page lists are in the DOM and CSS hides one of them
const pageTwoLink = (page: Page) =>
  page.getByTestId('pagination__page--link').filter({ hasText: /^\s*2\s*$/, visible: true })

// toBeInViewport would also pass for a card under the sticky header, so the top of the list is
// measured against the header, and below 960px the bar of the sheet under it (#26): it settles 24px
// below them (the scroll is smooth)
test('changing page brings the top of the list back under the header', async ({ page }) => {
  await page.goto('/customers')
  await pageTwoLink(page).click()
  await expect(page).toHaveURL(/page=2/)

  const header = await page.getByRole('banner').boundingBox()
  const bar = page.getByTestId('filter-sheet__bar--div')
  const barHeight = (await bar.isVisible()) ? ((await bar.boundingBox())?.height ?? 0) : 0
  const list = page.getByTestId('customers__list--list')
  await expect
    .poll(async () => {
      const box = await list.boundingBox()
      return box && header ? Math.round(box.y - (header.y + header.height + barHeight)) : undefined
    })
    .toBe(24)
})

const resultsSection = (page: Page) => page.getByTestId('customers__results--section')
const perPageSelect = (page: Page) => page.getByTestId('pagination__per-page--select')
const cards = (page: Page) => page.getByTestId('customer-card__root--article')
// Both page lists are in the DOM and CSS hides one of them
const currentPage = (page: Page) =>
  page.getByTestId('pagination__current--number').filter({ visible: true })

// Two frames are enough for what runs a frame after a navigation: the focus and the anchoring
const settle = (page: Page) =>
  page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  )

// waitForHydration needs a dark system. The keys do nothing useful before the page is interactive:
// Enter on a link is then a plain navigation.
test.describe('with the keyboard', () => {
  test.use({ colorScheme: 'dark' })

  // The reader who changes the page size is on the select. The list above it changes height twice
  // (list, skeleton of 9, list) and the select has to stay where it was, with the focus. A scroll to
  // the top of the list would take it off the screen, so nothing scrolls but the correction.
  // Reduced motion makes any scroll instant.
  for (const { name, path, noAnchoring = false, shortScreen = false } of [
    // A middle page. Chromium does not anchor the select here since the results got their wrapper
    // (it did before), so this guards the correction should it start anchoring again
    { name: 'page 2', path: '/customers?page=2' },
    // The last page has 2 cards and the page is at the top, where no browser anchors to anything
    { name: 'page 3, with 2 cards', path: '/customers?page=3', shortScreen: true },
    // As in Safari before 27, which has no scroll anchoring at all
    { name: 'page 2 without scroll anchoring', path: '/customers?page=2', noAnchoring: true },
  ]) {
    test(`changing the page size keeps the select where it was: ${name}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto(path)
      await waitForHydration(page)
      if (noAnchoring) await page.addStyleTag({ content: 'html { overflow-anchor: none }' })
      const select = perPageSelect(page)
      if (shortScreen) {
        // A page cannot scroll past its end, and the footer fills what a taller screen leaves under
        // the 2 cards: the select would end that much lower. This screen is just tall enough for it.
        const box = await select.boundingBox()
        const size = page.viewportSize()
        if (!box || !size) throw new Error('the page size select is not rendered')
        await page.setViewportSize({
          width: size.width,
          height: Math.ceil(box.y + box.height) + 40,
        })
      }
      await select.focus()
      const before = await select.boundingBox()

      await page.keyboard.press('ArrowDown')
      await expect(page).toHaveURL(/\?perPage=18$/)
      await expect(page.getByTestId('customer-card__root--article')).toHaveCount(18)
      await settle(page)

      const after = await select.boundingBox()
      if (!before || !after) throw new Error('the page size select is not rendered')
      expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1)
      await expect(select).toBeFocused()
    })
  }

  // The page link that was used turns into the current-page span, and the focus would be lost.
  // Going back leaves the focus where it is: the select takes it first, so a plugin that also
  // focused the results on a pop would be caught.
  test('a page link leaves the focus on the results, and going back does not move it', async ({
    page,
  }) => {
    await page.goto('/customers')
    await waitForHydration(page)
    await pageTwoLink(page).focus()

    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/page=2/)
    await expect(resultsSection(page)).toBeFocused()
    // It takes focus from code, not from a tab: a ring around the whole list would be noise
    await expect(resultsSection(page)).toHaveCSS('outline-style', 'none')

    await perPageSelect(page).focus()
    await page.goBack()
    await expect(page).toHaveURL(/\/customers$/)
    // Page 1 has come back: its "Página 2" is a link again
    await expect(pageTwoLink(page)).toBeVisible()
    await settle(page)
    await expect(perPageSelect(page)).toBeFocused()
  })
})

// The answer to the list request, faked in the browser. A page link is a client navigation, so the
// browser is the one that asks: before the page is interactive it is a plain navigation, answered
// by the server. Page 1 asks with no query. A new answer replaces the one before it.
const LIST_REQUEST = /\/api\/customers(\?|$)/
type TAnswer = { page: number; totalPages: number }
async function fakeAnswer(page: Page, answer: TAnswer) {
  await page.unroute(LIST_REQUEST)
  await page.route(LIST_REQUEST, (route) =>
    route.fulfill({ json: { items: [], total: answer.totalPages * 9, perPage: 9, ...answer } }),
  )
}

// Inside the 16px gutters of the page, so nothing scrolls sideways or touches the edge. The nav is
// centered, so one that is too wide spills on both sides.
async function expectInsideGutters(nav: Locator, width: number) {
  const box = await nav.boundingBox()
  if (!box) throw new Error('pagination not rendered')
  expect(box.x).toBeGreaterThanOrEqual(16)
  expect(box.x + box.width).toBeLessThanOrEqual(width - 16)
}

// Up to 5 pages the compact list shows every number, and "‹ 1 2 3 4 5 ›" is the widest of them:
// seven targets, 348px with their spaces and 308px without. Below 960px a target is 44px, or a
// seventh of the container when that is less (ADR-0013), and the nav has to stay inside the 16px
// gutters from a 280px screen (a Galaxy Fold) to a 375px one. The answers claim 2 to 5 pages (the
// fixture has 3), the last one current: the fixture answers a click with page 1 or 2 of 3, so it
// never matches both the current page and the count.
test.describe('the compact list with up to 5 pages', () => {
  // The page has to be interactive before the click. waitForHydration needs a dark system.
  test.use({ colorScheme: 'dark' })
  test.skip(({ isMobile }) => isMobile, 'the width is set by the test, whatever the project')

  // The fixture has 3 pages, too few for an ellipsis, so the next answer claims 23: the widest
  // compact list with an ellipsis ("1 2 3 … 23") has to fit a 320px screen.
  test('the widest one with an ellipsis fits a 320px screen', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await page.goto('/customers')
    await waitForHydration(page)
    await fakeAnswer(page, { page: 3, totalPages: 23 })
    await pageTwoLink(page).click()
    const nav = page.getByRole('navigation', { name: 'Paginação' })
    await expect(nav.getByRole('link', { name: 'Página 23' })).toBeVisible()

    await expectInsideGutters(nav, 320)
  })

  for (const width of [280, 320, 360, 375]) {
    test(`2 to 5 pages fit a ${String(width)}px screen`, async ({ page }) => {
      await page.setViewportSize({ width, height: 640 })
      await page.goto('/customers')
      await waitForHydration(page)
      const nav = page.getByRole('navigation', { name: 'Paginação' })
      // Both page lists are in the DOM and CSS hides one of them
      const links = page.getByTestId('pagination__page--link').filter({ visible: true })
      // 16px gutters on each side
      const size = Math.min(44, (width - 32) / 7)

      for (const [index, totalPages] of [2, 3, 4, 5].entries()) {
        await test.step(`${String(totalPages)} pages`, async () => {
          await fakeAnswer(page, { page: totalPages, totalPages })
          // Page 2 and page 1 in turn, never the current one. The URL goes between them, since a
          // link to the page the URL is on asks for nothing.
          await page.getByRole('link', { name: index % 2 === 0 ? 'Página 2' : 'Página 1' }).click()
          await expect(currentPage(page)).toHaveText(String(totalPages))
          // Every number is in the list, none behind an ellipsis
          await expect(
            page.getByTestId('pagination__compact--list').getByTestId('pagination__page--item'),
          ).toHaveCount(totalPages)

          await expectInsideGutters(nav, width)
          // The arrow and a page link are both squares of one target
          for (const target of [page.getByTestId('pagination__prev--link'), links.first()]) {
            const box = await target.boundingBox()
            if (!box) throw new Error('target not rendered')
            expect(box.width).toBeCloseTo(size, 1)
            expect(box.height).toBeCloseTo(size, 1)
          }
        })
      }
    })
  }
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

// From 960px the targets are the prototype's 32px whatever the container: only below 960px does a
// narrow one shrink them (ADR-0013). Limiting the container, which is the nav's parent, to 280px
// is a column that narrow at 1280px. Its gaps go below 348px of container, and the targets stay.
test('a narrow container leaves the 32px targets of 960px alone', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/customers')
  const nav = page.getByTestId('pagination__root--nav')

  // 5 targets of 32px with the gaps of 12px (2) and 4px (2)
  expect((await nav.boundingBox())?.width).toBe(192)
  await page.addStyleTag({
    content: ':has(> [data-testid="pagination__root--nav"]) { inline-size: 280px }',
  })

  expect((await nav.boundingBox())?.width).toBe(160)
  expect(await page.getByTestId('pagination__next--link').boundingBox()).toMatchObject({
    width: 32,
    height: 32,
  })
  expect(await page.getByRole('link', { name: 'Página 2' }).boundingBox()).toMatchObject({
    width: 32,
    height: 40,
  })
})

// Changing the page size starts over from page 1, so page 2 of 18 is one more step (#18). The
// fixture has 20 records: 18 on the first page and 2 on the second.
async function expectPageTwoOf18(page: Page) {
  await expect(cards(page)).toHaveCount(2)
  await expect(currentPage(page)).toHaveText('2')
  await expect(perPageSelect(page)).toHaveValue('18')
}

// The select does nothing before the page is interactive, and waitForHydration needs a dark system
test.describe('from the root', () => {
  test.use({ colorScheme: 'dark' })

  test('page 2, then 18 per page, then page 2 again', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/customers')
    await waitForHydration(page)

    await pageTwoLink(page).click()
    await expect(page).toHaveURL('/customers?page=2')
    await expect(currentPage(page)).toHaveText('2')

    await perPageSelect(page).selectOption('18')
    await expect(page).toHaveURL('/customers?perPage=18')
    await expect(cards(page)).toHaveCount(18)
    await expect(currentPage(page)).toHaveText('1')

    await pageTwoLink(page).click()
    await expect(page).toHaveURL('/customers?page=2&perPage=18')
    await expectPageTwoOf18(page)
  })
})

test('opening page 2 with 18 per page shows the same state', async ({ page }) => {
  await page.goto('/customers?page=2&perPage=18')

  await expectPageTwoOf18(page)
})
