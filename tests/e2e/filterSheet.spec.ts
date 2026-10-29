import { expect, test, type Locator, type Page } from '@playwright/test'
import { waitForHydration } from './hydration'
import { layoutWidth } from './layoutWidth'

// The sheet is a native <dialog> opened with showModal(): the top layer, the page behind it made
// inert, Esc and the focus on the way in and out are the browser's, and happy-dom has none of them
// (FilterSheet.spec.ts). The button does nothing before the page is interactive, and
// waitForHydration needs a dark system.
test.use({ colorScheme: 'dark' })

const trigger = (page: Page) => page.getByTestId('filter-sheet__open--button')
const bar = (page: Page) => page.getByTestId('filter-sheet__bar--div')
const sheet = (page: Page) => page.getByTestId('filter-sheet__root--dialog')
const closeButton = (page: Page) => page.getByTestId('filter-sheet__close--button')
const clearButton = (page: Page) => page.getByTestId('filter-sheet__clear--button')
const apply = (page: Page) => page.getByTestId('filter-sheet__apply--button')
// The page has a panel of its own, hidden below 960px: the sheet's is the one in the dialog
const stateBox = (page: Page, slug: string) =>
  sheet(page).locator(`[data-testid="filter-panel__state--checkbox"][value="${slug}"]`)
const cards = (page: Page) => page.getByTestId('customer-card__root--article')

// Two frames are enough for what runs a frame after an event: the scroll, the focus
const settle = (page: Page) =>
  page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  )

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('the element is not rendered')
  return box
}

// The resolved value of a token in the theme of the page, as the color or the shadow it stands for
const resolved = (page: Page, property: 'color' | 'boxShadow', token: string) =>
  page.evaluate(
    ({ property, token }) => {
      const probe = document.body.appendChild(document.createElement('i'))
      probe.style[property] = `var(${token})`
      const value = getComputedStyle(probe)[property]
      probe.remove()
      return value
    },
    { property, token },
  )

async function expectStyle(target: Locator, style: Record<string, string>) {
  for (const [property, value] of Object.entries(style)) {
    await expect(target, property).toHaveCSS(property, value)
  }
}

// The value a stylesheet declares for a property of the element, as it is written: the computed one
// is a length in pixels, whatever unit it was written in
const declared = (target: Locator, property: string) =>
  target.evaluate((el, name) => {
    for (const sheet of document.styleSheets) {
      for (const rule of sheet.cssRules) {
        if (rule instanceof CSSStyleRule && el.matches(rule.selectorText)) {
          const value = rule.style.getPropertyValue(name)
          if (value !== '') return value
        }
      }
    }
    return undefined
  }, property)

// The pressed color of a button, read with the pointer held down on it. The pointer lets go on
// another piece of the same frame, so no click is made on the button.
async function pressedColor(page: Page, target: Locator, elsewhere: Locator) {
  await target.hover()
  await page.mouse.down()
  const color = await target.evaluate((el) => getComputedStyle(el).backgroundColor)
  await elsewhere.hover()
  await page.mouse.up()
  return color
}

// The fixture has 20 customers, 2 of them from Minas Gerais and 1 from Acre, which is not one of the
// five states of the short list
async function openList(page: Page, { path = '/customers', width = 375, height = 812 } = {}) {
  await page.setViewportSize({ width, height })
  await page.goto(path)
  await waitForHydration(page)
}

async function openSheet(page: Page, options?: { path?: string; width?: number }) {
  await openList(page, options)
  await trigger(page).click()
  await expect(sheet(page)).toBeVisible()
}

test('the focus goes to the close button, and Esc closes the sheet and gives it back to the button', async ({
  page,
}) => {
  await openSheet(page)
  await expect(closeButton(page)).toBeFocused()

  await page.keyboard.press('Escape')

  await expect(sheet(page)).toBeHidden()
  await expect(trigger(page)).toBeFocused()
})

// The sheet is modal: the page behind it is inert, so Tab goes round the controls of the sheet (the
// close button, the 27 states, the gender, the two buttons) with one stop on the document, the
// browser's own UI, at the end of each lap. Never on the page. More than two laps, either way.
test('Tab and Shift+Tab stay in the sheet', async ({ page }) => {
  await openSheet(page)
  const where = () =>
    page.evaluate(() => {
      const active = document.activeElement
      if (active === document.body) return 'document'
      return document.querySelector('dialog')?.contains(active) ? 'sheet' : 'page'
    })

  for (const key of ['Tab', 'Shift+Tab']) {
    const stops: string[] = []
    for (let step = 0; step < 70; step++) {
      await page.keyboard.press(key)
      stops.push(await where())
    }
    expect(
      stops.filter((stop) => stop === 'page'),
      key,
    ).toEqual([])
    expect(stops.filter((stop) => stop === 'sheet').length, key).toBeGreaterThanOrEqual(64)
  }
})

