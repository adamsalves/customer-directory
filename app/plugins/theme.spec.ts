import { mountSuspended } from '@nuxt/test-utils/runtime'
import { DetachedWindowAPI } from 'happy-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../app.vue'

const TOGGLE = '[data-testid="header__theme--toggle"]'
const html = document.documentElement
const mounted: { unmount: () => void }[] = []

// The plugin ran once, when the test environment booted the app, and the end of hydration it waits
// for came and went then, with no saved choice. A page load in the real app is that hook firing
// after the plugin, so each case fires it again once its own state is in place.
async function endHydration() {
  await useNuxtApp().callHook('app:suspense:resolve')
  await nextTick()
}

async function mountApp() {
  const wrapper = await mountSuspended(App, { route: '/customers' })
  mounted.push(wrapper)
  await endHydration()
  return wrapper
}

// happy-dom answers `prefers-color-scheme` from its device settings and emits the MediaQueryList
// `change` events when the window is resized. Without `notify` only the answer changes, as on a
// page that opens under that scheme.
function setSystemColorScheme(scheme: 'light' | 'dark', { notify = true } = {}) {
  const api: unknown = 'happyDOM' in window ? window.happyDOM : undefined
  if (!(api instanceof DetachedWindowAPI)) throw new Error('happy-dom API not found')
  api.settings.device.prefersColorScheme = scheme
  if (notify) window.dispatchEvent(new Event('resize'))
}

describe('theme plugin', () => {
  beforeEach(() => {
    // The listeners the plugin adds outlive each case: the scheme goes back first, while the state
    // they write to is still there, and then every case starts from an app nobody told anything
    setSystemColorScheme('light')
    clearNuxtState(['theme', 'theme-chosen'])
    document.cookie = 'jsm-theme=; path=/; max-age=0'
    html.removeAttribute('data-theme')
  })

  afterEach(() => {
    for (const wrapper of mounted.splice(0)) wrapper.unmount()
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
    setSystemColorScheme('dark', { notify: false })
    await mountApp()
    const { theme } = useTheme()
    // The page opened under a dark system: adopting it would overwrite the saved choice
    expect(theme.value).toBe('light')

    setSystemColorScheme('light')
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
    setSystemColorScheme('dark', { notify: false })
    const wrapper = await mountApp()

    expect(useTheme().theme.value).toBe('dark')
    expect(wrapper.get(TOGGLE).attributes('aria-label')).toBe('Ativar tema claro')
  })

  // No other spec sees this: the test environment never hydrates, and a production build patches
  // the toggle's label silently. Only the dev server warns of the mismatch.
  it('waits for the end of hydration to adopt the system preference', async () => {
    setSystemColorScheme('dark', { notify: false })
    const { theme } = useTheme()

    // app:mounted comes as soon as mount() returns, before the async layout, and the toggle in it,
    // has hydrated: adopting here makes the toggle hydrate already dark, against the server HTML
    await useNuxtApp().callHook('app:mounted', useNuxtApp().vueApp)
    expect(theme.value).toBeNull()

    await endHydration()
    expect(theme.value).toBe('dark')
  })
})
