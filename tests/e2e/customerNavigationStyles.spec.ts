import { expect, type Locator, type Page } from '@playwright/test'
import { waitForHydration } from './hydration'
import { test } from './network'

// The identity of the nav of neighbors and of the related of the detail, as the prototype draws
// them (ADR-0013): the "N de M" in tabular-nums, the pills of the desktop and the cards of the
// mobile, the :active of the card, the ghosts of the side without a neighbor and the carousel of
// the mobile. happy-dom applies no CSS, and a media query applies none of it in the unit specs,
// so the E2E is the one that owns the shapes. One marking at every width, and each test sets its
// own width, so the mobile project would only repeat what the desktop one reads.
test.skip(({ isMobile }) => isMobile, 'the width is set by each test')
// A press reads nothing of the buttons before the page is interactive, and waitForHydration needs a
// dark system; reduced motion keeps every box of the entrance (jsm-in) on the pixel grid
test.use({ colorScheme: 'dark', reducedMotion: 'reduce' })

// Alejandra Rodrigues: 4th of the context of the 20 of the fixture, and her state (Santa
// Catarina) is the one with only one other customer, Apolo Nunes, for the related
const CUSTOMER = '/customers/alejandra-rodrigues'
// A customer alone in the context ("1 de 1"): no prev and no next, the two ghosts live at once
const EDGE = '/customers/girao-darosa?search=girao'

const nav = (page: Page) => page.getByTestId('customer-nav__root--nav')
const prevLink = (page: Page) => page.getByTestId('customer-nav__prev--link')
const nextLink = (page: Page) => page.getByTestId('customer-nav__next--link')
const position = (page: Page) => page.getByTestId('customer-nav__position--text')
const related = (page: Page) => page.getByTestId('customer-related__root--section')

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

// A press starts its transition at the next style update, which getAnimations() brings forward:
// waiting for what it returns reads the style at the end of the transition, or as it stays when
// there is none
const settle = (target: Locator) =>
  target.evaluate((el) =>
    Promise.allSettled(el.getAnimations().map((a) => a.finished)).then(() => 0),
  )

// The value a stylesheet declares for a property of the element, as it is written: the computed one
// is a length in pixels, whatever unit it was written in (the tracks of a grid resolve when they
// are read). The rules of a media query count too, when the width of the page answers it.
// This read is the first MATCHING declaration in document order, not the cascade winner: last-wins
// is not honored, so a later declaration wins the box without changing what it reads. Where the
// order matters, the measured box of the card backstops the 72% column of the carousel.
const declared = (target: Locator, property: string) =>
  target.evaluate((el, name) => {
    const walk = (rules: CSSRuleList): string | undefined => {
      for (const rule of rules) {
        if (rule instanceof CSSMediaRule) {
          if (matchMedia(rule.conditionText).matches) {
            const value = walk(rule.cssRules)
            if (value !== undefined) return value
          }
        } else if (rule instanceof CSSStyleRule && el.matches(rule.selectorText)) {
          const value = rule.style.getPropertyValue(name)
          if (value !== '') return value
        }
      }
      return undefined
    }
    for (const sheet of document.styleSheets) {
      const value = walk(sheet.cssRules)
      if (value !== undefined) return value
    }
    return undefined
  }, property)

