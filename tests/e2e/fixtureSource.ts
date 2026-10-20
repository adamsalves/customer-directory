// ADR-0009: stands in for the S3 source during E2E, so the app renders the local fixture.
// Playwright starts it before the app and points NUXT_CUSTOMERS_URL at it.
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'

const body = readFileSync(new URL('../fixtures/customers.json', import.meta.url))

createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'application/json' }).end(body)
}).listen(Number(process.env.PORT), '127.0.0.1')
