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
// (232px from there). At 768px that is 3 columns, where 232px would fit 2. From 960px the filter
// panel and its gap take 288px of the row: 2 columns at 960px, 3 at 1280px, where the cards would
// fit 3 and 4 without it.
for (const { width, columns } of [
  { width: 375, columns: 1 },
  { width: 639, columns: 1 },
  { width: 640, columns: 2 },
  { width: 768, columns: 3 },
  { width: 959, columns: 4 },
  { width: 960, columns: 2 },
  { width: 1280, columns: 3 },
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

// The filter panel is out of the page below 960px until the sheet (#26): display none, so it is out of
// the accessibility tree too and no tab stop is left behind a hidden control.
for (const width of [375, 959]) {
  test(`the filter panel is out of the page at ${String(width)}px`, async ({ page }) => {
    await openList(page, width)

    await expect(page.getByTestId('customers__filters--aside')).toBeHidden()
    await expect(page.getByRole('complementary', { name: 'Filtros' })).toHaveCount(0)
  })
}

// From 960px it is a column of 272px, 16px before the results, which take the rest of the row, and
// it is as tall as what it holds, not as the cards beside it.
for (const width of [960, 1280]) {
  test(`the filter panel is a column of 272px at ${String(width)}px`, async ({ page }) => {
    await openList(page, width)

    const panel = await boxOf(page.getByRole('complementary', { name: 'Filtros' }))
    const column = await boxOf(page.getByTestId('customers__column--div'))
    expect(panel.width).toBeCloseTo(272, 1)
    expect(column.x - (panel.x + panel.width)).toBeCloseTo(16, 1)
    // The page is 24px in from each edge, up to 1184px
    expect(column.width).toBeCloseTo(Math.min(1184, width) - 48 - 272 - 16, 1)
    expect(panel.y).toBeCloseTo(column.y, 1)
    expect(panel.height).toBeLessThan(column.height / 2)
  })
}

// The grid takes its width from the page, not from what is in it: a wide child (a name with no break,
// a toolbar to come) overflows the results instead of widening the column, and of pushing the panel
// off its place from 960px.
for (const width of [375, 1280]) {
  test(`a wide result does not widen the page grid at ${String(width)}px`, async ({ page }) => {
    await openList(page, width)
    const column = page.getByTestId('customers__column--div')
    const before = (await boxOf(column)).width

    await page.getByTestId('customers__results--section').evaluate((results) => {
      results.style.minInlineSize = '2000px'
    })

    expect((await boxOf(column)).width).toBeCloseTo(before, 1)
  })
}

// The prototype's card: 1px of border, 24px of padding above, 26px at the sides and 28px under; the
// groups 28px apart, a legend of 24px with 12px under it. An option is a target of 36px (WCAG 2.5.8
// asks for 24px) with the box of 18px 2px in, centered, 10px before the name, and the count at the
// far end. The buttons are no smaller than 24px, the toggle is a line of text 8px under the options
// that starts where they do and the clear button is not stretched to the width of the panel.
test('the geometry of the filter panel', async ({ page }) => {
  // A filter, so the clear button is there
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/customers?gender=female')
  const panel = await boxOf(page.getByTestId('customers__filters--aside'))
  const statesLegend = page.locator('legend', { hasText: 'Por Estado' })
  const gendersLegend = page.locator('legend', { hasText: 'Por Gênero' })
  const legend = await boxOf(statesLegend)
  const options = page.locator('label:has([data-testid="filter-panel__state--checkbox"])')
  const option = options.first()
  const row = await boxOf(option)
  const lastRow = await boxOf(options.last())
  const input = await boxOf(option.getByTestId('filter-panel__state--checkbox'))
  const name = await boxOf(option.getByTestId('filter-panel__name--text'))
  const count = await boxOf(option.getByTestId('filter-panel__count--number'))
  const toggleButton = page.getByTestId('filter-panel__toggle--button')
  const toggle = await boxOf(toggleButton)
  const clear = await boxOf(page.getByTestId('filter-panel__clear--button'))
  const toggleText = await toggleButton.evaluate((button) => {
    const range = document.createRange()
    range.selectNodeContents(button)
    return range.getBoundingClientRect().left
  })

  expect(legend.y - panel.y).toBeCloseTo(1 + 24, 1)
  expect(row.x - panel.x).toBeCloseTo(1 + 26, 1)
  expect(panel.y + panel.height - (clear.y + clear.height)).toBeCloseTo(28 + 1, 1)
  await expect(statesLegend).toHaveCSS('font-size', '20px')
  await expect(statesLegend).toHaveCSS('font-weight', '500')
  expect(legend.height).toBeCloseTo(24, 1)
  expect(row.y - (legend.y + legend.height)).toBeCloseTo(12, 1)
  expect((await boxOf(gendersLegend)).y - (toggle.y + toggle.height)).toBeCloseTo(28, 1)

  expect(row.height).toBeCloseTo(36, 1)
  expect(input).toMatchObject({ width: 18, height: 18 })
  expect(input.x - row.x).toBeCloseTo(2, 1)
  expect(input.y + input.height / 2).toBeCloseTo(row.y + row.height / 2, 1)
  expect(name.x - (input.x + input.width)).toBeCloseTo(10, 1)
  expect(count.x + count.width).toBeCloseTo(row.x + row.width, 1)

  expect(toggle.height).toBeGreaterThanOrEqual(24)
  expect(toggle.y - (lastRow.y + lastRow.height)).toBeCloseTo(8, 1)
  expect(toggleText).toBeCloseTo(row.x, 1)
  await expect(toggleButton).toHaveCSS('border-top-width', '0px')
  await expect(toggleButton).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  expect(clear.height).toBeCloseTo(40, 1)
  expect(clear.width).toBeLessThan(panel.width / 2)
})

// What the prototype writes in the style of each piece, read where it shows: the legend has no padding,
// the count is 13px with digits of one width, the buttons are in the font of the page (a button has
// its own by default), the toggle reads as an underlined link and the clear button as an outlined
// pill of 14px, and everything that takes a click shows the pointer.
test('the style of the pieces of the filter panel', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/customers?gender=female')
  const font = await page.evaluate(() => getComputedStyle(document.body).fontFamily)
  const option = page.locator('label:has([data-testid="filter-panel__state--checkbox"])').first()
  const looks: [Locator, Record<string, string>][] = [
    [page.locator('legend').first(), { 'padding-left': '0px', 'line-height': '24px' }],
    [
      page.getByTestId('filter-panel__count--text').first(),
      { 'font-size': '13px', 'font-variant-numeric': 'tabular-nums' },
    ],
    [option, { cursor: 'pointer' }],
    [option.getByTestId('filter-panel__state--checkbox'), { cursor: 'pointer' }],
    [
      page.getByTestId('filter-panel__toggle--button'),
      {
        cursor: 'pointer',
        'font-family': font,
        'text-decoration-line': 'underline',
        'text-underline-offset': '3px',
      },
    ],
    [
      page.getByTestId('filter-panel__clear--button'),
      {
        cursor: 'pointer',
        'font-family': font,
        'font-size': '14px',
        'font-weight': '500',
        'padding-left': '16px',
        'border-top-width': '1px',
        'border-top-left-radius': '20px',
      },
    ],
  ]

  for (const [target, style] of looks) {
    for (const [property, value] of Object.entries(style)) {
      await expect(target).toHaveCSS(property, value)
    }
  }
})

// The resolved value of a color token in the theme of the page
const colorOfToken = (page: Page, token: string) =>
  page.evaluate((name) => {
    const probe = document.body.appendChild(document.createElement('i'))
    probe.style.color = `var(${name})`
    const { color } = getComputedStyle(probe)
    probe.remove()
    return color
  }, token)

// A state nobody is from is in the muted text color, and a picked one never is (ADR-0013). The
// fixture has nobody from São Paulo, Rio de Janeiro or Bahia, and two from Minas Gerais.
for (const theme of ['light', 'dark']) {
  test(`the colors of the filter panel in the ${theme} theme`, async ({ page, context }) => {
    await openListIn(page, context, theme, 1280)
    const muted = await colorOfToken(page, '--text-muted')
    const strong = await colorOfToken(page, '--text-strong')
    const nameOf = (slug: string) =>
      page
        .locator(`label:has([data-testid="filter-panel__state--checkbox"][value="${slug}"])`)
        .getByTestId('filter-panel__name--text')
    expect(muted).not.toBe(strong)

    await expect(nameOf('sao-paulo')).toHaveCSS('color', muted)
    await expect(nameOf('bahia')).toHaveCSS('color', muted)
    await expect(nameOf('minas-gerais')).toHaveCSS('color', strong)

    // The legends, the counts and the outline of the clear button have their own tokens
    await expect(page.locator('legend').first()).toHaveCSS('color', strong)
    await expect(page.getByTestId('filter-panel__count--text').first()).toHaveCSS(
      'color',
      await colorOfToken(page, '--text-count'),
    )

    // The card around the panel and the color of its boxes, in the colors of the theme
    const panel = page.getByTestId('customers__filters--aside')
    await expect(panel).toHaveCSS('background-color', await colorOfToken(page, '--surface'))
    await expect(panel).toHaveCSS('border-top-color', await colorOfToken(page, '--border'))
    await expect(panel).toHaveCSS('border-top-left-radius', '2px')
    await expect(page.getByTestId('filter-panel__state--checkbox').first()).toHaveCSS(
      'accent-color',
      await colorOfToken(page, '--accent'),
    )

    // Picked, with nobody in it: it is what the list is filtered by. A filter is there, and so is the
    // clear button, outlined in the strong color.
    await page.goto('/customers?states=sao-paulo')
    await expect(page.getByTestId('filter-panel__clear--button')).toHaveCSS(
      'border-top-color',
      strong,
    )
    await expect(nameOf('sao-paulo')).toHaveCSS('color', strong)
    await expect(nameOf('bahia')).toHaveCSS('color', muted)
  })
}

// The count is a number to the eye and a phrase to the screen reader, which sits in the row as text
// that takes no room (ADR-0013)
test('the hidden phrase of a count takes no room', async ({ page }) => {
  await openList(page, 1280)
  const count = page.getByTestId('filter-panel__count--text').first()
  const phrase = count.getByTestId('filter-panel__count--label')

  await expect(phrase).toHaveText('0 clientes')
  expect(await boxOf(phrase)).toMatchObject({ width: 1, height: 1 })
  const number = await boxOf(count.getByTestId('filter-panel__count--number'))
  expect((await boxOf(count)).width).toBeCloseTo(number.width, 1)
})

// Hover only where a pointer can hover (ADR-0013): the desktop project has a mouse, the mobile one a
// touch screen, which (hover: hover) does not match
test('the buttons of the filter panel react to hover only with a mouse', async ({
  page,
  isMobile,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/customers?gender=female')
  const clear = page.getByTestId('filter-panel__clear--button')
  const toggle = page.getByTestId('filter-panel__toggle--button')
  const strong = await colorOfToken(page, '--text-strong')

  await clear.hover()
  await expect(clear).toHaveCSS(
    'background-color',
    await colorOfToken(page, isMobile ? '--surface' : '--inverse-bg'),
  )
  await expect(clear).toHaveCSS(
    'color',
    isMobile ? strong : await colorOfToken(page, '--inverse-text'),
  )

  await toggle.hover()
  await expect(toggle).toHaveCSS('color', isMobile ? strong : await colorOfToken(page, '--link'))
})

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