// The backdrop catches the click: it closes the sheet and the theme toggle under it, in the top
// strip the sheet leaves, does not get it
test('a click outside the sheet closes it and does not reach the page', async ({ page }) => {
  await openSheet(page)
  const toggle = await boxOf(page.getByTestId('header__theme--toggle'))

  await page.mouse.click(toggle.x + toggle.width / 2, toggle.y + toggle.height / 2)

  await expect(sheet(page)).toBeHidden()
  await settle(page)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

// A drag that begins in the sheet and lets go on the backdrop is a click on the dialog, the closest
// element that holds both, and not a click on the backdrop. At 768px the sheet is 560px wide, with
// the backdrop on both sides of it. Reduced motion keeps the title where it is while the sheet opens.
test('a drag from inside the sheet to the backdrop does not close it', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openSheet(page, { width: 768 })
  const title = await boxOf(page.getByTestId('filter-sheet__title--heading'))
  const frame = await boxOf(sheet(page))

  await page.mouse.move(title.x + title.width / 2, title.y + title.height / 2)
  await page.mouse.down()
  await page.mouse.move(frame.x / 2, frame.y + 200, { steps: 5 })
  await page.mouse.up()
  await settle(page)

  await expect(sheet(page)).toBeVisible()
})

// The second click of a double click on "Filtros" lands where the first one has just opened the sheet.
// With the bar stuck under the header and a screen taller than 825px that is the backdrop above the
// sheet, and a click there closes it (at 812px it is the grip, and nothing shows).
test('a double click on "Filtros" opens the sheet and leaves it open', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openList(page, { height: 900 })
  await page.evaluate(() => {
    window.scrollTo(0, 500)
  })
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(500)
  const button = await boxOf(trigger(page))

  await trigger(page).dblclick()
  await settle(page)

  await expect(sheet(page)).toBeVisible()
  await expect(page).toHaveURL('/customers')
  // That the second click was on the backdrop, which is the dialog itself, and not on the sheet
  const hit = { x: button.x + button.width / 2, y: button.y + button.height / 2 }
  expect(
    await sheet(page).evaluate((el, { x, y }) => document.elementFromPoint(x, y) === el, hit),
  ).toBe(true)
})

// The label of a state sends its click to the box, and the box ticks itself: the browser acts on a
// click before anyone listens to it. The first click of a double click picks the state and the second
// leaves it picked, on the name and on the box alike.
test('a double click on a state in the sheet picks it once', async ({ page }) => {
  await openSheet(page)
  const name = (state: string) =>
    sheet(page).getByTestId('filter-panel__name--text').filter({ hasText: state })

  await name('Acre').dblclick()
  await expect(stateBox(page, 'acre')).toBeChecked()
  await expect(page).toHaveURL('/customers?states=acre')

  await stateBox(page, 'bahia').dblclick()
  await expect(stateBox(page, 'bahia')).toBeChecked()
  await expect(page).toHaveURL('/customers?states=acre,bahia')
})

// The filters apply at each click, so the button of the sheet is a count of the list as it is
test('a state picked in the sheet is in the URL at once, and the button names the new total', async ({
  page,
}) => {
  await openSheet(page)
  await expect(apply(page)).toHaveText('Ver 20 clientes')
  await expect(clearButton(page)).toHaveAttribute('aria-disabled', 'true')
  // The class that the styles of the sheet variant start from (#96), as the build exports it
  await expect(sheet(page).getByTestId('filter-panel__root--div')).toHaveClass(/Sheet/)

  // A state outside the five: the sheet lists them all
  await stateBox(page, 'acre').check()
  await expect(page).toHaveURL('/customers?states=acre')
  await expect(apply(page)).toHaveText('Ver 1 cliente')
  await expect(trigger(page)).toHaveAttribute('aria-label', 'Filtros, 1 ativo')

  await stateBox(page, 'minas-gerais').check()
  await expect(page).toHaveURL('/customers?states=acre,minas-gerais')
  await expect(apply(page)).toHaveText('Ver 3 clientes')
  await expect(trigger(page)).toHaveAttribute('aria-label', 'Filtros, 2 ativos')

  await clearButton(page).click()
  await expect(page).toHaveURL('/customers')
  await expect(apply(page)).toHaveText('Ver 20 clientes')
  await expect(stateBox(page, 'acre')).not.toBeChecked()
  await expect(clearButton(page)).toHaveAttribute('aria-disabled', 'true')
  await expect(trigger(page)).toHaveAttribute('aria-label', 'Filtros')

  // The button only closes: the list is already the one it names
  await stateBox(page, 'minas-gerais').check()
  await expect(apply(page)).toHaveText('Ver 2 clientes')
  await apply(page).click()
  await expect(sheet(page)).toBeHidden()
  await expect(trigger(page)).toBeFocused()
  await expect(page).toHaveURL('/customers?states=minas-gerais')
  await expect(cards(page)).toHaveCount(2)
})

