import { defineConfig, devices } from '@playwright/test'
import {
  APP_PORT,
  APP_URL,
  FLAKY_APP_PORT,
  FLAKY_APP_URL,
  SOURCE_PORT,
  SOURCE_URL,
} from './tests/e2e/servers'

const sourceURL = `${SOURCE_URL}/frontend-challenge.json`
const flakySourceURL = `${SOURCE_URL}/flaky.json`

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // CI also writes the HTML report (with traces), uploaded as an artifact
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: APP_URL, trace: 'on-first-retry' },
  // Desktop and mobile 375px (ADR-0009)
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  // Runs against a fresh production build (node-server preset). Never reuse a running
  // server: the only one it could find is a build from another moment.
  // Playwright starts the entries one at a time, in this order, and waits for the url of each
  // before the next: the last one runs the build the second one makes.
  webServer: [
    // ADR-0009: the app reads the local fixture, never S3
    {
      command: 'node tests/e2e/fixtureSource.ts',
      url: sourceURL,
      env: { PORT: String(SOURCE_PORT) },
    },
    {
      command: 'npm run build && node .output/server/index.mjs',
      // A real page, not `/`: a broken root redirect must fail its test, not time out the server
      url: `${APP_URL}/customers`,
      env: { PORT: String(APP_PORT), NUXT_CUSTOMERS_URL: sourceURL },
      timeout: 180_000,
    },
    // The same build with a cache of its own and a source that starts down, for the spec that needs
    // to see the list fail (customerListError.spec.ts). The instance above could not: its url
    // fills the cache. The "[customers] source failed" in the log is that failure, on purpose.
    {
      command: 'node .output/server/index.mjs',
      // A static file: a page would read the source
      url: `${FLAKY_APP_URL}/logo.png`,
      env: { PORT: String(FLAKY_APP_PORT), NUXT_CUSTOMERS_URL: flakySourceURL },
    },
  ],
})
