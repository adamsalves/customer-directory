import { expect, test, type Locator, type Page } from '@playwright/test'
import { waitForHydration } from './hydration'

// The toast is one region of the layout (default.vue), outside <main>, always in the HTML and
// empty: the bubble only comes into it when the copy of the email answers, and the region takes
// itself down 2200 ms later (useToast.ts). The component specs check the composable, and
// customerDetail.spec.ts checks the write and the text; here the region and the bubble are the
// ones pinned, as the two ADR-0013 rows about them (the outline that forced colors unmasks and
// the max-content that keeps one line at 320px). The click needs the app, so every test waits for
// hydration — and the clock is paused right after it: the toast is gone in 2200 ms, and nothing
// here may outlive it or be taken down in the middle of the pinning. No link is clicked while the
// clock is paused (a paused clock turns a client navigation into a plain one).
test.skip(({ isMobile }) => isMobile, 'the width is set by each test')
// The motion is NOT reduced: the animation the bubble answers with is itself pinned
test.use({ colorScheme: 'dark' })

const CUSTOMER = '/customers/oceano-jesus'
const PHOTOS = 'https://randomuser.me/**'
// The clock is installed on a fixed date before the page opens, as in customerDetail.spec.ts, and
// is stopped an hour later: nothing is scheduled behind it (the only timer is the one the click
// starts, and the pause holds it)
const CLOCK = new Date('2026-01-01T08:00:00')
const PAUSED_AT = new Date(CLOCK.getTime() + 60_000)

// No test reaches the network: a photo that fails is aborted
test.beforeEach(async ({ page }) => {
  await page.route(PHOTOS, (route) => route.abort())
})

const regionLocator = (page: Page) => page.getByTestId('toast__root--status')
const bubbleLocator = (page: Page) => page.getByTestId('toast__message--text')
const copyButton = (page: Page) => page.getByTestId('customer-detail__copy--button')
const themeToggle = (page: Page) => page.getByTestId('header__theme--toggle')

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('the element is not rendered')
  return box
}

// The resolved value of a token (a `--name`) or of a system color (a keyword of forced colors)
const resolved = (page: Page, property: 'color' | 'boxShadow', token: string) =>
  page.evaluate(
    ({ property, token }) => {
      const probe = document.body.appendChild(document.createElement('i'))
      probe.style[property] = token.startsWith('--') ? `var(${token})` : token
      const value = getComputedStyle(probe)[property]
      probe.remove()
      return value
    },
    { property, token },
  )

async function expectLooks(target: Locator, looks: Record<string, string>) {
  for (const [property, value] of Object.entries(looks)) {
    await expect(target, property).toHaveCSS(property, value)
  }
}

// The page opens with the clock running (the hydration is judged on its own real timers) and is
// stopped the moment the page is interactive: the toast, when it comes, stays for as long as the
// test needs
async function openPaused(page: Page, width: number, height: number) {
  await page.clock.install({ time: CLOCK })
  await page.setViewportSize({ width, height })
  await page.goto(CUSTOMER)
  await waitForHydration(page)
  await page.clock.pauseAt(PAUSED_AT)
}

// The copy answers the write of the email, which the browser may refuse: the permission makes the
// `writeText` settle, and the toast is the one of success. The text on the bubble is the same one
// customerDetail.spec.ts proved, read once more to bind these assertions to it
async function copyEmail(page: Page) {
  await copyButton(page).click()
  await expect(bubbleLocator(page)).toHaveText('E-mail copiado')
}

// The first line of the text of an element, on its own rectangles: the box of the bubble hides a
// wrap
const lineOf = (target: Locator) =>
  target.evaluate((el) => {
    const range = document.createRange()
    range.selectNodeContents(el)
    const [line] = [...range.getClientRects()]
    if (!line) throw new Error('the text has no line')
    return { lines: range.getClientRects().length, height: line.height, width: line.width }
  })

