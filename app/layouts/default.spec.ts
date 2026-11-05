import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import DefaultLayout from './default.vue'

const MAIN = '[data-testid="layout__content--main"]'
const TOAST = '[data-testid="toast__root--status"]'

enableAutoUnmount(afterEach)

describe('default layout', () => {
  // Out of the page, a toast is not one more live region of the list, and it outlives a page change
  it('mounts the toast beside the main content, not in it', async () => {
    const wrapper = await mountSuspended(DefaultLayout)

    expect(wrapper.find(TOAST).exists()).toBe(true)
    expect(wrapper.get(MAIN).find(TOAST).exists()).toBe(false)
  })
})
