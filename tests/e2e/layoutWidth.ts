import type { Page } from '@playwright/test'

// The width the layout has: the viewport less the room the lock of the sheet keeps for the scrollbar
// (`scrollbar-gutter` on <html>, base.scss), so it is read with the sheet open. The headless desktop
// Chromium takes that room out, 15px, though it draws no scrollbar; the overlay scrollbar of a phone
// takes none.
export const layoutWidth = (page: Page) =>
  page.evaluate(() => document.documentElement.getBoundingClientRect().width)
