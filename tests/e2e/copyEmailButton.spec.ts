import { expect, type Locator, type Page } from '@playwright/test'
import { test } from './network'

// The copy button and the email row that holds it are the page's CSS ([id].module.scss): happy-dom
// applies none and no component spec lays the browser out, so these are the tests that pin them
// (#126). The write to the clipboard and the toast are already pinned in customerDetail.spec.ts;
// here the button only has to be drawn right at every width, theme and palette (#116).
// Every test sets its own width, so the mobile project would only repeat the desktop one — except
// the hover: it is a pointer question, and `hover` is false where the touch is.
test.use({ colorScheme: 'dark', reducedMotion: 'reduce' })

// The email still fits beside the button at 375px by five pixels, and its width decides the wrap,
// so the measurements are Roboto's
const CUSTOMER = '/customers/alejandra-rodrigues'
const EMAIL = 'alejandra.rodrigues@example.com'

const copyButton = (page: Page) => page.getByTestId('customer-detail__copy--button')
const copyIcon = (page: Page) => page.getByTestId('customer-detail__copy--icon')
const emailValue = (page: Page) => page.getByTestId('customer-detail__email--value')
const emailLink = (page: Page) => page.getByTestId('customer-detail__email--link')

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

// The resolved value of a token (a `--name`) or of a system color (a keyword of forced colors)
const resolved = (page: Page, property: 'color', token: string) =>
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

// The share of the pixels of a clip painted in an opaque color, read from a screenshot: what
// forced colors paint is in no computed style, and the ring sits outside the button's box
async function shareOfClipColor(
  page: Page,
  clip: { x: number; y: number; width: number; height: number },
  color: string,
) {
  const png = (await page.screenshot({ clip })).toString('base64')
  return page.evaluate(
    async ({ png, color }) => {
      const bytes = Uint8Array.from(atob(png), (char) => char.charCodeAt(0))
      const image = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
      const canvas = new OffscreenCanvas(image.width, image.height)
      const context = canvas.getContext('2d')
      if (!context) throw new Error('no 2d context')
      context.drawImage(image, 0, 0)
      const { data } = context.getImageData(0, 0, image.width, image.height)
      const [red = 0, green = 0, blue = 0] = (color.match(/[\d.]+/g) ?? []).map(Number)
      let hits = 0
      for (let i = 0; i < data.length; i += 4) {
        const [r = 0, g = 0, b = 0] = data.subarray(i, i + 3)
        if (Math.abs(r - red) + Math.abs(g - green) + Math.abs(b - blue) < 24) hits += 1
      }
      return hits / (data.length / 4)
    },
    { png, color },
  )
}

// The share of the pixels of a clip that moved between two screenshots, counted in the page: the
// ring is drawn in Highlight, whose alpha on the page is not the one that was read (the browser
// blends the color it paints on its own), so what the ring adds to the pixels is easier to see as
// a before and after than as a color
async function shareOfChangedPixels(
  page: Page,
  clip: { x: number; y: number; width: number; height: number },
  before: string,
  after: string,
) {
  return page.evaluate(
    async ({ before, after }) => {
      const decode = (png: string) =>
        createImageBitmap(
          new Blob([Uint8Array.from(atob(png), (char) => char.charCodeAt(0))], {
            type: 'image/png',
          }),
        )
      const [beforeImage, afterImage] = await Promise.all([decode(before), decode(after)])
      const canvas = new OffscreenCanvas(beforeImage.width, beforeImage.height)
      const context = canvas.getContext('2d')
      if (!context) throw new Error('no 2d context')
      const draw = (image: ImageBitmap) => {
        context.clearRect(0, 0, canvas.width, canvas.height)
        context.drawImage(image, 0, 0)
        return context.getImageData(0, 0, canvas.width, canvas.height).data
      }
      const beforeData = draw(beforeImage)
      const afterData = draw(afterImage)
      let changed = 0
      for (let i = 0; i < beforeData.length; i += 4) {
        const mover = Math.abs((beforeData[i] ?? 0) - (afterData[i] ?? 0))
        const later = Math.abs((beforeData[i + 1] ?? 0) - (afterData[i + 1] ?? 0))
        const spread = Math.abs((beforeData[i + 2] ?? 0) - (afterData[i + 2] ?? 0))
        if (mover + later + spread > 24) changed += 1
      }
      return changed / (beforeData.length / 4)
    },
    { before, after },
  )
}

