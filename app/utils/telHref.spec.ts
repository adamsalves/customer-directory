import { describe, expect, it } from 'vitest'
import { telHref } from './telHref'

describe('telHref', () => {
  it.each([
    { phone: '(54) 3190-3469', href: 'tel:+555431903469' },
    { phone: '(09) 7033-7406', href: 'tel:+550970337406' },
  ])('turns $phone into $href', ({ phone, href }) => {
    expect(telHref(phone)).toBe(href)
  })
})
