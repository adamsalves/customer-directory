import { expect, type Locator, type Page } from '@playwright/test'
import { waitForHydration } from './hydration'
import { test } from './network'

// The card is a link (#35): the name is the link, and CSS stretches it over the card. happy-dom
// applies no CSS, so the unit specs see none of it. waitForHydration needs a dark system.
test.use({ colorScheme: 'dark' })

const cards = (page: Page) => page.getByTestId('customer-card__root--article')
const links = (page: Page) => page.getByTestId('customer-card__name--link')
const back = (page: Page) => page.getByTestId('customer-detail__back--link')

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('the element is not rendered')
  return box
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

async function expectLooks(target: Locator, looks: Record<string, string>) {
  for (const [property, value] of Object.entries(looks)) {
    await expect(target, property).toHaveCSS(property, value)
  }
}

// A press starts its transition at the next style update, which getAnimations() brings forward:
// waiting for what it returns reads the style at the end of the transition, or as it stays when
// there is none
const settle = (target: Locator) =>
  target.evaluate((el) =>
    Promise.allSettled(el.getAnimations().map((a) => a.finished)).then(() => 0),
  )

// Page 1 of the 20 customers of the fixture, from A to Z
const PAGE_1 = [
  'Abraim da Costa',
  'Alcindo das Neves',
  'Alda Barbosa',
  'Alejandra Rodrigues',
  'Amadeu Farias',
  'Apolo Nunes',
  'Ariela Nunes',
  'Armando da Cruz',
  'Bartolomeu Martins',
]
// The men of Minas Gerais and Paraná with an "a", oldest first, 18 to a page: two customers, and the
// first one is on page 2 of the default list. Written in no particular order, apart from the URL the
// page writes (ADR-0021), which CARRIED is.
const FILTERED = '/customers?sort=old&gender=male&states=minas-gerais,parana&search=a&perPage=18'
const CARRIED = 'perPage=18&search=a&states=minas-gerais,parana&gender=male&sort=old'

