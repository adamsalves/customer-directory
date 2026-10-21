import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import CustomerCardSkeleton from './CustomerCardSkeleton.vue'

describe('CustomerCardSkeleton', () => {
  it('is hidden from assistive technology', async () => {
    const wrapper = await mountSuspended(CustomerCardSkeleton)

    expect(
      wrapper.get('[data-testid="customer-card-skeleton__root--block"]').attributes(),
    ).toMatchObject({
      'aria-hidden': 'true',
    })
  })
})
