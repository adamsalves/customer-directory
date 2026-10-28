import type { Router } from 'vue-router'
import {
  parseListQuery,
  sameListState,
  serializeListQuery,
  type IListQuery,
} from '#shared/utils/listQuery'

// Where the list lives: a list state is only ever written there
export const LIST_PATH = '/customers'

type TInFlight = { value: IListQuery | undefined }

// The list state of the last write the URL does not have yet, one per router: one for each request on
// the server and one in the browser, so what a request writes never reaches another. Not reactive:
// nothing renders from it (ADR-0023).
const inFlightByRouter = new WeakMap<Router, TInFlight>()

function inFlightOf(router: Router) {
  const known = inFlightByRouter.get(router)
  if (known) return known
  const created: TInFlight = { value: undefined }
  inFlightByRouter.set(router, created)
  return created
}

// ADR-0007: the URL is the source of truth for the list. `query` reads it through
// parseListQuery; `setQuery` writes it back as a navigation, so back and shared links work.
export function useListQuery() {
  const route = useRoute()
  const router = useRouter()
  const inFlight = inFlightOf(router)

  // Every navigation brings a new route.query, a hash-only one too (the skip link). Keeping the
  // previous object while the parsed value is the same stops useFetch from refetching it.
  const query = computed<IListQuery>((previous) => {
    const next = parseListQuery(route.query)
    return previous && sameListState(previous, next) ? previous : next
  })

  // The list state of the write that has not reached the URL yet, if there is one. The route is a
  // frame behind a write, so whatever builds on the list state builds on this first.
  function pending() {
    return inFlight.value
  }

  // Takes what changes in the list state and writes the canonical URL of the result: keys outside
  // IListQuery are dropped. The change is made on the write still on its way, if there is one, and on
  // the URL's state if not: made on the URL's while another write is on its way, it would leave that
  // one's changes out, and its navigation cancels that one's. It lands on the list from any page. A
  // push adds a history entry; `replace` swaps the current one.
  function setQuery(change: Partial<IListQuery>, { replace = false }: { replace?: boolean } = {}) {
    const next = { ...(inFlight.value ?? query.value), ...change }
    inFlight.value = next
    const location = { path: LIST_PATH, query: serializeListQuery(next) }
    // Landed, or aborted or replaced by a newer write: either way this one is not on its way anymore.
    // The `finally` is in the promise the caller gets, so whoever waits for it finds the state clear.
    return (replace ? router.replace(location) : router.push(location)).finally(() => {
      if (inFlight.value === next) inFlight.value = undefined
    })
  }

  return { query, pending, setQuery }
}
