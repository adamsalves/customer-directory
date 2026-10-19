import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AppThemeToggle from './AppThemeToggle.vue'

const TOGGLE = '[data-testid="header__theme--toggle"]'

describe('AppThemeToggle', () => {
  // useState keeps the theme state for the whole file and the cookie outlives the test
  afterEach(() => {
    vi.restoreAllMocks()
    clearNuxtState(['theme', 'theme-chosen'])
    document.cookie = 'jsm-theme=; path=/; max-age=0'
  })

  it('renders both icons, hidden from assistive technology, so CSS can pick one', async () => {
    const wrapper = await mountSuspended(AppThemeToggle)
    const icons = wrapper.findAll('svg')

    expect(icons).toHaveLength(2)
    for (const icon of icons) expect(icon.attributes('aria-hidden')).toBe('true')
    // CSS Modules hash the class names (_Moon_1a2b3c)
    expect(icons.map((icon) => icon.classes().join(' '))).toEqual([
      expect.stringContaining('Moon'),
      expect.stringContaining('Sun'),
    ])
  })

  it('offers the dark theme when there is no cookie', async () => {
    const toggle = (await mountSuspended(AppThemeToggle)).get(TOGGLE)

    expect(toggle.attributes('aria-label')).toBe('Ativar tema escuro')
    expect(toggle.attributes('title')).toBe('Ativar tema escuro')
  })

  it('offers the light theme when the cookie says dark', async () => {
    document.cookie = 'jsm-theme=dark; path=/'
    const toggle = (await mountSuspended(AppThemeToggle)).get(TOGGLE)

    expect(toggle.attributes('aria-label')).toBe('Ativar tema claro')
    expect(toggle.attributes('title')).toBe('Ativar tema claro')
  })

  // The APG says a toggle's label must not change with its state. This label names the action and
  // flips, so a pressed state would contradict it ("Ativar tema claro, pressed"). ADR-0013.
  it('exposes no pressed state, the label alone names the action', async () => {
    const toggle = (await mountSuspended(AppThemeToggle)).get(TOGGLE)
    expect(toggle.attributes('aria-pressed')).toBeUndefined()

    await toggle.trigger('click')

    expect(toggle.attributes('aria-label')).toBe('Ativar tema claro')
    expect(toggle.attributes('aria-pressed')).toBeUndefined()
  })

  it('flips the label on click and saves the choice in the cookie', async () => {
    const toggle = (await mountSuspended(AppThemeToggle)).get(TOGGLE)

    await toggle.trigger('click')
    expect(toggle.attributes('aria-label')).toBe('Ativar tema claro')
    expect(toggle.attributes('title')).toBe('Ativar tema claro')
    expect(document.cookie).toContain('jsm-theme=dark')

    await toggle.trigger('click')
    expect(toggle.attributes('aria-label')).toBe('Ativar tema escuro')
    expect(toggle.attributes('title')).toBe('Ativar tema escuro')
    expect(document.cookie).toContain('jsm-theme=light')
  })

  it('keeps the choice for a year and only for same-site requests', async () => {
    const writes = vi.spyOn(document, 'cookie', 'set')
    const toggle = (await mountSuspended(AppThemeToggle)).get(TOGGLE)

    await toggle.trigger('click')

    expect(writes.mock.calls.at(-1)?.[0]).toMatch(
      /^jsm-theme=dark; Max-Age=31536000;.*SameSite=Lax/i,
    )
  })

  // decodeURIComponent throws on a lone `%`: the default cookie decoder would 500 the whole render
  it('ignores a malformed cookie instead of failing to render', async () => {
    document.cookie = 'jsm-theme=dark%; path=/'
    const toggle = (await mountSuspended(AppThemeToggle)).get(TOGGLE)

    expect(toggle.attributes('aria-label')).toBe('Ativar tema escuro')
  })
})
