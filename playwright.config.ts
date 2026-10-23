import { defineConfig, devices } from '@playwright/test'
import { APP_PORT, APP_URL, SOURCE_PORT, SOURCE_URL } from './tests/e2e/servers'

const sourceURL = `${SOURCE_URL}/frontend-challenge.json`

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
  // customerListError.spec.ts starts one more instance of this build, with a cache of its own.
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
  ],
})