// The fonts are loaded before anything is measured: the button fits beside the email at 375px only
// because the email is 232px wide, and a fallback could be that one
async function openDetail(page: Page, width: number) {
  await page.setViewportSize({ width, height: 800 })
  await page.goto(CUSTOMER)
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  // `ready` also resolves when the font never came, and a fallback could be that one
  expect(await page.evaluate((text) => document.fonts.check('400 15px Roboto', text), EMAIL)).toBe(
    true,
  )
}

// The tokens resolve against the theme of the page: without the guard, a cookie that never
// arrives renders the dark test in the light one and compares light against light
async function expectTheme(page: Page, theme: 'light' | 'dark') {
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
}

// The first line of the text of an element, on its own rectangles: the box of the element hides a
// wrap, and the line box is what the row must not stretch
const lineOf = (target: Locator) =>
  target.evaluate((el) => {
    const range = document.createRange()
    range.selectNodeContents(el)
    const [line] = [...range.getClientRects()]
    if (!line) throw new Error('the text has no line')
    return { lines: range.getClientRects().length, height: line.height }
  })

type TSize = {
  width: number
  size: number
  margin: string
  // The border box of the button rides this far above the top of the row: its outer box, shrunk
  // by the negative margin, is centered on the 32px row
  rise: number
  // Three columns start at 800px: their ~239px hold the email but not the button beside it, and
  // the row is wrapped below 960px for the touch target anyway (375/959), holding it from there up
  fits: boolean
}

// 375 and 1280 are the widths of the ADR-0013 frames; 959/960 are the two sides of the cut for the
// touch target. One check for each declaration of .CopyButton, so deleting any of them fails
const SIZES: TSize[] = [
  { width: 375, size: 44, margin: '-6px', rise: -6, fits: true },
  { width: 959, size: 44, margin: '-6px', rise: -6, fits: false },
  { width: 960, size: 40, margin: '-4px', rise: -4, fits: false },
  { width: 1280, size: 40, margin: '-4px', rise: -4, fits: true },
]

