import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import EmptyState from './EmptyState.vue'

const TITLE = '[data-testid="empty-state__title--heading"]'
const HINT = '[data-testid="empty-state__hint--text"]'
const CLEAR = '[data-testid="empty-state__clear--button"]'

enableAutoUnmount(afterEach)

describe('EmptyState', () => {
  it('says that no customer was found, in a level 2 heading', async () => {
    const wrapper = await mountSuspended(EmptyState, { props: { search: 'zzzz' } })

    expect(wrapper.get(TITLE).element.tagName).toBe('H2')
    expect(wrapper.get(TITLE).text()).toBe('Nenhum cliente encontrado')
  })

  it('names the search in the hint', async () => {
    const wrapper = await mountSuspended(EmptyState, { props: { search: 'zzzz' } })

    expect(wrapper.get(HINT).text()).toBe(
      'Não encontramos ninguém chamado “zzzz”. Confira a grafia ou busque só pelo sobrenome.',
    )
  })

  it('emits clear on click', async () => {
    const wrapper = await mountSuspended(EmptyState, { props: { search: 'zzzz' } })

    expect(wrapper.get(CLEAR).text()).toBe('Limpar busca e filtros')
    expect(wrapper.get(CLEAR).attributes('type')).toBe('button')
    await wrapper.get(CLEAR).trigger('click')

    expect(wrapper.emitted('clear')).toEqual([[]])
  })
})
