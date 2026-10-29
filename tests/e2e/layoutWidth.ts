import type { Page } from '@playwright/test'

// The width the layout has: the viewport less the room the page keeps for a scrollbar (`scrollbar-gutter`
// on <html>, base.scss). The headless desktop Chromium takes that room out, 15px, though it draws no
// scrollbar; the overlay scrollbar of a phone takes none.
export const layoutWidth = (page: Page) =>
  page.evaluate(() => document.documentElement.getBoundingClientRect().width)
