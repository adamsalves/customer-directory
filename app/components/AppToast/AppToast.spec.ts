import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import AppToast from './AppToast.vue'

const REGION = '[data-testid="toast__root--status"]'
const BUBBLE = '[data-testid="toast__message--text"]'

enableAutoUnmount(afterEach)

// useState keeps the message for the whole file
afterEach(() => {
  vi.useRealTimers()
  clearNuxtState('toast')
})

// Only the wait is faked (setTimeout and clearTimeout) and only after the mount, which the router
// has to be able to finish
async function mountToast() {
  const wrapper = await mountSuspended(AppToast)
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  return wrapper
}

describe('AppToast', () => {
  // A screen reader announces what appears in a region it has already met, so the region is in the
  // HTML before the first message
  it('keeps its live region in the page with no message and no bubble', async () => {
    const wrapper = await mountToast()

    expect(wrapper.get(REGION).attributes()).toMatchObject({
      role: 'status',
      'aria-live': 'polite',
    })
    expect(wrapper.find(BUBBLE).exists()).toBe(false)
  })

  it('shows the message in a bubble inside the region', async () => {
    const wrapper = await mountToast()

    useToast().show('E-mail copiado')
    await nextTick()

    expect(wrapper.get(REGION).get(BUBBLE).text()).toBe('E-mail copiado')
  })

  it('takes the bubble away when the message clears, and the region stays', async () => {
    const wrapper = await mountToast()
    useToast().show('E-mail copiado')
    await nextTick()

    vi.advanceTimersByTime(2200)
    await nextTick()

    expect(wrapper.find(BUBBLE).exists()).toBe(false)
    expect(wrapper.get(REGION).attributes('role')).toBe('status')
  })

  // CSS Modules hash the class names (_Region_1a2b3c). A binding lost or misspelled would leave the
  // toast unstyled, in the flow of the page, and nothing else here would notice.
  it('carries the classes of its stylesheet', async () => {
    const wrapper = await mountToast()
    useToast().show('E-mail copiado')
    await nextTick()

    expect(wrapper.get(REGION).classes().join(' ')).toContain('Region')
    expect(wrapper.get(BUBBLE).classes().join(' ')).toContain('Bubble')
  })
})
