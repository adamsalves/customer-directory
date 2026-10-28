import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { NavigationFailureType, isNavigationFailure } from 'vue-router'
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

// The route is a frame behind a write. A change made on the URL while another write is on its way
// would leave that one out, and its navigation cancels the first: the write in flight is where every
// writer builds the next list state (#90, ADR-0023)
describe('useListQuery write in flight', () => {
  it('is the list state written, until the URL has it', async () => {
    await navigateTo('/customers')
    const { pending, setQuery } = useListQuery()
    expect(pending()).toBeUndefined()

    const write = setQuery({ page: 2 })
    expect(pending()).toStrictEqual({ ...defaults, page: 2 })

    await write
    expect(pending()).toBeUndefined()
    expect(useRoute().fullPath).toBe('/customers?page=2')
  })

  // The links of the pagination are built on it, so whatever reads it has to be told when it changes
  it('is reactive: it tells when a write starts and when it is over', async () => {
    await navigateTo('/customers')
    const { pending, setQuery } = useListQuery()
    const page = computed(() => pending()?.page)
    expect(page.value).toBeUndefined()

    const write = setQuery({ page: 2 })
    expect(page.value).toBe(2)

    await write
    expect(page.value).toBeUndefined()
  })

  it('builds a change on the write still on its way, not on the URL', async () => {
    await navigateTo('/customers?search=ana&page=3')
    const { pending, setQuery } = useListQuery()

    void setQuery({ states: ['bahia'], page: 1 })
    await setQuery({ gender: 'male' })

    expect(pending()).toBeUndefined()
    expect(useRoute().fullPath).toBe('/customers?search=ana&states=bahia&gender=male')
  })

  it('builds the next change on the URL again once the write has landed', async () => {
    await navigateTo('/customers')
    const { setQuery } = useListQuery()
    await setQuery({ states: ['bahia'] })
    // The URL moves on without a write of the list
    await navigateTo('/customers?states=acre')

    await setQuery({ gender: 'male' })

    expect(useRoute().fullPath).toBe('/customers?states=acre&gender=male')
  })

  // The first write is cancelled by the second and settles while the second is still on its way
  it('keeps the newer write in flight when an older one settles', async () => {
    await navigateTo('/customers')
    const { pending, setQuery } = useListQuery()

    const first = setQuery({ states: ['bahia'] })
    const second = setQuery({ gender: 'male' })
    const failure = await first

    expect(isNavigationFailure(failure, NavigationFailureType.cancelled)).toBe(true)
    expect(pending()).toStrictEqual({ ...defaults, states: ['bahia'], gender: 'male' })
    await second
    expect(pending()).toBeUndefined()
  })

  // Whoever waits for the write finds the state clear, whatever came of it
  it('is not in flight anymore when another navigation cancels the write', async () => {
    await navigateTo('/customers')
    const { pending, setQuery } = useListQuery()

    const write = setQuery({ page: 2 })
    await useRouter().push('/customers?page=5')
    const failure = await write

    expect(isNavigationFailure(failure, NavigationFailureType.cancelled)).toBe(true)
    expect(pending()).toBeUndefined()
  })

  it('is not in flight anymore when a guard aborts the write', async () => {
    await navigateTo('/customers')
    const { pending, setQuery } = useListQuery()
    onTestFinished(useRouter().beforeEach(() => false))

    const failure = await setQuery({ page: 2 })

    expect(isNavigationFailure(failure, NavigationFailureType.aborted)).toBe(true)
    expect(pending()).toBeUndefined()
    expect(useRoute().fullPath).toBe('/customers')
  })

  it('is not in flight anymore when the navigation of the write throws', async () => {
    await navigateTo('/customers')
    const { pending, setQuery } = useListQuery()
    onTestFinished(
      useRouter().beforeEach(() => {
        throw new Error('a guard that fails')
      }),
    )

    await expect(setQuery({ page: 2 })).rejects.toThrow('a guard that fails')

    expect(pending()).toBeUndefined()
  })

  // The sheet (#26) puts a second panel on the page, and the header has the search: all of them are
  // uses of the composable
  it('is the same for every use of the composable', async () => {
    await navigateTo('/customers')
    const first = useListQuery()
    const second = useListQuery()

    const write = first.setQuery({ states: ['bahia'] })
    expect(second.pending()).toStrictEqual({ ...defaults, states: ['bahia'] })
    await second.setQuery({ gender: 'male' })
    await write

    expect(useRoute().fullPath).toBe('/customers?states=bahia&gender=male')
  })
})
