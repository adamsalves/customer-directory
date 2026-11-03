import { expect, test, type Page } from '@playwright/test'
import { waitForHydration } from './hydration'

// The sort from the select to the URL and back. The select does nothing before the page is
// interactive, and waitForHydration needs a dark system.
test.use({ colorScheme: 'dark' })

const cards = (page: Page) => page.getByTestId('customer-card__root--article')
const names = (page: Page) => cards(page).getByTestId('customer-card__name--heading')
// The select is in the HTML twice, in the card of the toolbar and in the bar of the sheet, and CSS
// shows one: the parent says which
const cardSelect = (page: Page) =>
  page.getByTestId('list-toolbar__root--div').getByTestId('sort-select__select--select')
const barSelect = (page: Page) =>
  page.getByTestId('filter-sheet__bar--div').getByTestId('sort-select__select--select')

// "e" and three states leave 4 of the 20 customers, in three different orders. The surname order
// and Z–A differ only in the two Jesus: Melânia comes first by surname, Oceano in Z–A.
const FILTERED = '/customers?search=e&states=espirito-santo,parana,santa-catarina'
const BY_NAME = ['Alejandra Rodrigues', 'Apolo Nunes', 'Melânia Jesus', 'Oceano Jesus']
const BY_SURNAME = ['Melânia Jesus', 'Oceano Jesus', 'Apolo Nunes', 'Alejandra Rodrigues']
const BY_NAME_DESC = ['Oceano Jesus', 'Melânia Jesus', 'Apolo Nunes', 'Alejandra Rodrigues']

test('the card select sorts the filtered list, keeps the search and the states, and a reload keeps the order', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'the card is out of the page below 960px: the bar has the test below')
  await page.goto(FILTERED)
  await waitForHydration(page)
  await expect(names(page)).toHaveText(BY_NAME)

  // The names are the whole list of 4, so a pick that dropped the search or a state shows in them
  await cardSelect(page).selectOption('last')
  await expect(page).toHaveURL(`${FILTERED}&sort=last`)
  await expect(names(page)).toHaveText(BY_SURNAME)

  await cardSelect(page).selectOption('name-desc')
  await expect(page).toHaveURL(`${FILTERED}&sort=name-desc`)
  await expect(names(page)).toHaveText(BY_NAME_DESC)

  await page.reload()
  // The server HTML has the order already; the client must keep it
  await waitForHydration(page)

  await expect(page).toHaveURL(`${FILTERED}&sort=name-desc`)
  await expect(names(page)).toHaveText(BY_NAME_DESC)
  await expect(cardSelect(page)).toHaveValue('name-desc')
})

test('the bar select sorts the whole list and starts over from page 1', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'the bar is the select below 960px: the card has the test above')
  await page.goto('/customers?page=2')
  await waitForHydration(page)

  await barSelect(page).selectOption('name-desc')

  await expect(page).toHaveURL('/customers?sort=name-desc')
  // Z–A starts at the last of all 20; reversing only page 1 would start at Bartolomeu Martins
  await expect(names(page).first()).toHaveText('Quévin Cavalcanti')
})
