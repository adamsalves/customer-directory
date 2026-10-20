import { defineConfig, devices } from '@playwright/test'

// 3000 is often taken locally; any free port works
const port = 3124
const baseURL = `http://localhost:${String(port)}`

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // CI also writes the HTML report (with traces), uploaded as an artifact
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL, trace: 'on-first-retry' },
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
  webServer: {
    command: 'npm run build && node .output/server/index.mjs',
    // A real page, not `/`: a broken root redirect must fail its test, not time out the server
    url: `${baseURL}/customers`,
    env: { PORT: String(port) },
    timeout: 180_000,
  },
})
