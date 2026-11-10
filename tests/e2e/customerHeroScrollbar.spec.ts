import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { test } from './network'
import { SOURCE_URL } from './servers'

// The classic-scrollbar half of the fine-pointer clause of the hero stack (ADR-0013): a classic
// Chromium scrollbar takes 15px of layout, so a 375px viewport leaves a 360px content box — under
// the prototype's 375px row floor, where the actions are one over the other. Playwright's Chromium
// launches with `--hide-scrollbars`, which no style tag can undo; this file un-hides them with
// ignoreDefaultArgs, and the 15px tag pins the width of the gutter to the genuine Chromium default
// instead of trusting the native one of the build. The gutter in layout is asserted, never assumed.
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } })
// `pointer: fine` is false where the mobile project runs: the clause is a desktop one
test.skip(({ isMobile }) => isMobile, 'the clause is the desktop fine-pointer one')
// The entrance of the article (jsm-in) leaves its boxes off the pixel grid while it runs
test.use({ reducedMotion: 'reduce' })

const CUSTOMER = '/customers/alejandra-rodrigues'
const LOCAL_PHOTOS = `${SOURCE_URL}/photos/**`

// The photo fails on the local server and the initials take its place, as in the hero spec
test.beforeEach(async ({ page }) => {
  await page.route(LOCAL_PHOTOS, (route) => route.abort())
})

const parts = (page: Page) => {
  const root = page.getByTestId('customer-hero__root--section')
  return {
    root,
    actions: page.getByTestId('customer-hero__actions--div'),
    email: page.getByTestId('customer-hero__email--link'),
    call: page.getByTestId('customer-hero__call--link'),
  }
}

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('the element is not rendered')
  return box
}

// Fonts before anything is measured: the room "Enviar e-mail" needs is that of Roboto. The tag is
// here because a navigation drops it: every width of this file has the classic scrollbar forced.
async function open(page: Page, width: number) {
  await page.setViewportSize({ width, height: 667 })
  await page.goto(CUSTOMER)
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  await page.addStyleTag({ content: '::-webkit-scrollbar { width: 15px }' })
}

// The label lines, counted on the text itself as the hero spec does: a label that wraps shows as
// two rects on it
const linesOf = (action: Locator) =>
  action.evaluate((el) => {
    const label = [...el.childNodes].find(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
    )
    if (!label) throw new Error('the action has no label')
    const range = document.createRange()
    range.selectNodeContents(label)
    return range.getClientRects().length
  })

const gutter = (page: Page) =>
  page.evaluate(() => window.innerWidth - document.documentElement.clientWidth)

// With the plain `width < 375px` cut, this viewport kept the row, which overflows its 360px of
// content box and broke "Enviar e-mail" at the hyphen: the fine-pointer clause stacks exactly that
// desktop window (ADR-0013 registers it as a deviation).
test('a classic scrollbar stacks the actions at 375px, not on a wide desktop', async ({ page }) => {
  await open(page, 375)
  expect(await gutter(page), 'the classic scrollbar takes 15px of layout').toBe(15)

  const { root, actions, email, call } = parts(page)
  const room = (await boxOf(root)).width - 2 - 2 * 20
  await expect(actions).toHaveCSS('grid-template-columns', `${String(room)}px`)
  const emailBox = await boxOf(email)
  const callBox = await boxOf(call)
  expect(
    callBox.y,
    'one over the other: the content box lost the 15px, not the row',
  ).toBeGreaterThanOrEqual(emailBox.y + emailBox.height)
  expect(await linesOf(email)).toBe(1)
  expect(await linesOf(call)).toBe(1)

  // The clause is narrow: on a wide desktop the prototype's row is where it was (one row under the
  // same classic scrollbar)
  await page.setViewportSize({ width: 1280, height: 800 })
  const emailBoxWide = await boxOf(email)
  const callBoxWide = await boxOf(call)
  expect(callBoxWide.y, 'one row again on a wide viewport').toBeCloseTo(emailBoxWide.y, 1)
})
