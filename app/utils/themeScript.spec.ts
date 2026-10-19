import { runInThisContext } from 'node:vm'
import { DetachedWindowAPI } from 'happy-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { THEME_SCRIPT } from './themeScript'

// happy-dom answers `prefers-color-scheme` from its device settings (light by default)
function setSystemColorScheme(scheme: 'light' | 'dark') {
  const api: unknown = 'happyDOM' in window ? window.happyDOM : undefined
  if (!(api instanceof DetachedWindowAPI)) throw new Error('happy-dom API not found')
  api.settings.device.prefersColorScheme = scheme
}

const html = document.documentElement

describe('THEME_SCRIPT', () => {
  afterEach(() => {
    html.removeAttribute('data-theme')
    setSystemColorScheme('light')
  })

  it('keeps the theme the server already rendered', () => {
    setSystemColorScheme('dark')
    html.setAttribute('data-theme', 'light')

    runInThisContext(THEME_SCRIPT)

    expect(html.getAttribute('data-theme')).toBe('light')
  })

  it('applies a light system preference when the server rendered no theme', () => {
    runInThisContext(THEME_SCRIPT)

    expect(html.getAttribute('data-theme')).toBe('light')
  })

  it('applies a dark system preference when the server rendered no theme', () => {
    setSystemColorScheme('dark')

    runInThisContext(THEME_SCRIPT)

    expect(html.getAttribute('data-theme')).toBe('dark')
  })
})
