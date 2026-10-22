import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RESULTS_ID, scrollToResults } from './resultsScroll'

// The header (scroll-padding on <html>) and the margin of the results: 97 + 24
const OFFSET = 121
// The page is scrolled 900px and the results start 300px above the viewport, 600px down the page
const SCROLL_Y = 900
const ABOVE = -300
const TARGET = SCROLL_Y + ABOVE - OFFSET

const route = (fullPath: string) => useRouter().resolve(fullPath)
const scrollTo = vi.fn()

let results: HTMLElement
let top = ABOVE
let reducedMotion = false

beforeEach(() => {
  scrollTo.mockClear()
  top = ABOVE
  reducedMotion = false
  results = document.createElement('ul')
  results.id = RESULTS_ID
  results.style.setProperty('scroll-margin-top', '24px')
  vi.spyOn(results, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, top, 100, 100))
  document.body.append(results)
  document.documentElement.style.setProperty('scroll-padding-top', '97px')
  vi.stubGlobal('scrollY', SCROLL_Y)
  vi.stubGlobal('scrollTo', scrollTo)
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reducedMotion && query === '(prefers-reduced-motion: reduce)',
  }))
})

afterEach(() => {
  results.remove()
  document.documentElement.style.removeProperty('scroll-padding-top')
  vi.unstubAllGlobals()
})

describe('scrollToResults', () => {
  it('brings the top of the results back under the header when the page changes', () => {
    scrollToResults(route('/customers?page=3'), route('/customers?page=2'))

    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ left: 0, top: TARGET, behavior: 'smooth' })
  })

  it('does the same for a page of a page size other than the default', () => {
    scrollToResults(route('/customers?page=3&perPage=18'), route('/customers?page=2&perPage=18'))

    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ left: 0, top: TARGET, behavior: 'smooth' })
  })

  it('scrolls at once when the reader asks for reduced motion', () => {
    reducedMotion = true

    scrollToResults(route('/customers?page=3'), route('/customers?page=2'))

    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ left: 0, top: TARGET, behavior: 'instant' })
  })

  // The computed value of an unset scroll-padding is "auto", and parseFloat("auto") is NaN
  it('reads an unset scroll-padding as no padding', () => {
    document.documentElement.style.setProperty('scroll-padding-top', 'auto')

    scrollToResults(route('/customers?page=3'), route('/customers?page=2'))

    expect(scrollTo).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ top: SCROLL_Y + ABOVE - 24 }),
    )
  })

  it('leaves the page alone when the results are already in sight', () => {
    top = OFFSET

    scrollToResults(route('/customers?page=3'), route('/customers?page=2'))
    expect(scrollTo).not.toHaveBeenCalled()

    top = OFFSET - 1
    scrollToResults(route('/customers?page=3'), route('/customers?page=2'))
    expect(scrollTo).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ top: SCROLL_Y - 1 }))
  })

  it.each([
    { name: 'another route', to: '/other?page=3', from: '/customers?page=2' },
    { name: 'a hash', to: '/customers?page=3#conteudo', from: '/customers?page=2' },
    { name: 'a query that is not the list state', to: '/customers?foo=1', from: '/customers' },
    { name: 'the same list state', to: '/customers?page=1&perPage=9', from: '/customers' },
    // The select has the focus, and scrolling would take it off the screen
    { name: 'a new page size', to: '/customers?perPage=18', from: '/customers' },
    // A new page size goes back to page 1, so the page changes with it
    { name: 'a new page size and page 1', to: '/customers?perPage=18', from: '/customers?page=3' },
    { name: 'the default size back', to: '/customers', from: '/customers?page=2&perPage=18' },
  ])('does not scroll for $name', ({ to, from }) => {
    scrollToResults(route(to), route(from))

    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('does not scroll when the page has no results', () => {
    results.remove()

    scrollToResults(route('/customers?page=3'), route('/customers?page=2'))

    expect(scrollTo).not.toHaveBeenCalled()
  })
})
