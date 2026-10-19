// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { BRAZILIAN_STATES } from './brazilianStates'

describe('BRAZILIAN_STATES', () => {
  it('lists the 27 states', () => {
    expect(BRAZILIAN_STATES).toHaveLength(27)
  })

  it.each(['name', 'uf', 'slug'] as const)('has a different %s on every state', (key) => {
    const values = BRAZILIAN_STATES.map((state) => state[key])

    expect(new Set(values).size).toBe(BRAZILIAN_STATES.length)
  })

  it.each(BRAZILIAN_STATES)('derives the slug of $name from its name', ({ name, slug }) => {
    const withoutAccents = name.normalize('NFD').replace(/\p{M}/gu, '')

    expect(slug).toBe(withoutAccents.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
  })
})