test.describe('drawn at a width of its own', () => {
  test.skip(({ isMobile }) => isMobile, 'the width is set by each test')

  for (const { width, size, margin, rise, fits } of SIZES) {
    test(`at ${String(width)}px the copy button is ${String(size)}px and the row is as tall as it leaves`, async ({
      page,
    }) => {
      await openDetail(page, width)
      const buttonBox = await boxOf(copyButton(page))
      const valueBox = await boxOf(emailValue(page))
      const linkBox = await boxOf(emailLink(page))

      await expectLooks(copyButton(page), {
        width: `${String(size)}px`,
        height: `${String(size)}px`,
        'margin-block': margin,
        padding: '0px',
        'border-width': '0px',
        'border-radius': '50%',
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'center',
        cursor: 'pointer',
      })
      await expect(copyButton(page)).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
      // Beside the email the center of the row: the border box starts `rise` above the top of it,
      // and the outer box it closes to fills the 32px the row keeps at both sizes. Wrapped, the row
      // is the email's line, the 8px between the lines and that same 32px
      const emailLine = await lineOf(emailLink(page))
      expect(emailLine.lines, 'the email is one line').toBe(1)
      expect(valueBox.height, fits ? 'beside the email' : 'wrapped below the email').toBeCloseTo(
        fits ? 32 : emailLine.height + 8 + 32,
        1,
      )
      if (fits) {
        expect(buttonBox.y - valueBox.y).toBeCloseTo(rise, 1)
      } else {
        expect(buttonBox.y).toBeGreaterThan(linkBox.y + linkBox.height)
        expect(buttonBox.x).toBeCloseTo(linkBox.x, 1)
      }
    })
  }

  // The module styles the button with the tokens of the theme the server wrote from the cookie; a
  // swap that only differs in one of them dies there. The icon paints itself with currentColor
  for (const theme of ['light', 'dark'] as const) {
    test(`the copy button wears the ${theme} theme at 1280px`, async ({ page, context }) => {
      await context.addCookies([
        { name: 'jsm-theme', value: theme, domain: 'localhost', path: '/' },
      ])
      await openDetail(page, 1280)
      await expectTheme(page, theme)
      const muted = await resolved(page, 'color', '--text-muted')

      await expect(copyButton(page)).toHaveCSS('color', muted)
      await expect(copyIcon(page)).toHaveCSS('stroke', muted)
    })

    // The ring is the global one of base.scss: solid, 2px and 2px away, of the theme, and only for
    // the keyboard — a focus brought in by a click shows none. Nothing here depends on the app:
    // both the focus and the ring are the browser's, and waiting for hydration would never end with
    // a light cookie on this dark system
    test(`the keyboard rings the copy button and a click does not, in the ${theme} theme`, async ({
      page,
      context,
    }) => {
      await context.addCookies([
        { name: 'jsm-theme', value: theme, domain: 'localhost', path: '/' },
      ])
      await openDetail(page, 1280)
      await expectTheme(page, theme)
      const focusColor = await resolved(page, 'color', '--link')

      // The click brings the focus in with the pointer: the button is focused, but the ring is not
      // for pointer focus, and nothing before it moved the focus by the keyboard
      await copyButton(page).click()
      await expect(copyButton(page)).toBeFocused()
      await expect(copyButton(page)).toHaveCSS('outline-style', 'none')

      // focus() on the email link comes from the script: a Tab from there is keyboard input, and
      // the button is where the tab order takes it next
      await emailLink(page).focus()
      await page.keyboard.press('Tab')
      await expect(copyButton(page)).toBeFocused()
      await expect(copyButton(page)).toHaveCSS('outline-color', focusColor)
      await expectLooks(copyButton(page), {
        'outline-style': 'solid',
        'outline-width': '2px',
        'outline-offset': '2px',
      })
    })
  }

  // The system colors are the user's, so they are read from the page. The icon takes ButtonText
  // (the strokes come from currentColor) and the ring Highlight, and both are drawn: no correction
  // of CSS was needed (#116), so the pixels have to tell that they come out at all
  test('forced colors draw the copy button just like the system does', async ({ page }) => {
    await openDetail(page, 1280)
    await page.emulateMedia({ forcedColors: 'active' })
    const text = await resolved(page, 'color', 'ButtonText')
    const highlight = await resolved(page, 'color', 'Highlight')
    const buttonBox = await boxOf(copyButton(page))
    // The ring sits 2px away and is 2px wide: the clip adds 4px on every side of the button's box
    const clip = {
      x: buttonBox.x - 4,
      y: buttonBox.y - 4,
      width: buttonBox.width + 8,
      height: buttonBox.height + 8,
    }

    await expect(copyButton(page)).toHaveCSS('color', text)
    await expect(copyIcon(page)).toHaveCSS('stroke', text)
    expect(await shareOfClipColor(page, clip, text)).toBeGreaterThan(0.01)
    expect(await shareOfClipColor(page, clip, highlight)).toBe(0)
    const beforeTheRing = (await page.screenshot({ clip })).toString('base64')

    // focus() on the email link comes from the script, so the Tab that follows is keyboard input:
    // the ring is the one the page would show for the keyboard, in Highlight
    await emailLink(page).focus()
    await page.keyboard.press('Tab')
    await expect(copyButton(page)).toBeFocused()
    await expect(copyButton(page)).toHaveCSS('outline-color', highlight)
    await expect(copyIcon(page)).toHaveCSS('stroke', text)
    const afterTheRing = (await page.screenshot({ clip })).toString('base64')
    // The ring is 2px wide around a 40px button: about 13% of the clip is new ink, and the noise of
    // the pixel copies of the same render is none
    expect(await shareOfChangedPixels(page, clip, beforeTheRing, afterTheRing)).toBeGreaterThan(
      0.05,
    )
  })

  // One check for each declaration of .EmailValue, so a deletion fails there: the button stands 8px
  // after the email, and the row of 32px holds both centered without stretching the email
  test('at 1280px the copy button stands beside the email, both centered', async ({ page }) => {
    await openDetail(page, 1280)
    const buttonBox = await boxOf(copyButton(page))
    const valueBox = await boxOf(emailValue(page))
    const linkBox = await boxOf(emailLink(page))
    const emailLine = await lineOf(emailLink(page))

    await expectLooks(emailValue(page), {
      display: 'flex',
      'flex-wrap': 'wrap',
      gap: '8px',
      'align-items': 'center',
    })
    expect(buttonBox.x - (linkBox.x + linkBox.width)).toBeCloseTo(8, 1)
    expect(buttonBox.y - valueBox.y).toBeCloseTo(-4, 1)
    // Without `center` the row would stretch the link to its 32px, and under `start` it would sit
    // on the top edge instead of 6px down (the 32px of the row minus the 19px of the line)
    expect(emailLine.lines, 'the email is one line').toBe(1)
    expect(linkBox.height).toBeCloseTo(emailLine.height, 1)
    expect(linkBox.y - valueBox.y).toBeCloseTo((valueBox.height - emailLine.height) / 2, 1)
    expect(valueBox.height).toBeCloseTo(32, 1)
  })

  // The email takes 232px of the 234px of the row at 320px: the button (44px) does not fit beside
  // it and wraps under it, back on the start edge, with the 8px of the gap between the lines
  test('at 320px the copy button wraps under the email, on the start edge', async ({ page }) => {
    await openDetail(page, 320)
    const buttonBox = await boxOf(copyButton(page))
    const valueBox = await boxOf(emailValue(page))
    const linkBox = await boxOf(emailLink(page))
    const emailLine = await lineOf(emailLink(page))

    expect(emailLine.lines, 'the email is one line').toBe(1)
    expect(buttonBox.y).toBeGreaterThan(linkBox.y + linkBox.height)
    expect(buttonBox.x).toBeCloseTo(linkBox.x, 1)
    // The 8px of the wrap plus the 32px that the button leaves with its negative margin: its own
    // 44px is what the width tests pin
    expect(valueBox.height).toBeCloseTo(emailLine.height + 8 + 32, 1)
  })
})

