// ADR-0009: stands in for the S3 source during E2E, so the app renders the local fixture.
// Playwright starts it before the app and points NUXT_CUSTOMERS_URL at it.
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'

const body = readFileSync(new URL('../fixtures/customers.json', import.meta.url))

// /flaky.json is the same list behind a switch, for the spec that needs a source that is down and
// comes back (customerListError.spec.ts). It starts down; POST /flaky/up and /flaky/down flip it.
let flakyUp = false

createServer(({ method, url }, response) => {
  if (method === 'POST' && (url === '/flaky/up' || url === '/flaky/down')) {
    flakyUp = url === '/flaky/up'
    response.writeHead(204).end()
  } else if (url === '/flaky.json' && !flakyUp) {
    response.writeHead(503).end()
  } else {
    response.writeHead(200, { 'content-type': 'application/json' }).end(body)
  }
}).listen(Number(process.env.PORT), '127.0.0.1')
