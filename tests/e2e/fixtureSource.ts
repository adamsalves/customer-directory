// ADR-0009: stands in for the S3 source during E2E, so the app renders the local fixture.
// Playwright starts it before the app and points NUXT_CUSTOMERS_URL at it.
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'

const port = Number(process.env.PORT)

// The portraits of the fixture point at randomuser.me (#127). Every one of them is rewritten by
// prefix, once, before anything answers: with the host swapped and the path kept, large, med and
// thumb all survive under /photos/ and the browser asks this server for the photos instead of the
// internet.
const PHOTO_HOST = 'https://randomuser.me/api/portraits'
const PHOTOS_URL = `http://127.0.0.1:${String(port)}/photos`

const body = Buffer.from(
  readFileSync(new URL('../fixtures/customers.json', import.meta.url), 'utf8').replaceAll(
    PHOTO_HOST,
    PHOTOS_URL,
  ),
)

// One square per request path, always the same for it: the hue comes from the path itself, so the
// photos of the page do not all look alike and look the same on every run. The intrinsic size
// declared on the root is what a photo gets its naturalWidth from.
const photoSvg = (pathname: string) => {
  let hue = 0
  for (let i = 0; i < pathname.length; i += 1) hue = (hue * 31 + pathname.charCodeAt(i)) % 360
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">' +
    `<rect width="100" height="100" fill="hsl(${String(hue)} 50% 40%)"/>` +
    '</svg>'
  )
}

// /flaky/<n>.json is the same list behind a switch, for the specs that need a source that is down
// (customerListError.spec.ts, which also brings it back, and customerDetail.spec.ts). Each n has
// its own switch, so runs in parallel do not flip each other's. It starts down; POST /flaky/<n>/up and /flaky/<n>/down flip it.
const flakyUp = new Set<string>()

createServer(({ method, url = '' }, response) => {
  const { pathname } = new URL(url, 'http://127.0.0.1')
  const flip = /^\/flaky\/(\w+)\/(up|down)$/.exec(pathname)
  const flaky = /^\/flaky\/(\w+)\.json$/.exec(pathname)
  if (method === 'POST' && flip?.[1]) {
    if (flip[2] === 'up') flakyUp.add(flip[1])
    else flakyUp.delete(flip[1])
    response.writeHead(204).end()
  } else if (flaky?.[1] && !flakyUp.has(flaky[1])) {
    response.writeHead(503).end()
  } else if (pathname.startsWith('/photos/')) {
    response.writeHead(200, { 'content-type': 'image/svg+xml' }).end(photoSvg(pathname))
  } else if (pathname.endsWith('.json')) {
    // The endpoint the app reads, and a flaky source up answer with the same list
    response.writeHead(200, { 'content-type': 'application/json' }).end(body)
  } else {
    response.writeHead(404).end()
  }
}).listen(port, '127.0.0.1')
