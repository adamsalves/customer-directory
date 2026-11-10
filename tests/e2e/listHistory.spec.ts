import { expect, type Page } from '@playwright/test'
import { waitForHydration } from './hydration'
import { test } from './network'

// The arrows of a closed select step through the options and fire a `change` per press, so a
// keyboard traverse could write one history entry per arrow. The traverse of the selects is armed
// by the arrows instead: the first change pushes, and the armed changes after it rewrite that same
// entry, so going back lands on the state before the first arrow, not on an intermediate step
// (#107). A pick with the mouse keeps its own push.
//
// Only headless Chromium fires the `change` of an arrow on a closed select (probe 2026-11-10), so
// the file is flat on the other browsers; the 375px frame drops the case of the page-size select,
// which keeps the kind of test of customerList.spec.ts.
test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'the closed select fires change per arrow only in Chromium (probe 2026-11-10)',
)

// The gate of hydration reads the theme toggle, and it flips under a dark system
test.use({ colorScheme: 'dark' })

// The sort select is in the HTML twice, in the card of the toolbar and in the bar of the sheet, and
// CSS shows one per width (ADR-0014): the card from 960px, the bar below. The parent says which,
// as sort.spec.ts has it.
const cardSelect = (page: Page) =>
  page.getByTestId('list-toolbar__root--div').getByTestId('sort-select__select--select')
const barSelect = (page: Page) =>
  page.getByTestId('filter-sheet__bar--div').getByTestId('sort-select__select--select')
const perPageSelect = (page: Page) => page.getByTestId('pagination__per-page--select')

// history.length read after the load has settled and before the test writes anything of its own:
// the entries the keyboard adds on top of it are the ones the assertions count
const historyCount = (page: Page): Promise<number> => page.evaluate(() => history.length)

// Two frames, as the anchoring spec of the customer list has it: the browser could still move a
// measured box in the frame the watcher has run in
const settle = (page: Page) =>
  page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  )

// The sort select sits above the list and keeps the focus and its place through its writes
// (ADR-0022), so the arrows of a burst all land on it. `'old'` is four steps from `'name'` in the
// order of SORT_OPTIONS, which the end of the traverse pins.
test('the arrow traverse of a closed sort select is one entry, and back is the state before it', async ({
  page,
  isMobile,
}) => {
  await page.goto('/customers')
  await waitForHydration(page)
  const select = isMobile ? barSelect(page) : cardSelect(page)
  await select.focus()

  // The load is behind it: the baseline counts nothing of the page it came from
  const baseline = await historyCount(page)

  // No wait between the presses: they form the burst of the traverse, and the writes line up one
  // after the write before it
  for (let arrow = 0; arrow < 4; arrow++) await page.keyboard.press('ArrowDown')

  // The order of the last arrow: `sort` is the only key in the query
  await expect(page).toHaveURL(/\/customers\?sort=old$/)
  // One entry for the whole traverse: the four pushes before the fix left baseline + 4
  await expect.poll(() => historyCount(page)).toBe(baseline + 1)

  // Not the third step of the traverse (`?sort=young`): the entry after the load is the traverse's
  // own, and the one before it is the load, without a query
  await page.goBack()
  await expect(page).toHaveURL(/\/customers$/)
  await expect(select).toHaveValue('name')
})

// The mouse is not the traverse of the arrows: a pick of it starts a state over from page 1 as a
// push, the way every pick of the reader pushes (sort.spec.ts has a pick with the select open).
// No arrow keys before it keep it unarmed as well.
test('a pick with the mouse pushes once, it faces no traverse', async ({ page, isMobile }) => {
  await page.goto('/customers')
  await waitForHydration(page)
  const select = isMobile ? barSelect(page) : cardSelect(page)
  await select.focus()

  const baseline = await historyCount(page)

  // The last of SORT_OPTIONS, none of the steps the arrows take
  await select.selectOption('recent')

  await expect(page).toHaveURL(/\/customers\?sort=recent$/)
  // One pick, one entry, in spite of the arms the component keeps
  await expect.poll(() => historyCount(page)).toBe(baseline + 1)
})

// The page-size select is one control at every width, and the identity spec of the customer list
// carries its anchoring; here it is the history the arrows leave
test('the arrow traverse of the page size is one entry, and the select stays where it was', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'the bar select at 375 keeps the kind of test of customerList.spec.ts')
  // The list changes height twice behind the press, and corrections of the browser and of the
  // component are instant under reduced motion, which the dance of the boxes wants
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/customers')
  await waitForHydration(page)
  const select = perPageSelect(page)
  await select.focus()
  const box = await select.boundingBox()
  if (!box) throw new Error('the page size select is not rendered')

  const baseline = await historyCount(page)

  // 9 → 18 → 27: the first change opens the traverse over a push, the second rewrites its entry
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')

  // The rewrite keeps `page: 1`, and neither lands in the URL after its default came back:
  // `perPage=27` alone is canonical
  await expect(page).toHaveURL(/\/customers\?perPage=27$/)
  // 27 asked, 20 in the fixture: the answer is on the page when its whole list is
  await expect(page.getByTestId('customer-card__root--article')).toHaveCount(20)
  await expect.poll(() => historyCount(page)).toBe(baseline + 1)

  await settle(page)
  const after = await select.boundingBox()
  if (!after) throw new Error('the page size select is not rendered')
  // The select ends the traverse where it started it, in whole pixels (customerList.spec.ts:130)
  expect(Math.abs(after.y - box.y)).toBeLessThanOrEqual(1)
  await expect(select).toBeFocused()
})