test('the page behind does not scroll while the sheet is open', async ({ page }) => {
  await openSheet(page)
  await expect(page.locator('html')).toHaveCSS('overflow', 'hidden')

  // Over the top strip the sheet leaves: the wheel there would scroll the page
  await page.mouse.move(187, 40)
  await page.mouse.wheel(0, 600)
  await settle(page)

  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  await page.keyboard.press('Escape')
  await expect(page.locator('html')).toHaveCSS('overflow', 'visible')
})

// Only a modal dialog takes the page out of reach: one opened with show() is a box in the page like
// any other, and the wheel still scrolls it
test('a dialog that is not modal does not lock the page', async ({ page }) => {
  await openList(page)

  await page.evaluate(() => {
    document.body.appendChild(document.createElement('dialog')).show()
  })

  await expect(page.locator('dialog[open]')).toHaveCount(1)
  await expect(page.locator('html')).toHaveCSS('overflow', 'visible')
  await page.mouse.move(187, 400)
  await page.mouse.wheel(0, 300)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
})

// The lock takes the scrollbar of the page away. The room it took stays, so that nothing in the page
// moves: the declaration is what is read here, and filterSheetScrollbar.spec.ts reads the page itself.
test('the page keeps the room of its scrollbar while the sheet locks it', async ({ page }) => {
  await openList(page)
  await expect(page.locator('html')).toHaveCSS('scrollbar-gutter', 'stable')

  await trigger(page).click()
  await expect(sheet(page)).toBeVisible()

  await expect(page.locator('html')).toHaveCSS('overflow', 'hidden')
  await expect(page.locator('html')).toHaveCSS('scrollbar-gutter', 'stable')
})

// The prototype's animations, jsm-up for the sheet and jsm-fade for the backdrop. Reduced motion
// takes both away: the backdrop is not an element, so the rule of the page has to name it.
test('the sheet and its backdrop animate, and reduced motion takes the animations away', async ({
  page,
}) => {
  await openSheet(page)
  const animations = () =>
    sheet(page).evaluate((el) => [
      getComputedStyle(el).animationName,
      getComputedStyle(el, '::backdrop').animationName,
    ])
  expect(await animations()).toEqual(['jsm-up', 'jsm-fade'])

  await page.keyboard.press('Escape')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await trigger(page).click()

  await expect(sheet(page)).toBeVisible()
  expect(await animations()).toEqual(['none', 'none'])
})

// A bottom sheet: as wide as the screen up to 560px and in the middle of it, on the bottom edge, no
// taller than 88% of the screen, with the corners on top rounded and the backdrop over the page
for (const { width, sheetWidth } of [
  { width: 375, sheetWidth: 375 },
  { width: 768, sheetWidth: 560 },
]) {
  test(`the sheet sits on the bottom edge, ${String(sheetWidth)}px wide at ${String(width)}px`, async ({
    page,
  }) => {
    // The entrance moves the sheet while it plays; reduced motion leaves it in place
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openSheet(page, { width })

    // As wide as the layout, which is the screen less the room of the scrollbar (layoutWidth.ts)
    const layout = await layoutWidth(page)
    const wide = Math.min(sheetWidth, layout)
    const box = await boxOf(sheet(page))
    expect(box.width).toBeCloseTo(wide, 1)
    expect(box.x).toBeCloseTo((layout - wide) / 2, 1)
    expect(box.y + box.height).toBeCloseTo(812, 1)
    expect(box.height).toBeLessThanOrEqual(812 * 0.88 + 1)
    await expect(sheet(page)).toHaveCSS('border-top-left-radius', '16px')
    await expect(sheet(page)).toHaveCSS('border-bottom-left-radius', '0px')
    const backdrop = await sheet(page).evaluate(
      (el) => getComputedStyle(el, '::backdrop').backgroundColor,
    )
    // [data-theme='dark'] --overlay
    expect(backdrop).toBe('rgba(0, 0, 0, 0.6)')
  })
}