// A region fixed to the page: at 375x600 it keeps the bubble 24px above the bottom after the page
// is scrolled, and it sits centered on the whole viewport, not on the half that `left: 50%` alone
// would shrink to — the box that made the message wrap at 320px (ADR-0013). One check per
// declaration of the region that shows on the screen
test('at 375x600, scrolled, the region holds the bubble 24px up, centered', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-write'])
  await openPaused(page, 375, 600)
  await copyEmail(page)
  // The scroll is not the app's: `position: fixed` does not move with it, and that is what makes
  // the test tell a fixed region from an absolute one
  await page.evaluate(() => {
    window.scrollTo(0, 1200)
  })
  const region = await boxOf(regionLocator(page))
  const { clientWidth, clientHeight } = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    clientHeight: document.documentElement.clientHeight,
  }))

  await expectLooks(regionLocator(page), { position: 'fixed' })
  expect(region.x + region.width / 2).toBeCloseTo(clientWidth / 2, 1)
  // env(safe-area-inset-bottom) is 0 in this browser (seen as a limit of the plan)
  expect(region.y + region.height).toBeCloseTo(clientHeight - 24, 1)
  await expectLooks(regionLocator(page), {
    'z-index': '40',
    'pointer-events': 'none',
  })
})

// The bubble wears the tokens of the theme of the page: the dark one is the system's (no cookie),
// and the light one comes from the toggle — a button, not a link, so the pause of the clock does
// not take its click the wrong way. One check for each declaration of the bubble, with the shadow
// and the animation of the prototype read by name and time, and of the theme of the page
for (const theme of ['dark', 'light'] as const) {
  test(`after the copy, the bubble wears the ${theme} theme`, async ({ page, context }) => {
    await context.grantPermissions(['clipboard-write'])
    await page.clock.install({ time: CLOCK })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(CUSTOMER)
    await waitForHydration(page)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    if (theme === 'light') {
      // The toggle while the clock still runs: its data-theme reaches the <html> through the head,
      // and the pause comes only after the attribute is in place
      await themeToggle(page).click()
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    }
    await page.clock.pauseAt(PAUSED_AT)

    await copyEmail(page)

    await expectLooks(bubbleLocator(page), {
      display: 'block',
      'background-color': await resolved(page, 'color', '--inverse-bg'),
      color: await resolved(page, 'color', '--inverse-text'),
      'box-shadow': await resolved(page, 'boxShadow', '--shadow-toast'),
      'border-radius': '24px',
      'font-size': '14px',
      padding: '12px 20px',
    })
    await expectLooks(bubbleLocator(page), {
      'animation-name': 'jsm-in',
      'animation-duration': '0.18s',
    })
  })
}

// With no permission the `writeText` rejects in the browser, and the catch of the page shows the
// other message: not a mock, the doubt the browser of a user without a write right would answer
// with. At 320px the message keeps one line, and the region takes the width of the bubble instead
// of the half of the viewport that `left: 50%` alone would leave (ADR-0013)
test('at 320px a refused copy says it on one line, as wide as its text', async ({ page }) => {
  await openPaused(page, 320, 600)
  await copyButton(page).click()

  const bubble = bubbleLocator(page)
  await expect(bubble).toHaveText('Não foi possível copiar')
  const messageLine = await lineOf(bubble)
  expect(messageLine.lines, 'the message is one line').toBe(1)
  const bubbleBox = await boxOf(bubble)
  // The line itself plus 12px above and below, and the text with 20px on each side: a wrapped or
  // reshaped message would fail here
  expect(bubbleBox.height).toBeCloseTo(messageLine.height + 24, 1)
  expect(bubbleBox.width).toBeCloseTo(messageLine.width + 40, 1)
  // the region closes to the bubble: the max-content that keeps a long message on one line
  const regionBox = await boxOf(regionLocator(page))
  expect(regionBox.width).toBeCloseTo(bubbleBox.width, 1)
  expect(regionBox.x).toBeCloseTo(bubbleBox.x, 1)
})

// High Contrast takes the shadow away, and the transparent outline the bubble always carries is
// then its only edge: 1px in CanvasText, read from the page (#114)
test('in forced colors the bubble keeps a solid outline of its own', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-write'])
  await openPaused(page, 1280, 800)
  await copyEmail(page)
  await page.emulateMedia({ forcedColors: 'active' })

  await expectLooks(bubbleLocator(page), {
    'outline-style': 'solid',
    'outline-width': '1px',
    'outline-color': await resolved(page, 'color', 'CanvasText'),
  })
})
