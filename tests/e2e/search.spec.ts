import { expect, test, type Page } from '@playwright/test'
import { waitForHydration } from './hydration'

// The field only listens once the page is interactive. waitForHydration needs a dark system.
test.use({ colorScheme: 'dark' })

const input = (page: Page) => page.getByTestId('header__search--input')
const cards = (page: Page) => page.getByTestId('customer-card__root--article')
// Both page lists are in the DOM and CSS hides one of them
const pageTwoLink = (page: Page) =>
  page.getByTestId('pagination__page--link').filter({ hasText: /^\s*2\s*$/, visible: true })

// "girao rosa" has no accent and the only name with both words does: "Girão da Rosa"
async function expectGirao(page: Page) {
  await expect(cards(page)).toHaveCount(1)
  await expect(cards(page).getByTestId('customer-card__name--heading')).toHaveText('Girão da Rosa')
}

test('a search without accents finds the customer, and a reload keeps it', async ({ page }) => {
  await page.goto('/customers')
  await waitForHydration(page)

  await input(page).fill('girao rosa')

  // The router writes a space in a query as "+"
  await expect(page).toHaveURL('/customers?search=girao+rosa')
  await expectGirao(page)

  await page.reload()
  // The server HTML already has the value; the client must keep it
  await waitForHydration(page)

  await expectGirao(page)
  await expect(input(page)).toHaveValue('girao rosa')
})

test('a search with no match shows the empty state, and clearing it brings the list back', async ({
  page,
}) => {
  await page.goto('/customers')
  await waitForHydration(page)

  // Each word matches someone ("girao" 1, "jesus" 2) and no name has both: a search by any word
  // would show 3 cards, and by the first word only, 1
  await input(page).fill('girao jesus')

  await expect(page.getByTestId('empty-state__title--heading')).toBeVisible()
  await expect(cards(page)).toHaveCount(0)

  await page.getByTestId('empty-state__clear--button').click()

  await expect(cards(page)).toHaveCount(9)
  await expect(page).toHaveURL('/customers')
  await expect(input(page)).toHaveValue('')
})

test('the slash focuses the field without being typed, and the hint goes with the first letter', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'CSS shows the hint from 960px; at 375px it is in customerListLayout.spec.ts')
  await page.goto('/customers')
  await waitForHydration(page)
  const hint = page.getByTestId('header__search--hint')
  await expect(input(page)).not.toBeFocused()

  await page.keyboard.press('/')

  await expect(input(page)).toBeFocused()
  await expect(input(page)).toHaveValue('')
  // Focused and still empty: the hint stays, only text takes it away
  await expect(hint).toBeVisible()

  await page.keyboard.press('a')

  await expect(hint).toBeHidden()
})

test('typing replaces the history entry, so back skips every letter', async ({ page }) => {
  await page.goto('/customers')
  await waitForHydration(page)
  // Page 2 is the entry that the typing replaces, and the list before it is where back must land
  await pageTwoLink(page).click()
  await expect(page).toHaveURL('/customers?page=2')
  // The page change moves the focus to the results a frame later, and would take it from the field
  await expect(page.getByTestId('customers__results--section')).toBeFocused()

  // The keys go to whatever has the focus, so the field has to keep it between letters. Each letter
  // waits for its write: typed together, the three would be a single write and the history would
  // have no letters to skip.
  await input(page).click()
  let typed = ''
  for (const letter of ['g', 'i', 'r']) {
    typed += letter
    await page.keyboard.press(letter)
    await expect(page).toHaveURL(`/customers?search=${typed}`)
  }

  await page.goBack()

  await expect(page).toHaveURL('/customers')
  await expect(cards(page)).toHaveCount(9)
})
