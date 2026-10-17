import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import CustomersPage from './index.vue'

describe('customers page', () => {
  it('renders the list heading', async () => {
    const wrapper = await mountSuspended(CustomersPage)

    expect(wrapper.get('[data-testid="customers__title--heading"]').text()).toBe(
      'Lista de clientes',
    )
  })

  it('opens with the Home > Usuários trail', async () => {
    const wrapper = await mountSuspended(CustomersPage)

    expect(wrapper.get('[data-testid="breadcrumb__item--link"]').text()).toBe('Home')
    expect(wrapper.get('[data-testid="breadcrumb__item--current"]').text()).toBe('Usuários')
  })
})
