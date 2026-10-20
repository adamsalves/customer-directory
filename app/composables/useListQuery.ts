import { parseListQuery, serializeListQuery, type IListQuery } from '#shared/utils/listQuery'

// ADR-0007: the URL is the source of truth for the list. `query` reads it through
// parseListQuery; `setQuery` writes it back as a navigation, so back and shared links work.
export function useListQuery() {
  const route = useRoute()
  const router = useRouter()

  const query = computed(() => parseListQuery(route.query))

  function setQuery(next: IListQuery) {
    return router.push({ query: serializeListQuery(next) })
  }

  return { query, setQuery }
}