test.describe('with a mouse and a keyboard, at 1280px', () => {
  test.skip(({ isMobile }) => isMobile, 'the mobile project is a phone: the press has its own test')
  test.use({ viewport: { width: 1280, height: 800 } })

  // The link is the name, so a reader lists the customers by name; an <a> around the article would
  // be left without one in Chrome
  test('every card is a link named by its customer', async ({ page }) => {
    await page.goto('/customers')

    for (const name of PAGE_1) {
      await expect(page.getByRole('link', { name, exact: true })).toHaveCount(1)
    }
    await expect(cards(page).first()).toMatchAriaSnapshot(`
      - article:
        - heading "Abraim da Costa" [level=2]:
          - link "Abraim da Costa":
            - /url: /customers/abraim-dacosta
        - paragraph: Avenida D. Pedro II, 1315
        - paragraph: "Taubaté Minas Gerais - CEP: 66230"
    `)
  })

  test('a click on the street, off the name, opens the customer with the list state', async ({
    page,
  }) => {
    await page.goto(FILTERED)
    await waitForHydration(page)
    const first = cards(page).first()
    await expect(first.getByTestId('customer-card__name--heading')).toHaveText('Oceano Jesus')

    // The ::after of the link is over the street, which is what is under test: the check that nothing
    // covers the street is skipped
    await first.getByTestId('customer-card__street--text').click({ force: true })

    await expect(page).toHaveURL(`/customers/oceano-jesus?${CARRIED}`)
    await expect(page.getByTestId('customer-hero__name--heading')).toHaveText('Oceano Jesus')
    await expect(back(page)).toHaveAttribute('href', `/customers?${CARRIED}`)
  })

  // A card in the middle: with no `position: relative` on the card the ::after takes the page for its
  // box and covers every card, and the link on top is the last card's. The ::after is the border box
  // of the card, no more and no less: as large as the card with its 1px border, and not under the
  // points 2px outside of it. A hit at the very edge is blurred by under a pixel (the card's own is),
  // so the edge is measured by size and not by hit.
  test('the link covers the whole card, border included, and shows the pointer all over it', async ({
    page,
  }) => {
    await page.goto('/customers')
    const card = cards(page).nth(4)
    await card.scrollIntoViewIfNeeded()

    const hit = await card.evaluate((el) => {
      const link = el.querySelector('[data-testid="customer-card__name--link"]')
      if (!link) throw new Error('the card has no link')
      const after = getComputedStyle(link, '::after')
      const centerOf = (testId: string): [number, number] => {
        const rect = el.querySelector(`[data-testid="${testId}"]`)?.getBoundingClientRect()
        if (!rect) throw new Error(`${testId} is not rendered`)
        return [rect.x + rect.width / 2, rect.y + rect.height / 2]
      }
      const { left, top, right, bottom, width, height } = el.getBoundingClientRect()
      const [midX, midY] = [(left + right) / 2, (top + bottom) / 2]
      const isLink = (points: Record<string, [number, number]>) =>
        Object.fromEntries(
          Object.entries(points).map(([name, [x, y]]) => [
            name,
            document.elementFromPoint(x, y) === link,
          ]),
        )
      return {
        over: isLink({
          avatar: centerOf('customer-avatar__root--span'),
          street: centerOf('customer-card__street--text'),
          location: centerOf('customer-card__location--grid'),
          topLeft: [left + 6, top + 6],
          bottomRight: [right - 6, bottom - 6],
        }),
        beyond: isLink({
          left: [left - 2, midY],
          right: [right + 2, midY],
          top: [midX, top - 2],
          bottom: [midX, bottom + 2],
        }),
        asLargeAsTheCard:
          Math.abs(parseFloat(after.width) - width) < 0.01 &&
          Math.abs(parseFloat(after.height) - height) < 0.01,
        cursor: after.cursor,
      }
    })

    expect(hit).toEqual({
      over: { avatar: true, street: true, location: true, topLeft: true, bottomRight: true },
      beyond: { left: false, right: false, top: false, bottom: false },
      asLargeAsTheCard: true,
      cursor: 'pointer',
    })
  })

  // The same on the border, with a real click on the pixel column of the left border (1px wide, from
  // the edge of the card). A click hits the pixel it is on, so only a ::after that reaches the border
  // is the link there: one a pixel in (inset 0) would be missed by it.
  test('a click on the border of the card opens the customer too', async ({ page }) => {
    await page.goto('/customers')
    await waitForHydration(page)
    const card = cards(page).first()
    await card.scrollIntoViewIfNeeded()
    const { x, y, height } = await boxOf(card)

    await page.mouse.click(Math.floor(x), y + height / 2)

    await expect(page).toHaveURL('/customers/abraim-dacosta')
    await expect(page.getByTestId('customer-hero__name--heading')).toHaveText('Abraim da Costa')
  })

  // The link has the color of the card, hovered too (the base layer turns `a:hover` blue), and no
  // underline
  test('the link reads as the name', async ({ page }) => {
    await page.goto('/customers')
    const link = links(page).first()
    const strong = await colorOfToken(page, '--text-strong')

    await expectLooks(link, { color: strong, 'text-decoration-line': 'none' })
    await link.hover()
    await expectLooks(link, { color: strong, 'text-decoration-line': 'none' })
  })

  // The link has no ring of its own: the ring is the ::after's, around the card, with its radius. It is
  // 2px from the border, as the global ring is from a control: the ::after is the border box (the
  // inset takes the 1px border in) and the ring starts the offset out from it. A ring is ink outside
  // the box, so nothing between the link and the page may clip it.
  test('the focus ring goes around the card, 2px from its border, and nothing clips it', async ({
    page,
  }) => {
    await page.goto('/customers')
    await waitForHydration(page)
    const link = links(page).first()

    await page.getByTestId('customers__results--section').focus()
    await page.keyboard.press('Tab')
    await expect(link).toBeFocused()
    await expect(link).toHaveCSS('outline-style', 'none')
    const ring = await link.evaluate((el) => {
      const card = el.closest('[data-testid="customer-card__root--article"]')
      if (!card) throw new Error('the link is in no card')
      const after = getComputedStyle(el, '::after')
      const clipping: string[] = []
      for (let node = el.parentElement; node; node = node.parentElement) {
        const { overflowX, overflowY } = getComputedStyle(node)
        if (overflowX !== 'visible' || overflowY !== 'visible') clipping.push(node.tagName)
      }
      return {
        outlineStyle: after.outlineStyle,
        outlineWidth: after.outlineWidth,
        outlineOffset: after.outlineOffset,
        outlineColor: after.outlineColor,
        borderTopLeftRadius: after.borderTopLeftRadius,
        cardRadius: getComputedStyle(card).borderTopLeftRadius,
        // From the border of the card out to the ring: the offset, less what the ::after starts
        // inside the border box (the border, less the inset)
        gapToBorder:
          parseFloat(after.outlineOffset) -
          (parseFloat(getComputedStyle(card).borderTopWidth) + parseFloat(after.top)),
        clipping,
      }
    })

    expect(ring).toEqual({
      outlineStyle: 'solid',
      outlineWidth: '2px',
      outlineOffset: '2px',
      outlineColor: await colorOfToken(page, '--link'),
      borderTopLeftRadius: ring.cardRadius,
      cardRadius: '2px',
      gapToBorder: 2,
      clipping: [],
    })
  })
})

