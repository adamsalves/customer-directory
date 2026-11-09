import { expect, type Page } from '@playwright/test'
import { waitForHydration } from './hydration'
import { test } from './network'

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
// The names of the cards in a server HTML, in order. Each name is in it twice, in its card and in
// the payload, so only the markup of the link in the heading says which order the cards have
const htmlNames = (html: string) =>
  Array.from(
    html.matchAll(/data-testid="customer-card__name--link"[^>]*>([^<]*)</g),
    ([, name]) => name,
  )

// "e" and four states leave 5 of the 20 customers, in three different orders, and two pairs share a
// surname. Jesus: Melânia comes first by surname, Oceano in Z–A. Nunes: the source has Ariela before
// Apolo, in reverse alphabetical order, so only the first-name tie-break of the surname order puts
// Apolo first.
const FILTERED = '/customers?search=e&states=espirito-santo,goias,parana,santa-catarina'
const BY_NAME = [
  'Alejandra Rodrigues',
  'Apolo Nunes',
  'Ariela Nunes',
  'Melânia Jesus',
  'Oceano Jesus',
]
const BY_SURNAME = [
  'Melânia Jesus',
  'Oceano Jesus',
  'Apolo Nunes',
  'Ariela Nunes',
  'Alejandra Rodrigues',
]
const BY_NAME_DESC = [
  'Oceano Jesus',
  'Melânia Jesus',
  'Ariela Nunes',
  'Apolo Nunes',
  'Alejandra Rodrigues',
]

// Page 1 of all 20 customers from Z to A, nine to a page
const PAGE_1_BY_NAME_DESC = [
  'Quévin Cavalcanti',
  'Odélia Moura',
  'Oceano Jesus',
  'Nêuton Novaes',
  'Melchior da Cunha',
  'Melânia Jesus',
  'Marilene da Rocha',
  'Girão da Rosa',
  'Gilda Pires',
]

test('the card select sorts the filtered list, keeps the search and the states, and a reload keeps the order', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'the card is out of the page below 960px: the bar has the test below')
  await page.goto(FILTERED)
  await waitForHydration(page)
  await expect(names(page)).toHaveText(BY_NAME)

  // The names are the whole list of 5, so a pick that dropped the search or a state shows in them
  await cardSelect(page).selectOption('last')
  await expect(page).toHaveURL(`${FILTERED}&sort=last`)
  await expect(names(page)).toHaveText(BY_SURNAME)

  await cardSelect(page).selectOption('name-desc')
  await expect(page).toHaveURL(`${FILTERED}&sort=name-desc`)
  await expect(names(page)).toHaveText(BY_NAME_DESC)

  const response = await page.reload()
  if (!response) throw new Error('the reload has no response')
  // The server HTML has the order already. It is read apart from the page: a client whose request
  // differs from the server's fetches again on hydration, so the page alone can hide a server that
  // ignored the sort
  expect(htmlNames(await response.text())).toEqual(BY_NAME_DESC)
  // The client must keep it
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
  await expect(barSelect(page)).toHaveValue('name-desc')
  // Z–A starts at the last of all 20; reversing only page 1 would start at Bartolomeu Martins
  await expect(names(page)).toHaveText(PAGE_1_BY_NAME_DESC)

  // A reload leaves nothing on its way to put the select back, so it must come drawn from the URL
  await page.reload()
  await waitForHydration(page)
  await expect(barSelect(page)).toHaveValue('name-desc')
})