// From 640px the box of the prototype holds the two pills with the position between them (the gap
// with the two axes of the flex row)
test('the nav draws the box of the prototype and the pill answers a hover, at 1280px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(CUSTOMER)
  await waitForHydration(page)

  // The box: the surface of the card, the 8px of every side and of the gaps and the squared corner
  await expectLooks(nav(page), {
    padding: '8px', // mutant: the 8px of the box gone
    gap: '8px', // mutant: the pills and the position touching
    'border-radius': '2px', // mutant: the squared corner gone
  })
  await expect(nav(page)).toHaveCSS(
    'background-color',
    await colorOfToken(page, '--surface'), // mutant: --surface-alt took its place
  )

  // The pill: 44px tall, 22px round, the name the token of the strong text reads as
  await expectLooks(prevLink(page), {
    'min-height': '44px', // mutant: the touch target lost its minimum
    'border-radius': '22px',
    padding: '0px 16px 0px 10px',
    'font-size': '14px',
  })
  await expect(prevLink(page)).toHaveCSS(
    'color',
    await colorOfToken(page, '--text-strong'), // mutant: the name loses the strong color
  )
  expect(await boxOf(prevLink(page).locator('svg'))).toMatchObject({
    width: 18, // mutant: the chevron at 20px (the size of the mobile one)
    height: 18, // mutant: the chevron reshaped
  })

  // Hover only where a pointer can hover (ADR-0013): the mouse of this project paints it, and the
  // base of the pill is transparent again when the pointer leaves
  await prevLink(page).hover()
  await expect(prevLink(page)).toHaveCSS(
    'background-color',
    await colorOfToken(page, '--surface-alt'), // mutant: the hover rule removed
  )
  await page.mouse.move(0, 0)
  await expect(prevLink(page)).toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0)', // mutant: the hover left the paint on
  )

  // The position of the context: 13px, the digits of one width and the muted text of the page
  await expectLooks(position(page), {
    'font-size': '13px',
    'font-variant-numeric': 'tabular-nums', // mutant: the numerals of one width removed
  })
  await expect(position(page)).toHaveCSS(
    'color',
    await colorOfToken(page, '--text-muted'), // mutant: the position loses the muted text
  )
})

// The side without a neighbor: on the desktop the span is a plain child of the flex row and does
// not grow, holding the position away from the border as the prototype does (the comment of the
// scss)
test('with no neighbor, the ghosts are two zero-sized spacers of the row, at 1280px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(EDGE)
  // "1 de 1": the customer alone in the context, and no link rendering on either side
  await expect(position(page)).toHaveText('1 de 1') // mutant: the context counting over all 20
  await expect(prevLink(page)).toHaveCount(0) // mutant: the v-if of the null prev inverted
  await expect(nextLink(page)).toHaveCount(0) // mutant: the v-if of the null next inverted

  expect(await boxOf(page.getByTestId('customer-nav__prev--ghost'))).toMatchObject({
    width: 0, // mutant: the ghost of the left taking room
    height: 0, // mutant: the ghost of the left taking room
  })
  expect(await boxOf(page.getByTestId('customer-nav__next--ghost'))).toMatchObject({
    width: 0, // mutant: the ghost of the right taking room
    height: 0, // mutant: the ghost of the right taking room
  })
})

// The related of the state shares the grid of the list at both widths (ADR-0014)
test('the related section is a row of cards over the grid of the list, at 1280px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(CUSTOMER)
  await waitForHydration(page)
  const section = related(page)
  const cards = section.getByTestId('customer-related__cards--list')

  // The columns are as the stylesheet declares them, not as the four 272px ones the browser
  // resolves (mutant: the 232px minimum gone)
  expect(await declared(cards, 'grid-template-columns')).toBe(
    'repeat(auto-fill, minmax(232px, 1fr))',
  )
  await expect(cards).toHaveCSS('gap', '16px') // mutant: the gap of the cards gone

  // One card, in the card of the list at a smaller scale: 32px of padding over, 20px on the sides
  const card = section.getByTestId('customer-related__card--div')
  await expect(card).toHaveCount(1)
  await expectLooks(card, {
    padding: '32px 20px', // mutant: the card scale of the padding lost
    'border-width': '1px', // mutant: the border of the card gone
    'border-radius': '2px', // mutant: the squared corner of the card gone
  })
  expect(await boxOf(card.getByTestId('customer-avatar__root--span'))).toMatchObject({
    width: 64, // mutant: the avatar resized
    height: 64, // mutant: the avatar reshaped
  })

  // The heading and the link of the state in one row: one size each, the underline 3px down and
  // the color of a hovered link on it
  await expect(section.getByTestId('customer-related__title--heading')).toHaveCSS(
    'font-size',
    '24px', // mutant: the title at 20px (the mobile one)
  )
  const more = section.getByTestId('customer-related__more--link')
  await expectLooks(more, {
    'font-size': '14px', // mutant: the link at another size
    'text-underline-offset': '3px', // mutant: the underline at its default offset
  })
  await more.hover()
  await expect(more).toHaveCSS('color', await colorOfToken(page, '--link')) // mutant: the hover rule removed

  // The first card of each snap: the row stops the card level with the column as it scrolls
  await expect(section.getByTestId('customer-related__item--listitem')).toHaveCSS(
    'scroll-snap-align',
    'start', // mutant: the align of the snap removed
  )
})

