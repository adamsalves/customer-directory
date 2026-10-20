import { parseListQuery, serializeListQuery, type IListQuery } from '#shared/utils/listQuery'

// ADR-0007: the URL is the source of truth for the list. `query` reads it through
// parseListQuery; `setQuery` writes it back as a navigation, so back and shared links work.
export function useListQuery() {
  const route = useRoute()
  const router = useRouter()

  // Every navigation brings a new route.query, a hash-only one too (the skip link). Keeping the
  // previous object while the parsed value is the same stops useFetch from refetching it.
  const query = computed<IListQuery>((previous) => {
    const next = parseListQuery(route.query)
    return previous && JSON.stringify(previous) === JSON.stringify(next) ? previous : next
  })

  // Takes the whole list state and writes its canonical URL: keys outside IListQuery are dropped
  function setQuery(next: IListQuery) {
    return router.push({ query: serializeListQuery(next) })
  }

  return { query, setQuery }
}
