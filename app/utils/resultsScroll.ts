import type { RouteLocationNormalized } from 'vue-router'
import { parseListQuery } from '#shared/utils/listQuery'

type TRoute = Pick<RouteLocationNormalized, 'path' | 'hash' | 'query'>

// The id of the results, the element a page change scrolls back to and moves the focus to
export const RESULTS_ID = 'results'

const px = (value: string) => Number.parseFloat(value) || 0

// Same page of the app, no hash, and another page of the same page size. A new page size also goes
// back to page 1, but it is no page change: whoever made it is on the select, and the scroll would
// take it off the screen. ponytail: only the page size is compared; when the list has more state
// (search, filters), compare all of it but the page.
function pageChanged(to: TRoute, from: TRoute) {
  if (to.path !== from.path || to.hash) return false
  const next = parseListQuery(to.query)
  const previous = parseListQuery(from.query)
  return next.perPage === previous.perPage && next.page !== previous.page
}

// The focus goes to the results without a scroll of its own: a page change scrolls by itself, below,
// and a retry stays where it is. The results stay while the skeleton comes and goes, the button or
// link that had the focus does not (ADR-0022).
export function focusResults(): HTMLElement | null {
  const results = document.getElementById(RESULTS_ID)
  results?.focus({ preventScroll: true })
  return results
}

// Nuxt leaves the page where it is when only the query changes, so a click on another page would
// leave the reader at the end of the new list. This brings the top of the results back, under the
// sticky header, and moves the focus there: the page link that was used turned into the current-page
// span and the focus would be lost. Any other navigation is left to Nuxt, a change of page size
// included.
export function scrollToResults(to: TRoute, from: TRoute) {
  if (!pageChanged(to, from)) return
  // Even when the results are already in sight
  const results = focusResults()
  if (!results) return
  // What Nuxt adds to a hash: the sticky header (scroll-padding on <html>) and the element's margin
  const offset =
    px(getComputedStyle(results).getPropertyValue('scroll-margin-top')) +
    px(getComputedStyle(document.documentElement).getPropertyValue('scroll-padding-top'))
  const { top } = results.getBoundingClientRect()
  // Already in sight: nothing moves. That much is as in the prototype's goPage; the rest differs
  // (ADR-0013)
  if (top >= offset) return
  window.scrollTo({
    left: 0,
    top: window.scrollY + top - offset,
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  })
}
