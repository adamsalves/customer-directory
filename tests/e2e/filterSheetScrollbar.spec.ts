import { expect, test } from '@playwright/test'
import { waitForHydration } from './hydration'
import { layoutWidth } from './layoutWidth'

// The scroll lock of the sheet takes the scrollbar of the page away and keeps the room it had
// (`scrollbar-gutter`, base.scss), so that nothing in the page moves. That shows only where a scrollbar
// takes room in the layout: the headless Chromium hides its own, and the overlay scrollbar of a phone
// takes none. This file lets the desktop one draw its scrollbar, which a whole file has to ask for, and
// filterSheet.spec.ts measures the layout without it. waitForHydration needs a dark system.
test.use({ colorScheme: 'dark', launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } })
test.skip(({ isMobile }) => isMobile, 'the scrollbar of a phone is an overlay')

test('the lock moves nothing in the page', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/customers')
  await waitForHydration(page)
  const scrollbar = () =>
    page.evaluate(() => window.innerWidth - document.documentElement.clientWidth)
  expect(await scrollbar(), 'the page has a scrollbar').toBeGreaterThan(0)
  const before = await layoutWidth(page)

  await page.getByTestId('filter-sheet__open--button').click()
  await expect(page.getByTestId('filter-sheet__root--dialog')).toBeVisible()

  await expect(page.locator('html')).toHaveCSS('overflow', 'hidden')
  expect(await scrollbar(), 'the scrollbar is gone').toBe(0)
  expect(await layoutWidth(page)).toBe(before)
})