// Below 640px the first row carries the position across the two columns and the cards sit side by
// side, each in the column of its side. Chrome reports the explicit areas as they are, and the
// columns as the length each fr resolved to
test('below 640px the nav is two cards with the position above, at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(CUSTOMER)
  const root = nav(page)

  // The rows of the page as it is: one row of the position over, the cards side by side
  await expect(root).toHaveCSS(
    'grid-template-areas',
    '"position position" "prev next"', // mutant: an area gone or the cards in one row
  )
  await expect(root).toHaveCSS(
    'grid-template-columns',
    '167.5px 167.5px', // mutant: 1fr typed as auto, the cells gone
  )
  // The pill box of the desktop is out
  await expectLooks(root, {
    padding: '0px', // mutant: 8px of the desktop box left on
    'border-width': '0px', // mutant: the 1px of the desktop box left on
    'background-color': 'rgba(0, 0, 0, 0)', // mutant: the surface of the desktop box left on
  })

  // The prev on the left and the next on the right (mutant: the two grid-areas swapped)
  const prevBox = await boxOf(prevLink(page))
  expect(prevBox.x).toBeLessThan((await boxOf(nextLink(page))).x)

  // The cards: 60px tall, and the paddings of each side mirrored — the prev keeps the chevron in
  // the 6px and the name in the 12px, and the next the opposite
  await expectLooks(prevLink(page), {
    'min-height': '60px', // mutant: the cards under the touch target
    padding: '8px 12px 8px 6px', // mutant: the two sides mirrored
  })
  await expectLooks(nextLink(page), {
    padding: '8px 6px 8px 12px', // mutant: the two sides mirrored
    'justify-content': 'flex-end', // mutant: the content unaligned to the edge
    'text-align': 'right', // mutant: the name to the left
  })

  // The chevrons grow with the tap target
  expect(await boxOf(prevLink(page).locator('svg'))).toMatchObject({
    width: 20, // mutant: the chevron at 18px (the desktop one)
    height: 20,
  })

  // The label of the side (the first span after the row of the card) drops to 12px in the muted
  // text, the name does not: it is cut where it is, on one line
  const label = prevLink(page).locator('span').nth(1)
  await expect(label).toHaveCSS('font-size', '12px') // mutant: the label at 14px
  await expect(label).toHaveCSS(
    'color',
    await colorOfToken(page, '--text-muted'), // mutant: the label in the strong text
  )
  const name = prevLink(page).locator('span').nth(2)
  await expectLooks(name, {
    'white-space': 'nowrap', // mutant: the name breaking into lines
    overflow: 'hidden', // mutant: the name spreading its column
    'text-overflow': 'ellipsis', // mutant: the overflow with no ellipsis
  })
})

// The :active of the mobile: held down with the pointer on it, and let go on another piece of the
// page so no click is made, as the card of the list is proved (customerCardLink.spec.ts). When the
// pointer leaves, :hover no longer matches the card, so only the :active can hold the alternate
// surface while it is pressed: no unit spec sees a media query (happy-dom)
test('a press on the card answers with the alternate surface, at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(CUSTOMER)
  await waitForHydration(page)
  const card = prevLink(page)
  const rest = await colorOfToken(page, '--surface')
  const pressed = await colorOfToken(page, '--surface-alt')
  expect(pressed).not.toBe(rest)
  // The card is the surface of the page, of its own
  await expect(card).toHaveCSS('background-color', rest)

  await card.hover()
  await page.mouse.down()
  await settle(card)
  await expect(card).toHaveCSS('background-color', pressed)

  // The pointer away and still down: the hover is off the pill and the alternate surface remains
  await page.mouse.move(0, 0)
  await expect(card).toHaveCSS(
    'background-color',
    pressed, // mutant: the :active rule removed
  )
  await page.mouse.up()
  await expect(card).toHaveCSS(
    'background-color',
    rest, // mutant: the alternates left pressed after the release
  )
  // The release on another piece of the page lands no click
  await expect(page).toHaveURL(CUSTOMER) // mutant: the release lands a click anyway
})

