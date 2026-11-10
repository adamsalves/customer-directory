import { readFileSync } from 'node:fs'
import { expect, type Locator, type Page } from '@playwright/test'
import { test } from './network'
import { SOURCE_URL } from './servers'

// The hero is one markup at every width (ADR-0014): CSS makes it a column below 640px and puts its
// actions in a grid of two equal columns only where they fit — below 375px of content box, which on
// a fine pointer means up to 389px of viewport (ADR-0013 has a classic scrollbar taking 15px). happy-dom applies no CSS, and no component spec
// sees the order the browser really has: server HTML, photo fails, page hydrates (#124).
// Each test sets its own width, so the mobile project would only repeat the desktop one.
test.skip(({ isMobile }) => isMobile, 'the width is set by each test')
// The entrance of the article (jsm-in) leaves its boxes off the pixel grid while it runs
test.use({ reducedMotion: 'reduce' })

// The longest name of the fixture, and the widest one in Roboto
const CUSTOMER = '/customers/alejandra-rodrigues'
const LOCAL_PHOTOS = `${SOURCE_URL}/photos/**`
const LOGO = readFileSync(new URL('../../public/logo.png', import.meta.url))

// No test reaches the network, and ./network proves it when a test is over. The photo that has to
// fail is aborted on the local server, and the one that has to arrive is answered by its test,
// whose route comes later and so runs first
test.beforeEach(async ({ page }) => {
  await page.route(LOCAL_PHOTOS, (route) => route.abort())
})

const parts = (page: Page) => {
  // The other clients of the state (#39) carry avatars of their own: the ones measured here are
  // the hero's, inside it
  const root = page.getByTestId('customer-hero__root--section')
  return {
    root,
    avatar: root.getByTestId('customer-avatar__root--span'),
    text: page.getByTestId('customer-hero__text--div'),
    name: page.getByTestId('customer-hero__name--heading'),
    tags: page.getByTestId('customer-hero__tags--list'),
    actions: page.getByTestId('customer-hero__actions--div'),
    email: page.getByTestId('customer-hero__email--link'),
    call: page.getByTestId('customer-hero__call--link'),
    photo: root.getByTestId('customer-avatar__photo--image'),
    initials: root.getByTestId('customer-avatar__initials--text'),
  }
}

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

// The fonts are loaded before anything is measured: the room "Enviar e-mail" has at 375px is a few
// pixels, and it is that of Roboto
async function openHero(page: Page, width: number) {
  await page.setViewportSize({ width, height: 800 })
  await page.goto(CUSTOMER)
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  // `ready` also resolves when the font never came, and a fallback could be narrower
  expect(await page.evaluate(() => document.fonts.check('500 15px Roboto', 'Enviar e-mail'))).toBe(
    true,
  )
}

// The lines the label of an action takes, counted on the text itself: the fixed height of the button
// hides a label that wraps
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

// Vue leaves this on the root once the app is mounted. createSSRApp, which Nuxt uses for a page
// rendered by the server, sets no data-v-app: only createApp does.
const isHydrated = (page: Page) =>
  page.evaluate(() => {
    const root = document.getElementById('__nuxt')
    return root !== null && '__vue_app__' in root
  })

