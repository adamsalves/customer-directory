import { expect, test } from '@playwright/test'
import { waitForHydration } from './hydration'
import { FLAKY_APP_URL, SOURCE_URL } from './servers'

// The app instance of this spec (playwright.config.ts) caches the list the first time its source
// answers, and nothing empties the cache. A retry would find the list at once and never see the
// error.
test.describe.configure({ retries: 0 })
// waitForHydration needs a dark system
test.use({ colorScheme: 'dark' })

// mountSuspended does not hydrate, so only here is the page seen opening on an error that the server
// rendered (status "error" in the payload), staying on it, and leaving it when the source is back.
test('the page opens on the error from the server HTML, and retry loads the list', async ({
  page,
  request,
}, testInfo) => {
  // The project that runs second would find the cache of the instance filled
  test.skip(testInfo.project.name !== 'desktop', 'one run per instance')
  await request.post(`${SOURCE_URL}/flaky/down`)
  const apiRequests: string[] = []
  page.on('request', (browserRequest) => {
    if (browserRequest.url().includes('/api/customers')) apiRequests.push(browserRequest.url())
  })

  const response = await page.goto(`${FLAKY_APP_URL}/customers`)
  // From the server, not from a request of the browser
  expect(await response?.text()).toContain('error-state__message--alert')
  await waitForHydration(page)
  await expect(page.getByTestId('error-state__message--alert')).toBeVisible()
  expect(apiRequests).toEqual([])

  await request.post(`${SOURCE_URL}/flaky/up`)
  await page.getByTestId('error-state__retry--button').click()

  await expect(page.getByTestId('customer-card__root--article')).toHaveCount(9)
  await expect(page.getByTestId('error-state__message--alert')).toBeHidden()
})
