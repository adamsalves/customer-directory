import { mountSuspended } from '@nuxt/test-utils/runtime'
import { DetachedWindowAPI } from 'happy-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './app.vue'

const TOGGLE = '[data-testid="header__theme--toggle"]'
const html = document.documentElement
const mounted: { unmount: () => void }[] = []

async function mountApp() {
  const wrapper = await mountSuspended(App, { route: '/clientes' })
  mounted.push(wrapper)
  return wrapper
}

// happy-dom answers `prefers-color-scheme` from its device settings and emits the MediaQueryList
// `change` events when the window is resized
function setSystemColorScheme(scheme: 'light' | 'dark') {
  const api: unknown = 'happyDOM' in window ? window.happyDOM : undefined
  if (!(api instanceof DetachedWindowAPI)) throw new Error('happy-dom API not found')
  api.settings.device.prefersColorScheme = scheme
  window.dispatchEvent(new Event('resize'))
}

describe('app theme', () => {
  afterEach(() => {
    for (const wrapper of mounted.splice(0)) wrapper.unmount()
    clearNuxtState(['theme', 'theme-chosen'])
    document.cookie = 'jsm-theme=; path=/; max-age=0'
    html.removeAttribute('data-theme')
    setSystemColorScheme('light')
  })

  it('follows the system preference until the first click', async () => {
    const wrapper = await mountApp()
    const { theme } = useTheme()

    setSystemColorScheme('dark')
    expect(theme.value).toBe('dark')
    await vi.waitFor(() => {
      expect(html.getAttribute('data-theme')).toBe('dark')
    })

    setSystemColorScheme('light')
    expect(theme.value).toBe('light')
    await vi.waitFor(() => {
      expect(html.getAttribute('data-theme')).toBe('light')
    })

    await wrapper.get(TOGGLE).trigger('click')
    expect(theme.value).toBe('dark')

    setSystemColorScheme('dark')
    setSystemColorScheme('light')
    expect(theme.value).toBe('dark')
    await vi.waitFor(() => {
      expect(html.getAttribute('data-theme')).toBe('dark')
    })
  })

  it('keeps the saved choice over the system preference', async () => {
    document.cookie = 'jsm-theme=light; path=/'
    await mountApp()
    const { theme } = useTheme()

    setSystemColorScheme('dark')

    expect(theme.value).toBe('light')
  })

  it('ignores a saved value that is not a theme', async () => {
    document.cookie = 'jsm-theme=blue; path=/'
    await mountApp()
    const { theme } = useTheme()
    expect(theme.value).toBe('light')

    setSystemColorScheme('dark')

    expect(theme.value).toBe('dark')
  })

  it('adopts the system preference on mount when there is no saved choice', async () => {
    setSystemColorScheme('dark')
    const wrapper = await mountApp()

    expect(useTheme().theme.value).toBe('dark')
    expect(wrapper.get(TOGGLE).attributes('aria-label')).toBe('Ativar tema claro')
  })
})
