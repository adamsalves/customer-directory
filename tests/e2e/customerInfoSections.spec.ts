import { expect, test, type Locator, type Page } from '@playwright/test'

// The three sections are one markup at every width (ADR-0014): the page makes a grid of as many
// 240px columns as it keeps and a column that holds them 16px under the hero. happy-dom applies no
// CSS and no component spec lays the browser out, so these are the tests that do (#125). Each test
// sets its own width, so the mobile project would only repeat the desktop one.
test.skip(({ isMobile }) => isMobile, 'the width is set by each test')
// The entrance of the article (jsm-in) leaves its boxes off the pixel grid while it runs
test.use({ reducedMotion: 'reduce' })

// Of the fixture, bartolomeu martins carries the only e-mail wider than the value of a section at
// 320px, and what the sections pin is not about the customer
const CUSTOMER = '/customers/bartolomeu-martins'
const EMAIL = 'bartolomeu.martins@example.com'
const PHOTOS = 'https://randomuser.me/**'

// No test reaches the network: a photo that fails is aborted
test.beforeEach(async ({ page }) => {
  await page.route(PHOTOS, (route) => route.abort())
})

const sections = (page: Page) => page.getByTestId('customer-info-section__root--section')

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('the element is not rendered')
  return box
}

async function expectLooks(target: Locator, looks: Record<string, string>) {
  for (const [property, value] of Object.entries(looks)) {
    await expect(target, property).toHaveCSS(property, value)
  }
}

// The resolved value of a color token in the theme of the page
const colorOfToken = (page: Page, token: string) =>
  page.evaluate((name) => {
    const probe = document.body.appendChild(document.createElement('i'))
    probe.style.color = `var(${name})`
    const { color } = getComputedStyle(probe)
    probe.remove()
    return color
  }, token)

// The fonts are loaded before anything is measured: the break of the e-mail at 320px is a few
// pixels wide, and it is Roboto's
async function openDetail(page: Page, width: number) {
  await page.setViewportSize({ width, height: 800 })
  await page.goto(CUSTOMER)
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  // `ready` also resolves when the font never came, and a fallback could be narrower
  expect(await page.evaluate((text) => document.fonts.check('400 15px Roboto', text), EMAIL)).toBe(
    true,
  )
  return sections(page)
}

type TColumns = { width: number; columns: number; rows: number }

// 375, 768 and 1280 are the widths of the ADR-0013 frames. The column of the layout is 16px of
// inline padding below 640px and 24px from there, and it stops growing at 1184px, so two 240px
// sections fit from 528px and three from 800px: 527/528 and 799/800 are the sides of those edges
const WIDTHS: TColumns[] = [
  { width: 375, columns: 1, rows: 3 },
  { width: 527, columns: 1, rows: 3 },
  { width: 528, columns: 2, rows: 2 },
  { width: 768, columns: 2, rows: 2 },
  { width: 799, columns: 2, rows: 2 },
  { width: 800, columns: 3, rows: 1 },
  { width: 1280, columns: 3, rows: 1 },
]

// One check for each declaration of the page's grid (.Sections) and of the column (.Article) that
// keeps the hero above them, so deleting any of them fails
for (const { width, columns, rows } of WIDTHS) {
  test(`at ${String(width)}px the sections make ${String(columns)} column${columns === 1 ? '' : 's'}`, async ({
    page,
  }) => {
    const cards = await openDetail(page, width)
    await expect(cards).toHaveCount(3)

    const hero = await boxOf(page.getByTestId('customer-hero__root--section'))
    const grid = await boxOf(page.getByTestId('customer-detail__sections--div'))
    expect(grid.y - (hero.y + hero.height)).toBeCloseTo(16, 1)

    const boxes = await cards.evaluateAll((els) =>
      els.map((el) => {
        const { x, y, width, height } = el.getBoundingClientRect()
        return { x, y, width, height }
      }),
    )
    const section = (grid.width - 16 * (columns - 1)) / columns
    for (const box of boxes) expect(box.width).toBeCloseTo(section, 1)

    // The columns of a row share their left edge and start 16px after the one before. The raw
    // boxes group exactly: rounding them would put half-pixel tracks on the wrong side (367.5px
    // at 799px)
    const starts = [...new Set(boxes.map((box) => box.x))]
    expect(starts.length, 'the columns of auto-fit').toBe(columns)
    let behind: number | undefined
    for (const start of starts.sort((a, b) => a - b)) {
      if (behind !== undefined) expect(start - behind).toBeCloseTo(section + 16, 1)
      behind = start
    }

    // The rows as well, one under the other, 16px apart
    const tops = [...new Set(boxes.map((box) => box.y))]
    expect(tops.length, 'the rows of auto-fit').toBe(rows)
    let above: number | undefined
    for (const top of tops.sort((a, b) => a - b)) {
      if (above !== undefined) {
        const headRow = boxes.find((box) => box.y === above)
        if (!headRow) throw new Error('the row above is gone')
        expect(top - (headRow.y + headRow.height)).toBeCloseTo(16, 1)
      }
      above = top
    }

    // The columns reach both edges of the grid: at 1280px the fourth track of auto-fit collapses
    expect(Math.min(...boxes.map((box) => box.x))).toBeCloseTo(grid.x, 1)
    expect(Math.max(...boxes.map((box) => box.x + box.width))).toBeCloseTo(grid.x + grid.width, 1)
  })
}