// Below 640px the hero is a column centered on the page, the avatar over the text and the two actions
// in a row of equal halves. One check for each declaration of that block of CustomerHero.module.scss
// (and for the `align-items` of the hero, which centers the avatar), so deleting any of them fails.
// The room inside the hero is its width less its border and padding. The row only exists where the
// widest action holds its one line: 2 × 145.1px + 8px of gap need 375px of content box, so 375px of
// viewport stacks on this project's fine pointer (here the viewport is the content box: headless
// scrollbars overlay) and 390px is its last row — ADR-0013.
for (const { width, stacked } of [
  { width: 375, stacked: true },
  { width: 390, stacked: false },
]) {
  test(`at ${String(width)}px the hero is a centered column and the actions ${stacked ? 'are one over the other' : 'share a row'}`, async ({
    page,
  }) => {
    await openHero(page, width)
    const { root, avatar, text, name, tags, actions, email, call } = parts(page)
    const hero = await boxOf(root)
    const room = hero.width - 2 - 2 * 20

    await expectLooks(root, {
      'flex-direction': 'column',
      padding: '28px 20px 20px',
      'text-align': 'center',
    })
    await expectLooks(avatar, { width: '112px', height: '112px' })
    await expectLooks(text, { flex: '0 0 auto', width: `${String(room)}px` })
    await expectLooks(name, { 'font-size': '26px' })
    await expectLooks(tags, { 'justify-content': 'center' })
    await expectLooks(actions, { display: 'grid', width: `${String(room)}px` })
    for (const action of [email, call]) {
      await expectLooks(action, { height: '48px', padding: '0px 16px' })
    }

    // The avatar is on the axis of the hero and over the text
    const avatarBox = await boxOf(avatar)
    const textBox = await boxOf(text)
    expect(avatarBox.x + avatarBox.width / 2).toBeCloseTo(hero.x + hero.width / 2, 1)
    expect(avatarBox.y + avatarBox.height).toBeLessThanOrEqual(textBox.y)

    if (stacked) {
      // One over the other: the single track is the whole room
      await expectLooks(actions, { 'grid-template-columns': `${String(room)}px` })
      const emailBox = await boxOf(email)
      const callBox = await boxOf(call)
      expect(emailBox.width, 'one column as wide as the room').toBeCloseTo(room, 1)
      expect(callBox.width).toBeCloseTo(room, 1)
      expect(callBox.x, 'same axis').toBeCloseTo(emailBox.x, 1)
      expect(callBox.y - (emailBox.y + emailBox.height)).toBeCloseTo(8, 1)
      expect(await linesOf(email)).toBe(1)
      expect(await linesOf(call)).toBe(1)
    } else {
      // Share a row: two equal columns of half the room, 8px apart
      const column = (room - 8) / 2
      await expectLooks(actions, {
        'grid-template-columns': `${String(column)}px ${String(column)}px`,
      })
      const emailBox = await boxOf(email)
      const callBox = await boxOf(call)
      expect(callBox.y, 'on one line').toBeCloseTo(emailBox.y, 1)
      expect(emailBox.width).toBeCloseTo(column, 1)
      expect(callBox.width).toBeCloseTo(column, 1)
      expect(callBox.x - (emailBox.x + emailBox.width)).toBeCloseTo(8, 1)
      expect(await linesOf(email)).toBe(1)
      expect(await linesOf(call)).toBe(1)
    }
  })
}

// Below 375px the actions are one over the other, each as wide as the room. 374px is the edge and
// 375px (above) the other side of it; at 320px the label still takes a single line.
for (const width of [374, 320]) {
  test(`at ${String(width)}px the actions are one over the other`, async ({ page }) => {
    await openHero(page, width)
    const { root, actions, email, call } = parts(page)
    const room = (await boxOf(root)).width - 2 - 2 * 20

    await expectLooks(actions, { 'grid-template-columns': `${String(room)}px` })
    const emailBox = await boxOf(email)
    const callBox = await boxOf(call)
    expect(emailBox.width).toBeCloseTo(room, 1)
    expect(callBox.width).toBeCloseTo(room, 1)
    expect(callBox.x).toBeCloseTo(emailBox.x, 1)
    expect(callBox.y - (emailBox.y + emailBox.height)).toBeCloseTo(8, 1)
    expect(await linesOf(email)).toBe(1)
  })
}

// The column starts at 639px and the row at 640px
for (const { width, column } of [
  { width: 639, column: true },
  { width: 640, column: false },
]) {
  test(`at ${String(width)}px the hero is a ${column ? 'column' : 'row'}`, async ({ page }) => {
    await openHero(page, width)
    const { root, avatar, text } = parts(page)

    await expect(root).toHaveCSS('flex-direction', column ? 'column' : 'row')
    const avatarBox = await boxOf(avatar)
    const textBox = await boxOf(text)
    const over = textBox.y >= avatarBox.y + avatarBox.height
    const beside =
      textBox.x >= avatarBox.x + avatarBox.width && textBox.y < avatarBox.y + avatarBox.height
    expect(over, 'the text is under the avatar').toBe(column)
    expect(beside, 'the text is beside the avatar').toBe(!column)
  })
}

type TCombo = {
  width: number
  colorScheme: 'dark' | 'light'
  size: string
  color: string
  background: string
}

// The avatar is 112px below 640px and 128px from there: its initials are 40% of it. --text-strong on
// --muted-bg, in the theme of each system.
const COMBOS: TCombo[] = [
  {
    width: 375,
    colorScheme: 'dark',
    size: '44.8px',
    color: 'rgb(232, 237, 242)',
    background: 'rgb(37, 46, 56)',
  },
  {
    width: 1280,
    colorScheme: 'light',
    size: '51.2px',
    color: 'rgb(35, 48, 61)',
    background: 'rgb(224, 224, 224)',
  },
]

