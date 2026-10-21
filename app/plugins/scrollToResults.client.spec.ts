import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { scrollToResults } = vi.hoisted(() => ({ scrollToResults: vi.fn() }))
mockNuxtImport('scrollToResults', () => scrollToResults)

// What the plugin waits for: a frame, after Nuxt's own scroll handling
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))

beforeEach(() => {
  scrollToResults.mockClear()
})

describe('scrollToResults plugin', () => {
  it('hands every navigation, a frame after it, to scrollToResults', async () => {
    await navigateTo('/customers')
    await frame()
    scrollToResults.mockClear()

    await navigateTo('/customers?page=2')
    expect(scrollToResults).not.toHaveBeenCalled()
    await frame()

    expect(scrollToResults).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ fullPath: '/customers?page=2' }),
      expect.objectContaining({ fullPath: '/customers' }),
    )
  })

  it('leaves back and forward to Nuxt', async () => {
    await navigateTo('/customers?page=2')
    await navigateTo('/customers?page=3')
    await frame()
    scrollToResults.mockClear()

    useRouter().back()
    await vi.waitFor(() => {
      expect(useRoute().fullPath).toBe('/customers?page=2')
    })
    await frame()
    expect(scrollToResults).not.toHaveBeenCalled()

    // Only the pop is left alone: the next navigation is handled again
    await navigateTo('/customers?page=4')
    await frame()
    expect(scrollToResults).toHaveBeenCalledOnce()
  })
})
