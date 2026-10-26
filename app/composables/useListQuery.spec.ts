import { describe, expect, it, onTestFinished, vi } from 'vitest'

describe('useListQuery', () => {
  it('reads the page and the page size from the URL', async () => {
    await navigateTo('/customers?page=2&perPage=18')

    expect(useListQuery().query.value).toStrictEqual({ page: 2, perPage: 18, search: '' })
  })

  it('reads the search from the URL, decoded and trimmed', async () => {
    await navigateTo('/customers?search=%20ELEUT%C3%89RIO+almeida%20')

    expect(useListQuery().query.value).toStrictEqual({
      page: 1,
      perPage: 9,
      search: 'ELEUTÉRIO almeida',
    })
  })

  it('falls back to the defaults when the URL is not canonical', async () => {
    await navigateTo('/customers?page=abc&perPage=7')

    expect(useListQuery().query.value).toStrictEqual({ page: 1, perPage: 9, search: '' })
  })

  it('keeps the defaults out of the URL', async () => {
    await navigateTo('/customers?page=3&perPage=18')

    await useListQuery().setQuery({ page: 1, perPage: 9, search: '' })

    expect(useRoute().fullPath).toBe('/customers')
  })

  it('writes what differs from the defaults and reads it back', async () => {
    await navigateTo('/customers')
    const { query, setQuery } = useListQuery()

    await setQuery({ page: 3, perPage: 18, search: '' })

    expect(useRoute().fullPath).toBe('/customers?page=3&perPage=18')
    expect(query.value).toStrictEqual({ page: 3, perPage: 18, search: '' })
  })

  // A new object would make useFetch refetch the same page
  it('keeps the same query when only the hash or an unknown key changes', async () => {
    await navigateTo('/customers?page=2')
    const { query } = useListQuery()
    const before = query.value

    await navigateTo('/customers?page=2#conteudo')
    expect(query.value).toBe(before)

    await navigateTo('/customers?page=2&foo=1')
    expect(query.value).toBe(before)
  })

  // ADR-0007: the back button returns to the previous list state, so setQuery pushes
  it('pushes a history entry', async () => {
    await navigateTo('/customers?page=2')
    await useListQuery().setQuery({ page: 3, perPage: 9, search: '' })

    useRouter().back()
    await vi.waitFor(() => {
      expect(useRoute().fullPath).toBe('/customers?page=2')
    })
  })

  // Back skips the entry that was replaced
  it('replaces the history entry when asked to', async () => {
    await navigateTo('/customers?page=2')
    await navigateTo('/customers?page=3')

    await useListQuery().setQuery({ page: 4, perPage: 9, search: '' }, { replace: true })
    expect(useRoute().fullPath).toBe('/customers?page=4')

    useRouter().back()
    await vi.waitFor(() => {
      expect(useRoute().fullPath).toBe('/customers?page=2')
    })
  })

  // A search from the detail page (#36) has to land on the list, not on the page it came from
  it('writes the list state on the list, whatever the current page is', async () => {
    const removeRoute = useRouter().addRoute({
      path: '/elsewhere',
      component: { render: () => null },
    })
    onTestFinished(removeRoute)
    await navigateTo('/elsewhere')

    await useListQuery().setQuery({ page: 2, perPage: 9, search: 'ana' })

    expect(useRoute().fullPath).toBe('/customers?page=2&search=ana')
  })
})
