import { expect, type Page } from '@playwright/test'

// With no cookie the server renders the toggle as "Ativar tema escuro". Once Vue has mounted it
// adopts the system theme and the label flips, so the flip proves the page is interactive. It only
// flips under a dark system: a spec that calls this sets test.use({ colorScheme: 'dark' }).
export async function waitForHydration(page: Page) {
  await expect(page.getByTestId('header__theme--toggle')).toHaveAccessibleName('Ativar tema claro')
}
