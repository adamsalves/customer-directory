import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import AppHeader from './AppHeader.vue'

describe('AppHeader', () => {
  it('links the logo to the customer list', async () => {
    const wrapper = await mountSuspended(AppHeader)
    const link = wrapper.get('[data-testid="header__logo--link"]')

    expect(link.attributes('href')).toBe('/clientes')
    expect(link.attributes('aria-label')).toBe('Juntos Somos Mais — início')
  })

  it('renders the logo with its size reserved', async () => {
    const wrapper = await mountSuspended(AppHeader)
    const image = wrapper.get('[data-testid="header__logo--image"]')

    expect(image.attributes('src')).toBe('/logo.png')
    expect(image.attributes('alt')).toBe('Juntos Somos Mais')
    expect(image.attributes('width')).toBe('49')
    expect(image.attributes('height')).toBe('56')
  })

  it('renders the theme toggle as the last item of the header row', async () => {
    const wrapper = await mountSuspended(AppHeader)
    const toggle = wrapper.get('[data-testid="header__theme--toggle"]').element

    expect(toggle.nextElementSibling).toBeNull()
    expect(toggle.parentElement?.parentElement).toBe(wrapper.element)
  })
})
