import { expect, test, type Locator, type Page } from '@playwright/test'
import { waitForHydration } from './hydration'

// The search, the states and the gender together, from the control to the URL and back: what the
// spec of each piece cannot see (FilterPanel, FilterChips and FilterSheet have theirs). The controls
// and the field do nothing before the page is interactive, and waitForHydration needs a dark system.
test.use({ colorScheme: 'dark' })

const cards = (page: Page) => page.getByTestId('customer-card__root--article')
const names = (page: Page) => cards(page).getByTestId('customer-card__name--heading')
const field = (page: Page) => page.getByTestId('header__search--input')
const chips = (page: Page) => page.getByTestId('filter-chips__chip--button')
const chipLabels = (page: Page) => page.getByTestId('filter-chips__label--text')
const trigger = (page: Page) => page.getByTestId('filter-sheet__open--button')
const sheet = (page: Page) => page.getByTestId('filter-sheet__root--dialog')
const apply = (page: Page) => page.getByTestId('filter-sheet__apply--button')

// The page has a panel and the sheet another, with the same test ids: `scope` is the one in hand. An
// option is its label, which holds the box, the name and the count; in the sheet the box is 1px, so
// it is the label that gets the click.
const stateOption = (scope: Locator, slug: string) =>
  scope.locator(`label:has([data-testid="filter-panel__state--checkbox"][value="${slug}"])`)
const genderOption = (scope: Locator, value: string) =>
  scope.locator(`label:has([data-testid="filter-panel__gender--radio"][value="${value}"])`)
const stateBox = (scope: Locator, slug: string) =>
  stateOption(scope, slug).getByTestId('filter-panel__state--checkbox')
const genderBox = (scope: Locator, value: string) =>
  genderOption(scope, value).getByTestId('filter-panel__gender--radio')
const countOf = (option: Locator) => option.getByTestId('filter-panel__count--number')

// The fixture has 20 customers, 13 men and 7 women, and 10 of them have "da" in the name: 7 men and 3
// women, 2 from Tocantins, 1 from Paraná (of its 2) and one man each from the Federal District
// (Alcindo das Neves) and Mato Grosso do Sul (Girão da Rosa). The page shows 9 of the 10.
const SEARCH_URL = '/customers?search=da'