// The cap is 88dvh, the screen as it is now. 88vh counts the screen of a phone with its URL bar pulled
// in, so while the bar shows, a sheet that tall can have its top cut off. The Chromium here has no URL
// bar: vh and dvh are the same length and the box cannot tell them apart, so the declaration is read.
test('the height of the sheet is capped in dvh', async ({ page }) => {
  await openSheet(page)

  expect(await declared(sheet(page), 'max-block-size')).toBe('88dvh')
})

// What the prototype writes in the style of the bar and of the sheet, read where it shows: the sizes
// and the gaps by their boxes (the bar is 61px; the sheet is 12px of grip, 61px of header, the body
// and 73px of footer), the rest by what the browser computes, with the tokens of the dark theme.
// Reduced motion leaves the sheet where it stops.
test('the geometry and the style of the bar and of the sheet', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openList(page, { path: '/customers?states=minas-gerais' })
  const font = await page.evaluate(() => getComputedStyle(document.body).fontFamily)
  const color = (token: string) => resolved(page, 'color', token)
  const [strong, surface, subtle, alt] = await Promise.all([
    color('--text-strong'),
    color('--surface'),
    color('--border-subtle'),
    color('--surface-alt'),
  ])
  const badge = page.getByTestId('filter-sheet__badge--text')

  await expectStyle(bar(page), {
    position: 'sticky',
    top: '69px',
    'z-index': '15',
    display: 'flex',
    'column-gap': '8px',
    'align-items': 'center',
    'margin-left': '-16px',
    'margin-bottom': '16px',
    'padding-top': '8px',
    'padding-left': '16px',
    'border-bottom-width': '1px',
    'border-bottom-style': 'solid',
    'border-bottom-color': subtle,
    'background-color': await color('--toolbar-bg'),
    'backdrop-filter': 'saturate(1.4) blur(6px)',
  })
  await expectStyle(trigger(page), {
    display: 'flex',
    'flex-shrink': '0',
    'column-gap': '8px',
    'align-items': 'center',
    height: '44px',
    'padding-top': '0px',
    'padding-left': '14px',
    'padding-right': '16px',
    'border-top-width': '1px',
    'border-top-style': 'solid',
    'border-top-color': strong,
    'border-top-left-radius': '22px',
    'background-color': surface,
    color: strong,
    'font-family': font,
    'font-size': '15px',
    'font-weight': '500',
    cursor: 'pointer',
  })
  await expectStyle(badge, {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'min-width': '22px',
    height: '22px',
    'padding-left': '6px',
    'border-top-left-radius': '11px',
    'background-color': await color('--inverse-bg'),
    color: await color('--inverse-text'),
    'font-size': '12px',
    'font-weight': '700',
  })
  // The icon, the label and the badge are in the padding of the button, 8px apart, the badge 22px
  const button = await boxOf(trigger(page))
  const icon = await boxOf(trigger(page).locator('svg'))
  const label = await boxOf(trigger(page).getByText('Filtros', { exact: true }))
  const count = await boxOf(badge)
  expect(button.height).toBeCloseTo(44, 1)
  expect(icon.x - button.x).toBeCloseTo(1 + 14, 1)
  expect(icon.width).toBeCloseTo(18, 1)
  expect(icon.height).toBeCloseTo(18, 1)
  expect(label.x - (icon.x + icon.width)).toBeCloseTo(8, 1)
  expect(count.x - (label.x + label.width)).toBeCloseTo(8, 1)
  expect(button.x + button.width - (count.x + count.width)).toBeCloseTo(16 + 1, 1)
  expect(count.width).toBeCloseTo(22, 1)
  expect(count.height).toBeCloseTo(22, 1)
  expect(await pressedColor(page, trigger(page), bar(page))).toBe(alt)

  await trigger(page).click()
  await expect(sheet(page)).toBeVisible()
  const grip = page.getByTestId('filter-sheet__grip--div')
  const header = page.getByTestId('filter-sheet__header--div')
  const body = page.getByTestId('filter-sheet__body--div')
  const footer = page.getByTestId('filter-sheet__footer--div')
  const title = page.getByTestId('filter-sheet__title--heading')
  const closeButton = page.getByTestId('filter-sheet__close--button')
  await expectStyle(sheet(page), {
    display: 'flex',
    'flex-direction': 'column',
    'padding-top': '0px',
    'border-top-width': '0px',
    'background-color': surface,
    color: await color('--text'),
    'box-shadow': await resolved(page, 'boxShadow', '--shadow-sheet'),
    overflow: 'hidden',
  })
  await expectStyle(grip, { 'flex-shrink': '0', 'padding-top': '8px' })
  const handle = await grip.evaluate((el) => {
    const style = getComputedStyle(el, '::before')
    return {
      content: style.content,
      display: style.display,
      width: style.width,
      height: style.height,
      marginLeft: style.marginLeft,
      radius: style.borderTopLeftRadius,
      background: style.backgroundColor,
    }
  })
  expect(handle).toEqual({
    content: '""',
    display: 'block',
    width: '40px',
    height: '4px',
    marginLeft: `${String(((await layoutWidth(page)) - 40) / 2)}px`,
    radius: '2px',
    background: await color('--border-strong'),
  })
  await expectStyle(header, {
    display: 'flex',
    'flex-shrink': '0',
    'align-items': 'center',
    'justify-content': 'space-between',
    'padding-top': '8px',
    'padding-left': '20px',
    'padding-right': '8px',
    'border-bottom-width': '1px',
    'border-bottom-color': subtle,
  })
  await expectStyle(title, {
    'margin-top': '0px',
    color: strong,
    'font-size': '20px',
    'font-weight': '700',
  })
  await expectStyle(closeButton, {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'padding-top': '0px',
    'border-top-width': '0px',
    'border-top-left-radius': '50%',
    'background-color': 'rgba(0, 0, 0, 0)',
    color: strong,
    cursor: 'pointer',
  })
  await expectStyle(body, {
    'flex-grow': '1',
    'padding-top': '20px',
    'padding-bottom': '24px',
    'padding-left': '20px',
    'overflow-y': 'auto',
    'overscroll-behavior-y': 'contain',
  })
  await expectStyle(footer, {
    display: 'flex',
    'flex-shrink': '0',
    'column-gap': '8px',
    'padding-top': '12px',
    'padding-bottom': '12px',
    'padding-left': '20px',
    'border-top-width': '1px',
    'border-top-color': subtle,
  })
  const buttons = {
    'padding-top': '0px',
    'padding-left': '20px',
    height: '48px',
    'border-top-left-radius': '24px',
    'font-family': font,
    'font-size': '15px',
    'font-weight': '500',
    cursor: 'pointer',
  }
  await expectStyle(clearButton(page), {
    ...buttons,
    'flex-shrink': '0',
    'border-top-width': '1px',
    'border-top-style': 'solid',
    'border-top-color': strong,
    'background-color': surface,
    color: strong,
    opacity: '1',
  })
  await expectStyle(apply(page), {
    ...buttons,
    'flex-grow': '1',
    'border-top-width': '0px',
    'background-color': await color('--primary-bg'),
    color: await color('--primary-text'),
  })

  // The boxes: the frame is filled by the grip, the header, the body and the footer, top to bottom
  const frame = await boxOf(sheet(page))
  const gripBox = await boxOf(grip)
  const headerBox = await boxOf(header)
  const bodyBox = await boxOf(body)
  const footerBox = await boxOf(footer)
  expect(gripBox.y).toBeCloseTo(frame.y, 1)
  expect(gripBox.height).toBeCloseTo(12, 1)
  expect(headerBox.y).toBeCloseTo(gripBox.y + gripBox.height, 1)
  expect(headerBox.height).toBeCloseTo(61, 1)
  expect(bodyBox.y).toBeCloseTo(headerBox.y + headerBox.height, 1)
  expect(bodyBox.y + bodyBox.height).toBeCloseTo(footerBox.y, 1)
  expect(footerBox.height).toBeCloseTo(73, 1)
  expect(footerBox.y + footerBox.height).toBeCloseTo(frame.y + frame.height, 1)
  // The title is in the padding of the header, the close button at the other end, both on its middle
  const titleBox = await boxOf(title)
  const closeBox = await boxOf(closeButton)
  const closeIcon = await boxOf(closeButton.locator('svg'))
  expect(titleBox.x - frame.x).toBeCloseTo(20, 1)
  expect(titleBox.y + titleBox.height / 2).toBeCloseTo(headerBox.y + 8 + 22, 1)
  expect(closeBox.width).toBeCloseTo(44, 1)
  expect(closeBox.height).toBeCloseTo(44, 1)
  expect(frame.x + frame.width - (closeBox.x + closeBox.width)).toBeCloseTo(8, 1)
  expect(closeBox.y - headerBox.y).toBeCloseTo(8, 1)
  expect(closeIcon.width).toBeCloseTo(20, 1)
  expect(closeIcon.x + closeIcon.width / 2).toBeCloseTo(closeBox.x + closeBox.width / 2, 1)
  expect(closeIcon.y + closeIcon.height / 2).toBeCloseTo(closeBox.y + closeBox.height / 2, 1)
  // The buttons of the footer: 20px in, 8px apart, the action button to the other 20px
  const clearBox = await boxOf(clearButton(page))
  const applyBox = await boxOf(apply(page))
  expect(clearBox.x - frame.x).toBeCloseTo(20, 1)
  expect(clearBox.y - footerBox.y).toBeCloseTo(1 + 12, 1)
  expect(clearBox.height).toBeCloseTo(48, 1)
  expect(applyBox.x - (clearBox.x + clearBox.width)).toBeCloseTo(8, 1)
  expect(frame.x + frame.width - (applyBox.x + applyBox.width)).toBeCloseTo(20, 1)
  expect(applyBox.y).toBeCloseTo(clearBox.y, 1)
  expect(applyBox.height).toBeCloseTo(48, 1)

  expect(await pressedColor(page, closeButton, title)).toBe(alt)
  expect(await pressedColor(page, apply(page), clearButton(page))).toBe(
    await color('--primary-bg-hover'),
  )
  // With nothing to clear it is dimmed
  await clearButton(page).click()
  await expect(clearButton(page)).toHaveAttribute('aria-disabled', 'true')
  await expect(clearButton(page)).toHaveCSS('opacity', '0.4')
})