// The side without a neighbor on the mobile: the ghost is the cell of its side of the grid, with
// the width of a fr of the page, so the card of the other side keeps its place as the prototype
// keeps
test('with no neighbor, every ghost keeps the fr of its cell, at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(EDGE)
  await expect(position(page)).toHaveText('1 de 1') // mutant: the context counting over all 20
  const prev = page.getByTestId('customer-nav__prev--ghost')
  const next = page.getByTestId('customer-nav__next--ghost')

  // The side marked as an empty place
  await expect(prev).toHaveAttribute('aria-hidden', 'true') // mutant: the empty side announced as content
  await expect(next).toHaveAttribute('aria-hidden', 'true') // mutant: the other side announced as content

  const cell = ((await boxOf(nav(page))).width - 8) / 2
  expect((await boxOf(prev)).width, 'the prev cell').toBeCloseTo(cell, 1)
  expect((await boxOf(next)).width, 'the next cell').toBeCloseTo(
    cell, // mutant: 1fr typed as auto, the empty cell collapsed
    1,
  )
  expect((await boxOf(prev)).width).toBe((await boxOf(next)).width)

  await expect(prevLink(page)).toHaveCount(0)
  await expect(nextLink(page)).toHaveCount(0)
})

// Below 640px the row is the carousel of the prototype: the cards leave the column of the page to
// both sides, one card of each snap, and the scrollbar out of the way
test('below 640px the related row is a carousel on the column of the page, at 375px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(CUSTOMER)
  const section = related(page)
  const cards = section.getByTestId('customer-related__cards--list')

  // The heading and the gap of the section shrink with the width
  await expect(section.getByTestId('customer-related__title--heading')).toHaveCSS(
    'font-size',
    '20px', // mutant: the 24px of the desktop left on
  )
  await expect(section).toHaveCSS(
    'margin-top',
    '24px', // mutant: the 32px of the desktop left on
  )

  // The track bleeds 16px to both sides of the column, and gives one back (4px) under the cards
  await expectLooks(cards, {
    'margin-left': '-16px', // mutant: the left bleed gone
    'margin-right': '-16px', // mutant: the right bleed gone
    padding: '0px 16px 4px', // mutant: the 4px kick-back under the cards lost
    gap: '12px', // mutant: the 16px gap of the grid left on
  })
  // The snap edge ignores the 16px of the bleed and keeps the snapped card level with the column
  // (the longhands, as Chrome serializes them)
  await expectLooks(cards, {
    'scroll-padding-left': '16px', // mutant: the bleed ignored at the snap edge
    'scroll-padding-right': '16px', // mutant: the bleed ignored at the snap edge
  })
  // One column of cards one after the other
  await expect(cards).toHaveCSS('grid-auto-flow', 'column') // mutant: the rows of the grid back

  // The column of the card: as the stylesheet declares it, and as large as the 72% of the 343px
  // of the track the browser lays out
  expect(await declared(cards, 'grid-auto-columns')).toBe('72%') // mutant: auto or 100% in its place
  expect(await boxOf(section.getByTestId('customer-related__card--div'))).toMatchObject({
    width: 246.953125, // mutant: the column taking the track's whole width
  })

  // The snap of the track and of the card within it
  await expect(cards).toHaveCSS('scroll-snap-type', 'x mandatory') // mutant: the snap type removed
  await expect(section.getByTestId('customer-related__item--listitem')).toHaveCSS(
    'scroll-snap-align',
    'start', // mutant: the align of the snap removed
  )

  // The scrollbar out of the way
  await expect(cards).toHaveCSS('scrollbar-width', 'none') // mutant: the bar back on the track
})
