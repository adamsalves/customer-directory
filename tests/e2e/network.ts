import { test as base, expect } from '@playwright/test'

// Which hosts are the test infrastructure's own: the app on localhost, the fixture source on
// 127.0.0.1 (servers.ts) and the own instance customerDetail.spec.ts and customerListError.spec.ts
// raise, also on localhost. Anything else is a leak of the suite to the outside (127).
const LOCAL_HOSTS = ['localhost', '127.0.0.1']

// ADR-0009: no test uses the network, and this is the proof that one stays true. The URLs the
// browser asks for are recorded while the test runs and checked once it is over: a host that is
// not one of the local servers fails the test with the offending URLs in the message. URLs
// without an http(s) scheme (data:, blob:) never leave the page and are not recorded.
export const test = base.extend({
  page: async ({ page, context }, use) => {
    const urls: string[] = []
    // The context carries the requests of every page of the test: the one handed over and any
    // more it opens itself. A page of a context this test raised with the `browser` fixture has
    // a context of its own, outside this record (none of the suite opens one today).
    context.on('request', (request) => {
      const url = request.url()
      if (url.startsWith('http://') || url.startsWith('https://')) urls.push(url)
    })
    await use(page)
    const leaks = urls.filter((url) => !LOCAL_HOSTS.includes(new URL(url).hostname))
    expect(leaks, 'the test reached hosts other than the local servers (ADR-0009)').toEqual([])
  },
})
