import type { RouteLocationNormalized } from 'vue-router'
import { parseListQuery } from '#shared/utils/listQuery'

type TRoute = Pick<RouteLocationNormalized, 'path' | 'hash' | 'query'>

// The id of the list of customers, the element a page change scrolls back to
export const RESULTS_ID = 'results'

const px = (value: string) => Number.parseFloat(value) || 0

// Same page of the app, no hash, and another page or page size of the list
function listPageChanged(to: TRoute, from: TRoute) {
  if (to.path !== from.path || to.hash) return false
  const next = parseListQuery(to.query)
  const previous = parseListQuery(from.query)
  return next.page !== previous.page || next.perPage !== previous.perPage
}

// Nuxt leaves the page where it is when only the query changes, so a click on another page would
// leave the reader at the end of the new list. This brings the top of the results back, under the
// sticky header. Any other navigation is left to Nuxt.
export function scrollToResults(to: TRoute, from: TRoute) {
  const results = document.getElementById(RESULTS_ID)
  if (!results || !listPageChanged(to, from)) return
  // What Nuxt adds to a hash: the sticky header (scroll-padding on <html>) and the element's margin
  const offset =
    px(getComputedStyle(results).getPropertyValue('scroll-margin-top')) +
    px(getComputedStyle(document.documentElement).getPropertyValue('scroll-padding-top'))
  const { top } = results.getBoundingClientRect()
  // Already in sight, as in the prototype's goPage: leave the page where it is
  if (top >= offset) return
  window.scrollTo({
    left: 0,
    top: window.scrollY + top - offset,
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  })
}