// The hover is the part that the projects tell apart, and it has to be pinned in both: with a
// pointer it turns `--surface-alt` on and the color up (ADR-0013 stopped the hover of the prototype
// for touch), and a touch project — which answers `hover: none` — must keep the base look, or a tap
// would leave the button in the hover state
for (const theme of ['light', 'dark'] as const) {
  test(`the copy button answers the mouse only with a pointer, in the ${theme} theme`, async ({
    page,
    context,
    isMobile,
  }) => {
    test.info().annotations.push({
      type: 'project',
      description: isMobile ? 'a touch project keeps the base look' : 'a pointer gets the hover',
    })
    await context.addCookies([{ name: 'jsm-theme', value: theme, domain: 'localhost', path: '/' }])
    // The touch project runs at 375px and the pointer one at 1280px: what the hover turns on is
    // the same at both widths
    await openDetail(page, isMobile ? 375 : 1280)
    await expectTheme(page, theme)
    const muted = await resolved(page, 'color', '--text-muted')

    await expect(copyButton(page)).toHaveCSS('color', muted)
    await copyButton(page).hover()
    if (isMobile) {
      await expect(copyButton(page)).toHaveCSS('color', muted)
      await expect(copyButton(page)).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    } else {
      await expect(copyButton(page)).toHaveCSS(
        'background-color',
        await resolved(page, 'color', '--surface-alt'),
      )
      await expect(copyButton(page)).toHaveCSS(
        'color',
        await resolved(page, 'color', '--text-strong'),
      )
    }
  })
}
