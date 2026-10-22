import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ErrorState from './ErrorState.vue'

const ALERT = '[data-testid="error-state__message--alert"]'
const RETRY = '[data-testid="error-state__retry--button"]'

enableAutoUnmount(afterEach)

describe('ErrorState', () => {
  it('announces the message as an alert', async () => {
    const wrapper = await mountSuspended(ErrorState)
    const alert = wrapper.get(ALERT)

    expect(alert.attributes('role')).toBe('alert')
    expect(alert.get('h2').text()).toBe('Não foi possível carregar os clientes')
    expect(alert.get('p').text()).toBe(
      'Verifique sua conexão e tente novamente. Seus filtros serão mantidos.',
    )
  })

  // Inside the alert, its label would be read as part of the message
  it('keeps the retry button out of the alert', async () => {
    const wrapper = await mountSuspended(ErrorState)

    expect(wrapper.get(RETRY).text()).toBe('Tentar novamente')
    expect(wrapper.get(RETRY).attributes('type')).toBe('button')
    expect(wrapper.get(ALERT).find(RETRY).exists()).toBe(false)
  })

  it('emits retry on click', async () => {
    const wrapper = await mountSuspended(ErrorState)

    await wrapper.get(RETRY).trigger('click')

    expect(wrapper.emitted('retry')).toEqual([[]])
  })

  // What a screen reader reads on a page load that already has the error in its HTML
  it('marks the title as an error while it is mounted', async () => {
    const wrapper = await mountSuspended(ErrorState)

    await vi.waitFor(() => {
      expect(document.title).toBe('Erro: Diretório de clientes')
    })
    wrapper.unmount()
    await vi.waitFor(() => {
      expect(document.title).toBe('Diretório de clientes')
    })
  })
})
