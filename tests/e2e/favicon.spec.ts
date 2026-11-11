import { readFileSync } from 'node:fs'
import { expect } from '@playwright/test'
import { test } from './network'

// The site icons are head links served from public/ (#43). A browser or a crawler reads them
// straight from the HTML the server sends, before any script runs, so this asks for it with no
// browser. The mobile project would only repeat the same request.
test.skip(({ isMobile }) => isMobile, 'the server HTML is the same at any width')

// Nitro answers /favicon.ico with a built-in 1x1 GIF (status 200, image/x-icon) when the app
// ships none, so the files are checked by their bytes: what the server sends has to be the
// very file the repo keeps.
const FILES = ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png']
// The type the server picks for each file; the ICO one is also a tell: Nitro's built-in
// /favicon.ico fallback (no file shipped) answers image/x-icon instead
const TYPES: Record<string, string> = {
  'favicon.svg': 'image/svg+xml',
  'favicon.ico': 'image/vnd.microsoft.icon',
  'apple-touch-icon.png': 'image/png',
}

test('the list serves the three icon links', async ({ request }) => {
  const html = await (await request.get('/customers')).text()

  // The order of the attributes is the one the head config declares
  expect(html, 'the SVG icon is linked as the preferred one').toContain(
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg">',
  )
  expect(html, 'the ICO fallback is linked').toContain(
    '<link rel="icon" href="/favicon.ico" sizes="48x48">',
  )
  expect(html, 'the apple-touch icon is linked').toContain(
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
  )
})

test('the three icon files are the repo ones, with their content types', async ({ request }) => {
  for (const file of FILES) {
    const response = await request.get(`/${file}`)
    expect(response.status(), `/${file} answers`).toBe(200)
    expect(response.headers()['content-type'], `the type of /${file}`).toBe(TYPES[file])
    expect(
      Buffer.from(await response.body()).equals(readFileSync(`public/${file}`)),
      `the bytes of /${file} are the repo ones`,
    ).toBe(true)
  }
})