// The browser fires the `error` of a photo while the page is still plain HTML, before anything listens.
// The scripts are held so the photo is seen failing on that page, then let go: the avatar finds the
// failure when it mounts. waitForHydration does not serve here, it needs the scripts to have run.
for (const { width, colorScheme, size, color, background } of COMBOS) {
  test(`a photo that fails before hydration gives way to the initials at ${String(width)}px, ${colorScheme}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme })
    await page.setViewportSize({ width, height: 800 })
    const scripts: PromiseWithResolvers<void> = Promise.withResolvers()
    await page.route(/\/_nuxt\/.+\.js$/, async (route) => {
      await scripts.promise
      await route.continue()
    })
    // `load` waits for the scripts, which wait for this test
    await page.goto(CUSTOMER, { waitUntil: 'commit' })
    const { avatar, photo, initials } = parts(page)

    // Complete with no width is how a browser reports a photo that failed
    await expect(photo).toHaveJSProperty('complete', true)
    await expect(photo).toHaveJSProperty('naturalWidth', 0)
    expect(await isHydrated(page)).toBe(false)
    await expect(initials).toHaveCount(0)

    scripts.resolve()
    await expect.poll(() => isHydrated(page)).toBe(true)
    await expect(photo).toHaveCount(0)
    await expect(initials).toHaveText('AR')
    await expectLooks(initials, {
      'font-size': size,
      'line-height': size,
      'font-weight': '700',
      color,
    })
    await expectLooks(avatar, { 'background-color': background })
  })
}

// The other side of the check: a photo still on its way when the page hydrates has no width yet either,
// and it is not complete. It stays a photo and shows when it arrives. A fixture the photo of which loads
// at once would not tell the two apart, so this one is held until after the hydration.
test('a photo still loading when the page hydrates stays a photo', async ({ page }) => {
  const arrival: PromiseWithResolvers<void> = Promise.withResolvers()
  await page.route(LOCAL_PHOTOS, async (route) => {
    await arrival.promise
    await route.fulfill({ body: LOGO, contentType: 'image/png' })
  })
  // `load` waits for the photo
  await page.goto(CUSTOMER, { waitUntil: 'commit' })
  const { photo, initials } = parts(page)

  await expect.poll(() => isHydrated(page)).toBe(true)
  await expect(photo, 'the photo is on its way, not taken for a broken one').toHaveJSProperty(
    'complete',
    false,
  )
  await expect(initials).toHaveCount(0)

  arrival.resolve()
  await expect(photo).toHaveJSProperty('complete', true)
  await expect
    .poll(() => photo.evaluate((el) => (el instanceof HTMLImageElement ? el.naturalWidth : 0)))
    .toBeGreaterThan(0)
  await expect(initials).toHaveCount(0)
})

// The floors are minimums: a scaled label makes the action taller instead of being clipped by it
// (min-block-size). The tag pumps the label to 44px on line-height 1.2 — a 52.8px line, over both
// floors — and the test measures the height it had before the tag on the same page, so no floor
// number is copied here: the assertion is only that the box followed the label, and that the text
// still sits whole on it (scrollHeight within clientHeight).
for (const width of [375, 1280]) {
  test(`at ${String(width)}px a bigger label takes the action past its floor`, async ({ page }) => {
    await openHero(page, width)
    const { email } = parts(page)
    const unpumped = await boxOf(email)

    await page.addStyleTag({
      content:
        '[data-testid="customer-hero__email--link"], [data-testid="customer-hero__call--link"] { font-size: 44px; line-height: 1.2 }',
    })
    const pumped = await boxOf(email)
    expect(pumped.height, 'the floor is a minimum, the label grows the box').toBeGreaterThan(
      unpumped.height,
    )
    expect(await linesOf(email)).toBe(1)
    expect(await email.evaluate((el) => el.scrollHeight <= el.clientHeight)).toBe(true)
  })
}

// The classic-scrollbar environment of the stacked cut has a file of its own: this suite's Chromium
// runs headless with `--hide-scrollbars`, and no tag can undo it — customerHeroScrollbar.spec.ts
// un-hides them and holds the stack and the wide-desktop guard there.

// The nowrap half of it: 390px is the narrowest row (154px columns here, the last call of
// `width < 390px` does not stack), and one line of the label at 15px fills all but 2px of it
// (87.1px of a 96px text area). An 18px label — a 1.2× text scale — takes 104.6px, so without
// white-space: nowrap the label breaks at its hyphen right at this edge; with it, the grid just
// lets the tracks claim the room each line needs and nothing overflows.
test('at the narrowest row a grown label never breaks at the hyphen', async ({ page }) => {
  await openHero(page, 390)
  const { actions, email, call } = parts(page)

  await page.addStyleTag({
    content:
      '[data-testid="customer-hero__email--link"], [data-testid="customer-hero__call--link"] { font-size: 18px }',
  })

  expect(await linesOf(email)).toBe(1)
  expect(await linesOf(call)).toBe(1)
  expect(await actions.evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(0)
})
