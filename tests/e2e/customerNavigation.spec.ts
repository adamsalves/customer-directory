import { expect, type Page } from '@playwright/test'
import { waitForHydration } from './hydration'
import { test } from './network'

// The whole way between the rows: search, filter, chip, page, detail with its position in the
// context (#38), the related of the state (#39) and the way back, each step pinned by the URL the
// app writes (ADR-0021). What the unit specs cannot see, since they do not navigate. The mobile
// project would only repeat the same clicks and the same server HTML.
test.skip(({ isMobile }) => isMobile, 'the same at any width: the desktop project is enough')
// The clicks of this file do nothing before the page is interactive: a link would be a plain
// navigation and the field would not listen. waitForHydration needs a dark system.
test.use({ colorScheme: 'dark' })

const cards = (page: Page) => page.getByTestId('customer-card__root--article')
const names = (page: Page) => cards(page).getByTestId('customer-card__name--heading')
const links = (page: Page) => page.getByTestId('customer-card__name--link')
const field = (page: Page) => page.getByTestId('header__search--input')
const counter = (page: Page) => page.getByTestId('list-toolbar__count--text')
const chips = (page: Page) => page.getByTestId('filter-chips__chip--button')
const chipLabels = (page: Page) => page.getByTestId('filter-chips__label--text')
// The panel of the page is the aside: the sheet has another, with the same test ids
const menBox = (page: Page) =>
  page
    .getByTestId('customers__filters--aside')
    .locator('[data-testid="filter-panel__gender--radio"][value="male"]')
// Both page lists are in the DOM and CSS hides one of them
const pageTwoLink = (page: Page) =>
  page.getByTestId('pagination__page--link').filter({ hasText: /^\s*2\s*$/, visible: true })
const paginationCurrent = (page: Page) =>
  page
    .getByRole('navigation', { name: 'Paginação' })
    .locator('[aria-current="page"]')
    .filter({ visible: true })

// Every name of the fixture has an "a" aside accents and case, so the search keeps the 20: 13 men,
// 9 to the page. Page 2 of the names from A opens with Deolindo da Cunha, the 10th, and the men of
// the fixture end at page 2 with Quévin Cavalcanti, as customerDetail.spec.ts pins.
const SEARCH_URL = '/customers?search=a'

// AC1 and AC2 in one chain, every link fed by the one before it: the filter, the page and the
// context travel in the address, and the way back lands the list on the same state
test('a customer of page 2 opens with his place in the context, and back restores the page', async ({
  page,
}) => {
  await page.goto('/customers')
  await waitForHydration(page)
  // The total is the 20 of the fixture, not the 9 of the page
  await expect(counter(page)).toHaveText('Exibindo 1–9 de 20 clientes')

  // The field writes in flight (ADR-0023): the whole value, then the URL it lands
  await field(page).fill('a')
  await expect(page).toHaveURL(SEARCH_URL)
  // The search keeps the 20: still page 1 of it
  await expect(counter(page)).toHaveText('Exibindo 1–9 de 20 clientes')

  await menBox(page).check()
  await expect(page).toHaveURL('/customers?search=a&gender=male')
  // 13 men, and the counter is the one the chip has to bring back
  await expect(counter(page)).toHaveText('Exibindo 1–9 de 13 clientes')
  await expect(chipLabels(page)).toHaveText(['Busca: “a”', 'Masculino'])
  const menChip = chips(page).filter({ hasText: 'Masculino' })
  await expect(menChip).toHaveAccessibleName('Remover filtro Masculino')

  await menChip.click()
  await expect(page).toHaveURL(SEARCH_URL)
  // The panel reads the URL again: a chip removal with a stale side-effect would leave the box picked
  await expect(menBox(page)).not.toBeChecked()
  // The total back at 20: no man left out of the count
  await expect(counter(page)).toHaveText('Exibindo 1–9 de 20 clientes')

  await pageTwoLink(page).click()
  // The page comes first in the query the app writes (ADR-0021)
  await expect(page).toHaveURL('/customers?page=2&search=a')
  await expect(counter(page)).toHaveText('Exibindo 10–18 de 20 clientes')

  await links(page).first().click()

  await expect(page).toHaveURL('/customers/deolindo-dacunha?page=2&search=a')
  await expect(page.getByTestId('customer-hero__name--heading')).toHaveText('Deolindo da Cunha')
  // The place in the context of the 20 the search keeps, not of the page of 9
  await expect(page.getByTestId('customer-nav__position--text')).toHaveText('10 de 20')
  // The neighbors of the 10th of the names from A, not of the list without the search
  await expect(page.getByTestId('customer-nav__prev--link')).toHaveAccessibleName(
    'Anterior Bartolomeu Martins',
  )
  await expect(page.getByTestId('customer-nav__next--link')).toHaveAccessibleName(
    'Próximo Eleutério Almeida',
  )

  await page.getByTestId('customer-nav__next--link').click()

  // The query travels to the neighbor: a next link that lost it would open him without it
  await expect(page).toHaveURL('/customers/eleuterio-almeida?page=2&search=a')
  await expect(page.getByTestId('customer-hero__name--heading')).toHaveText('Eleutério Almeida')
  await expect(page.getByTestId('customer-nav__position--text')).toHaveText('11 de 20')

  await page.getByTestId('customer-detail__back--link').click()

  // The way back carries page and search: one lost, and the list opens somewhere else
  await expect(page).toHaveURL('/customers?page=2&search=a')
  await expect(counter(page)).toHaveText('Exibindo 10–18 de 20 clientes')
  await expect(paginationCurrent(page)).toHaveCount(1)
  await expect(paginationCurrent(page).getByTestId('pagination__current--number')).toHaveText('2')
  await expect(paginationCurrent(page).getByTestId('pagination__current--label')).toHaveText(
    'Página 2, atual',
  )
})

// AC3: the related of the state (#39), reached straight on the detail. Santa Catarina has exactly
// one other customer in the fixture, Apolo Nunes, so the section shows one card
test('the related of the state links to the list of the state alone', async ({ page }) => {
  await page.goto('/customers/alejandra-rodrigues')
  await waitForHydration(page)
  const related = page.getByTestId('customer-related__root--section')
  await expect(related.getByTestId('customer-related__title--heading')).toHaveText(
    'Outros clientes em Santa Catarina',
  )
  // Resolved from inside the section: the list page has its own cards with other test ids
  await expect(related.getByTestId('customer-related__item--listitem')).toHaveCount(1)
  await expect(
    related
      .getByTestId('customer-related__item--listitem')
      .getByTestId('customer-related__name--text'),
  ).toHaveText('Apolo Nunes')

  await page.getByTestId('customer-related__more--link').click()

  // The state alone: the search, the gender and the page had none to keep, and none came back
  await expect(page).toHaveURL('/customers?states=santa-catarina')
  // The 2 of the state, not the 20 of the list without it
  await expect(counter(page)).toHaveText('Exibindo 1–2 de 2 clientes')
  await expect(names(page)).toHaveText(['Alejandra Rodrigues', 'Apolo Nunes'])
  await expect(chipLabels(page)).toHaveText(['Santa Catarina'])
  await expect(chips(page).filter({ hasText: 'Santa Catarina' })).toHaveAccessibleName(
    'Remover filtro Santa Catarina',
  )
})