// Under the header, as the first thing in the column, edge to edge: the padding of <main> (16px, 24px
// from 640px) is where the button sits. The page scrolls under it, which is why the scroll padding of
// the page counts its 61px (customerListLayout.spec.ts).
for (const { width, inset } of [
  { width: 375, inset: 16 },
  { width: 639, inset: 16 },
  { width: 640, inset: 24 },
  { width: 959, inset: 24 },
]) {
  test(`the bar sticks under the header at ${String(width)}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await page.goto('/customers')
    const header = await boxOf(page.getByRole('banner'))
    const before = await boxOf(bar(page))
    expect(before.height).toBeCloseTo(61, 1)
    // It starts lower, in the flow of the column, and the scroll brings it up to the header
    expect(before.y).toBeGreaterThan(header.y + header.height + 40)

    await page.evaluate(() => {
      window.scrollTo(0, 500)
    })
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(500)

    const after = await boxOf(bar(page))
    expect(after.y).toBeCloseTo(header.y + header.height, 1)
    expect(after.x).toBeCloseTo(0, 1)
    expect(after.width).toBeCloseTo(await layoutWidth(page), 1)
    expect((await boxOf(trigger(page))).x).toBeCloseTo(inset, 1)
  })
}

// ADR-0014: the bar is out of the page from 960px, and with it the button, from the accessibility
// tree and the tab order; the panel of the page is there instead
for (const { width, shown } of [
  { width: 959, shown: true },
  { width: 960, shown: false },
]) {
  test(`the bar is ${shown ? 'in' : 'out of'} the page at ${String(width)}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await page.goto('/customers')

    await expect(bar(page)).toBeVisible({ visible: shown })
    await expect(page.getByRole('button', { name: 'Filtros' })).toHaveCount(shown ? 1 : 0)
    await expect(page.getByRole('complementary', { name: 'Filtros' })).toBeVisible({
      visible: !shown,
    })
  })
}

// ADR-0014 again: the width is CSS, so a sheet that is open when the screen grows to 960px is not
// closed by it. The dialog is beside the bar and not in it, or it would go with the bar. When it
// closes the button it would give the focus back to is gone, and the focus is left on the page.
test('an open sheet stays open when the screen grows to 960px', async ({ page }) => {
  await openSheet(page)

  await page.setViewportSize({ width: 1280, height: 812 })

  await expect(bar(page)).toBeHidden()
  await expect(sheet(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(sheet(page)).toBeHidden()
  // The browser moves the focus off the close button that is gone on the next frame
  await expect.poll(() => page.evaluate(() => document.activeElement === document.body)).toBe(true)
})
