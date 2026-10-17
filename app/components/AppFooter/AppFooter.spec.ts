import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import AppFooter from './AppFooter.vue'

describe('AppFooter', () => {
  it('lists the social links in order', async () => {
    const wrapper = await mountSuspended(AppFooter)
    const links = wrapper.findAll('[data-testid="footer__social--link"]')

    expect(links.map((link) => [link.attributes('aria-label'), link.attributes('href')])).toEqual([
      ['Facebook (abre em nova aba)', 'https://www.facebook.com/juntossomosmais'],
      ['LinkedIn (abre em nova aba)', 'https://www.linkedin.com/company/juntossomosmais'],
      ['Instagram (abre em nova aba)', 'https://www.instagram.com/juntossomosmais'],
    ])
  })

  it('opens every link in a new tab without exposing the opener', async () => {
    const wrapper = await mountSuspended(AppFooter)
    const links = wrapper.findAll('[data-testid="footer__social--link"]')

    expect(links).toHaveLength(3)
    for (const link of links) {
      expect(link.attributes('target')).toBe('_blank')
      expect(link.attributes('rel')).toBe('noopener noreferrer')
    }
  })

  it('hides the icons from assistive technology', async () => {
    const wrapper = await mountSuspended(AppFooter)
    const icons = wrapper.findAll('[data-testid="footer__social--link"] svg')

    expect(icons).toHaveLength(3)
    for (const icon of icons) {
      expect(icon.attributes('aria-hidden')).toBe('true')
    }
  })
})
