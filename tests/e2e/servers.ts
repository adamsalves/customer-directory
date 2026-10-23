// Where the servers of an E2E run listen: playwright.config.ts starts them and the specs reach
// them. 3000 is often taken locally; any free port works.
export const APP_PORT = 3124
export const SOURCE_PORT = 3125
// customerListError.spec.ts starts its own app instance, one per worker, from this port up
export const FLAKY_APP_PORT = 3126

export const APP_URL = `http://localhost:${String(APP_PORT)}`
export const SOURCE_URL = `http://127.0.0.1:${String(SOURCE_PORT)}`