// Below 640px the card is a row and answers a press, as the prototype's does: held down with the
// pointer on it, and let go on another piece of the page so no click is made. From 640px it is a
// card with a hover lift and no press.
test('the row answers a press with the alternate surface, in 0.15s', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'a phone: the desktop project is the mouse of the tests above')
  await page.goto('/customers')
  const card = cards(page).first()
  const rest = await colorOfToken(page, '--surface')
  const pressed = await colorOfToken(page, '--surface-alt')
  const backgroundOf = () => card.evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(pressed).not.toBe(rest)
  expect(await backgroundOf()).toBe(rest)

  await card.hover()
  await page.mouse.down()
  await settle(card)
  expect(await backgroundOf()).toBe(pressed)
  const { property, duration } = await card.evaluate((el) => ({
    property: getComputedStyle(el).transitionProperty.split(', '),
    duration: getComputedStyle(el).transitionDuration.split(', '),
  }))
  expect(duration[property.indexOf('background-color')]).toBe('0.15s')
  await page.mouse.move(0, 0)
  await page.mouse.up()

  await page.setViewportSize({ width: 1280, height: 800 })
  await card.hover()
  await page.mouse.down()
  await settle(card)
  expect(await backgroundOf()).toBe(rest)
  await page.mouse.move(0, 0)
  await page.mouse.up()
})

// The customer page opens with the trail, which a phone does not have (the prototype's detail has
// none below 640px), and the link back, which both have. The link back is 36px tall, as in the
// prototype, and 44px below 960px, the touch target of the project (ADR-0013): 959px is the edge. The
// radius is half the height at both. The page is read with the entrance of the article done, or
// mid-way it is off the pixel grid.
const DETAIL = '/customers/alejandra-rodrigues?perPage=18&sort=old'

for (const { width, trail, height } of [
  { width: 375, trail: false, height: 44 },
  { width: 959, trail: true, height: 44 },
  { width: 960, trail: true, height: 36 },
  { width: 1280, trail: true, height: 36 },
]) {
  test(`the link back is ${String(height)}px tall, ${trail ? 'under the trail' : 'the first thing, with no trail'}, at ${String(width)}px`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width, height: 800 })
    await page.goto(DETAIL)
    const link = back(page)
    const nav = page.getByRole('navigation', { name: 'Trilha de navegação' })
    const hero = await boxOf(page.getByTestId('customer-hero__root--section'))
    const box = await boxOf(link)
    const icon = await boxOf(link.getByTestId('customer-detail__back--icon'))

    await expect(nav).toBeVisible({ visible: trail })
    // 28px under the trail, as the prototype's margin; with none, it opens the page
    if (trail) {
      const { y, height } = await boxOf(nav)
      expect(box.y - (y + height)).toBeCloseTo(28, 1)
    } else {
      expect(box.y).toBeCloseTo((await boxOf(page.getByRole('banner'))).height + 16, 1)
    }
    // As tall as the width says, 16px over the hero, and pulled 8px out of its column so the chevron
    // lines up with it
    expect(box.height).toBeCloseTo(height, 1)
    expect(hero.y - (box.y + box.height)).toBeCloseTo(16, 1)
    expect(hero.x - box.x).toBeCloseTo(8, 1)
    expect(icon).toMatchObject({ width: 18, height: 18 })
    expect(icon.x - box.x).toBeCloseTo(8, 1)
    expect(icon.y + icon.height / 2).toBeCloseTo(box.y + box.height / 2, 1)
    await expect(link).toHaveAccessibleName('Voltar para a lista')
    await expectLooks(link, {
      display: 'flex',
      'align-items': 'center',
      'align-self': 'flex-start',
      'column-gap': '6px',
      'min-block-size': `${String(height)}px`,
      'padding-right': '14px',
      'border-top-left-radius': `${String(height / 2)}px`,
      color: await colorOfToken(page, '--text-strong'),
      'font-size': '14px',
      'font-weight': '500',
      'text-decoration-line': 'none',
      'background-color': 'rgba(0, 0, 0, 0)',
    })
  })
}

// Hover only where a pointer can hover (ADR-0013): the desktop project has a mouse, the mobile one a
// touch screen, which (hover: hover) does not match
test('the link back reacts to hover only with a mouse', async ({ page, isMobile }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(DETAIL)
  const link = back(page)

  await link.hover()

  await expect(link).toHaveCSS(
    'background-color',
    isMobile ? 'rgba(0, 0, 0, 0)' : await colorOfToken(page, '--surface-alt'),
  )
  await expect(link).toHaveCSS('color', await colorOfToken(page, '--text-strong'))
})

// Text-only zoom at 200% takes the 14px label to 28px or more, and at 375px it wraps: the pill must
// grow with it, not let the second line spill out of its 44px
test('the link back grows with a label that wraps', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(DETAIL)
  await page.addStyleTag({
    content: '[data-testid="customer-detail__back--link"] { font-size: 40px }',
  })

  const { scrollHeight, clientHeight } = await back(page).evaluate((element) => ({
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
  }))
  expect(clientHeight).toBeGreaterThan(44)
  expect(scrollHeight).toBeLessThanOrEqual(clientHeight)
})
