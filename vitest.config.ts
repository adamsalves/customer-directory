import { defineVitestConfig } from '@nuxt/test-utils/config'

// Specs live next to the code (ADR-0009); E2E belongs to Playwright
export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    include: ['{app,server,shared}/**/*.spec.ts'],
    // A cached module makes the Nuxt entry stub resolve outside the project, so every
    // run after the first fails. Remove once nuxt/test-utils#1856 ships.
    fsModuleCache: false,
  },
})
