import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { waitForHydration } from './hydration'
import { FLAKY_APP_PORT, SOURCE_URL } from './servers'

// The mobile project would only repeat the same server HTML and the same click
test.skip(({ isMobile }) => isMobile, 'the server HTML is the same at any width')
// A retry would hide the flake this timing-sensitive test exists to show, so no retry, and the trace
// is kept on failure instead of on a retry that never comes
test.describe.configure({ retries: 0 })
// waitForHydration needs a dark system
test.use({ colorScheme: 'dark', trace: 'retain-on-failure' })

// mountSuspended does not hydrate, so only here is the page seen opening on an error that the server
// rendered (status "error" in the payload), staying on it, and leaving it when the source is back.
test('the page opens on the error from the server HTML, and retry loads the list', async ({
  page,
  request,
}, testInfo) => {
  // The app caches the list the first time its source answers, and nothing empties the cache. So
  // each run starts the build (made by the webServer of playwright.config.ts) with a cache of its
  // own: a server kept alive by UI mode or --repeat-each would already have the list. Port and
  // source switch are per worker, so runs in parallel (--repeat-each) do not meet. The
  // "[customers] source failed" in the log is the failure, on purpose.
  const worker = String(testInfo.parallelIndex)
  const port = FLAKY_APP_PORT + testInfo.parallelIndex
  const appURL = `http://localhost:${String(port)}`
  const flakySource = `${SOURCE_URL}/flaky/${worker}`
  await request.post(`${flakySource}/down`)
  const server = spawn(
    process.execPath,
    [fileURLToPath(new URL('../../.output/server/index.mjs', import.meta.url))],
    {
      env: { ...process.env, PORT: String(port), NUXT_CUSTOMERS_URL: `${flakySource}.json` },
      stdio: ['ignore', 'ignore', 'inherit'],
    },
  )
  try {
    // A static file: a page would read the source
    await expect
      .poll(() =>
        request.get(`${appURL}/logo.png`).then(
          (r) => r.ok(),
          () => false,
        ),
      )
      .toBe(true)
    const apiRequests: string[] = []
    page.on('request', (browserRequest) => {
      if (browserRequest.url().includes('/api/customers')) apiRequests.push(browserRequest.url())
    })

    const response = await page.goto(`${appURL}/customers`)
    // From the server, not from a request of the browser
    expect(await response?.text()).toContain('error-state__message--alert')
    await waitForHydration(page)
    await expect(page.getByTestId('error-state__message--alert')).toBeVisible()
    // A refetch started a tick after hydration would come after the check otherwise
    await page.waitForLoadState('networkidle')
    expect(apiRequests).toEqual([])

    await request.post(`${flakySource}/up`)
    await page.getByTestId('error-state__retry--button').click()

    await expect(page.getByTestId('customer-card__root--article')).toHaveCount(9)
    await expect(page.getByTestId('error-state__message--alert')).toBeHidden()
  } finally {
    // The next run of this worker takes the same port
    if (server.exitCode === null) {
      server.kill()
      await once(server, 'exit')
    }
  }
})