// The module of the component styles the pairs the page slots in, and the colors resolve against
// the tokens of the theme the server wrote from the cookie. One check for each declaration, in both
// themes: a swap that only differs in one of them fails there (--surface and --bg are both #fff in
// the light one, and #1c232b and #14191f in the dark one)
for (const theme of ['light', 'dark']) {
  test(`the sections wear the ${theme} theme at 1280px`, async ({ page, context }) => {
    await context.addCookies([{ name: 'jsm-theme', value: theme, domain: 'localhost', path: '/' }])
    const cards = await openDetail(page, 1280)
    // The tokens resolve against the theme of the page: without the guard, a cookie that never
    // arrives renders the dark test in the light one and compares light against light
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    const strong = await colorOfToken(page, '--text-strong')
    const muted = await colorOfToken(page, '--text-muted')
    const border = await colorOfToken(page, '--border')
    const surface = await colorOfToken(page, '--surface')

    for (let index = 0; index < 3; index += 1) {
      const card = cards.nth(index)

      await expectLooks(card, {
        padding: '24px 26px',
        'border-width': '1px',
        'border-style': 'solid',
        'border-color': border,
        'border-radius': '2px',
      })
      await expect(card).toHaveCSS('background-color', surface)

      const heading = card.getByTestId('customer-info-section__heading--heading')
      await expectLooks(heading, {
        'margin-top': '0px',
        'margin-bottom': '18px',
        color: strong,
        'font-size': '18px',
        'font-weight': '500',
      })

      const list = card.getByTestId('customer-info-section__list--list')
      await expectLooks(list, {
        display: 'flex',
        'flex-direction': 'column',
        'row-gap': '16px',
        'column-gap': '16px',
        margin: '0px',
      })

      for (const label of await card.locator('dt').all()) {
        await expectLooks(label, {
          'margin-top': '0px',
          'margin-bottom': '4px',
          color: muted,
          'font-size': '13px',
        })
      }
      for (const value of await card.locator('dd').all()) {
        await expectLooks(value, {
          margin: '0px',
          color: strong,
          'font-size': '15px',
        })
      }
    }
  })
}

// The digits of a call and of a postcode take the same width: the class of the values does it
test('the cell, the phone and the postcode use tabular digits', async ({ page }) => {
  await openDetail(page, 1280)
  for (const testId of [
    'customer-detail__cell--value',
    'customer-detail__phone--value',
    'customer-detail__postcode--value',
  ]) {
    await expect(page.getByTestId(testId)).toHaveCSS('font-variant-numeric', 'tabular-nums')
  }
})

// At 320px the value of a section has 234px and the e-mail of bartolomeu is 236px wide: it breaks
// anywhere into two lines instead of running past the column (#33). The break hangs on the steps
// of Roboto, and openDetail waits for them
test('at 320px the e-mail of bartolomeu breaks inside its value', async ({ page }) => {
  await openDetail(page, 320)
  const value = page.getByTestId('customer-detail__email--value')
  const link = page.getByTestId('customer-detail__email--link')
  await expectLooks(value, { 'overflow-wrap': 'anywhere' })

  // The text makes two lines, counted on its own rectangles: the box of the link hides a wrap
  const lines = await link.evaluate((el) => {
    const range = document.createRange()
    range.selectNodeContents(el)
    return range.getClientRects().length
  })
  expect(lines).toBe(2)

  // The link stays inside the value and ends above it, where the copy button goes on
  const valueBox = await boxOf(value)
  const linkBox = await boxOf(link)
  expect(linkBox.width).toBeLessThanOrEqual(valueBox.width + 0.5)
  expect(linkBox.y + linkBox.height).toBeLessThanOrEqual(valueBox.y + valueBox.height + 0.5)
})
