import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import EmptyState from './EmptyState.vue'

const TITLE = '[data-testid="empty-state__title--heading"]'
const HINT = '[data-testid="empty-state__hint--text"]'
const CLEAR = '[data-testid="empty-state__clear--button"]'

const SEARCH_AND_FILTERS =
  'Nenhum resultado para essa busca com os filtros atuais. Tente outro nome ou remova alguns filtros.'
const FILTERS = 'Nenhum cliente corresponde aos filtros selecionados.'
const searchOnly = (search: string) =>
  `Não encontramos ninguém chamado “${search}”. Confira a grafia ou busque só pelo sobrenome.`

enableAutoUnmount(afterEach)

describe('EmptyState', () => {
  it('says that no customer was found, in a level 2 heading', async () => {
    const wrapper = await mountSuspended(EmptyState, { props: { search: 'zzzz', filtered: false } })

    expect(wrapper.get(TITLE).element.tagName).toBe('H2')
    expect(wrapper.get(TITLE).text()).toBe('Nenhum cliente encontrado')
  })

  // The hint blames what narrowed the list, and the search is not a filter. The search comes
  // trimmed from parseListQuery.
  it.each([
    { name: 'a search and filters', search: 'nunes', filtered: true, hint: SEARCH_AND_FILTERS },
    { name: 'a search alone', search: 'zzzz', filtered: false, hint: searchOnly('zzzz') },
    { name: 'filters alone', search: '', filtered: true, hint: FILTERS },
  ])('hints for $name', async ({ search, filtered, hint }) => {
    const wrapper = await mountSuspended(EmptyState, { props: { search, filtered } })

    expect(wrapper.get(HINT).text()).toBe(hint)
  })

  it('emits clear on click', async () => {
    const wrapper = await mountSuspended(EmptyState, { props: { search: 'zzzz', filtered: false } })

    expect(wrapper.get(CLEAR).text()).toBe('Limpar busca e filtros')
    expect(wrapper.get(CLEAR).attributes('type')).toBe('button')
    await wrapper.get(CLEAR).trigger('click')

    expect(wrapper.emitted('clear')).toEqual([[]])
  })
})
