import { describe, expect, it, onTestFinished, vi } from 'vitest'
import type { IListQuery } from '#shared/utils/listQuery'

// The list state with nothing set; each test overrides what it exercises
const defaults: IListQuery = { page: 1, perPage: 9, search: '', states: [], gender: 'all' }

describe('useListQuery', () => {
  it('reads the page and the page size from the URL', async () => {
    await navigateTo('/customers?page=2&perPage=18')

    expect(useListQuery().query.value).toStrictEqual({ ...defaults, page: 2, perPage: 18 })
  })

  it('reads the search from the URL, decoded and trimmed', async () => {
    await navigateTo('/customers?search=%20ELEUT%C3%89RIO+almeida%20')

    expect(useListQuery().query.value).toStrictEqual({ ...defaults, search: 'ELEUTÉRIO almeida' })
  })

  // The order of the table, whatever the order of the link, with the comma written either way
  it.each(['sao-paulo,bahia', 'sao-paulo%2Cbahia'])(
    'reads the filters from the URL, the states in canonical order: states=%s',
    async (states) => {
      await navigateTo(`/customers?states=${states}&gender=female`)

      expect(useListQuery().query.value).toStrictEqual({
        ...defaults,
        states: ['bahia', 'sao-paulo'],
        gender: 'female',
      })
    },
  )

  it('falls back to the defaults when the URL is not canonical', async () => {
    await navigateTo('/customers?page=abc&perPage=7&states=atlantis&gender=other')

    expect(useListQuery().query.value).toStrictEqual(defaults)
  })

  it('keeps the defaults out of the URL', async () => {
    await navigateTo('/customers?page=3&perPage=18&states=bahia&gender=male')

    await useListQuery().setQuery(defaults)

    expect(useRoute().fullPath).toBe('/customers')
  })

  it('writes what differs from the defaults and reads it back', async () => {
    await navigateTo('/customers')
    const { query, setQuery } = useListQuery()
    const next: IListQuery = {
      ...defaults,
      page: 3,
      perPage: 18,
      states: ['bahia', 'sao-paulo'],
      gender: 'female',
    }

    await setQuery(next)

    expect(useRoute().fullPath).toBe(
      '/customers?page=3&perPage=18&states=bahia,sao-paulo&gender=female',
    )
    expect(query.value).toStrictEqual(next)
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

  // The same states in another order, or repeated, are the same list: no refetch either
  it('keeps the same query when the states only change order or repeat', async () => {
    await navigateTo('/customers?states=sao-paulo,bahia')
    const { query } = useListQuery()
    const before = query.value

    await navigateTo('/customers?states=bahia,sao-paulo')
    expect(query.value).toBe(before)

    await navigateTo('/customers?states=bahia,sao-paulo,bahia')
    expect(query.value).toBe(before)
  })

  // ADR-0007: the back button returns to the previous list state, so setQuery pushes
  it('pushes a history entry', async () => {
    await navigateTo('/customers?page=2')
    await useListQuery().setQuery({ ...defaults, page: 3 })

    useRouter().back()
    await vi.waitFor(() => {
      expect(useRoute().fullPath).toBe('/customers?page=2')
    })
  })

  // Back skips the entry that was replaced
  it('replaces the history entry when asked to', async () => {
    await navigateTo('/customers?page=2')
    await navigateTo('/customers?page=3')

    await useListQuery().setQuery({ ...defaults, page: 4 }, { replace: true })
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

    await useListQuery().setQuery({ ...defaults, page: 2, search: 'ana' })

    expect(useRoute().fullPath).toBe('/customers?page=2&search=ana')
  })
})
