import {
  parseListQuery,
  sameListState,
  serializeListQuery,
  type IListQuery,
} from '#shared/utils/listQuery'

// Where the list lives: a list state is only ever written there
export const LIST_PATH = '/customers'

// ADR-0007: the URL is the source of truth for the list. `query` reads it through
// parseListQuery; `setQuery` writes it back as a navigation, so back and shared links work.
export function useListQuery() {
  const route = useRoute()
  const router = useRouter()

  // Every navigation brings a new route.query, a hash-only one too (the skip link). Keeping the
  // previous object while the parsed value is the same stops useFetch from refetching it.
  const query = computed<IListQuery>((previous) => {
    const next = parseListQuery(route.query)
    return previous && sameListState(previous, next) ? previous : next
  })

  // Takes the whole list state and writes its canonical URL: keys outside IListQuery are dropped.
  // It lands on the list from any page. A push adds a history entry; `replace` swaps the current one.
  function setQuery(next: IListQuery, { replace = false }: { replace?: boolean } = {}) {
    const location = { path: LIST_PATH, query: serializeListQuery(next) }
    return replace ? router.replace(location) : router.push(location)
  }

  return { query, setQuery }
}
