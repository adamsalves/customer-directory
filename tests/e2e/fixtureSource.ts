// ADR-0009: stands in for the S3 source during E2E, so the app renders the local fixture.
// Playwright starts it before the app and points NUXT_CUSTOMERS_URL at it.
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'

const body = readFileSync(new URL('../fixtures/customers.json', import.meta.url))

// /flaky/<n>.json is the same list behind a switch, for the spec that needs a source that is down
// and comes back (customerListError.spec.ts). Each n has its own switch, so runs in parallel do not
// flip each other's. It starts down; POST /flaky/<n>/up and /flaky/<n>/down flip it.
const flakyUp = new Set<string>()

createServer(({ method, url = '' }, response) => {
  const flip = /^\/flaky\/(\w+)\/(up|down)$/.exec(url)
  const flaky = /^\/flaky\/(\w+)\.json$/.exec(url)
  if (method === 'POST' && flip?.[1]) {
    if (flip[2] === 'up') flakyUp.add(flip[1])
    else flakyUp.delete(flip[1])
    response.writeHead(204).end()
  } else if (flaky?.[1] && !flakyUp.has(flaky[1])) {
    response.writeHead(503).end()
  } else {
    response.writeHead(200, { 'content-type': 'application/json' }).end(body)
  }
}).listen(Number(process.env.PORT), '127.0.0.1')