test('search, states and gender narrow the list together, and the chips and a reload keep them', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'the panel is out of the page below 960px: the sheet has the test below')
  await page.goto('/customers')
  await waitForHydration(page)
  const panel = page.getByTestId('customers__filters--aside')
  const male = genderOption(panel, 'male')
  const female = genderOption(panel, 'female')
  const toggle = panel.getByTestId('filter-panel__toggle--button')
  // The panel lists five states and the picked ones: the others are behind "Ver todos"
  await toggle.click()
  await expect(countOf(male)).toHaveText('13')
  await expect(countOf(female)).toHaveText('7')
  await expect(countOf(stateOption(panel, 'parana'))).toHaveText('2')

  // The list and the counts follow the search. The field writes after a pause, and the page shows 9
  // cards before and after: 4 of the first 9 without the search have no "da" in the name.
  await field(page).fill('da')
  await expect(page).toHaveURL(SEARCH_URL)
  await expect(names(page)).toHaveText(Array.from({ length: 9 }, () => /da/i))
  await expect(countOf(male)).toHaveText('7')
  await expect(countOf(female)).toHaveText('3')
  await expect(countOf(stateOption(panel, 'parana'))).toHaveText('1')
  await expect(countOf(stateOption(panel, 'tocantins'))).toHaveText('2')

  // Picked from the end of the table to the start, and written in the order of the table. Each pick
  // waits for its URL, so that every step of it is read.
  await stateBox(panel, 'mato-grosso-do-sul').check()
  await expect(page).toHaveURL(`${SEARCH_URL}&states=mato-grosso-do-sul`)
  await stateBox(panel, 'distrito-federal').check()
  await expect(page).toHaveURL(`${SEARCH_URL}&states=distrito-federal,mato-grosso-do-sul`)
  await genderBox(panel, 'male').check()
  const filtered = `${SEARCH_URL}&states=distrito-federal,mato-grosso-do-sul&gender=male`
  await expect(page).toHaveURL(filtered)

  await expect(cards(page)).toHaveCount(2)
  await expect(names(page)).toHaveText(['Alcindo das Neves', 'Girão da Rosa'])
  // Each count leaves out its own filter: the genders count the two states and the search, so the
  // men are as many as the cards and there is no woman; a state counts the search and the gender,
  // so one of the 2 from Tocantins is left
  await expect(countOf(male)).toHaveText('2')
  await expect(countOf(female)).toHaveText('0')
  await expect(countOf(stateOption(panel, 'tocantins'))).toHaveText('1')
  await expect(chipLabels(page)).toHaveText([
    'Busca: “da”',
    'Distrito Federal',
    'Mato Grosso do Sul',
    'Masculino',
  ])

  // The chip takes out its own state, and the rest stays: the search, the other state, the gender.
  // It is the chip of the second state, where FilterChips.spec.ts takes out the first: a chip that
  // took out a state by its place, the first or the last, would pass one spec and fail the other.
  const matoGrossoDoSul = chips(page).filter({ hasText: 'Mato Grosso do Sul' })
  await expect(matoGrossoDoSul).toHaveAccessibleName('Remover filtro Mato Grosso do Sul')
  await matoGrossoDoSul.click()
  const remaining = `${SEARCH_URL}&states=distrito-federal&gender=male`
  await expect(page).toHaveURL(remaining)
  await expect(names(page)).toHaveText(['Alcindo das Neves'])
  await expect(chipLabels(page)).toHaveText(['Busca: “da”', 'Distrito Federal', 'Masculino'])
  await expect(stateBox(panel, 'distrito-federal')).toBeChecked()
  await expect(stateBox(panel, 'mato-grosso-do-sul')).not.toBeChecked()

  await page.reload()
  // The server HTML has the filters already; the client must keep them
  await waitForHydration(page)

  await expect(page).toHaveURL(remaining)
  await expect(names(page)).toHaveText(['Alcindo das Neves'])
  await expect(chipLabels(page)).toHaveText(['Busca: “da”', 'Distrito Federal', 'Masculino'])
  await expect(field(page)).toHaveValue('da')
  await expect(stateBox(panel, 'distrito-federal')).toBeChecked()
  await expect(genderBox(panel, 'male')).toBeChecked()
  // Mato Grosso do Sul is behind "Ver todos" again, since it is neither picked nor one of the five
  await expect(stateOption(panel, 'mato-grosso-do-sul')).toHaveCount(0)
})

test('the sheet filters at each pick, and Esc closes it with the filters kept, reload included', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'the sheet is the filters below 960px: the panel has the test above')
  await page.goto(SEARCH_URL)
  await waitForHydration(page)
  await trigger(page).click()
  await expect(sheet(page)).toBeVisible()
  await expect(apply(page)).toHaveText('Ver 10 clientes')

  // The filters apply at each pick, so the button names the list as it is. Each pick waits for its URL.
  await stateOption(sheet(page), 'distrito-federal').click()
  await expect(page).toHaveURL(`${SEARCH_URL}&states=distrito-federal`)
  await genderOption(sheet(page), 'male').click()
  const filtered = `${SEARCH_URL}&states=distrito-federal&gender=male`
  await expect(page).toHaveURL(filtered)
  await expect(apply(page)).toHaveText('Ver 1 cliente')

  // Esc closes without taking anything back: the picks are already the list
  await page.keyboard.press('Escape')
  await expect(sheet(page)).toBeHidden()
  await expect(trigger(page)).toBeFocused()
  await expect(trigger(page)).toHaveAttribute('aria-label', 'Filtros, 2 ativos')
  await expect(page).toHaveURL(filtered)
  await expect(names(page)).toHaveText(['Alcindo das Neves'])

  await page.reload()
  await waitForHydration(page)

  await expect(page).toHaveURL(filtered)
  await expect(names(page)).toHaveText(['Alcindo das Neves'])
  await expect(trigger(page)).toHaveAttribute('aria-label', 'Filtros, 2 ativos')
  await trigger(page).click()
  await expect(sheet(page)).toBeVisible()
  await expect(stateBox(sheet(page), 'distrito-federal')).toBeChecked()
  await expect(genderBox(sheet(page), 'male')).toBeChecked()
  await expect(apply(page)).toHaveText('Ver 1 cliente')
})
